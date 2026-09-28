<script>
  import { onMount, untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import confetti from 'canvas-confetti';
  import Modal from './Modal.svelte';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import StarInput from './StarInput.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t, formatAverage } from '../lib/i18n.svelte.js';
  import { prefersReducedMotion, toast } from '../lib/ui.svelte.js';

  let { bookId, congrats = false, onclose } = $props();

  const book = $derived(club.book(bookId));
  const mine = untrack(() => club.entry(bookId));
  let rating = $state(mine?.rating ?? 0);
  let review = $state(mine?.review ?? '');
  let error = $state('');
  let busy = $state(false);
  let canvas = $state();

  onMount(() => {
    if (!congrats || prefersReducedMotion() || !canvas) return;
    const fire = confetti.create(canvas, { resize: true });
    fire({ particleCount: 70, spread: 80, startVelocity: 40, origin: { x: 0.5, y: 0.3 }, colors: ['#c1902f', '#f3d58e', '#3f7a57', '#8c2f45'], ticks: 220 });
    return () => fire.reset();
  });

  async function submit(e) {
    e.preventDefault();
    if (!rating) return (error = t('review.needStars'));
    busy = true;
    const target = book;
    try {
      const { wasComplete } = await club.rate(target, rating, review);
      const s = club.summary(club.book(target.id) ?? target);
      if (s.complete && !wasComplete) {
        toast(`${target.title}: ${t('chron.avg', { value: formatAverage(s.average) })} ★`, { tone: 'success', duration: 6000 });
      } else {
        toast(t('review.saved'), { tone: 'success' });
      }
      onclose();
    } catch (err) {
      console.error(err);
      busy = false;
    }
  }
</script>

<Modal {onclose} labelledby="review-title" size="md" variant={congrats ? 'celebrate' : 'default'}>
  {#snippet backdrop()}
    <canvas class="confetti" bind:this={canvas} aria-hidden="true"></canvas>
  {/snippet}
  {#if book}
    <form class="review" onsubmit={submit} data-testid="review-modal">
      <div class="head">
        <div class="mini-cover"><BookCover {book} shine={false} /></div>
        <div>
          {#if congrats}
            <p class="congrats" in:fly={{ y: -8 }}><Icon name="sparkles" size={15} /> {t('review.congrats')}</p>
          {/if}
          <h2 id="review-title">{t('review.title', { title: book.title })}</h2>
        </div>
      </div>

      <div class="stars-row">
        <StarInput bind:value={rating} size={44} label={t('current.yourRating')} />
      </div>

      <label class="field">
        <span>{t('review.text')} <small>({t('common.optional')})</small></span>
        <textarea bind:value={review} maxlength="4000" placeholder={t('review.placeholder')} rows="4" data-testid="review-text"></textarea>
      </label>

      <p class="sealed"><Icon name="envelope" size={16} /> {t('review.sealed')}</p>

      {#if error}<p class="form-error" role="alert">{error}</p>{/if}

      <div class="actions">
        <button type="button" class="btn btn-ghost" onclick={onclose}>{t('review.later')}</button>
        <button type="submit" class="btn btn-primary" disabled={busy || !rating} data-testid="review-submit">
          <Icon name="check" size={17} stroke={2.6} />
          {t('review.submit')}
        </button>
      </div>
    </form>
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
  .review {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .head {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 16px;
    align-items: center;
    padding-right: 30px;
  }
  .mini-cover {
    transform: rotate(-4deg);
  }
  .congrats {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--green);
    font-weight: 800;
    font-size: 13.5px;
    margin-bottom: 6px;
  }
  h2 {
    font-size: 24px;
  }
  .stars-row {
    display: flex;
    justify-content: center;
    padding: 6px 0;
  }
  .sealed {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 13px;
    color: var(--ink-soft);
    background: var(--card-2);
    border: 1px dashed var(--line-strong);
    padding: 10px 12px;
    border-radius: 12px;
  }
  .sealed :global(svg) {
    flex: none;
    margin-top: 1px;
    color: var(--gold);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
