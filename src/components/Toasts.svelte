<script>
  import { flip } from 'svelte/animate';
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import Icon from './Icon.svelte';
  import { dismissToast, ui } from '../lib/ui.svelte.js';
</script>

<div class="toasts" aria-live="polite" role="status">
  {#each ui.toasts as toast (toast.id)}
    <div class="toast {toast.tone}" animate:flip={{ duration: 250 }} in:fly={{ y: 30, duration: 450, easing: backOut }} out:scale={{ start: 0.9, duration: 180 }}>
      <span class="ico">
        {#if toast.tone === 'success'}<Icon name="check" size={16} stroke={3} />{:else if toast.tone === 'error'}<Icon name="x" size={16} stroke={3} />{:else}<Icon name="sparkles" size={16} />{/if}
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
    bottom: calc(22px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: min(460px, calc(100vw - 24px));
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px 10px 10px;
    border-radius: 16px;
    background: var(--ink);
    color: var(--paper);
    box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.5);
    font-size: 14.5px;
    font-weight: 600;
    max-width: 100%;
  }
  .ico {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--paper) 16%, transparent);
    flex: none;
  }
  .success .ico {
    background: #3f7a57;
    color: #fff;
  }
  .error .ico {
    background: #b23b30;
    color: #fff;
  }
  .msg {
    flex: 1;
  }
  button {
    border: none;
    background: none;
    color: var(--gold-2);
    font-weight: 800;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 8px;
  }
  button:hover {
    background: color-mix(in srgb, var(--paper) 12%, transparent);
  }
  @media (max-width: 760px) {
    .toasts {
      bottom: calc(92px + env(safe-area-inset-bottom));
    }
  }
</style>
