<script>
  // Small popover menu anchored to a trigger button.
  import { scale } from 'svelte/transition';
  import { clickOutside } from '../lib/actions.js';

  let { label, trigger, children, align = 'right', testid } = $props();
  let open = $state(false);
  const close = () => (open = false);
</script>

<div class="menu" use:clickOutside={close}>
  <button
    type="button"
    class="trigger"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={label}
    onclick={() => (open = !open)}
    data-testid={testid}
  >
    {@render trigger()}
  </button>
  {#if open}
    <div
      class="pop {align}"
      role="menu"
      tabindex="-1"
      transition:scale={{ start: 0.92, duration: 160 }}
      onkeydown={(e) => e.key === 'Escape' && close()}
      onclick={(e) => e.target.closest('[data-close]') && close()}
    >
      {@render children(close)}
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    display: inline-flex;
  }
  .trigger {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 999px;
  }
  .pop {
    position: absolute;
    top: calc(100% + 8px);
    z-index: 60;
    min-width: 240px;
    padding: 6px;
    border-radius: 10px;
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-lg);
    transform-origin: top right;
  }
  .pop.right {
    right: 0;
  }
  .pop.left {
    left: 0;
    transform-origin: top left;
  }
  .pop :global(.mi) {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 11px;
    border: none;
    background: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 400;
    text-align: left;
    cursor: pointer;
    color: var(--ink);
    text-decoration: none;
  }
  .pop :global(.mi:hover),
  .pop :global(.mi:focus-visible) {
    background: var(--card-2);
  }
  .pop :global(.mi.danger) {
    color: var(--red);
  }
  .pop :global(.sep) {
    height: 1px;
    background: var(--line);
    margin: 6px 4px;
  }
  .pop :global(.mlabel) {
    padding: 8px 11px 4px;
    font-size: 11px;
    font-family: var(--font-body);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--ink-faint);
  }
</style>
