<script>
  import { flip } from 'svelte/animate';
  import { fly, scale } from 'svelte/transition';
  import { backOut, cubicIn } from 'svelte/easing';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { genreById, genreSwatch } from '../lib/genres.js';
  import { reveal } from '../lib/actions.js';
  import { ui } from '../lib/ui.svelte.js';

  let query = $state('');
  const q = $derived(query.trim().toLowerCase());
  const books = $derived(
    q
      ? club.shelf.filter((b) => `${b.title} ${b.author} ${genreById(b.genre).label}`.toLowerCase().includes(q))
      : club.shelf,
  );
</script>

<section id="shelf" class="shelf-section" aria-labelledby="shelf-title">
  <div class="section-head" use:reveal>
    <div>
      <p class="eyebrow">{t('shelf.count', { n: club.shelf.length })}</p>
      <h2 id="shelf-title" class="section-title">{t('shelf.title')}</h2>
      <p class="section-sub">{t('shelf.sub')}</p>
    </div>
    <div class="tools">
      <label class="search">
        <Icon name="search" size={17} />
        <input type="search" bind:value={query} placeholder={t('shelf.search')} aria-label={t('shelf.search')} />
      </label>
      <button class="btn btn-primary" type="button" onclick={() => (ui.bookForm = { mode: 'add' })} data-testid="add-book">
        <Icon name="plus" size={18} stroke={2.6} />
        {t('shelf.add')}
      </button>
    </div>
  </div>

  <div class="case" use:reveal={100}>
    {#if !club.shelf.length}
      <div class="empty">
        <p>{t('shelf.empty')}</p>
        <button class="btn btn-primary" type="button" onclick={() => (ui.bookForm = { mode: 'add' })}>
          <Icon name="plus" size={18} />{t('shelf.add')}
        </button>
      </div>
    {:else if !books.length}
      <p class="empty">{t('shelf.noMatch')}</p>
    {:else}
      <ul class="grid" data-testid="shelf">
        {#each books as book (book.id)}
          <li
            class="book"
            animate:flip={{ duration: 450 }}
            in:fly={{ y: -60, duration: 700, easing: backOut }}
            out:scale={{ start: 0.6, duration: 280, easing: cubicIn }}
          >
            <button class="cover-btn" type="button" onclick={() => (ui.bookForm = { mode: 'edit', bookId: book.id })} aria-label="{t('common.edit')}: {book.title}">
              <span class="lift"><BookCover {book} /></span>
              <span class="edit-badge" aria-hidden="true"><Icon name="edit" size={14} /></span>
            </button>
            <span class="plank" aria-hidden="true"></span>
            <h3 class="b-title" title={book.title}>{book.title}</h3>
            <p class="b-author">{book.author}</p>
            <p class="b-meta">
              <span class="dot" style:background={genreSwatch(book.genre)}></span>
              <span class="g">{genreById(book.genre).label}</span>
            </p>
            <p class="b-by">{t('shelf.addedBy', { name: club.nameOf(book.addedBy, book.addedByName) })}</p>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  .tools {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .search {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search :global(svg) {
    position: absolute;
    left: 13px;
    color: var(--ink-faint);
    pointer-events: none;
  }
  .search input {
    padding-left: 38px;
    border-radius: 999px;
    width: 240px;
  }
  .case {
    position: relative;
    border-radius: 26px;
    padding: clamp(18px, 3vw, 30px) clamp(14px, 3vw, 30px) 10px;
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.04), transparent 30%),
      var(--paper-2);
    border: 1px solid var(--line);
    box-shadow: inset 0 2px 12px rgba(60, 35, 15, 0.08);
  }
  .empty {
    text-align: center;
    padding: 40px 10px;
    color: var(--ink-soft);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 26px 22px;
  }
  .book {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .cover-btn {
    position: relative;
    display: block;
    padding: 0 8% 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 8px;
    z-index: 1;
  }
  .lift {
    display: block;
    transform-origin: 50% 100%;
    transition: transform 0.35s var(--ease-spring);
  }
  .cover-btn:hover .lift,
  .cover-btn:focus-visible .lift {
    transform: translateY(-10px) rotate(-2deg);
  }
  .edit-badge {
    position: absolute;
    top: 8px;
    right: calc(8% + 6px);
    z-index: 4;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--card);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
    opacity: 0;
    transform: scale(0.6);
    transition:
      opacity 0.2s,
      transform 0.3s var(--ease-spring);
  }
  .cover-btn:hover .edit-badge,
  .cover-btn:focus-visible .edit-badge {
    opacity: 1;
    transform: translateY(-10px) scale(1);
  }
  .plank {
    display: block;
    height: 13px;
    margin: -3px -12px 12px;
    border-radius: 3px;
    background:
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.05) 0 2px, transparent 2px 31px),
      linear-gradient(180deg, var(--wood-1), var(--wood-2));
    box-shadow:
      0 8px 12px -6px rgba(50, 25, 5, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
  .b-title {
    font-size: 15.5px;
    font-weight: 700;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .b-author {
    font-size: 13.5px;
    color: var(--ink-soft);
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .b-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 7px;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-soft);
    min-width: 0;
  }
  .g {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .b-by {
    font-size: 11.5px;
    color: var(--ink-faint);
    margin-top: 2px;
  }
  @media (max-width: 640px) {
    .tools,
    .search,
    .search input {
      width: 100%;
    }
    .tools .btn {
      width: 100%;
    }
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
      gap: 22px 14px;
    }
    .b-title {
      font-size: 14px;
    }
  }
</style>
