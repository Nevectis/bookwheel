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
    let v;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = Math.min(5, (value || 0) + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = Math.max(1, (value || 1) - 1);
    else return;
    e.preventDefault();
    set(v);
    // Focus follows the checked star (roving tabindex), as in any radio group.
    e.currentTarget.parentElement?.children[v - 1]?.focus();
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
    gap: 6px;
    outline: none;
  }
  button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 8px;
    line-height: 0;
    transition: transform 0.3s var(--ease-out);
  }
  button:hover {
    transform: translateY(-2px);
  }
  svg {
    width: var(--s);
    height: var(--s);
  }
  path {
    fill: transparent;
    stroke: var(--gold);
    stroke-width: 1;
    stroke-linejoin: round;
    opacity: 0.7;
    transition:
      fill 0.25s ease,
      opacity 0.25s ease;
  }
  .on path {
    fill: var(--gold);
    opacity: 1;
  }
  .pop {
    animation: pop 0.6s var(--ease-out) var(--d) both;
  }
  @keyframes pop {
    0% {
      transform: scale(1);
    }
    35% {
      transform: scale(1.18);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
