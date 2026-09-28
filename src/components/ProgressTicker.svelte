<script>
  // "Wer liest wie weit?" – a row of library checkout cards under the wheel,
  // one per member: who, which book, how far, and a rubber stamp for the
  // state against the reading goal. Re-sorts live as people read.
  import { flip } from '../lib/motion.js';
  import { fly, scale } from '../lib/motion.js';
  import { cubicOut } from 'svelte/easing';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import Stars from './Stars.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { percent, readerGoalState } from '../lib/reading.js';
  import { safeColor } from '../lib/club.js';
  import { parseDay } from '../lib/dates.js';
  import { clock, prefersReducedMotion } from '../lib/ui.svelte.js';

  const book = $derived(club.current);
  const rows = $derived.by(() => {
    if (!book) return [];
    const revealed = club.summary(book).revealed;
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
          goal: readerGoalState(e, book.goals ?? [], parseDay(clock.day)),
          me: m.id === club.user?.uid,
          showRating: revealed && e?.rating,
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

  // After you update your page your card re-sorts; without this the strip
  // re-snaps to whichever card it showed before and yours slides out of view.
  const mine = $derived.by(() => {
    const e = book ? club.entry(book.id) : null;
    return `${book?.id}|${e?.page ?? 0}|${!!e?.finished}`;
  });
  let lastMine;
  let mineTimer;
  $effect(() => () => clearTimeout(mineTimer));
  $effect(() => {
    const key = mine;
    if (lastMine !== undefined && key !== lastMine) {
      clearTimeout(mineTimer);
      // Let the reorder settle, then bring my card in (snapping paused, or
      // the strip snaps straight back to the card it showed before).
      mineTimer = setTimeout(() => {
        const card = strip?.querySelector('.me'); // offsetLeft ignores the reorder animation
        if (!card) return;
        const pad = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
        const smooth = !prefersReducedMotion();
        strip.style.scrollSnapType = 'none';
        const restore = () => (strip.style.scrollSnapType = '');
        strip.addEventListener('scrollend', restore, { once: true });
        setTimeout(restore, 900);
        strip.scrollTo({ left: Math.max(0, card.offsetLeft - pad), behavior: smooth ? 'smooth' : 'auto' });
      }, 120);
    }
    lastMine = key;
  });

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
        <button class="btn btn-icon btn-sm" type="button" disabled={!canLeft} onclick={() => nudge(-1)} aria-label={t('ticker.prev')}><Icon name="left" size={16} stroke={1.6} /></button>
        <button class="btn btn-icon btn-sm" type="button" disabled={!canRight} onclick={() => nudge(1)} aria-label={t('ticker.next')}><Icon name="right" size={16} stroke={1.6} /></button>
      </div>
    {/if}
  </div>

  {#if !book}
    <p class="empty">{t('ticker.empty')}</p>
  {:else}
    <!-- focusable so keyboard users can scroll the strip with the arrow keys -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <ul class="strip" bind:this={strip} onscroll={measure} data-testid="ticker" tabindex="0" aria-label={t('ticker.title')}>
      {#each rows as r, i (r.id)}
        {@const s = status(r)}
        <li
          class="card-slip"
          class:me={r.me}
          animate:flip={{ duration: 500 }}
          in:fly={{ y: 22, duration: 600, delay: 70 * i, easing: cubicOut }}
          style:--c={safeColor(r.member.color)}
          style:--tilt="{((i % 3) - 1) * 0.7}deg"
        >
          <div class="slip-head">
            <Avatar member={r.member} size={34} />
            <p class="name" title={r.member.name}>
              <span class="nm">{r.member.name}</span>
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .t-head > :first-child {
    min-width: 0;
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
    position: relative; /* the cards' offsetParent */
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
    --slip-ink: #2a2420;
    --slip-soft: #5e5145;
    --slip-line: rgba(88, 128, 170, 0.13);
    --slip-red: rgba(170, 60, 60, 0.4);
    --slip-track: rgba(60, 40, 20, 0.12);
    --stamp-idle: #6f6357;
    --stamp-ok: #2f6a45;
    --stamp-behind: #a23a2c;
    --stamp-open: #2c4d7a;
    --stamp-blend: multiply;
    position: relative;
    flex: 0 0 auto;
    width: 272px;
    scroll-snap-align: start;
    padding: 14px 16px 14px;
    border-radius: 3px;
    background:
      linear-gradient(var(--slip-red), var(--slip-red)) 0 52px / 100% 1px no-repeat,
      repeating-linear-gradient(to bottom, transparent 0 25px, var(--slip-line) 25px 26px) 0 52px / 100% calc(100% - 52px) no-repeat,
      var(--slip);
    color: var(--slip-ink);
    box-shadow:
      0 1px 1px rgba(60, 40, 20, 0.12),
      0 10px 20px -12px rgba(60, 40, 20, 0.35);
    transform: rotate(var(--tilt));
    transition:
      transform 0.4s var(--ease-out),
      box-shadow 0.4s var(--ease-out);
  }
  /* dark mode: dark card stock with light ink, no glare against the page */
  :global(:root[data-theme='dark']) .card-slip {
    --slip: #2d261f;
    --slip-ink: #efe6d5;
    --slip-soft: #c9bba5;
    --slip-line: rgba(170, 190, 220, 0.08);
    --slip-red: rgba(225, 120, 120, 0.4);
    --slip-track: rgba(255, 240, 220, 0.12);
    --stamp-idle: #b9ab98;
    --stamp-ok: #93c9a2;
    --stamp-behind: #f0a293;
    --stamp-open: #a9c0e6;
    --stamp-blend: normal;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .card-slip {
      --slip: #2d261f;
      --slip-ink: #efe6d5;
      --slip-soft: #c9bba5;
      --slip-line: rgba(170, 190, 220, 0.08);
      --slip-red: rgba(225, 120, 120, 0.4);
      --slip-track: rgba(255, 240, 220, 0.12);
      --stamp-idle: #b9ab98;
      --stamp-ok: #93c9a2;
      --stamp-behind: #f0a293;
      --stamp-open: #a9c0e6;
      --stamp-blend: normal;
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
    height: 34px;
  }
  .slip-head :global(.avatar) {
    box-shadow: 0 0 0 1.5px var(--slip);
  }
  .name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    line-height: 1.1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .nm {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .you {
    flex: none;
  }
  .you {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid currentColor;
    color: var(--slip-soft);
  }
  .book {
    margin-top: 14px;
    font-family: var(--font-type);
    font-size: 14px;
    line-height: 26px;
    color: var(--slip-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar {
    height: 3px;
    border-radius: 2px;
    background: var(--slip-track);
    margin: 10px 0 8px;
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
    min-height: 36px;
  }
  .pages {
    font-family: var(--font-type);
    font-weight: 700;
    font-size: 14px;
    color: var(--slip-ink);
    white-space: nowrap;
  }
  /* rubber stamp */
  .stamp {
    position: absolute;
    right: 12px;
    bottom: 14px;
    max-width: 54%;
    padding: 4px 8px 3px;
    border: 1.5px solid currentColor;
    border-radius: 3px;
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    line-height: 1.25;
    text-transform: uppercase;
    text-align: center;
    transform: rotate(-4deg);
    opacity: 0.92;
    mix-blend-mode: var(--stamp-blend);
    color: var(--stamp-idle);
  }
  .stamp.done,
  .stamp.ok {
    color: var(--stamp-ok);
  }
  .stamp.behind {
    color: var(--stamp-behind);
  }
  .stamp.open {
    color: var(--stamp-open);
  }
  .rated {
    display: inline-flex;
  }
</style>
