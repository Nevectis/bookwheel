<script>
  import { flip } from '../lib/motion.js';
  import { fly, scale } from '../lib/motion.js';
  import { cubicOut } from 'svelte/easing';
  import Icon from './Icon.svelte';
  import { dismissToast, ui } from '../lib/ui.svelte.js';
</script>

<div class="toasts" aria-live="polite" role="status">
  {#each ui.toasts as toast (toast.id)}
    <div class="toast {toast.tone}" animate:flip={{ duration: 250 }} in:fly={{ y: 24, duration: 500, easing: cubicOut }} out:scale={{ start: 0.9, duration: 180 }}>
      <span class="ico">
        {#if toast.tone === 'success'}<Icon name="check" size={13} stroke={2.2} />{:else if toast.tone === 'error'}<Icon name="x" size={13} stroke={2.2} />{:else}<Icon name="sparkles" size={13} stroke={1.6} />{/if}
      </span>
      <span class="msg">{toast.message}</span>
      {#if toast.action}
        <button
          type="button"
          onclick={() => {
            toast.action();
            dismissToast(toast.id);
          }}>{toast.actionLabel}</button
        >
      {/if}
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: calc(22px + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: min(480px, calc(100vw - 24px));
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px 11px 12px;
    border-radius: 8px;
    background: #2a2420;
    color: #f3ecdf;
    border: 1px solid rgba(201, 166, 107, 0.35);
    box-shadow: 0 16px 40px -14px rgba(0, 0, 0, 0.55);
    font-family: var(--font-display);
    font-size: 18px;
    line-height: 1.25;
    max-width: 100%;
  }
  .ico {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid rgba(201, 166, 107, 0.6);
    color: #d9bb7e;
    flex: none;
  }
  .success .ico {
    color: #9fd0ac;
    border-color: rgba(159, 208, 172, 0.55);
  }
  .error .ico {
    color: #f0a293;
    border-color: rgba(240, 162, 147, 0.55);
  }
  /* long titles in messages: at most three lines */
  .msg {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
  }
  button {
    border: none;
    background: none;
    color: #e0c690;
    font-family: var(--font-body);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 5px 8px;
    border-radius: 6px;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  @media (max-width: 760px) {
    .toasts {
      bottom: calc(92px + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
