<script>
  // 1–5 star picker: hover preview, keyboard arrows, a little pop on select.
  import { t } from '../lib/i18n.svelte.js';

  let { value = $bindable(0), size = 40, label = '' } = $props();
  let hover = $state(0);
  let popped = $state(0);
  const shown = $derived(hover || value);

  function set(v) {
    value = v;
    popped = v;
    setTimeout(() => (popped = 0), 450);
  }
  function onkeydown(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      set(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      set(Math.max(1, (value || 1) - 1));
    }
  }
  const STAR = 'M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
</script>

<div class="star-input" role="radiogroup" aria-label={label} style:--s="{size}px" onmouseleave={() => (hover = 0)} tabindex="-1">
  {#each [1, 2, 3, 4, 5] as v}
    <button
      type="button"
      role="radio"
      aria-checked={value === v}
      aria-label={t('review.star', { n: v })}
      tabindex={value === v || (!value && v === 1) ? 0 : -1}
      class:on={v <= shown}
      class:pop={popped && v <= popped}
      style:--d="{(v - 1) * 45}ms"
      onmouseenter={() => (hover = v)}
      onfocus={() => (hover = 0)}
      onclick={() => set(v)}
      {onkeydown}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
    </button>
  {/each}
</div>

<style>
  .star-input {
    display: inline-flex;
    gap: 4px;
    outline: none;
  }
  button {
    background: none;
    border: none;
    padding: 3px;
    cursor: pointer;
    border-radius: 10px;
    line-height: 0;
    transition: transform 0.2s var(--ease-spring);
  }
  button:hover {
    transform: scale(1.12) rotate(-4deg);
  }
  svg {
    width: var(--s);
    height: var(--s);
  }
  path {
    fill: var(--card-2);
    stroke: var(--line-strong);
    stroke-width: 1.2;
    stroke-linejoin: round;
    transition:
      fill 0.18s ease,
      stroke 0.18s ease;
  }
  .on path {
    fill: var(--gold);
    stroke: color-mix(in srgb, var(--gold) 70%, black);
  }
  .pop {
    animation: pop 0.45s var(--ease-spring) var(--d) both;
  }
  @keyframes pop {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.35) rotate(8deg);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
