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
  let popupTimer;
  $effect(() => () => clearTimeout(popupTimer));

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
    const since = club.pickMarker();
    spinning = true;
    announce = t('wheel.spinning');
    // Only commit once the wheel has stopped, so nobody's screen (the current
    // book card, the chronicle) gives the result away mid-spin. The pick is a
    // transaction, so a book someone else took meanwhile is refused.
    const landed = await wheel.spin(book.id);
    const res = landed
      ? await club.pick(book, since).then(
          () => ({ ok: true }),
          (e) => ({ ok: false, e }),
        )
      : { ok: false };
    spinning = false;
    if (!landed || !res.ok) {
      console.warn(res.e);
      const code = res.e?.code;
      const msg =
        code === 'someone-else-spun'
          ? t('wheel.otherSpun')
          : code === 'not-available'
            ? t('wheel.taken', { title: book.title })
            : code === 'storage-full'
              ? t('common.storageFull')
              : t('common.error');
      toast(msg, { tone: 'error' });
      announce = '';
      return;
    }
    winnerId = book.id;
    holding = true;
    if (ui.sound) chime();
    announce = `${book.title} — ${book.author}`;
    popupTimer = setTimeout(
      () => {
        ui.result = { bookId: book.id, byName: null };
        holding = false;
      },
      prefersReducedMotion() ? 150 : 950,
    );
  }
</script>

<section id="wheel" class="card page-rule wheel-card" aria-labelledby="wheel-title">
  <header class="wc-head">
    <div>
      <p class="eyebrow">{t('nav.wheel')}</p>
      <h2 id="wheel-title">{t('wheel.title')}</h2>
    </div>
    <p class="count-pill" aria-live="polite">{t('wheel.count', { n: items.length })}</p>
  </header>

  <div class="filters" role="group" aria-label={t('wheel.filter')}>
    <button type="button" class="tag all" class:on={!selected.length} aria-pressed={!selected.length} onclick={() => (selected = [])}>
      {t('wheel.allGenres')}
    </button>
    {#each GENRES as g (g.id)}
      {@const n = counts[g.id] ?? 0}
      {@const on = selected.includes(g.id)}
      <button
        type="button"
        class="tag"
        class:on
        aria-pressed={on}
        disabled={!n && !on}
        style:--gc={genreSwatch(g.id)}
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
      label={t('wheel.aria', { n: items.length, titles: items.map((b) => `${b.title} (${b.author})`).join('; ') })}
      emptyText={club.shelf.length ? '' : t('wheel.emptyCenter')}
      ringText={club.meta?.name || 'Bookwheel'}
      onhub={spin}
      ontick={(s) => ui.sound && tick(s)}
    />
  </div>

  <div class="spin-row">
    {#if !club.shelf.length}
      <p class="hint">{t('wheel.empty')}</p>
      <button class="btn btn-primary" type="button" onclick={() => (ui.bookForm = { mode: 'add' })}>
        <Icon name="plus" size={17} />
        {t('shelf.add')}
      </button>
    {:else if !items.length}
      <p class="hint">{t('wheel.emptyFilter')}</p>
    {:else}
      <button class="btn btn-primary spin-btn" type="button" onclick={spin} disabled={spinning} data-testid="spin">
        <span class="spin-ico" class:go={spinning}><Icon name="spin" size={19} stroke={1.6} /></span>
        <span class="spin-label">{spinning ? t('wheel.spinning') : t('wheel.spin')}</span>
      </button>
    {/if}
  </div>
  <p class="sr-only" aria-live="assertive">{announce}</p>
</section>

<style>
  .wheel-card {
    padding: clamp(24px, 3.6vw, 38px);
    overflow: hidden;
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
    font-size: clamp(34px, 4.4vw, 46px);
    font-weight: 500;
    margin-top: 6px;
  }
  .count-pill {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    color: var(--ink-soft);
  }
  .filters {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 20px 0 6px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px 5px 9px;
    border-radius: 4px;
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink-soft);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition:
      background-color 0.25s var(--ease-soft),
      color 0.25s var(--ease-soft),
      border-color 0.25s var(--ease-soft);
  }
  .tag:hover:not(:disabled) {
    border-color: var(--ink-faint);
    color: var(--ink);
  }
  .tag.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
  }
  .tag.on:not(.all) {
    background: var(--gc);
    border-color: transparent;
    color: #fbf5ea;
  }
  .tag.on .dot {
    background: #fbf5ea !important;
  }
  .tag:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .n {
    font-family: var(--font-type);
    font-size: 12.5px;
    font-weight: 700;
  }
  .stage {
    position: relative;
    padding: 34px 0 6px;
  }
  .spin-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-top: 22px;
    min-height: 60px;
  }
  .hint {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    color: var(--ink-soft);
    text-align: center;
  }
  .spin-btn {
    min-width: min(100%, 290px); /* same width while it says "spinning …" */
    min-height: 54px;
    padding: 10px 34px 10px 28px;
    gap: 12px;
    border-radius: 10px;
  }
  .spin-btn:disabled {
    opacity: 1;
    cursor: progress;
  }
  .spin-btn:disabled .spin-label {
    opacity: 0.85;
  }
  .spin-label {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 22px;
    letter-spacing: 0.01em;
  }
  .spin-ico {
    display: grid;
    color: var(--gold-2);
  }
  .spin-ico.go {
    animation: rot 1.1s linear infinite;
  }
  @keyframes rot {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 640px) {
    /* give the wheel nearly the full card width on phones */
    .stage {
      margin-inline: -14px;
    }
    .filters {
      flex-wrap: nowrap;
      overflow-x: auto;
      margin-inline: -24px;
      padding: 16px 24px 6px;
      scrollbar-width: none;
      mask-image: linear-gradient(90deg, transparent, #000 20px, #000 calc(100% - 20px), transparent);
    }
    .filters::-webkit-scrollbar {
      display: none;
    }
    .tag {
      flex: none;
      min-height: 40px;
    }
  }
</style>
