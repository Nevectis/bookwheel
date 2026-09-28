<script>
  import { onMount } from 'svelte';
  import { fly } from '../lib/motion.js';
  import { cubicOut } from 'svelte/easing';
  import { goldLeaf } from '../lib/goldleaf.js';
  import Modal from './Modal.svelte';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t, locale } from '../lib/i18n.svelte.js';
  import { genreById, genreSwatch } from '../lib/genres.js';
  import { monthLabel, monthOptions } from '../lib/dates.js';
  import { prefersReducedMotion } from '../lib/ui.svelte.js';

  let { bookId, byName = null, onclose } = $props();

  const book = $derived(club.book(bookId));
  const genre = $derived(genreById(book?.genre));
  const months = $derived(monthOptions(undefined, 2, 8, book?.month));
  let canvas = $state();
  let undoing = $state(false);

  // Close if the pick is undone elsewhere. Only after we've seen it picked:
  // right after a spin the listener may not have delivered the pick yet.
  let seenPicked = false;
  $effect(() => {
    if (book?.status === 'picked') seenPicked = true;
    else if (seenPicked) onclose();
  });

  onMount(() => {
    if (prefersReducedMotion() || !canvas) return;
    return goldLeaf(canvas);
  });

  async function undo() {
    undoing = true;
    try {
      await club.unpick(book);
      onclose();
    } catch {
      undoing = false;
    }
  }
</script>

<Modal {onclose} labelledby="result-title" size="lg" variant="bare" returnFocus="[data-testid='spin']">
  {#snippet backdrop()}
    <canvas class="confetti" bind:this={canvas} aria-hidden="true"></canvas>
  {/snippet}
  {#if book}
    <div class="plate" data-testid="spin-result">
      <div class="endpaper" aria-hidden="true">
        <div class="flip">
          <BookCover {book} />
        </div>
      </div>
      <div class="leaf">
        <p class="eyebrow">{byName ? t('result.byOther', { name: byName }) : t('result.eyebrow')}</p>
        <div class="exlibris" in:fly={{ y: 10, delay: 300, duration: 700, easing: cubicOut }}>
          <span class="ex">Ex Libris</span>
          <span class="club">{club.meta?.name ?? 'Bookwheel'}</span>
        </div>
        <h2 id="result-title" class="title" in:fly={{ y: 14, delay: 480, duration: 800, easing: cubicOut }}>{book.title}</h2>
        <p class="author" in:fly={{ y: 10, delay: 580, duration: 800, easing: cubicOut }}>{t('current.by', { author: book.author })}</p>
        <p class="meta" in:fly={{ y: 8, delay: 680, duration: 800, easing: cubicOut }}>
          <span class="genre"><span class="dot" style:background={genreSwatch(book.genre)}></span>{genre.label}</span>
          {#if book.pageCount}<span class="sep">·</span><span>{t('result.pages', { n: book.pageCount })}</span>{/if}
        </p>

        <label class="month" in:fly={{ y: 8, delay: 780, duration: 800, easing: cubicOut }}>
          <span>{t('result.month')}</span>
          <select value={book.month} onchange={(e) => club.setMonth(book, e.currentTarget.value)} data-testid="result-month">
            {#each months as m}
              <option value={m}>{monthLabel(m, locale())}</option>
            {/each}
          </select>
        </label>

        <div class="actions" in:fly={{ y: 8, delay: 880, duration: 800, easing: cubicOut }}>
          <button class="btn btn-primary big" type="button" onclick={onclose} data-testid="result-start" data-autofocus>
            {t('result.start')}
          </button>
          {#if !byName}
            <button class="btn btn-ghost" type="button" onclick={undo} disabled={undoing}>
              <Icon name="undo" size={15} stroke={1.6} />
              {t('result.undo')}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .confetti {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none; /* falls behind the dialog, never over what you're reading or typing */
  }
  .plate {
    display: grid;
    grid-template-columns: 0.82fr 1fr;
    min-height: 460px;
  }
  /* marbled endpaper with the book lying on it */
  .endpaper {
    position: relative;
    display: grid;
    place-items: center;
    padding: 40px 30px;
    background: url('/textures/marble.jpg') center / cover;
    box-shadow:
      inset -14px 0 22px -12px rgba(30, 18, 8, 0.5),
      inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    perspective: 1100px;
  }
  .flip {
    width: min(190px, 70%);
    transform: rotate(-3deg);
    animation: open 1.2s var(--ease-out) both;
    transform-origin: 0% 50%;
  }
  .flip :global(.cover) {
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.3),
      0 28px 40px -14px rgba(20, 10, 4, 0.75);
  }
  @keyframes open {
    0% {
      transform: rotate(-3deg) rotateY(-85deg) translateX(-20px);
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
    100% {
      transform: rotate(-3deg) rotateY(0) translateX(0);
    }
  }
  .leaf {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 44px 40px 36px;
  }
  .leaf::before {
    content: '';
    position: absolute;
    inset: 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    pointer-events: none;
  }
  .leaf .eyebrow {
    color: var(--oxblood);
  }
  /* the bookplate label */
  .exlibris {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin: 18px 0 20px;
    padding: 10px 26px 12px;
    border: 1px solid var(--gold);
    outline: 1px solid color-mix(in srgb, var(--gold) 50%, transparent);
    outline-offset: 3px;
  }
  .ex {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 22px;
    line-height: 1;
    color: var(--gold-ink);
  }
  .club {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .title {
    font-size: clamp(32px, 5vw, 46px);
    font-weight: 600;
    line-height: 1;
  }
  .author {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 21px;
    color: var(--ink-soft);
    margin-top: 8px;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .genre {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sep {
    color: var(--gold);
  }
  .month {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 22px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    color: var(--ink-soft);
  }
  .month select {
    width: auto;
    padding: 5px 30px 5px 10px;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    font-style: normal;
  }
  .actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 24px;
    width: 100%;
  }
  .big {
    min-height: 50px;
    width: min(260px, 100%);
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 21px;
    letter-spacing: 0.01em;
  }
  /* landscape phones: keep both columns, but compact enough to fit (the panel scrolls if not) */
  @media (max-height: 560px) and (min-width: 641px) {
    .plate {
      min-height: 0;
    }
    .endpaper {
      padding: 18px;
    }
    .flip {
      width: min(118px, 60%);
    }
    .leaf {
      padding: 22px 28px 20px;
    }
  }
  @media (max-width: 640px) {
    .plate {
      grid-template-columns: 1fr;
      min-height: 0;
    }
    .endpaper {
      padding: 28px 20px 24px;
      box-shadow: inset 0 -14px 22px -12px rgba(30, 18, 8, 0.5);
    }
    .flip {
      width: 124px;
    }
    .leaf {
      padding: 28px 24px calc(28px + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
