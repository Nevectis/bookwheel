<script>
  import { fly, fade } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import BookCover from './BookCover.svelte';
  import GoalList from './GoalList.svelte';
  import Icon from './Icon.svelte';
  import Stars from './Stars.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t, locale } from '../lib/i18n.svelte.js';
  import { genreById, genreSwatch } from '../lib/genres.js';
  import { daysUntil, longDate, monthLabel, shortDay } from '../lib/dates.js';
  import { clampPage, nextGoal, percent } from '../lib/reading.js';
  import { tilt } from '../lib/actions.js';
  import { toast, ui } from '../lib/ui.svelte.js';

  const book = $derived(club.current);
  const mine = $derived(book ? club.entry(book.id) : null);
  const next = $derived(book ? nextGoal(book.goals ?? []) : null);
  const genre = $derived(genreById(book?.genre));

  let page = $state(0);
  let savedFlash = $state(0);
  let pagesInput = $state('');
  // Follow my saved page (a primitive, so other members' updates don't reset typing).
  const savedPage = $derived(mine?.page ?? 0);
  $effect(() => {
    page = savedPage;
  });
  const pct = $derived(book ? percent(page, book.pageCount, mine?.finished) : 0);

  async function save() {
    if (!book) return;
    const p = clampPage(page, book.pageCount);
    page = p;
    if (p === (mine?.page ?? 0)) return;
    try {
      await club.saveProgress(book, p);
      savedFlash++;
    } catch {
      /* toast shown by store */
    }
  }

  async function finish() {
    try {
      await club.markFinished(book);
      ui.review = { bookId: book.id, congrats: true };
    } catch {
      /* toast shown */
    }
  }

  async function setPages(e) {
    e.preventDefault();
    const n = Math.floor(Number(pagesInput));
    if (!Number.isFinite(n) || n <= 0) return;
    await club.updateBook(book.id, { pageCount: Math.min(n, 20000) });
    pagesInput = '';
    toast(t('edit.saved'), { tone: 'success' });
  }

  function dueText(g) {
    const d = daysUntil(g.date);
    if (d === 0) return t('goals.today');
    if (d === 1) return t('goals.tomorrow');
    return t('goals.inDays', { n: d });
  }
</script>

<section id="current" class="card current" aria-labelledby="current-title">
  {#key book?.id}
    {#if book}
      <div class="halo" style:--g={genre.color} aria-hidden="true"></div>
      <div class="inner" in:fly={{ y: 24, duration: 600, easing: backOut }}>
        <div class="top">
          <div class="cover-col">
            <div class="cover-tilt" use:tilt={{ max: 9 }}>
              <BookCover {book} />
            </div>
          </div>
          <div class="info">
            <p class="eyebrow">
              <span class="live-dot"></span>
              {t('current.eyebrow')}
            </p>
            <h2 id="current-title" class="title">{book.title}</h2>
            <p class="author">{book.author}</p>
            <div class="meta">
              <span class="chip"><span class="dot" style:background={genreSwatch(book.genre)}></span>{genre.label}</span>
              {#if book.month}<span class="chip"><Icon name="calendar" size={13} />{monthLabel(book.month, locale())}</span>{/if}
              {#if book.pageCount}<span class="chip">{t('current.pages', { n: book.pageCount })}</span>{/if}
            </div>
            <p class="picked">
              {t('current.pickedBy', { name: club.nameOf(book.pickedBy, book.pickedByName) })} · {longDate(book.pickedAt, locale())}
            </p>
          </div>
        </div>

        {#if next}
          <div class="next-goal" in:fade>
            <span class="ng-icon"><Icon name="target" size={20} /></span>
            <div>
              <p class="ng-label">{t('goals.next')}</p>
              <p class="ng-text">{t('goals.item', { date: shortDay(next.date, locale()), page: next.page })}</p>
            </div>
            <span class="ng-due">{dueText(next)}</span>
          </div>
        {/if}

        <div class="progress">
          <div class="p-head">
            <span class="label">{t('current.myProgress')}</span>
            {#if book.pageCount}<span class="pct">{pct}%</span>{/if}
          </div>

          {#if mine?.finished}
            <div class="finished" in:fly={{ y: 10 }}>
              <span class="badge"><Icon name="check" size={16} stroke={3} /> {t('current.finished')}</span>
              {#if mine.rating}
                <span class="mine-rating">
                  <span class="label">{t('current.yourRating')}</span>
                  <Stars value={mine.rating} size={18} label={t('review.star', { n: mine.rating })} />
                </span>
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })}>
                  <Icon name="edit" size={15} />{t('current.editRating')}
                </button>
              {:else}
                <button class="btn btn-gold btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })} data-testid="rate-now">
                  <Icon name="sparkles" size={15} />{t('current.rateNow')}
                </button>
              {/if}
              <button class="linkish" type="button" onclick={() => club.markUnfinished(book)}>{t('current.notFinished')}</button>
            </div>
          {:else}
            {#if book.pageCount}
              <div class="range" style:--p="{pct}%">
                <input
                  type="range"
                  min="0"
                  max={book.pageCount}
                  bind:value={page}
                  onchange={save}
                  aria-label={t('current.myProgress')}
                  data-testid="page-slider"
                />
                {#each book.goals ?? [] as g (g.id)}
                  <span
                    class="flag"
                    class:hit={page >= g.page}
                    style:left="{Math.min(100, (g.page / book.pageCount) * 100)}%"
                    title={t('goals.item', { date: shortDay(g.date, locale()), page: g.page })}
                  ></span>
                {/each}
              </div>
            {/if}
            <div class="p-row">
              <label class="page-input">
                <span>{t('current.page')}</span>
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max={book.pageCount || 20000}
                  bind:value={page}
                  onchange={save}
                  onkeydown={(e) => e.key === 'Enter' && save()}
                  data-testid="page-input"
                />
                {#if book.pageCount}<span class="of">{t('current.ofPages', { n: book.pageCount })}</span>{/if}
              </label>
              {#key savedFlash}
                {#if savedFlash}
                  <span class="saved" in:fly={{ y: 6, duration: 300 }}><Icon name="check" size={15} stroke={3} /></span>
                {/if}
              {/key}
              <button class="btn btn-primary" type="button" onclick={finish} data-testid="mark-read">
                <Icon name="check" size={18} stroke={2.6} />
                {t('current.markRead')}
              </button>
            </div>
            {#if !book.pageCount}
              <form class="pages-form" onsubmit={setPages}>
                <span>{t('current.pageCountMissing')}</span>
                <input type="number" min="1" bind:value={pagesInput} placeholder="350" />
                <button class="btn btn-sm" type="submit">{t('current.setPages')}</button>
              </form>
            {/if}
          {/if}
        </div>

        <GoalList {book} />
      </div>
    {:else}
      <div class="none" in:fade>
        <div class="none-art" aria-hidden="true">
          <span class="b b1"></span><span class="b b2"></span><span class="b b3"></span>
        </div>
        <p class="eyebrow">{t('current.eyebrow')}</p>
        <h2 class="none-title">{t('current.none')}</h2>
        <p class="none-hint">{t('current.noneHint')}</p>
        <a class="btn" href="#wheel"><Icon name="spin" size={17} /> {t('wheel.spin')}</a>
      </div>
    {/if}
  {/key}
</section>

<style>
  .current {
    padding: clamp(20px, 3.5vw, 30px);
    overflow: hidden;
    min-height: 100%;
  }
  .halo {
    position: absolute;
    width: 420px;
    height: 420px;
    left: -140px;
    top: -170px;
    background: radial-gradient(closest-side, color-mix(in srgb, var(--g) 32%, transparent), transparent);
    pointer-events: none;
    animation: breathe 7s ease-in-out infinite alternate;
  }
  @keyframes breathe {
    to {
      transform: scale(1.15) translate(20px, 10px);
    }
  }
  .inner {
    position: relative;
  }
  .top {
    display: grid;
    grid-template-columns: minmax(110px, 170px) 1fr;
    gap: clamp(16px, 3vw, 26px);
    align-items: start;
  }
  .cover-tilt {
    border-radius: 6px;
    will-change: transform;
    animation: float 6s ease-in-out infinite;
  }
  @keyframes float {
    50% {
      translate: 0 -6px;
    }
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 var(--accent);
    animation: ping 2s ease-out infinite;
  }
  @keyframes ping {
    70% {
      box-shadow: 0 0 0 9px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
  .title {
    font-size: clamp(26px, 3.6vw, 36px);
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .author {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    color: var(--ink-soft);
    margin-top: 4px;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 14px;
  }
  .picked {
    margin-top: 12px;
    font-size: 13px;
    color: var(--ink-faint);
  }
  .next-goal {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    padding: 12px 14px;
    border-radius: 16px;
    background: linear-gradient(120deg, var(--accent-soft), color-mix(in srgb, var(--gold-soft) 70%, transparent));
    border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .ng-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: var(--card);
    color: var(--accent);
    box-shadow: var(--shadow-sm);
  }
  .ng-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .ng-text {
    font-weight: 800;
    font-size: 16px;
  }
  .ng-due {
    font-family: var(--font-mono);
    font-size: 12.5px;
    font-weight: 500;
    background: var(--card);
    padding: 4px 10px;
    border-radius: 999px;
  }
  .progress {
    margin-top: 22px;
  }
  .p-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .label {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .pct {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 22px;
    color: var(--accent);
  }
  .range {
    position: relative;
    height: 28px;
    margin-bottom: 8px;
  }
  .range input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 28px;
    background: transparent;
    margin: 0;
    position: relative;
    z-index: 2;
    cursor: pointer;
  }
  .range::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 10px;
    height: 8px;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--accent) 0 var(--p), var(--line) var(--p) 100%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
    transition: background 0.2s;
  }
  .range input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--card);
    border: 3px solid var(--accent);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
    transition: transform 0.2s var(--ease-spring);
  }
  .range input:active::-webkit-slider-thumb {
    transform: scale(1.2);
  }
  .range input::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--card);
    border: 3px solid var(--accent);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  }
  .range input::-moz-range-track {
    background: transparent;
  }
  .flag {
    position: absolute;
    top: 4px;
    width: 3px;
    height: 20px;
    margin-left: -1.5px;
    border-radius: 2px;
    background: var(--gold);
    z-index: 1;
    pointer-events: none;
  }
  .flag::after {
    content: '';
    position: absolute;
    top: -6px;
    left: 1px;
    border-left: 9px solid var(--gold);
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }
  .flag.hit {
    background: var(--green);
  }
  .flag.hit::after {
    border-left-color: var(--green);
  }
  .p-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .page-input {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 14px;
    color: var(--ink-soft);
    margin-right: auto;
  }
  .page-input input {
    width: 92px;
    text-align: center;
    font-family: var(--font-mono);
    font-weight: 500;
  }
  .of {
    font-weight: 500;
  }
  .saved {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--green-soft);
    color: var(--green);
  }
  .pages-form {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    flex-wrap: wrap;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .pages-form input {
    width: 100px;
  }
  .finished {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 14px;
    border-radius: 16px;
    background: var(--green-soft);
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 800;
    color: var(--green);
  }
  .mine-rating {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .linkish {
    background: none;
    border: none;
    padding: 0;
    color: var(--ink-soft);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    font-size: 13px;
    margin-left: auto;
  }
  .none {
    position: relative;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 380px;
    padding: 20px;
  }
  .none-title {
    font-size: 28px;
  }
  .none-hint {
    color: var(--ink-soft);
    max-width: 34ch;
    margin-bottom: 8px;
  }
  .none-art {
    display: flex;
    align-items: end;
    gap: 6px;
    height: 96px;
    margin-bottom: 10px;
  }
  .b {
    width: 26px;
    border-radius: 3px 3px 2px 2px;
    box-shadow: var(--shadow-sm);
    animation: bob 3s ease-in-out infinite;
  }
  .b1 {
    height: 78px;
    background: #8c2f45;
  }
  .b2 {
    height: 92px;
    background: #c1902f;
    animation-delay: -1s;
  }
  .b3 {
    height: 70px;
    background: #2f6f73;
    transform: rotate(10deg);
    transform-origin: bottom left;
    animation-delay: -2s;
  }
  @keyframes bob {
    50% {
      translate: 0 -5px;
    }
  }
  @media (max-width: 520px) {
    .top {
      grid-template-columns: 110px 1fr;
    }
    .author {
      font-size: 16px;
    }
  }
</style>
