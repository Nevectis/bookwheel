<script>
  import { slide, fly, scale } from '../lib/motion.js';
  import { cubicOut } from 'svelte/easing';
  import Avatar from './Avatar.svelte';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import Menu from './Menu.svelte';
  import Stars from './Stars.svelte';
  import WaxSeal from './WaxSeal.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t, locale, listNames, formatAverage } from '../lib/i18n.svelte.js';
  import { genreById, genreSwatch } from '../lib/genres.js';
  import { monthLabel, monthOptions } from '../lib/dates.js';
  import { tilt } from '../lib/actions.js';
  import { confirmDialog, ui } from '../lib/ui.svelte.js';

  let { book } = $props();

  const s = $derived(club.summary(book));
  const mine = $derived(club.entry(book.id));
  const isCurrent = $derived(club.current?.id === book.id);
  const ratedIds = $derived(new Set(s.ratings.map((r) => r.uid)));
  let open = $state(false);
  let monthOpen = $state(false);

  const reviews = $derived(
    s.ratings
      .map((r) => ({ ...r, member: club.member(r.uid) ?? { id: r.uid, name: r.name || '?', color: '#9a8b7d' } }))
      .sort((a, b) => b.rating - a.rating),
  );

  async function backToShelf() {
    const ok = await confirmDialog(t('chron.backToShelfConfirm', { title: book.title }), { confirmLabel: t('chron.backToShelf') });
    if (ok) club.unpick(book).catch(() => {});
  }
</script>

<article class="entry" class:current={isCurrent} data-testid="chronicle-entry">
  <div class="c-cover" use:tilt={{ max: 8 }}>
    <BookCover {book} />
  </div>

  <div class="c-body">
    <div class="c-top">
      <div class="c-titles">
        {#if isCurrent}
          <span class="now-badge">{t('chron.current')}</span>
        {/if}
        <h3>{book.title}</h3>
        <p class="author">{book.author}</p>
      </div>
      <Menu label={t('chron.options', { title: book.title })} testid="entry-menu">
        {#snippet trigger()}
          <span class="btn btn-ghost btn-icon btn-sm"><Icon name="more" size={18} stroke={1.6} /></span>
        {/snippet}
        {#snippet children(close)}
          {#if !isCurrent}
            <button class="mi" data-close onclick={() => club.setCurrent(book)}><Icon name="book" size={16} />{t('chron.setCurrent')}</button>
          {/if}
          <button class="mi" data-close onclick={() => (monthOpen = true)}><Icon name="calendar" size={16} />{t('chron.moveMonth')}</button>
          <button class="mi" data-close onclick={() => (ui.bookForm = { mode: 'edit', bookId: book.id })}><Icon name="edit" size={16} />{t('common.edit')}</button>
          <div class="sep"></div>
          <button class="mi danger" data-close onclick={backToShelf}><Icon name="undo" size={16} />{t('chron.backToShelf')}</button>
        {/snippet}
      </Menu>
    </div>

    <div class="c-meta">
      <span class="genre"><span class="dot" style:background={genreSwatch(book.genre)}></span>{genreById(book.genre).label}</span>
      <span class="picked">{t('chron.pickedBy', { name: club.nameOf(book.pickedBy, book.pickedByName) })}</span>
    </div>

    {#if monthOpen}
      <label class="month-edit" transition:slide={{ duration: 200 }}>
        <Icon name="calendar" size={15} />
        <select
          value={book.month}
          onchange={(e) => {
            club.setMonth(book, e.currentTarget.value);
            monthOpen = false;
          }}
        >
          {#each monthOptions(book.month, 12, 6) as m}
            <option value={m}>{monthLabel(m, locale())}</option>
          {/each}
        </select>
        <button class="btn btn-ghost btn-icon btn-sm" type="button" aria-label={t('common.close')} onclick={() => (monthOpen = false)}><Icon name="x" size={14} /></button>
      </label>
    {/if}

    <div class="rating">
      {#if s.revealed}
        <div class="avg" in:scale={{ start: 0.9, duration: 700, easing: cubicOut }} data-testid="avg-rating">
          <span class="avg-num">{formatAverage(s.average)}</span>
          <div class="avg-side">
            <Stars value={s.average} size={20} animate label={t('chron.avg', { value: formatAverage(s.average) })} />
            <span class="avg-of">{t('chron.votes', { n: s.ratedCount, m: s.expectedCount })}</span>
          </div>
        </div>
      {:else}
        <div class="sealed" data-testid="sealed">
          <WaxSeal size={48} />
          <div class="sealed-text">
            <p class="votes">{t('chron.votes', { n: s.ratedCount, m: s.expectedCount })}</p>
            {#if s.ratedCount}<p class="seal-note">{t('chron.sealed')}</p>{/if}
            <div class="voters">
              {#each club.sortedMembers.filter((m) => ratedIds.has(m.id) || s.pending.some((p) => p.id === m.id)) as m (m.id)}
                <span class="voter" class:done={ratedIds.has(m.id)} title={m.name}>
                  <Avatar member={m} size={24} />
                  {#if ratedIds.has(m.id)}<span class="tick"><Icon name="check" size={9} stroke={3.4} /></span>{/if}
                </span>
              {/each}
            </div>
            {#if s.pending.length}
              <p class="waiting">{t('chron.waitingFor', { names: listNames(s.pending.map((m) => (m.id === club.user?.uid ? t('common.you') : m.name))) })}</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="c-actions">
      {#if mine?.rating}
        <span class="my-rating"><span class="my-label">{t('current.yourRating')}</span><Stars value={mine.rating} size={15} label={t('review.star', { n: mine.rating })} /></span>
        <button class="btn btn-ghost btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })}>
          <Icon name="edit" size={14} stroke={1.6} />{t('chron.editRating')}
        </button>
      {:else}
        <button class="btn btn-gold btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })} data-testid="chron-rate">
          <Icon name="sparkles" size={14} stroke={1.6} />{t('chron.rate')}
        </button>
      {/if}
      {#if s.revealed && reviews.length}
        <button class="btn btn-ghost btn-sm" type="button" onclick={() => (open = !open)} aria-expanded={open}>
          <Icon name="book" size={14} stroke={1.6} />{open ? t('chron.hideReviews') : t('chron.showReviews')}
        </button>
      {/if}
    </div>

    {#if open && s.revealed}
      <ul class="reviews" transition:slide={{ duration: 320 }}>
        {#each reviews as r, i (r.uid)}
          <li in:fly={{ y: 10, delay: 60 * i }}>
            <p class="r-text" class:muted={!r.review}>{r.review || t('chron.noText')}</p>
            <p class="r-head"><Avatar member={r.member} size={22} /><strong>{r.member.name}</strong> <Stars value={r.rating} size={14} /></p>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</article>

<style>
  .entry {
    position: relative;
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr);
    gap: 22px;
    padding: 22px 22px 20px;
    border-radius: 10px;
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-sm);
  }
  .entry.current::after {
    content: '';
    position: absolute;
    top: -1px;
    right: 26px;
    width: 12px;
    height: 44px;
    background: linear-gradient(90deg, #4f161e, #7b2a33 40%, #9c3f49 52%, #7b2a33 64%, #4a141c);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 7px), 0 100%);
  }
  .c-cover {
    border-radius: 4px;
    align-self: start;
  }
  .c-body {
    min-width: 0;
  }
  .c-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
    padding-right: 24px;
  }
  .c-titles {
    min-width: 0;
  }
  h3 {
    font-size: 27px;
    font-weight: 600;
    line-height: 1.05;
  }
  .author {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    color: var(--ink-soft);
    margin-top: 2px;
  }
  .now-badge {
    display: inline-block;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--oxblood);
    margin-bottom: 6px;
  }
  .c-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    margin-top: 10px;
  }
  .genre {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .picked {
    font-size: 13.5px;
    color: var(--ink-soft);
    overflow-wrap: anywhere;
  }
  .month-edit {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
  }
  .month-edit select {
    width: auto;
    padding: 6px 10px;
  }
  .rating {
    margin-top: 16px;
  }
  .avg {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .avg-num {
    font-family: var(--font-display);
    font-size: 54px;
    font-weight: 500;
    line-height: 0.8;
    color: var(--ink);
    font-variant-numeric: oldstyle-nums;
  }
  .avg-side {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .avg-of {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .sealed {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px dashed var(--line-strong);
    background: color-mix(in srgb, var(--paper) 60%, var(--card));
  }
  .votes {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 19px;
  }
  .voters {
    display: flex;
    gap: 5px;
    margin: 6px 0 4px;
    flex-wrap: wrap;
  }
  /* still to rate: greyed, with a dashed ring, but still legible */
  .voter {
    position: relative;
    border-radius: 50%;
    opacity: 0.7;
    filter: grayscale(0.7);
    outline: 1.5px dashed var(--ink-faint);
    outline-offset: 1px;
    transition:
      opacity 0.3s,
      filter 0.3s;
  }
  .voter.done {
    opacity: 1;
    filter: none;
    outline: none;
  }
  .tick {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--green);
    color: var(--card);
    display: grid;
    place-items: center;
    box-shadow: 0 0 0 2px var(--card);
  }
  .waiting {
    font-size: 13.5px;
    color: var(--ink-soft);
  }
  .seal-note {
    font-size: 14px;
    color: var(--ink);
    margin: 2px 0 2px;
  }
  .c-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin-top: 16px;
  }
  .my-rating {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .my-label {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .reviews {
    list-style: none;
    margin: 18px 0 0;
    padding: 18px 0 0;
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .reviews li {
    padding-left: 16px;
    border-left: 2px solid var(--gold-2);
  }
  .r-text {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    line-height: 1.4;
  }
  .r-text {
    quotes: auto;
  }
  .r-text::before {
    content: open-quote;
  }
  .r-text::after {
    content: close-quote;
  }
  .r-text.muted::before,
  .r-text.muted::after {
    content: none;
  }
  .r-text.muted {
    color: var(--ink-soft);
    font-size: 17px;
  }
  .r-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 12.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .r-head strong {
    font-weight: 500;
  }
  @media (max-width: 560px) {
    .entry {
      grid-template-columns: 66px minmax(0, 1fr);
      gap: 6px 14px;
      padding: 16px;
    }
    /* cover + titles share the first row; the rest spans the card */
    .c-body {
      display: contents;
    }
    .c-cover {
      grid-row: 1 / span 2;
    }
    .c-top,
    .c-meta {
      grid-column: 2;
    }
    .month-edit,
    .rating,
    .c-actions,
    .reviews {
      grid-column: 1 / -1;
    }
    h3 {
      font-size: 22px;
    }
    .avg-num {
      font-size: 44px;
    }
  }
</style>
