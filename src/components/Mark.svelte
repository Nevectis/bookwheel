<script>
  // The Bookwheel mark: a tiny volvelle — paper dial, cloth segments, brass rivet.
  let { size = 40, spin = false } = $props();
  const CLOTH = ['#6f2a32', '#2d4a3e', '#86673a', '#2b3a55', '#4a3552', '#3d5a5c'];
  const seg = (i, n, r, r0) => {
    const p = (deg, rad) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return `${(32 + rad * Math.cos(a)).toFixed(2)} ${(32 + rad * Math.sin(a)).toFixed(2)}`;
    };
    const a0 = (i * 360) / n;
    const a1 = ((i + 1) * 360) / n;
    return `M${p(a0, r0)}L${p(a0, r)}A${r} ${r} 0 0 1 ${p(a1, r)}L${p(a1, r0)}A${r0} ${r0} 0 0 0 ${p(a0, r0)}Z`;
  };
</script>

<svg class="mark" class:spin width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="#efe5d0" />
  <circle cx="32" cy="32" r="31" fill="none" stroke="#4a3d31" stroke-width="1" />
  <circle cx="32" cy="32" r="28.2" fill="none" stroke="#4a3d31" stroke-width=".5" opacity=".7" />
  <g class="turn">
    {#each CLOTH as c, i}
      <path d={seg(i, CLOTH.length, 26, 9)} fill={c} />
    {/each}
    <circle cx="32" cy="32" r="25.6" fill="none" stroke="#c9a66b" stroke-width=".9" />
  </g>
  <circle cx="32" cy="32" r="8.4" fill="#b8955a" stroke="#6f5328" stroke-width=".8" />
  <circle cx="30.5" cy="30.3" r="3" fill="#f3e2b8" opacity=".55" />
  <path d="M29.5 0.5h5V9l-2.5-2.2L29.5 9z" fill="#7b2a33" />
</svg>

<style>
  .mark {
    display: block;
    flex: none;
    filter: drop-shadow(0 2px 3px rgba(40, 25, 12, 0.25));
  }
  .turn {
    transform-origin: 32px 32px;
    transition: transform 1.2s cubic-bezier(0.22, 1, 0.36, 1);
  }
  :global(a:hover) > .mark .turn,
  :global(a:hover) .mark .turn {
    transform: rotate(120deg);
  }
  .spin .turn {
    animation: turn 1.6s cubic-bezier(0.45, 0.05, 0.3, 1) infinite;
  }
  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }
</style>
