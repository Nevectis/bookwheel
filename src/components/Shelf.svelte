<script>
  import { flip } from 'svelte/animate';
  import { fly, scale } from 'svelte/transition';
  import { cubicIn, cubicOut } from 'svelte/easing';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { genreById, genreSwatch } from '../lib/genres.js';
  import { reveal } from '../lib/actions.js';
  import { ui } from '../lib/ui.svelte.js';

  let query = $state('');
  const q = $derived(query.trim().toLowerCase());
  // Real shelves hold books of different sizes: vary each cover a little, stably per book.
  function heightFor(id) {
    let h = 0;
    for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return 4 + (h % 9); // side padding 4–12 %
  }
  const titleWords = $derived(t('shelf.title').split(' '));
  const titleHead = $derived(titleWords.slice(0, -1).join(' '));
  const titleLast = $derived(titleWords.at(-1));
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
      <h2 id="shelf-title" class="section-title">{titleHead} <em>{titleLast}</em></h2>
      <p class="section-sub">{t('shelf.sub')}</p>
    </div>
    <div class="tools">
      <label class="search">
        <Icon name="search" size={16} stroke={1.6} />
        <input type="search" bind:value={query} placeholder={t('shelf.search')} aria-label={t('shelf.search')} />
      </label>
      <button class="btn btn-primary" type="button" onclick={() => (ui.bookForm = { mode: 'add' })} data-testid="add-book">
        <Icon name="plus" size={16} stroke={1.8} />
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
            in:fly={{ y: -40, duration: 800, easing: cubicOut }}
            out:scale={{ start: 0.6, duration: 280, easing: cubicIn }}
          >
            <button class="cover-btn" style:--pad="{heightFor(book.id)}%" type="button" onclick={() => (ui.bookForm = { mode: 'edit', bookId: book.id })} aria-label="{t('common.edit')}: {book.title}">
              <span class="lift"><BookCover {book} /></span>
              <span class="edit-badge" aria-hidden="true"><Icon name="edit" size={13} stroke={1.6} /></span>
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
    gap: 14px;
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
    left: 2px;
    color: var(--ink-faint);
    pointer-events: none;
  }
  .search input {
    width: 230px;
    padding: 8px 4px 8px 28px;
    border: none;
    border-bottom: 1px solid var(--line-strong);
    border-radius: 0;
    background: transparent;
    font-family: var(--font-display);
    font-size: 18px;
    font-style: italic;
  }
  .search input:focus {
    box-shadow: none;
    border-bottom-color: var(--gold);
    background: transparent;
  }
  /* the bookcase: a warm back panel, walnut shelves */
  .case {
    position: relative;
    border-radius: 6px;
    padding: clamp(26px, 3.5vw, 40px) clamp(18px, 3.2vw, 38px) 14px;
    background:
      linear-gradient(180deg, rgba(40, 22, 10, 0.12), transparent 22%),
      repeating-linear-gradient(90deg, rgba(90, 60, 30, 0.035) 0 2px, transparent 2px 9px),
      var(--wall);
    border: 1px solid var(--line-strong);
    box-shadow:
      inset 0 10px 24px -14px rgba(40, 22, 10, 0.45),
      inset 0 0 0 6px color-mix(in srgb, var(--wood-2) 22%, transparent),
      var(--shadow-sm);
  }
  .empty {
    text-align: center;
    padding: 46px 10px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 20px;
    color: var(--ink-soft);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
    gap: 30px 24px;
  }
  .book {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  /* every book gets the same slot; covers stand on its floor at their own size */
  .cover-btn {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    aspect-ratio: 1 / 1.38;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 6px;
    z-index: 1;
  }
  .lift {
    display: block;
    width: calc(100% - 2 * var(--pad, 9%));
    transition:
      transform 0.5s var(--ease-out),
      filter 0.5s var(--ease-out);
  }
  .cover-btn:hover .lift,
  .cover-btn:focus-visible .lift {
    transform: translateY(-10px);
    filter: drop-shadow(0 14px 12px rgba(40, 22, 10, 0.25));
  }
  .edit-badge {
    position: absolute;
    top: 8px;
    right: calc(var(--pad, 9%) + 7px);
    z-index: 4;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--card);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
    opacity: 0;
    transform: translateY(-4px);
    transition:
      opacity 0.3s,
      transform 0.5s var(--ease-out);
  }
  .cover-btn:hover .edit-badge,
  .cover-btn:focus-visible .edit-badge {
    opacity: 1;
    transform: translateY(-10px);
  }
  /* walnut shelf board with a lit front edge */
  .plank {
    display: block;
    height: 14px;
    margin: -4px -15px 14px;
    border-radius: 2px;
    background:
      linear-gradient(180deg, rgba(255, 230, 190, 0.28) 0 1px, transparent 1px 4px, rgba(0, 0, 0, 0.18) 100%),
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.07) 0 1px, transparent 1px 13px, rgba(255, 220, 170, 0.05) 13px 15px, transparent 15px 37px),
      linear-gradient(180deg, var(--wood-1), var(--wood-2));
    box-shadow: 0 10px 12px -8px rgba(30, 15, 5, 0.55);
  }
  .b-title {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.12;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .b-author {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 16px;
    color: var(--ink-soft);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .b-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-soft);
    min-width: 0;
  }
  .g {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .b-by {
    font-family: var(--font-type);
    font-size: 11px;
    color: var(--ink-faint);
    margin-top: 3px;
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
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 24px 14px;
    }
    .b-title {
      font-size: 16px;
    }
  }
</style>
