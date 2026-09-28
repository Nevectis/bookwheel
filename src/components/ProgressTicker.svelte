<script>
  // "Wer liest wie weit?" – a row of library checkout cards under the wheel,
  // one per member: who, which book, how far, and a rubber stamp for the
  // state against the reading goal. Re-sorts live as people read.
  import { flip } from 'svelte/animate';
  import { fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import Stars from './Stars.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { percent, readerGoalState } from '../lib/reading.js';

  const book = $derived(club.current);
  const rows = $derived.by(() => {
    if (!book) return [];
    const summaryComplete = club.summary(book).complete;
    return club.sortedMembers
      .map((m) => {
        const e = club.entry(book.id, m.id);
        const page = e?.page ?? 0;
        return {
          id: m.id,
          member: m,
          entry: e,
          page,
          pct: percent(page, book.pageCount, e?.finished),
          goal: readerGoalState(e, book.goals ?? []),
          me: m.id === club.user?.uid,
          showRating: summaryComplete && e?.rating,
        };
      })
      .sort((a, b) => Number(!!b.entry?.finished) - Number(!!a.entry?.finished) || b.pct - a.pct || b.page - a.page);
  });

  let strip = $state();
  let canLeft = $state(false);
  let canRight = $state(false);
  function measure() {
    if (!strip) return;
    canLeft = strip.scrollLeft > 4;
    canRight = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4;
  }
  $effect(() => {
    rows.length;
    requestAnimationFrame(measure);
  });
  const nudge = (dir) => strip?.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: 'smooth' });

  function status(r) {
    if (r.entry?.finished) return { cls: 'done', text: t('ticker.finished') };
    if (!r.page) return { cls: 'idle', text: t('ticker.notStarted') };
    if (r.goal.state === 'behind') return { cls: 'behind', text: t('ticker.behind', { n: r.goal.pagesLeft }) };
    if (r.goal.state === 'reached') return { cls: 'ok', text: t('ticker.reached') };
    if (r.goal.state === 'open') return { cls: 'open', text: t('ticker.toGo', { n: r.goal.pagesLeft }) };
    return { cls: 'open', text: `${r.pct}%` };
  }
</script>

<section class="ticker" aria-labelledby="ticker-title">
  <div class="t-head">
    <div>
      <p class="eyebrow">{book ? book.title : t('nav.current')}</p>
      <h2 id="ticker-title">{t('ticker.title')}</h2>
    </div>
    {#if rows.length > 2}
      <div class="arrows">
        <button class="btn btn-icon btn-sm" type="button" disabled={!canLeft} onclick={() => nudge(-1)} aria-label="←"><Icon name="left" size={16} stroke={1.6} /></button>
        <button class="btn btn-icon btn-sm" type="button" disabled={!canRight} onclick={() => nudge(1)} aria-label="→"><Icon name="right" size={16} stroke={1.6} /></button>
      </div>
    {/if}
  </div>

  {#if !book}
    <p class="empty">{t('ticker.empty')}</p>
  {:else}
    <ul class="strip" bind:this={strip} onscroll={measure} data-testid="ticker">
      {#each rows as r, i (r.id)}
        {@const s = status(r)}
        <li
          class="card-slip"
          class:me={r.me}
          animate:flip={{ duration: 500 }}
          in:fly={{ y: 22, duration: 600, delay: 70 * i, easing: cubicOut }}
          style:--c={r.member.color}
          style:--tilt="{((i % 3) - 1) * 0.7}deg"
        >
          <div class="slip-head">
            <Avatar member={r.member} size={34} />
            <p class="name">
              {r.member.name}
              {#if r.me}<span class="you">{t('common.you')}</span>{/if}
            </p>
          </div>
          <p class="book" title={book.title}>{book.title}</p>
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={r.pct} aria-label={r.member.name}>
            <span style:width="{r.pct}%"></span>
          </div>
          <div class="slip-foot">
            {#key r.page}
              <span class="pages" in:fly={{ y: -6, duration: 400 }}>
                {book.pageCount ? t('ticker.ofPages', { page: r.page, total: book.pageCount }) : t('ticker.page', { page: r.page })}
              </span>
            {/key}
            {#if r.showRating}
              <span class="rated"><Stars value={r.entry.rating} size={12} /></span>
            {/if}
          </div>
          <span class="stamp {s.cls}">{s.text}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .ticker {
    position: relative;
  }
  .t-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }
  .t-head .eyebrow {
    color: var(--oxblood);
  }
  h2 {
    font-size: clamp(30px, 3.6vw, 40px);
    font-weight: 500;
    margin-top: 4px;
  }
  .arrows {
    display: flex;
    gap: 6px;
  }
  .empty {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    color: var(--ink-soft);
    padding: 16px 0;
  }
  .strip {
    list-style: none;
    margin: 0 calc(-1 * clamp(16px, 4vw, 36px));
    padding: 22px clamp(16px, 4vw, 36px) 26px;
    display: flex;
    gap: 18px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding: 0 clamp(16px, 4vw, 36px);
    scrollbar-width: none;
    mask-image: linear-gradient(90deg, transparent, #000 clamp(16px, 4vw, 36px), #000 calc(100% - clamp(16px, 4vw, 36px)), transparent);
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  /* a library index card: red header rule, faint blue lines */
  .card-slip {
    --slip: #fbf6e9;
    --slip-line: rgba(88, 128, 170, 0.18);
    --slip-red: rgba(170, 60, 60, 0.45);
    position: relative;
    flex: 0 0 auto;
    width: 262px;
    scroll-snap-align: start;
    padding: 14px 16px 14px;
    border-radius: 3px;
    background:
      linear-gradient(var(--slip-red), var(--slip-red)) 0 50px / 100% 1px no-repeat,
      repeating-linear-gradient(to bottom, transparent 0 23px, var(--slip-line) 23px 24px) 0 50px / 100% calc(100% - 50px) no-repeat,
      var(--slip);
    color: #2a2420;
    box-shadow:
      0 1px 1px rgba(60, 40, 20, 0.12),
      0 10px 20px -12px rgba(60, 40, 20, 0.35);
    transform: rotate(var(--tilt));
    transition:
      transform 0.4s var(--ease-out),
      box-shadow 0.4s var(--ease-out);
  }
  :global(:root[data-theme='dark']) .card-slip {
    --slip: #e7dcc6;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .card-slip {
      --slip: #e7dcc6;
    }
  }
  .card-slip:hover {
    transform: rotate(0deg) translateY(-4px);
    box-shadow:
      0 1px 1px rgba(60, 40, 20, 0.12),
      0 18px 30px -14px rgba(60, 40, 20, 0.45);
  }
  .card-slip.me {
    box-shadow:
      0 0 0 1.5px color-mix(in srgb, var(--c) 70%, transparent),
      0 10px 20px -12px rgba(60, 40, 20, 0.35);
  }
  .slip-head {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 32px;
  }
  .slip-head :global(.avatar) {
    box-shadow: 0 0 0 1.5px var(--slip);
  }
  .name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 21px;
    line-height: 1;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .you {
    font-family: var(--font-body);
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid currentColor;
    color: #6b5d50;
  }
  .book {
    margin-top: 12px;
    font-family: var(--font-type);
    font-size: 13px;
    line-height: 24px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar {
    height: 3px;
    border-radius: 2px;
    background: rgba(60, 40, 20, 0.12);
    margin: 9px 0 8px;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--c);
    transition: width 1.1s var(--ease-out);
    animation: grow 1.3s var(--ease-out) both;
  }
  @keyframes grow {
    from {
      width: 0;
    }
  }
  .slip-foot {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
  }
  .pages {
    font-family: var(--font-type);
    font-size: 13px;
    white-space: nowrap;
  }
  /* rubber stamp */
  .stamp {
    position: absolute;
    right: 12px;
    bottom: 14px;
    max-width: 52%;
    padding: 3px 7px 2px;
    border: 1.5px solid currentColor;
    border-radius: 3px;
    font-family: var(--font-body);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    line-height: 1.25;
    text-transform: uppercase;
    text-align: center;
    transform: rotate(-5deg);
    opacity: 0.82;
    mix-blend-mode: multiply;
    -webkit-mask-image: radial-gradient(circle at 30% 40%, #000 60%, rgba(0, 0, 0, 0.72) 61%, #000 75%);
    mask-image: radial-gradient(circle at 30% 40%, #000 60%, rgba(0, 0, 0, 0.72) 61%, #000 75%);
    color: #7a6e62;
  }
  .stamp.done,
  .stamp.ok {
    color: #2f6a45;
  }
  .stamp.behind {
    color: #a23a2c;
  }
  .stamp.open {
    color: #2c4d7a;
  }
  .rated {
    display: inline-flex;
  }
</style>
