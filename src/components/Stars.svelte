<script>
  // Read-only star display with partial fills (e.g. 4.3 → four full, one 30%).
  import { starFills } from '../lib/reading.js';
  import { prefersReducedMotion } from '../lib/ui.svelte.js';
  import { onMount, untrack } from 'svelte';

  let { value = 0, size = 18, animate = false, label = '' } = $props();
  const fills = $derived(starFills(value));
  let shown = $state(untrack(() => !animate));
  onMount(() => {
    if (animate && !prefersReducedMotion()) {
      const id = setTimeout(() => (shown = true), 120);
      return () => clearTimeout(id);
    }
    shown = true;
  });
  const STAR = 'M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
</script>

<span class="stars" role="img" aria-label={label} style:--s="{size}px">
  {#each fills as f, i}
    <span class="star" style:--i={i}>
      <svg viewBox="0 0 24 24" class="bg" aria-hidden="true"><path d={STAR} /></svg>
      <span class="fill" style:width="{(shown ? f : 0) * 100}%">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
      </span>
    </span>
  {/each}
</span>

<style>
  .stars {
    display: inline-flex;
    gap: calc(var(--s) * 0.12);
    vertical-align: middle;
  }
  .star {
    position: relative;
    width: var(--s);
    height: var(--s);
    flex: none;
  }
  svg {
    width: var(--s);
    height: var(--s);
    display: block;
  }
  .bg path {
    fill: var(--line);
    stroke: var(--line-strong);
    stroke-width: 0.6;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    overflow: hidden;
    transition: width 0.55s var(--ease-out);
    transition-delay: calc(var(--i) * 130ms);
  }
  .fill path {
    fill: var(--gold);
    stroke: color-mix(in srgb, var(--gold) 70%, black);
    stroke-width: 0.6;
    filter: drop-shadow(0 1px 1px rgba(120, 80, 10, 0.25));
  }
</style>
