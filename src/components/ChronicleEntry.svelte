<script>
  import { slide, fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import Avatar from './Avatar.svelte';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import Menu from './Menu.svelte';
  import Stars from './Stars.svelte';
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
    const ok = await confirmDialog(`${t('chron.backToShelf')}: „${book.title}“?`, { confirmLabel: t('chron.backToShelf') });
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
          <span class="now-badge"><span class="pulse"></span>{t('chron.current')}</span>
        {/if}
        <h3>{book.title}</h3>
        <p class="author">{book.author}</p>
      </div>
      <Menu label="…" testid="entry-menu">
        {#snippet trigger()}
          <span class="btn btn-ghost btn-icon btn-sm"><Icon name="more" size={18} /></span>
        {/snippet}
        {#snippet children(close)}
          {#if !isCurrent}
            <button class="mi" role="menuitem" data-close onclick={() => club.setCurrent(book)}><Icon name="book" size={16} />{t('chron.setCurrent')}</button>
          {/if}
          <button class="mi" role="menuitem" data-close onclick={() => (monthOpen = true)}><Icon name="calendar" size={16} />{t('chron.moveMonth')}</button>
          <button class="mi" role="menuitem" data-close onclick={() => (ui.bookForm = { mode: 'edit', bookId: book.id })}><Icon name="edit" size={16} />{t('common.edit')}</button>
          <div class="sep"></div>
          <button class="mi danger" role="menuitem" data-close onclick={backToShelf}><Icon name="undo" size={16} />{t('chron.backToShelf')}</button>
        {/snippet}
      </Menu>
    </div>

    <div class="c-meta">
      <span class="chip"><span class="dot" style:background={genreSwatch(book.genre)}></span>{genreById(book.genre).label}</span>
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
      {#if s.complete}
        <div class="avg" in:scale={{ start: 0.8, duration: 600, easing: backOut }} data-testid="avg-rating">
          <Stars value={s.average} size={24} animate label={t('chron.avg', { value: formatAverage(s.average) })} />
          <span class="avg-num">{formatAverage(s.average)}</span>
          <span class="avg-of">{t('chron.avg', { value: formatAverage(s.average) })} · {t('chron.votes', { n: s.ratedCount, m: s.expectedCount })}</span>
        </div>
      {:else}
        <div class="sealed">
          <span class="env" aria-hidden="true"><Icon name="envelope" size={18} /></span>
          <div class="sealed-text">
            <p class="votes">{t('chron.votes', { n: s.ratedCount, m: s.expectedCount })}</p>
            <div class="voters">
              {#each club.sortedMembers.filter((m) => ratedIds.has(m.id) || s.pending.some((p) => p.id === m.id)) as m (m.id)}
                <span class="voter" class:done={ratedIds.has(m.id)} title={m.name}>
                  <Avatar member={m} size={24} />
                  {#if ratedIds.has(m.id)}<span class="tick"><Icon name="check" size={9} stroke={4} /></span>{/if}
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
        <span class="my-rating"><Stars value={mine.rating} size={15} label={t('review.star', { n: mine.rating })} /></span>
        <button class="btn btn-ghost btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })}>
          <Icon name="edit" size={14} />{t('chron.editRating')}
        </button>
      {:else}
        <button class="btn btn-gold btn-sm" type="button" onclick={() => (ui.review = { bookId: book.id })} data-testid="chron-rate">
          <Icon name="sparkles" size={15} />{t('chron.rate')}
        </button>
      {/if}
      {#if s.complete && reviews.length}
        <button class="btn btn-ghost btn-sm" type="button" onclick={() => (open = !open)} aria-expanded={open}>
          <Icon name={open ? 'eye' : 'eye'} size={15} />{open ? t('chron.hideReviews') : t('chron.showReviews')}
        </button>
      {:else if !s.complete && s.ratedCount}
        <span class="hint"><Icon name="lock" size={13} /> {t('chron.sealed')}</span>
      {/if}
    </div>

    {#if open && s.complete}
      <ul class="reviews" transition:slide={{ duration: 320 }}>
        {#each reviews as r, i (r.uid)}
          <li in:fly={{ y: 10, delay: 60 * i }}>
            <Avatar member={r.member} size={30} />
            <div>
              <p class="r-head"><strong>{r.member.name}</strong> <Stars value={r.rating} size={13} /></p>
              <p class="r-text" class:muted={!r.review}>{r.review || t('chron.noText')}</p>
            </div>
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
    grid-template-columns: 96px 1fr;
    gap: 18px;
    padding: 18px;
    border-radius: 22px;
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-md);
  }
  .entry.current {
    border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--accent-soft) 70%, transparent),
      var(--shadow-md);
  }
  .c-cover {
    border-radius: 6px;
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
  }
  .c-titles {
    min-width: 0;
  }
  h3 {
    font-size: 21px;
    font-weight: 700;
  }
  .author {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--ink-soft);
  }
  .now-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: blink 1.4s ease-in-out infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.25;
    }
  }
  .c-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
  }
  .picked {
    font-size: 12.5px;
    color: var(--ink-faint);
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
    margin-top: 14px;
  }
  .avg {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
  }
  .avg-num {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
    color: color-mix(in srgb, var(--gold) 75%, var(--ink));
  }
  .avg-of {
    font-size: 12.5px;
    color: var(--ink-soft);
    width: 100%;
  }
  .sealed {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-radius: 14px;
    background: repeating-linear-gradient(-45deg, transparent 0 10px, color-mix(in srgb, var(--gold-soft) 45%, transparent) 10px 20px), var(--card-2);
    border: 1px dashed var(--line-strong);
  }
  .env {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: var(--card);
    color: var(--gold);
    flex: none;
    box-shadow: var(--shadow-sm);
    animation: wiggle 4s ease-in-out infinite;
  }
  @keyframes wiggle {
    0%,
    86%,
    100% {
      transform: rotate(0);
    }
    90% {
      transform: rotate(-9deg);
    }
    95% {
      transform: rotate(7deg);
    }
  }
  .votes {
    font-weight: 800;
    font-size: 14px;
  }
  .voters {
    display: flex;
    gap: 4px;
    margin: 6px 0 4px;
    flex-wrap: wrap;
  }
  .voter {
    position: relative;
    opacity: 0.4;
    filter: grayscale(0.7);
    transition:
      opacity 0.3s,
      filter 0.3s;
  }
  .voter.done {
    opacity: 1;
    filter: none;
  }
  .tick {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
    display: grid;
    place-items: center;
    box-shadow: 0 0 0 2px var(--card);
  }
  .waiting {
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .c-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
  }
  .my-rating {
    display: inline-flex;
  }
  .hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    color: var(--ink-faint);
  }
  .reviews {
    list-style: none;
    margin: 14px 0 0;
    padding: 14px 0 0;
    border-top: 1px dashed var(--line);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .reviews li {
    display: flex;
    gap: 10px;
  }
  .r-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  .r-text {
    font-size: 14.5px;
    line-height: 1.5;
    margin-top: 2px;
  }
  .r-text.muted {
    color: var(--ink-faint);
    font-style: italic;
  }
  @media (max-width: 520px) {
    .entry {
      grid-template-columns: 72px 1fr;
      gap: 14px;
      padding: 14px;
    }
    h3 {
      font-size: 18px;
    }
  }
</style>
