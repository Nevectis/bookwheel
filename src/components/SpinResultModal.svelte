<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import confetti from 'canvas-confetti';
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
  const months = $derived(monthOptions(undefined, 2, 8));
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
    const fire = confetti.create(canvas, { resize: true, useWorker: false });
    const colors = ['#8c2f45', '#c1902f', '#f3d58e', '#2f6f73', '#b3475f', '#fff4dc'];
    const burst = (x, angle) =>
      fire({ particleCount: 90, spread: 70, startVelocity: 55, angle, origin: { x, y: 0.75 }, colors, scalar: 1.05, ticks: 260 });
    burst(0.1, 60);
    burst(0.9, 120);
    const t2 = setTimeout(() => fire({ particleCount: 140, spread: 120, startVelocity: 38, origin: { x: 0.5, y: 0.35 }, colors, shapes: ['star', 'circle'], ticks: 300 }), 350);
    return () => {
      clearTimeout(t2);
      fire.reset();
    };
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

<Modal {onclose} labelledby="result-title" variant="celebrate">
  {#snippet backdrop()}
    <canvas class="confetti" bind:this={canvas} aria-hidden="true"></canvas>
  {/snippet}
  {#if book}
    <div class="result" data-testid="spin-result">
      <p class="eyebrow">
        <Icon name="sparkles" size={14} />
        {byName ? t('result.byOther', { name: byName }) : t('result.eyebrow')}
      </p>
      <div class="cover-stage">
        <div class="rays" aria-hidden="true"></div>
        <div class="flip">
          <BookCover {book} />
        </div>
      </div>
      <h2 id="result-title" class="title" in:fly={{ y: 16, delay: 450, duration: 600, easing: backOut }}>{book.title}</h2>
      <p class="author" in:fly={{ y: 12, delay: 560, duration: 600 }}>{book.author}</p>
      <div class="meta" in:fly={{ y: 10, delay: 660, duration: 600 }}>
        <span class="chip genre" style:--gc={genreSwatch(book.genre)}><span class="dot" style:background={genreSwatch(book.genre)}></span>{genre.label}</span>
        {#if book.pageCount}<span class="chip">{t('result.pages', { n: book.pageCount })}</span>{/if}
      </div>

      <label class="month" in:fly={{ y: 10, delay: 760, duration: 600 }}>
        <span><Icon name="calendar" size={16} /> {t('result.month')}</span>
        <select value={book.month} onchange={(e) => club.setMonth(book, e.currentTarget.value)} data-testid="result-month">
          {#each months as m}
            <option value={m}>{monthLabel(m, locale())}</option>
          {/each}
        </select>
      </label>

      <div class="actions" in:fly={{ y: 10, delay: 860, duration: 600 }}>
        <button class="btn btn-primary big" type="button" onclick={onclose} data-testid="result-start">
          <Icon name="book" size={18} />
          {t('result.start')}
        </button>
        {#if !byName}
          <button class="btn btn-ghost" type="button" onclick={undo} disabled={undoing}>
            <Icon name="undo" size={16} />
            {t('result.undo')}
          </button>
        {/if}
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
    pointer-events: none;
    z-index: 101;
  }
  .result {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--accent);
  }
  .cover-stage {
    position: relative;
    width: 180px;
    margin: 22px 0 22px;
    perspective: 1000px;
  }
  .rays {
    position: absolute;
    inset: -70%;
    background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--gold) 35%, transparent) 0 8deg, transparent 8deg 22deg);
    mask-image: radial-gradient(closest-side, #000 20%, transparent 75%);
    animation: rays 14s linear infinite;
    opacity: 0.7;
  }
  @keyframes rays {
    to {
      transform: rotate(360deg);
    }
  }
  .flip {
    position: relative;
    animation: flip-in 1s var(--ease-out) both;
    transform-style: preserve-3d;
  }
  .flip :global(.cover) {
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.2),
      0 30px 50px -18px rgba(50, 20, 5, 0.65);
  }
  @keyframes flip-in {
    0% {
      transform: rotateY(-110deg) scale(0.5) translateY(40px);
      opacity: 0;
    }
    55% {
      opacity: 1;
    }
    75% {
      transform: rotateY(12deg) scale(1.06);
    }
    100% {
      transform: none;
    }
  }
  .title {
    font-size: clamp(28px, 5vw, 38px);
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .author {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    color: var(--ink-soft);
    margin-top: 6px;
  }
  .meta {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .chip.genre {
    background: var(--gc);
    color: #fff;
    border-color: transparent;
    font-size: 13px;
    padding: 5px 12px 5px 10px;
  }
  .chip.genre .dot {
    background: #fff !important;
  }
  .month {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    font-weight: 700;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .month span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .month select {
    width: auto;
    padding: 7px 12px;
    font-weight: 700;
  }
  .actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 22px;
    width: 100%;
  }
  .big {
    min-height: 50px;
    padding: 12px 30px;
    font-size: 16px;
    width: min(280px, 100%);
  }
</style>
