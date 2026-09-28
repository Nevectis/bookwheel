<script>
  import { untrack } from 'svelte';
  import { fly, fade, slide } from 'svelte/transition';
  import Modal from './Modal.svelte';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { GENRES, genreSwatch, guessGenre } from '../lib/genres.js';
  import { compressImage, safeImageUrl, searchBooks } from '../lib/covers.js';
  import { googleBooksApiKey } from '../config.js';
  import { confirmDialog } from '../lib/ui.svelte.js';

  let { mode = 'add', bookId = null, onclose } = $props();

  // The form edits a copy of the book as it was when the dialog opened.
  const existing = untrack(() => (mode === 'edit' ? club.book(bookId) : null));
  let title = $state(existing?.title ?? '');
  let author = $state(existing?.author ?? '');
  let genre = $state(existing?.genre ?? '');
  let pageCount = $state(existing?.pageCount ?? '');
  let coverUrl = $state(existing?.coverUrl ?? '');
  let urlOpen = $state(false);
  let urlDraft = $state('');
  let error = $state('');
  let busy = $state(false);

  // lookup
  let lookup = $state('');
  let results = $state([]);
  let searching = $state(false);
  let searched = $state(false);
  let timer;
  let controller;

  function onLookup() {
    clearTimeout(timer);
    controller?.abort();
    const q = lookup.trim();
    if (q.length < 2) {
      results = [];
      searched = false;
      searching = false;
      return;
    }
    searching = true;
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        results = await searchBooks(q, { signal: controller.signal, apiKey: googleBooksApiKey });
        searched = true;
      } catch {
        /* aborted or offline */
      } finally {
        searching = false;
      }
    }, 380);
  }

  function choose(r) {
    title = r.title;
    author = r.author;
    if (r.coverUrl) coverUrl = r.coverUrl;
    if (r.pageCount) pageCount = r.pageCount;
    if (!genre) genre = guessGenre(r.categories) ?? '';
    results = [];
    lookup = '';
    searched = false;
    error = '';
  }

  async function upload(e) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      coverUrl = await compressImage(file);
      error = '';
    } catch {
      error = t('add.coverError');
    }
  }

  function applyUrl() {
    const safe = safeImageUrl(urlDraft);
    if (!safe || safe.startsWith('data:')) {
      error = t('add.badUrl');
      return;
    }
    coverUrl = safe;
    urlDraft = '';
    urlOpen = false;
    error = '';
  }

  const preview = $derived({ title: title || '…', author: author || '', genre: genre || 'literary-fiction', coverUrl });

  async function submit(e) {
    e.preventDefault();
    error = '';
    if (!title.trim() || !author.trim()) return (error = t('add.needTitle'));
    if (!genre) return (error = t('add.needGenre'));
    const pages = Math.floor(Number(pageCount));
    const data = {
      title,
      author,
      genre,
      coverUrl: safeImageUrl(coverUrl) || null,
      pageCount: Number.isFinite(pages) && pages > 0 ? pages : null,
    };
    if (mode === 'add') {
      const norm = (s) => s.trim().toLowerCase();
      const dup = club.shelf.find((b) => norm(b.title) === norm(title) && norm(b.author) === norm(author));
      if (dup) return (error = t('add.duplicate', { title: dup.title }));
    }
    busy = true;
    try {
      if (mode === 'add') await club.addBook(data);
      else {
        await club.updateBook(bookId, {
          title: data.title.trim().slice(0, 200),
          author: data.author.trim().slice(0, 200),
          genre: data.genre,
          coverUrl: data.coverUrl,
          pageCount: data.pageCount,
        });
      }
      onclose();
    } catch {
      /* toast shown by the store */
    } finally {
      busy = false;
    }
  }

  async function remove() {
    const ok = await confirmDialog(`${t('edit.remove')}: „${existing.title}“?`, { confirmLabel: t('edit.remove'), danger: true });
    if (!ok) return;
    onclose();
    club.removeBook(existing).catch(() => {});
  }
</script>

<Modal {onclose} labelledby="bookform-title" size="lg">
  <h2 id="bookform-title" class="m-title">{mode === 'add' ? t('add.title') : t('edit.title')}</h2>

  {#if mode === 'add'}
    <div class="lookup">
      <label class="field">
        <span>{t('add.lookup')}</span>
        <div class="lookup-input">
          <Icon name="search" size={18} />
          <input
            type="search"
            bind:value={lookup}
            oninput={onLookup}
            placeholder={t('add.lookupPlaceholder')}
            autocomplete="off"
            data-testid="lookup"
          />
          {#if searching}<span class="spinner" aria-label={t('add.searching')}></span>{/if}
        </div>
      </label>
      <p class="hint">{t('add.lookupHint')}</p>
      {#if results.length}
        <ul class="results" transition:slide={{ duration: 250 }} data-testid="lookup-results">
          {#each results as r, i}
            <li in:fly={{ y: 8, delay: i * 40, duration: 260 }}>
              <button type="button" onclick={() => choose(r)}>
                <span class="r-cover"><BookCover book={{ ...r, genre: guessGenre(r.categories) ?? 'literary-fiction' }} shine={false} /></span>
                <span class="r-text">
                  <strong>{r.title}</strong>
                  <span>{r.author}{r.pageCount ? ` · ${t('current.pages', { n: r.pageCount })}` : ''}</span>
                </span>
                <Icon name="plus" size={18} />
              </button>
            </li>
          {/each}
        </ul>
      {:else if searched && !searching}
        <p class="hint" in:fade>{t('add.noResults')}</p>
      {/if}
    </div>
  {/if}

  <form class="form" onsubmit={submit}>
    <div class="cols">
      <div class="cover-col">
        <span class="label">{t('add.cover')}</span>
        <div class="cover-prev"><BookCover book={preview} /></div>
        <div class="cover-actions">
          <label class="btn btn-sm file-btn">
            <Icon name="upload" size={15} />{t('add.upload')}
            <input type="file" accept="image/*" onchange={upload} class="sr-only" />
          </label>
          <button type="button" class="btn btn-sm" onclick={() => (urlOpen = !urlOpen)}><Icon name="link" size={15} />{t('add.coverUrl')}</button>
          {#if coverUrl}
            <button type="button" class="btn btn-ghost btn-sm" onclick={() => (coverUrl = '')}><Icon name="trash" size={15} />{t('add.removeCover')}</button>
          {/if}
        </div>
        {#if urlOpen}
          <div class="url-row" transition:slide={{ duration: 200 }}>
            <input type="url" bind:value={urlDraft} placeholder="https://…" onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), applyUrl())} />
            <button type="button" class="btn btn-sm btn-primary" onclick={applyUrl}><Icon name="check" size={15} /></button>
          </div>
        {/if}
      </div>

      <div class="fields">
        <label class="field">
          <span>{t('add.bookTitle')}</span>
          <input type="text" bind:value={title} maxlength="200" required data-testid="book-title" />
        </label>
        <label class="field">
          <span>{t('add.author')}</span>
          <input type="text" bind:value={author} maxlength="200" required data-testid="book-author" />
        </label>
        <label class="field pages">
          <span>{t('add.pages')} <small>({t('common.optional')})</small></span>
          <input type="number" inputmode="numeric" min="1" max="20000" bind:value={pageCount} data-testid="book-pages" />
        </label>
      </div>
    </div>

    <fieldset class="genres">
      <legend class="label">{t('add.genre')}</legend>
      <div class="genre-grid">
        {#each GENRES as g (g.id)}
          <label class="gopt" class:on={genre === g.id} style:--gc={genreSwatch(g.id)}>
            <input type="radio" name="genre" value={g.id} bind:group={genre} class="sr-only" />
            <span class="dot" style:background={genreSwatch(g.id)}></span>
            {g.label}
          </label>
        {/each}
      </div>
    </fieldset>

    {#if error}<p class="form-error" role="alert" in:fly={{ y: -4 }}>{error}</p>{/if}

    <div class="actions">
      {#if mode === 'edit' && existing?.status === 'shelf'}
        <button type="button" class="btn btn-danger" onclick={remove}><Icon name="trash" size={16} />{t('edit.remove')}</button>
      {/if}
      <span class="spacer"></span>
      <button type="button" class="btn btn-ghost" onclick={onclose}>{t('common.cancel')}</button>
      <button type="submit" class="btn btn-primary" disabled={busy} data-testid="book-submit">
        {#if mode === 'add'}{t('add.submit')}{:else}{t('common.save')}{/if}
      </button>
    </div>
  </form>
</Modal>

<style>
  .m-title {
    font-size: 34px;
    font-weight: 500;
    margin: 0 40px 20px 0;
  }
  .lookup {
    padding: 16px 18px 14px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--paper-2) 60%, var(--card));
    border: 1px solid var(--line);
    margin-bottom: 24px;
  }
  .lookup-input {
    position: relative;
    display: flex;
    align-items: center;
  }
  .lookup-input :global(svg) {
    position: absolute;
    left: 13px;
    color: var(--ink-faint);
  }
  .lookup-input input {
    padding-left: 40px;
    padding-right: 40px;
    background: var(--card);
  }
  .spinner {
    position: absolute;
    right: 14px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--line);
    border-top-color: var(--gold);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .hint {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17.5px;
    color: var(--ink-soft);
    margin-top: 8px;
  }
  .results {
    list-style: none;
    margin: 10px 0 0;
    padding: 6px;
    background: var(--card);
    border-radius: 8px;
    border: 1px solid var(--line);
    max-height: 290px;
    overflow-y: auto;
    box-shadow: var(--shadow-md);
  }
  .results button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px;
    border: none;
    background: none;
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }
  .results button:hover,
  .results button:focus-visible {
    background: var(--card-2);
  }
  .results button > :global(svg) {
    color: var(--accent);
    flex: none;
  }
  .r-cover {
    width: 38px;
    flex: none;
  }
  .r-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .r-text strong {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .r-text span {
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .cols {
    display: grid;
    grid-template-columns: 170px 1fr;
    gap: 22px;
  }
  .cover-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cover-prev {
    width: 130px;
    transform: rotate(-2deg);
    margin: 4px 0 6px 6px;
  }
  .cover-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .file-btn {
    cursor: pointer;
  }
  .url-row {
    display: flex;
    gap: 6px;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .pages input {
    max-width: 140px;
  }
  .genres {
    border: none;
    padding: 0;
    margin: 0;
  }
  .genres legend {
    margin-bottom: 8px;
  }
  .genre-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .gopt {
    position: relative; /* keeps the visually hidden radio inside its label */
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 11px 6px 9px;
    border-radius: 4px;
    border: 1px solid var(--line-strong);
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-soft);
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s,
      color 0.2s;
  }
  .gopt:hover {
    border-color: var(--ink-faint);
    color: var(--ink);
  }
  .gopt:focus-within {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }
  .gopt.on {
    background: var(--gc);
    color: #fbf5ea;
    border-color: transparent;
  }
  .gopt.on .dot {
    background: #fbf5ea !important;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .spacer {
    flex: 1;
  }
  @media (max-width: 560px) {
    .cols {
      grid-template-columns: 1fr;
    }
    .cover-col {
      flex-direction: row;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .cover-col > .label {
      width: 100%;
    }
    .cover-prev {
      width: 96px;
    }
  }
</style>
