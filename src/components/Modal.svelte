<script>
  // Accessible dialog: the page behind is made `inert` by App while any dialog
  // is open, so focus can't escape. Escape and the backdrop close it.
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { t } from '../lib/i18n.svelte.js';

  let {
    onclose,
    labelledby,
    size = 'md',
    closable = true,
    variant = 'default',
    children,
    backdrop = null,
  } = $props();

  let panel = $state();
  const mobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 640px)').matches;

  onMount(() => {
    const previouslyFocused = document.activeElement;
    const target = panel?.querySelector('[data-autofocus]') ?? panel?.querySelector('input, textarea, select, button:not(.modal-x)') ?? panel;
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus({ preventScroll: true });
    };
  });

  function onkeydown(e) {
    if (e.key === 'Escape' && closable) {
      e.stopPropagation();
      onclose?.();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="modal-root" role="presentation" {onkeydown}>
  <div class="modal-backdrop" transition:fade={{ duration: 220 }} onclick={() => closable && onclose?.()} aria-hidden="true"></div>
  {@render backdrop?.()}
  <div
    class="modal-panel {size} {variant}"
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledby}
    tabindex="-1"
    bind:this={panel}
    in:fly={mobile ? { y: 80, duration: 420, easing: cubicOut, opacity: 1 } : { y: 24, duration: 460, easing: backOut }}
    out:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
  >
    {#if closable}
      <button class="modal-x btn btn-ghost btn-icon btn-sm" type="button" onclick={onclose} aria-label={t('common.close')}>
        <Icon name="x" size={18} />
      </button>
    {/if}
    {@render children()}
  </div>
</div>

<style>
  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 20px;
    overflow-y: auto;
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 18, 14, 0.46);
    backdrop-filter: blur(6px) saturate(1.1);
    -webkit-backdrop-filter: blur(6px) saturate(1.1);
  }
  .modal-panel {
    position: relative;
    width: min(520px, 100%);
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 26px;
    box-shadow: var(--shadow-lg);
    padding: clamp(22px, 4vw, 32px);
    outline: none;
  }
  .modal-panel.sm {
    width: min(420px, 100%);
  }
  .modal-panel.lg {
    width: min(680px, 100%);
  }
  .modal-panel.celebrate {
    overflow: visible;
    background:
      radial-gradient(120% 70% at 50% 0%, var(--gold-soft), transparent 60%),
      var(--card);
  }
  .modal-x {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 2;
  }
  @media (max-width: 640px) {
    .modal-root {
      place-items: end center;
      padding: 0;
    }
    .modal-panel,
    .modal-panel.sm,
    .modal-panel.lg {
      width: 100%;
      border-radius: 26px 26px 0 0;
      max-height: 92dvh;
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
    .modal-panel.celebrate {
      overflow-y: auto;
    }
  }
</style>
