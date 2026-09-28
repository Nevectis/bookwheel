<script>
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import BookCover from './BookCover.svelte';
  import GoalList from './GoalList.svelte';
  import Icon from './Icon.svelte';
  import Stars from './Stars.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t, locale } from '../lib/i18n.svelte.js';
  import { genreById, genreSwatch } from '../lib/genres.js';
  import { daysUntil, isoDay, monthLabel, shortDay } from '../lib/dates.js';
  import { clampPage, nextGoal, percent } from '../lib/reading.js';
  import { scrollToSection, tilt } from '../lib/actions.js';
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

<section id="current" class="card page-rule current" aria-labelledby="current-title">
  {#key book?.id}
    {#if book}
      <div class="inner" in:fly={{ y: 18, duration: 700, easing: cubicOut }}>
        <p class="eyebrow top-line">
          <span>{t('current.eyebrow')}</span>
          {#if book.month}<span class="month">{monthLabel(book.month, locale())}</span>{/if}
        </p>
        <div class="top">
          <div class="cover-col">
            <div class="cover-tilt" use:tilt={{ max: 7 }}>
              <BookCover {book} />
            </div>
            <span class="ribbon" aria-hidden="true"></span>
          </div>
          <div class="info">
            <h2 id="current-title" class="title">{book.title}</h2>
            <p class="author">{t('current.by', { author: book.author })}</p>
            <dl class="facts">
              <div>
                <dt>{t('add.genre')}</dt>
                <dd><span class="dot" style:background={genreSwatch(book.genre)}></span>{genre.label}</dd>
              </div>
              {#if book.pageCount}
                <div>
                  <dt>{t('current.length')}</dt>
                  <dd>{t('current.pages', { n: book.pageCount })}</dd>
                </div>
              {/if}
              <div>
                <dt>{t('current.picked')}</dt>
                <dd>{club.nameOf(book.pickedBy, book.pickedByName)}, {shortDay(isoDay(new Date(book.pickedAt ?? Date.now())), locale())}</dd>
              </div>
            </dl>
          </div>
        </div>

        {#if next}
          <div class="next-goal" in:fade>
            <span class="ng-icon"><Icon name="flag" size={17} stroke={1.6} /></span>
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
            {#if book.pageCount}<span class="pct">{pct}<small>%</small></span>{/if}
          </div>

          {#if mine?.finished}
            <div class="finished" in:fly={{ y: 8 }}>
              <span class="badge"><Icon name="check" size={16} stroke={2.4} /> {t('current.finished')}</span>
              {#if mine.rating}
                <span class="mine-rating">
                  <Stars value={mine.rating} size={17} label={t('review.star', { n: mine.rating })} />
                </span>
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })}>
                  <Icon name="edit" size={14} stroke={1.6} />{t('current.editRating')}
                </button>
              {:else}
                <button class="btn btn-gold btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })} data-testid="rate-now">
                  <Icon name="sparkles" size={14} stroke={1.6} />{t('current.rateNow')}
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
                  ><span>{g.page}</span></span>
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
                  <span class="saved" in:fly={{ y: 6, duration: 300 }}><Icon name="check" size={14} stroke={2.4} /></span>
                {/if}
              {/key}
              <button class="btn btn-primary" type="button" onclick={finish} data-testid="mark-read">
                <Icon name="check" size={17} stroke={1.8} />
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
        <div class="stack" aria-hidden="true">
          <span class="b b1"></span><span class="b b2"></span><span class="b b3"></span>
        </div>
        <p class="eyebrow">{t('current.eyebrow')}</p>
        <h2 class="none-title">{t('current.none')}</h2>
        <p class="none-hint">{t('current.noneHint')}</p>
        <a class="btn" href="#wheel" onclick={(e) => scrollToSection(e, 'wheel')}><Icon name="spin" size={16} stroke={1.6} /> {t('wheel.spin')}</a>
      </div>
    {/if}
  {/key}
</section>

<style>
  .current {
    padding: clamp(24px, 3.6vw, 38px);
    min-height: 100%;
  }
  .inner {
    position: relative;
  }
  .top-line {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    margin-bottom: 22px;
    border-bottom: 1px solid var(--line);
  }
  .month {
    color: var(--oxblood);
  }
  .top {
    display: grid;
    grid-template-columns: minmax(110px, 168px) 1fr;
    gap: clamp(18px, 3vw, 30px);
    align-items: start;
  }
  .cover-col {
    position: relative;
  }
  .cover-tilt {
    position: relative;
    z-index: 1;
    border-radius: 4px;
    will-change: transform;
  }
  /* an oxblood ribbon bookmark hanging out of the book */
  .ribbon {
    position: absolute;
    top: -6px;
    right: 22%;
    width: 11px;
    height: calc(100% + 34px);
    z-index: 0;
    background: linear-gradient(90deg, #4f161e, #7b2a33 40%, #9c3f49 52%, #7b2a33 64%, #4a141c);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 8px), 0 100%);
    filter: drop-shadow(0 2px 2px rgba(40, 15, 10, 0.3));
    transform-origin: top;
    animation: sway 7s ease-in-out infinite;
  }
  @keyframes sway {
    50% {
      transform: rotate(1.4deg);
    }
  }
  .title {
    font-size: clamp(32px, 3.8vw, 44px);
    font-weight: 600;
    letter-spacing: -0.012em;
    line-height: 1;
  }
  .author {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 21px;
    color: var(--ink-soft);
    margin-top: 8px;
  }
  .facts {
    margin: 20px 0 0;
    display: grid;
    gap: 0;
    border-top: 1px solid var(--line);
  }
  .facts div {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 10px;
    align-items: baseline;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
  }
  dt {
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  dd {
    margin: 0;
    font-family: var(--font-display);
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .next-goal {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    margin-top: 26px;
    padding: 14px 16px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--oxblood-soft) 60%, var(--card));
    border: 1px solid color-mix(in srgb, var(--oxblood) 18%, transparent);
  }
  .ng-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: var(--oxblood);
    border: 1px solid color-mix(in srgb, var(--oxblood) 30%, transparent);
  }
  .ng-label {
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .ng-text {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 21px;
    line-height: 1.2;
  }
  .ng-due {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17px;
    color: var(--oxblood);
    white-space: nowrap;
  }
  .progress {
    margin-top: 28px;
  }
  .p-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }
  .label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .pct {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 36px;
    line-height: 1;
    font-variant-numeric: oldstyle-nums;
  }
  .pct small {
    font-size: 20px;
    margin-left: 2px;
    color: var(--ink-soft);
  }
  .range {
    position: relative;
    height: 44px;
    margin-bottom: 10px;
  }
  .range input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 26px;
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
    top: 12px;
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent) 0 var(--p), var(--line-strong) var(--p) 100%);
  }
  .range input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--card);
    border: 1.5px solid var(--accent);
    box-shadow:
      inset 0 0 0 3px var(--card),
      inset 0 0 0 8px var(--gold-2),
      0 2px 5px rgba(0, 0, 0, 0.22);
    transition: transform 0.2s var(--ease-out);
  }
  .range input:active::-webkit-slider-thumb {
    transform: scale(1.15);
  }
  .range input::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--gold-2);
    border: 2px solid var(--card);
    box-shadow: 0 0 0 1.5px var(--accent), 0 2px 5px rgba(0, 0, 0, 0.22);
  }
  .range input::-moz-range-track {
    background: transparent;
  }
  .flag {
    position: absolute;
    top: 18px;
    width: 1px;
    height: 10px;
    background: var(--gold);
    z-index: 1;
    pointer-events: none;
  }
  .flag span {
    position: absolute;
    top: 11px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-type);
    font-size: 10.5px;
    color: var(--ink-faint);
    white-space: nowrap;
  }
  .flag.hit {
    background: var(--green);
  }
  .flag.hit span {
    color: var(--green);
  }
  .p-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .page-input {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-right: auto;
    font-family: var(--font-display);
    font-size: 19px;
    color: var(--ink-soft);
  }
  .page-input input {
    width: 84px;
    text-align: center;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    padding: 4px 6px;
    border: none;
    border-bottom: 1.5px solid var(--line-strong);
    border-radius: 0;
    background: transparent;
    font-variant-numeric: oldstyle-nums;
  }
  .page-input input:focus {
    box-shadow: none;
    border-bottom-color: var(--gold);
  }
  .of {
    font-style: italic;
  }
  .saved {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--green) 40%, transparent);
    color: var(--green);
  }
  .pages-form {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    flex-wrap: wrap;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17px;
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
    padding: 14px 16px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--green-soft) 70%, var(--card));
    border: 1px solid color-mix(in srgb, var(--green) 20%, transparent);
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 20px;
    color: var(--green);
  }
  .mine-rating {
    display: inline-flex;
  }
  .linkish {
    background: none;
    border: none;
    padding: 0;
    color: var(--ink-soft);
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
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
    min-height: 420px;
    padding: 20px;
  }
  .none-title {
    font-size: 34px;
    font-weight: 500;
  }
  .none-hint {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    color: var(--ink-soft);
    max-width: 32ch;
    margin-bottom: 10px;
  }
  .stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    margin-bottom: 18px;
  }
  .b {
    height: 22px;
    border-radius: 3px;
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.12),
      inset 10px 0 0 -8px rgba(201, 166, 107, 0.8),
      inset -10px 0 0 -8px rgba(201, 166, 107, 0.8),
      var(--shadow-sm);
  }
  .b1 {
    width: 150px;
    background: #6f2a32;
    transform: translateX(-8px);
  }
  .b2 {
    width: 170px;
    background: #2d4a3e;
    transform: translateX(6px);
  }
  .b3 {
    width: 184px;
    background: #2b3a55;
  }
  @media (max-width: 520px) {
    .top {
      grid-template-columns: 112px 1fr;
      gap: 16px;
    }
    .author {
      font-size: 18px;
    }
    .facts div {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .next-goal {
      grid-template-columns: auto 1fr;
    }
    .ng-due {
      grid-column: 2;
    }
  }
</style>
