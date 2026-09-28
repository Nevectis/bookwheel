<script>
  import Wheel from './Wheel.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { confirmDialog, prefersReducedMotion, toast, ui } from '../lib/ui.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { GENRES, genreSwatch } from '../lib/genres.js';
  import { randomIndex } from '../lib/wheel.js';
  import { chime, tick, unlockAudio } from '../lib/sound.js';

  let selected = $state([]);
  let spinning = $state(false);
  let holding = $state(false);
  let winnerId = $state(null);
  let wheel = $state();
  let announce = $state('');

  const counts = $derived.by(() => {
    const c = {};
    for (const b of club.shelf) c[b.genre] = (c[b.genre] ?? 0) + 1;
    return c;
  });
  const items = $derived(selected.length ? club.shelf.filter((b) => selected.includes(b.genre)) : club.shelf);

  // Keep the winning slice lit while its popup is open; let it shrink away after.
  $effect(() => {
    if (!ui.result && !holding && !spinning && winnerId) winnerId = null;
  });

  function toggle(id) {
    selected = selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id];
  }

  async function spin() {
    if (spinning || !items.length) return;
    unlockAudio();
    if (club.current) {
      const ok = await confirmDialog(t('wheel.confirmReplace', { title: club.current.title }), {
        confirmLabel: t('wheel.confirmYes'),
      });
      if (!ok) return;
    }
    const pool = items;
    const book = pool[randomIndex(pool.length)];
    spinning = true;
    announce = t('wheel.spinning');
    // Only commit once the wheel has stopped, so nobody's screen (the current
    // book card, the chronicle) gives the result away mid-spin. The pick is a
    // transaction, so a book someone else took meanwhile is refused.
    const landed = await wheel.spin(book.id);
    const res = landed
      ? await club.pick(book).then(
          () => ({ ok: true }),
          (e) => ({ ok: false, e }),
        )
      : { ok: false };
    spinning = false;
    if (!landed || !res.ok) {
      console.warn(res.e);
      toast(res.e?.code === 'not-available' ? t('wheel.taken', { title: book.title }) : t('common.error'), { tone: 'error' });
      announce = '';
      return;
    }
    winnerId = book.id;
    holding = true;
    if (ui.sound) chime();
    announce = `${book.title} — ${book.author}`;
    setTimeout(
      () => {
        ui.result = { bookId: book.id, byName: null };
        holding = false;
      },
      prefersReducedMotion() ? 150 : 950,
    );
  }
</script>

<section id="wheel" class="card wheel-card" aria-labelledby="wheel-title">
  <header class="wc-head">
    <div>
      <p class="eyebrow">{t('nav.wheel')}</p>
      <h2 id="wheel-title">{t('wheel.title')}</h2>
    </div>
    <span class="count-pill" aria-live="polite">
      <Icon name="books" size={16} />
      {t('wheel.count', { n: items.length })}
    </span>
  </header>

  <div class="filters" role="group" aria-label={t('wheel.filter')}>
    <button type="button" class="fchip all" class:on={!selected.length} aria-pressed={!selected.length} onclick={() => (selected = [])}>
      <Icon name="sparkles" size={14} />
      {t('wheel.allGenres')}
    </button>
    {#each GENRES as g (g.id)}
      {@const n = counts[g.id] ?? 0}
      {@const on = selected.includes(g.id)}
      <button
        type="button"
        class="fchip"
        class:on
        aria-pressed={on}
        disabled={!n && !on}
        style:--gc={genreSwatch(g.id)}
        style:--gsolid={g.color}
        onclick={() => toggle(g.id)}
      >
        <span class="dot" style:background={genreSwatch(g.id)}></span>
        {g.label}
        <span class="n">{n}</span>
      </button>
    {/each}
  </div>

  <div class="stage">
    <Wheel
      bind:this={wheel}
      {items}
      frozen={spinning || !!winnerId}
      {winnerId}
      {spinning}
      disabled={!items.length}
      hubLabel={t('wheel.spin')}
      emptyText={club.shelf.length ? '' : t('wheel.emptyCenter')}
      onhub={spin}
      ontick={(s) => ui.sound && tick(s)}
    />
  </div>

  <div class="spin-row">
    {#if !club.shelf.length}
      <p class="hint">{t('wheel.empty')}</p>
      <button class="btn btn-primary" type="button" onclick={() => (ui.bookForm = { mode: 'add' })}>
        <Icon name="plus" size={18} />
        {t('shelf.add')}
      </button>
    {:else if !items.length}
      <p class="hint">{t('wheel.emptyFilter')}</p>
    {:else}
      <button class="spin-btn" type="button" onclick={spin} disabled={spinning} data-testid="spin">
        <span class="spin-ico" class:go={spinning}><Icon name="spin" size={22} stroke={2.4} /></span>
        <span>{spinning ? t('wheel.spinning') : t('wheel.spin')}</span>
      </button>
    {/if}
  </div>
  <p class="sr-only" aria-live="assertive">{announce}</p>
</section>

<style>
  .wheel-card {
    padding: clamp(20px, 3.5vw, 32px);
    overflow: hidden;
  }
  .wheel-card::before {
    content: '';
    position: absolute;
    inset: -40% -20% auto;
    height: 70%;
    background: radial-gradient(closest-side, var(--glow-2), transparent);
    pointer-events: none;
  }
  .wc-head {
    position: relative;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  h2 {
    font-size: clamp(28px, 4vw, 36px);
  }
  .count-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--gold-soft);
    color: color-mix(in srgb, var(--gold) 55%, var(--ink));
    font-weight: 700;
    font-size: 13.5px;
  }
  .filters {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 18px 0 8px;
  }
  .fchip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 11px 6px 9px;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: var(--card-2);
    color: var(--ink-soft);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition:
      transform 0.2s var(--ease-spring),
      color 0.25s ease,
      border-color 0.25s ease;
  }
  .fchip::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--gc, var(--accent));
    transform: scale(0);
    border-radius: inherit;
    transition: transform 0.35s var(--ease-out);
  }
  .fchip.all::before {
    background: var(--ink);
  }
  .fchip:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--line-strong);
  }
  .fchip.on {
    color: #fff;
    border-color: transparent;
  }
  .fchip.all.on {
    color: var(--paper);
  }
  .fchip.on::before {
    transform: scale(1);
  }
  .fchip.on .dot {
    background: #fff !important;
  }
  .fchip:disabled {
    opacity: 0.38;
    cursor: default;
  }
  .n {
    font-family: var(--font-mono);
    font-size: 11px;
    opacity: 0.7;
    font-weight: 500;
  }
  .stage {
    position: relative;
    padding: 18px 0 6px;
  }
  .spin-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    min-height: 64px;
  }
  .hint {
    color: var(--ink-soft);
    text-align: center;
  }
  .spin-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 16px 38px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: #fff8f0;
    background: linear-gradient(180deg, #b3475f, #8c2f45 60%, #74243a);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.35) inset,
      0 -3px 0 rgba(0, 0, 0, 0.2) inset,
      0 6px 0 #5a1a2b,
      0 14px 28px -8px rgba(140, 47, 69, 0.7);
    overflow: hidden;
    transition:
      transform 0.18s var(--ease-spring),
      box-shadow 0.18s ease,
      filter 0.2s ease;
  }
  .spin-btn::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 -60%;
    width: 40%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent);
    transform: skewX(-20deg);
    animation: sweep 3.6s ease-in-out infinite;
  }
  @keyframes sweep {
    0%,
    55% {
      left: -60%;
    }
    100% {
      left: 130%;
    }
  }
  .spin-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.06);
  }
  .spin-btn:active:not(:disabled) {
    transform: translateY(5px);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.35) inset,
      0 1px 0 #5a1a2b,
      0 6px 14px -8px rgba(140, 47, 69, 0.7);
  }
  .spin-btn:disabled {
    cursor: progress;
    filter: saturate(0.75);
  }
  .spin-btn:disabled::after {
    animation-duration: 1s;
  }
  .spin-ico {
    display: grid;
  }
  .spin-ico.go {
    animation: rot 0.7s linear infinite;
  }
  @keyframes rot {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 640px) {
    .filters {
      flex-wrap: nowrap;
      overflow-x: auto;
      margin-inline: -20px;
      padding: 2px 20px 6px;
      scrollbar-width: none;
      mask-image: linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 16px), transparent);
    }
    .filters::-webkit-scrollbar {
      display: none;
    }
    .fchip {
      flex: none;
    }
  }
</style>
