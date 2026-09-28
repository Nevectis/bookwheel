<script>
  // Decorative: a slowly turning wheel with books drifting around it.
  const COLORS = ['#8c2f45', '#c1902f', '#2f6f73', '#b4533c', '#5b4a9e', '#3f7a57', '#d27a24', '#b2456e'];
  const N = 12;
  const slice = (i) => {
    const a0 = ((i * 360) / N - 90) * (Math.PI / 180);
    const a1 = (((i + 1) * 360) / N - 90) * (Math.PI / 180);
    return `M0 0L${100 * Math.cos(a0)} ${100 * Math.sin(a0)}A100 100 0 0 1 ${100 * Math.cos(a1)} ${100 * Math.sin(a1)}Z`;
  };
  const books = [
    { c: '#8c2f45', w: 34, h: 50, x: 6, y: 14, r: -14, d: 0 },
    { c: '#2f6f73', w: 30, h: 46, x: 80, y: 8, r: 12, d: -2 },
    { c: '#c1902f', w: 36, h: 52, x: 86, y: 70, r: -8, d: -4 },
    { c: '#5b4a9e', w: 28, h: 42, x: 2, y: 72, r: 16, d: -6 },
  ];
</script>

<div class="art" aria-hidden="true">
  <div class="glow"></div>
  <svg class="mini" viewBox="-110 -110 220 220">
    <circle r="108" fill="#c1902f" />
    <circle r="102" fill="#3b2419" />
    <g class="turn">
      {#each Array(N) as _, i}
        <path d={slice(i)} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,.2)" stroke-width="0.6" />
      {/each}
      {#each Array(N) as _, i}
        {@const a = ((i * 360) / N - 90) * (Math.PI / 180)}
        <circle cx={96 * Math.cos(a)} cy={96 * Math.sin(a)} r="2.6" fill="#f3d58e" />
      {/each}
    </g>
    <circle r="100" fill="url(#g)" />
    <defs>
      <radialGradient id="g" cx="0.3" cy="0.2" r="0.8">
        <stop offset="0" stop-color="#fff" stop-opacity="0.35" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <circle r="20" fill="#fbf1df" stroke="#c1902f" stroke-width="4" />
    <path d="M-9 -4c3.4-1.4 6.2-1 9 1 2.8-2 5.6-2.4 9-1v10c-3.4-1.4-6.2-1-9 1-2.8-2-5.6-2.4-9-1z" fill="none" stroke="#8c2f45" stroke-width="2" stroke-linejoin="round" />
  </svg>
  <svg class="pin" viewBox="0 0 40 58"><path d="M4 2h32v34L20 56 4 36z" fill="#9c3550" /><circle cx="20" cy="15" r="5" fill="#f3d58e" /></svg>
  {#each books as b}
    <span class="book" style:--c={b.c} style:width="{b.w}px" style:height="{b.h}px" style:left="{b.x}%" style:top="{b.y}%" style:--r="{b.r}deg" style:--d="{b.d}s"></span>
  {/each}
</div>

<style>
  .art {
    position: relative;
    width: min(360px, 78vw);
    aspect-ratio: 1;
  }
  .glow {
    position: absolute;
    inset: -12%;
    border-radius: 50%;
    background: radial-gradient(closest-side, var(--glow-2), transparent);
    animation: pulse 5s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    to {
      transform: scale(1.12);
    }
  }
  .mini {
    position: absolute;
    inset: 12%;
    width: 76%;
    height: 76%;
    filter: drop-shadow(0 18px 24px rgba(60, 25, 10, 0.3));
  }
  .turn {
    animation: turn 38s linear infinite;
  }
  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }
  .pin {
    position: absolute;
    left: 50%;
    top: 7%;
    width: 8%;
    transform: translateX(-50%);
    filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.3));
  }
  .book {
    position: absolute;
    border-radius: 2px 5px 5px 2px;
    background:
      linear-gradient(90deg, rgba(0, 0, 0, 0.25), rgba(255, 255, 255, 0.2) 8%, transparent 14%),
      var(--c);
    box-shadow: 0 10px 18px -8px rgba(40, 15, 5, 0.6);
    animation: drift 7s ease-in-out infinite;
    animation-delay: var(--d);
    transform: rotate(var(--r));
  }
  .book::after {
    content: '';
    position: absolute;
    inset: 18% 20%;
    border: 1.5px solid rgba(242, 208, 138, 0.7);
    border-radius: 1px;
  }
  @keyframes drift {
    50% {
      transform: rotate(calc(var(--r) * -1)) translateY(-14px);
    }
  }
</style>
