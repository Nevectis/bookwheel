<script>
  // "Wer liest wie weit?" – little pop-up bubbles under the wheel, one per
  // member, showing the current book and how far they are. Re-sorts live.
  import { flip } from 'svelte/animate';
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
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
    <h2 id="ticker-title"><span class="pulse" aria-hidden="true"></span>{t('ticker.title')}</h2>
    {#if rows.length > 2}
      <div class="arrows">
        <button class="btn btn-icon btn-sm" type="button" disabled={!canLeft} onclick={() => nudge(-1)} aria-label="←"><Icon name="left" size={16} /></button>
        <button class="btn btn-icon btn-sm" type="button" disabled={!canRight} onclick={() => nudge(1)} aria-label="→"><Icon name="right" size={16} /></button>
      </div>
    {/if}
  </div>

  {#if !book}
    <p class="empty">{t('ticker.empty')}</p>
  {:else}
    <ul class="strip" bind:this={strip} onscroll={measure} data-testid="ticker">
      {#each rows as r, i (r.id)}
        {@const s = status(r)}
        <li class="bubble" class:me={r.me} animate:flip={{ duration: 500 }} in:fly={{ y: 26, duration: 520, delay: 80 * i, easing: backOut }} style:--c={r.member.color}>
          <div class="b-top">
            <Avatar member={r.member} size={38} />
            <div class="who">
              <p class="name">
                {r.member.name}
                {#if r.me}<span class="you">{t('common.you')}</span>{/if}
              </p>
              <p class="book" title={book.title}><Icon name="book" size={12} /> {book.title}</p>
            </div>
          </div>
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={r.pct} aria-label={r.member.name}>
            <span style:width="{r.pct}%"></span>
          </div>
          <div class="b-foot">
            {#key r.page}
              <span class="pages" in:scale={{ start: 0.7, duration: 400, easing: backOut }}>
                {book.pageCount ? t('ticker.ofPages', { page: r.page, total: book.pageCount }) : t('ticker.page', { page: r.page })}
              </span>
            {/key}
            <span class="state {s.cls}">
              {#if s.cls === 'done'}<Icon name="check" size={12} stroke={3} />{/if}
              {#if s.cls === 'behind'}<Icon name="hourglass" size={12} />{/if}
              {#if s.cls === 'ok'}<Icon name="flag" size={12} />{/if}
              {s.text}
            </span>
          </div>
          {#if r.showRating}
            <div class="rated"><Stars value={r.entry.rating} size={13} /></div>
          {/if}
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
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 4px;
  }
  h2 {
    font-size: 22px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pulse {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 60%, transparent);
    animation: live 2.2s ease-out infinite;
  }
  @keyframes live {
    70% {
      box-shadow: 0 0 0 10px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
  .arrows {
    display: flex;
    gap: 6px;
  }
  .empty {
    color: var(--ink-soft);
    padding: 14px 0;
  }
  .strip {
    list-style: none;
    margin: 0 calc(-1 * clamp(16px, 4vw, 32px));
    padding: 16px clamp(16px, 4vw, 32px) 18px;
    display: flex;
    gap: 14px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding: 0 clamp(16px, 4vw, 32px);
    scrollbar-width: none;
    mask-image: linear-gradient(90deg, transparent, #000 clamp(16px, 4vw, 32px), #000 calc(100% - clamp(16px, 4vw, 32px)), transparent);
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  .bubble {
    position: relative;
    flex: 0 0 auto;
    width: 264px;
    scroll-snap-align: start;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 14px 14px 12px;
    box-shadow: var(--shadow-md);
    transition:
      transform 0.25s var(--ease-spring),
      box-shadow 0.25s ease;
  }
  /* speech-bubble tail pointing up at the wheel */
  .bubble::before {
    content: '';
    position: absolute;
    top: -8px;
    left: 26px;
    width: 14px;
    height: 14px;
    background: var(--card);
    border-left: 1px solid var(--line);
    border-top: 1px solid var(--line);
    transform: rotate(45deg);
    border-radius: 3px 0 0 0;
  }
  .bubble:hover {
    transform: translateY(-4px) rotate(-0.6deg);
    box-shadow: var(--shadow-lg);
  }
  .bubble.me {
    border-color: color-mix(in srgb, var(--c) 55%, var(--line));
    background: linear-gradient(160deg, color-mix(in srgb, var(--c) 10%, var(--card)), var(--card) 60%);
  }
  .bubble.me::before {
    border-color: color-mix(in srgb, var(--c) 55%, var(--line));
    background: color-mix(in srgb, var(--c) 10%, var(--card));
  }
  .b-top {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .who {
    min-width: 0;
  }
  .name {
    font-weight: 800;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .you {
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--c);
    color: #fff;
  }
  .book {
    font-size: 12.5px;
    color: var(--ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .bar {
    height: 7px;
    border-radius: 99px;
    background: var(--card-2);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
    margin: 12px 0 9px;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, color-mix(in srgb, var(--c) 70%, white), var(--c));
    transition: width 1.1s var(--ease-out);
    animation: grow 1.2s var(--ease-out) both;
  }
  @keyframes grow {
    from {
      width: 0;
    }
  }
  .b-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .pages {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  .state {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;
    background: var(--card-2);
    color: var(--ink-soft);
  }
  .state.done,
  .state.ok {
    background: var(--green-soft);
    color: var(--green);
  }
  .state.behind {
    background: var(--red-soft);
    color: var(--red);
  }
  .rated {
    margin-top: 8px;
  }
</style>
