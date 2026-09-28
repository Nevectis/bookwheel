<script>
  // An oxblood wax seal with an impressed fleuron: "sealed until everyone has voted".
  let { size = 46, broken = false } = $props();
  // Irregular blob outline: a circle with gentle, fixed wobble.
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = 29 + Math.sin(i * 2.7) * 1.6 + Math.cos(i * 1.3) * 1.2;
    return `${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
</script>

<svg class="seal" class:broken width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <radialGradient id="wax" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#b24a55" />
      <stop offset="0.45" stop-color="#8a2c37" />
      <stop offset="1" stop-color="#561820" />
    </radialGradient>
  </defs>
  <polygon points={pts} fill="url(#wax)" />
  <circle cx="32" cy="32" r="20.5" fill="none" stroke="#4a121a" stroke-opacity=".55" stroke-width="1.6" />
  <circle cx="32" cy="32" r="20.5" fill="none" stroke="#e9a3a8" stroke-opacity=".28" stroke-width=".8" transform="translate(-.6 -.8)" />
  <text x="32" y="40.5" text-anchor="middle" class="glyph">❦</text>
  <ellipse cx="24" cy="19" rx="7" ry="3.2" fill="#fff" opacity=".16" transform="rotate(-30 24 19)" />
</svg>

<style>
  .seal {
    display: block;
    flex: none;
    filter: drop-shadow(0 2px 2px rgba(60, 10, 15, 0.35));
  }
  .glyph {
    font-family: var(--font-display);
    font-size: 24px;
    fill: #4a121a;
    fill-opacity: 0.7;
  }
  .broken {
    opacity: 0.5;
  }
</style>
