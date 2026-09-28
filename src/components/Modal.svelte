<script>
  // Accessible dialog: the page behind is made `inert` by App while any dialog
  // is open, so focus can't escape. Escape and the backdrop close it.
  import { fade, fly, scale } from '../lib/motion.js';
  import { cubicOut } from 'svelte/easing';
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
    /** Where focus goes on close if whatever had it before is gone (a selector). */
    returnFocus = null,
  } = $props();

  let panel = $state();
  const mobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 640px)').matches;

  onMount(() => {
    const previouslyFocused = document.activeElement;
    const target = panel?.querySelector('[data-autofocus]') ?? panel?.querySelector('input, textarea, select, button:not(.modal-x)') ?? panel;
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
    return () => {
      const back =
        previouslyFocused?.isConnected && previouslyFocused !== document.body
          ? previouslyFocused
          : returnFocus && document.querySelector(returnFocus);
      back?.focus?.({ preventScroll: true });
    };
  });

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function onkeydown(e) {
    if (e.key === 'Escape' && closable) {
      e.stopPropagation();
      onclose?.();
    } else if (e.key === 'Tab' && panel) {
      // Keep Tab inside this dialog (the page behind is inert, but a dialog
      // underneath this one isn't).
      e.stopPropagation();
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length);
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items.at(-1);
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
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
    in:fly={mobile ? { y: 80, duration: 460, easing: cubicOut, opacity: 1 } : { y: 18, duration: 520, easing: cubicOut }}
    out:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
  >
    {#if closable}
      <button class="modal-x btn btn-ghost btn-icon btn-sm" type="button" onclick={onclose} aria-label={t('common.close')}>
        <Icon name="x" size={17} stroke={1.6} />
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
    background: rgba(26, 18, 11, 0.5);
    backdrop-filter: blur(5px) sepia(0.2);
  }
  /* a sheet of paper with a printed inner rule */
  .modal-panel {
    position: relative;
    width: min(520px, 100%);
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
    overscroll-behavior: contain;
    background:
      radial-gradient(120% 60% at 50% 0%, color-mix(in srgb, var(--gold-soft) 45%, transparent), transparent 70%),
      var(--card);
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    --pad-b: clamp(26px, 4vw, 38px); /* sticky footers inside reach the edge with it */
    padding: clamp(26px, 4vw, 38px);
    padding-bottom: var(--pad-b);
    /* the printed inner rule: an outline stays put while the content scrolls
       (a positioned ::before would scroll with it and cut across the text) */
    outline: 1px solid var(--line);
    outline-offset: -9px;
  }
  .modal-panel.sm {
    width: min(430px, 100%);
  }
  .modal-panel.lg {
    width: min(700px, 100%);
  }
  .modal-panel.bare {
    padding: 0;
    overflow: hidden auto;
    outline: none;
  }
  .modal-x {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 3;
  }
  /* over artwork (the marbled endpaper) the close button needs its own paper */
  .bare .modal-x {
    background: color-mix(in srgb, var(--card) 92%, transparent);
    border: 1px solid var(--line-strong);
    box-shadow: 0 2px 8px rgba(30, 18, 8, 0.18);
  }
  @media (pointer: coarse) {
    .modal-x {
      width: 44px;
      height: 44px;
      top: 12px;
      right: 12px;
    }
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
      border-radius: 16px 16px 0 0;
      max-height: 94dvh;
      --pad-b: calc(26px + env(safe-area-inset-bottom, 0px));
    }
    .modal-panel.bare {
      padding-bottom: 0;
    }
  }
</style>
