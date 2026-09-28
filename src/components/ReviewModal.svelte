<script>
  import { onMount, untrack } from 'svelte';
  import { fly } from '../lib/motion.js';
  import { goldLeaf } from '../lib/goldleaf.js';
  import Modal from './Modal.svelte';
  import BookCover from './BookCover.svelte';
  import Icon from './Icon.svelte';
  import StarInput from './StarInput.svelte';
  import WaxSeal from './WaxSeal.svelte';
  import { club, landed } from '../lib/store.svelte.js';
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

  let open = true;
  onMount(() => {
    const stop = congrats && !prefersReducedMotion() && canvas ? goldLeaf(canvas, { amount: 0.6 }) : null;
    return () => {
      open = false;
      stop?.();
    };
  });

  async function submit(e) {
    e.preventDefault();
    if (!rating) return (error = t('review.needStars'));
    busy = true;
    const target = book;
    const before = club.summary(target);
    try {
      await landed(club.rate(target, rating, review));
      const s = club.summary(club.book(target.id) ?? target);
      if (s.complete && !before.complete) {
        toast(`${target.title}: ${t('chron.avg', { value: formatAverage(s.average) })} ★`, { tone: 'success', duration: 6000 });
      } else if (s.ratedCount > 1 && !before.revealed) {
        toast(t('review.revealed'), { tone: 'success', duration: 5500 });
      } else {
        toast(t('review.saved'), { tone: 'success' });
      }
      if (open) onclose(); // not if it was closed meanwhile (the next dialog may be open)
    } catch (err) {
      console.error(err);
      busy = false;
    }
  }
</script>

<Modal {onclose} labelledby="review-title" size="md">
  {#snippet backdrop()}
    <canvas class="confetti" bind:this={canvas} aria-hidden="true"></canvas>
  {/snippet}
  {#if book}
    <form class="review" onsubmit={submit} data-testid="review-modal">
      <div class="head">
        <div class="mini-cover"><BookCover {book} shine={false} /></div>
        <div>
          {#if congrats}
            <p class="congrats" in:fly={{ y: -8 }}><Icon name="check" size={13} stroke={2} /> {t('review.congrats')}</p>
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

      <p class="sealed"><WaxSeal size={30} /> {t('review.sealed')}</p>

      {#if error}<p class="form-error" role="alert">{error}</p>{/if}

      <div class="actions">
        <button type="button" class="btn btn-ghost" onclick={onclose}>{t('review.later')}</button>
        <button type="submit" class="btn btn-primary" disabled={busy || !rating} data-testid="review-submit">
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
    gap: 20px;
  }
  .head {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 18px;
    align-items: center;
    padding-right: 30px;
  }
  .mini-cover {
    transform: rotate(-3deg);
  }
  .congrats {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--green);
    margin-bottom: 8px;
  }
  h2 {
    font-size: 28px;
    font-weight: 500;
    line-height: 1.08;
  }
  .stars-row {
    display: flex;
    justify-content: center;
    padding: 8px 0 4px;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .sealed {
    display: flex;
    gap: 12px;
    align-items: center;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17.5px;
    color: var(--ink-soft);
  }
  .sealed :global(svg) {
    flex: none;
    color: var(--oxblood);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
