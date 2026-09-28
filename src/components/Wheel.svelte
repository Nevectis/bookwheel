<script>
  // The wheel, drawn as a volvelle — the rotating paper disc found in old
  // books. A fixed printed dial, a turning disc of book-cloth segments (title
  // and author only), a brass rivet and a silk ribbon as the pointer.
  // Slices grow/shrink smoothly when books come and go; `spin(id)` plays the
  // full animation and resolves once the wheel has stopped on that book.
  import { untrack } from 'svelte';
  import {
    easeInOutCubic,
    fitText,
    indexAtPointer,
    labelFontSize,
    landingRotation,
    mergeLayout,
    mod360,
    segmentAngles,
    spinEase,
  } from '../lib/wheel.js';
  import { prefersReducedMotion } from '../lib/ui.svelte.js';

  let {
    items = [],
    frozen = false,
    winnerId = null,
    spinning = false,
    disabled = false,
    ontick,
    onhub,
    hubLabel = '',
    emptyText = '',
    ringText = 'Bookwheel',
  } = $props();

  const R = 222; // turning disc
  const HUB = 62; // centre label
  const TEXT_OUT = R - 17;
  const TEXT_LEN = TEXT_OUT - HUB - 10;
  // Book-cloth colours: muted, and all dark enough for ivory lettering.
  const CLOTH = ['#6f2a32', '#2d4a3e', '#2b3a55', '#86673a', '#4a3552', '#3d5a5c', '#77462b', '#4f5638', '#86505a', '#3a332e'];
  const NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  let rotation = $state(0);
  let entries = $state([]);
  let pop = $state(0);
  let ribbonEl = $state();
  let tweenRaf = 0;
  let spinRaf = 0;

  $effect(() => {
    const list = items;
    if (frozen) return;
    untrack(() => retarget(list));
  });

  function snap(list) {
    return list.map((it) => ({ id: it.id, item: it, from: 1, to: 1, weight: 1 }));
  }

  function retarget(list) {
    cancelAnimationFrame(tweenRaf);
    const prev = entries;
    const visible = prev.filter((e) => e.to > 0);
    if (!list.length) {
      entries = [];
      return;
    }
    if (!visible.length) {
      entries = snap(list);
      pop++;
      return;
    }
    const merged = mergeLayout(prev, list).map((e) => ({ ...e, weight: e.from }));
    if (prefersReducedMotion() || merged.every((e) => e.from === e.to)) {
      entries = snap(list);
      return;
    }
    entries = merged;
    const start = performance.now();
    const step = (now) => {
      const p = Math.max(0, Math.min(1, (now - start) / 800));
      const k = easeInOutCubic(p);
      for (const e of entries) e.weight = e.from + (e.to - e.from) * k;
      if (p < 1) tweenRaf = requestAnimationFrame(step);
      else entries = snap(entries.filter((e) => e.to > 0).map((e) => e.item));
    };
    tweenRaf = requestAnimationFrame(step);
  }

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  // Stable colour per book, nudged so neighbours (and first/last) never match.
  const colors = $derived.by(() => {
    const out = [];
    const n = entries.length;
    entries.forEach((e, i) => {
      let c = hash(String(e.id)) % CLOTH.length;
      const avoid = new Set([out[i - 1]]);
      if (i === n - 1 && n > 2) avoid.add(out[0]);
      while (avoid.has(c)) c = (c + 1) % CLOTH.length;
      out.push(c);
    });
    return out.map((c) => CLOTH[c]);
  });

  const slices = $derived.by(() => {
    const angles = segmentAngles(entries.map((e) => e.weight));
    return entries
      .map((e, i) => {
        const a = angles[i];
        const fs = labelFontSize(a.span, (R + HUB) / 1.7, { min: 8, max: 17.5 });
        const twoLines = ((a.span * Math.PI) / 180) * (R * 0.66) >= fs * 2.2;
        return {
          id: e.id,
          ...a,
          color: colors[i],
          fs,
          twoLines,
          full: `${e.item?.title ?? ''} — ${e.item?.author ?? ''}`,
          title: fitText(e.item?.title, fs, TEXT_LEN, 0.43),
          author: fitText((e.item?.author ?? '').toUpperCase(), fs * 0.52, TEXT_LEN, 0.74),
        };
      })
      .filter((s) => s.span > 0.05);
  });

  function arcPath(start, end, r, r0 = 0) {
    if (end - start >= 359.99) {
      const outer = `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
      return r0 ? `${outer}M0 ${-r0}A${r0} ${r0} 0 1 0 0 ${r0}A${r0} ${r0} 0 1 0 0 ${-r0}Z` : outer;
    }
    const [x0, y0] = polar(start, r);
    const [x1, y1] = polar(end, r);
    const large = end - start > 180 ? 1 : 0;
    if (!r0) return `M0 0L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
    const [x2, y2] = polar(end, r0);
    const [x3, y3] = polar(start, r0);
    return `M${x3.toFixed(2)} ${y3.toFixed(2)}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r0} ${r0} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
  }
  function polar(deg, r) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  }

  // Printed dial: fine ticks every 2°, longer every 10°, numerals every 30°.
  const ticks = [];
  for (let d = 0; d < 360; d += 2) {
    if (d % 30 === 0) continue;
    const long = d % 10 === 0;
    const [x0, y0] = polar(d, 247);
    const [x1, y1] = polar(d, long ? 238 : 242.5);
    ticks.push({ x0, y0, x1, y1, long });
  }
  const numerals = NUMERALS.map((n, i) => {
    const [x, y] = polar(i * 30, 236.5);
    return { n, x, y, rot: i * 30 };
  });

  const RING_R = 51;
  const ring = $derived.by(() => {
    const word = String(ringText).toUpperCase().slice(0, 40);
    const circumference = 2 * Math.PI * RING_R;
    const unit = (word.length + 5) * 7.2;
    const reps = Math.max(1, Math.round(circumference / unit));
    return Array(reps).fill(word).join('  ·  ') + '  ·  ';
  });

  function flick(strength) {
    const s = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0.5;
    ribbonEl?.animate?.(
      [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-3 - 7 * s}deg)` }, { transform: 'rotate(0deg)' }],
      { duration: 240 + 160 * (1 - s), easing: 'cubic-bezier(.25,.6,.3,1)' },
    );
  }

  /** Spin until `targetId` sits under the pointer. Resolves when stopped. */
  export function spin(targetId) {
    cancelAnimationFrame(tweenRaf);
    cancelAnimationFrame(spinRaf);
    entries = snap(entries.filter((e) => e.to > 0).map((e) => e.item));
    const angles = segmentAngles(entries.map((e) => e.weight));
    const idx = entries.findIndex((e) => e.id === targetId);
    if (idx < 0) return Promise.resolve(null);

    const reduced = prefersReducedMotion();
    const from = rotation;
    const to = landingRotation(from, angles[idx], {
      turns: reduced ? 1 : 4 + Math.floor(Math.random() * 3),
      offset: (Math.random() - 0.5) * 0.7,
    });
    const windup = reduced ? 0 : 520;
    const back = reduced ? 0 : 9;
    const duration = reduced ? 1100 : 6000 + Math.random() * 1400;
    const t0 = performance.now();
    let last = indexAtPointer(from, angles);
    let prevR = from;
    let prevT = t0;

    return new Promise((resolve) => {
      const step = (now) => {
        // rAF timestamps can predate t0 by a few ms; never let time run backwards.
        const el = Math.max(0, now - t0);
        let r;
        if (windup > 0 && el < windup) {
          const p = el / windup;
          r = from - back * Math.sin((p * Math.PI) / 2);
        } else {
          const p = Math.min(1, (el - windup) / duration);
          r = from - back + (to - from + back) * spinEase(p);
        }
        rotation = r;
        const i = indexAtPointer(r, angles);
        if (i !== last) {
          last = i;
          const speed = Math.min(1, Math.abs(r - prevR) / Math.max(1, now - prevT) / 1.2);
          try {
            flick(speed);
            ontick?.(speed);
          } catch (e) {
            console.warn(e); // a failed tick effect must never stop the wheel
          }
        }
        prevR = r;
        prevT = now;
        if (el < windup + duration) spinRaf = requestAnimationFrame(step);
        else {
          rotation = mod360(to);
          resolve(entries[idx].item);
        }
      };
      spinRaf = requestAnimationFrame(step);
    });
  }

  $effect(() => () => {
    cancelAnimationFrame(tweenRaf);
    cancelAnimationFrame(spinRaf);
  });
</script>

<div class="volvelle" class:spinning class:has-winner={!!winnerId} class:empty={!slices.length}>
  {#key pop}
    <div class="disc">
      <svg viewBox="-262 -262 524 524" role="img" aria-label={hubLabel}>
        <defs>
          <pattern id="vv-linen" width="3" height="3" patternUnits="userSpaceOnUse">
            <path d="M0 .5H3M.5 0V3" stroke="#fff" stroke-opacity=".07" stroke-width=".5" />
          </pattern>
          <pattern id="vv-paper" width="300" height="300" patternUnits="userSpaceOnUse">
            <image href="textures/paper.jpg" width="300" height="300" />
          </pattern>
          <radialGradient id="vv-shade" r="0.5">
            <stop offset="0.35" stop-color="#000" stop-opacity="0" />
            <stop offset="0.92" stop-color="#000" stop-opacity="0.12" />
            <stop offset="1" stop-color="#000" stop-opacity="0.28" />
          </radialGradient>
          <radialGradient id="vv-lamp" cx="0.3" cy="0.15" r="0.9">
            <stop offset="0" stop-color="#fff6df" stop-opacity="0.22" />
            <stop offset="0.6" stop-color="#fff6df" stop-opacity="0" />
          </radialGradient>
          <path id="vv-hub-path" d="M0 -51A51 51 0 1 1 0 51A51 51 0 1 1 0 -51" />
        </defs>

        <!-- fixed paper dial -->
        <circle r="258" class="dial-paper" />
        <circle r="258" fill="url(#vv-paper)" class="grain" />
        <circle r="253" class="rule heavy" />
        <circle r="249.5" class="rule" />
        <circle r="229" class="rule" />
        {#each ticks as t}
          <line x1={t.x0} y1={t.y0} x2={t.x1} y2={t.y1} class="tick" class:long={t.long} />
        {/each}
        {#each numerals as n}
          <text class="numeral" x={n.x} y={n.y} transform="rotate({n.rot} {n.x} {n.y})" text-anchor="middle" dominant-baseline="central">{n.n}</text>
        {/each}

        {#if slices.length}
          <g class="rotor" transform="rotate({rotation})">
            <circle r={R + 3} class="disc-edge" />
            {#each slices as s (s.id)}
              <g class="slice" class:win={s.id === winnerId}>
                <title>{s.full}</title>
                <path d={arcPath(s.start, s.end, R, HUB)} fill={s.color} />
                {#if s.span > 2.2}
                  <g transform="rotate({s.mid - 90})">
                    <text
                      class="t-title"
                      x={TEXT_OUT}
                      y={s.twoLines ? -s.fs * 0.14 : s.fs * 0.32}
                      text-anchor="end"
                      font-size={s.fs}>{s.title}</text
                    >
                    {#if s.twoLines}
                      <text class="t-author" x={TEXT_OUT} y={s.fs * 0.86} text-anchor="end" font-size={s.fs * 0.5}>{s.author}</text>
                    {/if}
                  </g>
                {/if}
              </g>
            {/each}
            <circle r={R} fill="url(#vv-linen)" pointer-events="none" />
            <circle r={R} fill="url(#vv-shade)" pointer-events="none" />
            {#if slices.length > 1}
              {#each slices as s (s.id)}
                {@const [x0, y0] = polar(s.start, HUB)}
                {@const [x1, y1] = polar(s.start, R)}
                <line class="seam" x1={x0} y1={y0} x2={x1} y2={y1} />
              {/each}
            {/if}
            <circle r={R - 0.5} class="gilt" />
            <circle r={R - 7} class="gilt-dots" />
            <!-- centre label -->
            <circle r={HUB} class="label-paper" />
            <circle r={HUB} fill="url(#vv-paper)" class="grain" />
            <circle r={HUB - 1} class="gilt" />
            <circle r={HUB - 4.5} class="rule fine" />
            <text class="ring-text" xml:space="preserve"><textPath href="#vv-hub-path" startOffset="0" textLength={2 * Math.PI * RING_R - 2} lengthAdjust="spacing">{ring}</textPath></text>
          </g>
        {:else}
          <circle r={R} class="empty-disc" />
          <circle r={R - 16} class="rule fine dashed" />
          <text class="empty-text" y="-84" text-anchor="middle">{emptyText}</text>
        {/if}

        <circle r="258" fill="url(#vv-lamp)" pointer-events="none" />
      </svg>

      <button class="rivet" type="button" onclick={onhub} disabled={disabled || spinning} aria-label={hubLabel}>
        <span class="rivet-face" aria-hidden="true">❦</span>
      </button>
    </div>
  {/key}

  <div class="ribbon" bind:this={ribbonEl} aria-hidden="true">
    <svg viewBox="0 0 30 132" preserveAspectRatio="none">
      <defs>
        <linearGradient id="vv-silk" x1="0" x2="1">
          <stop offset="0" stop-color="#4f161e" />
          <stop offset="0.35" stop-color="#7b2a33" />
          <stop offset="0.5" stop-color="#9c3f49" />
          <stop offset="0.62" stop-color="#7b2a33" />
          <stop offset="1" stop-color="#4a141c" />
        </linearGradient>
        <pattern id="vv-weave" width="30" height="2" patternUnits="userSpaceOnUse">
          <rect width="30" height="1" fill="#000" fill-opacity=".09" />
        </pattern>
      </defs>
      <path d="M3 0H27V132L15 118L3 132Z" fill="url(#vv-silk)" />
      <path d="M3 0H27V132L15 118L3 132Z" fill="url(#vv-weave)" />
      <path d="M5 0V126" stroke="#000" stroke-opacity=".12" stroke-width=".6" />
      <path d="M25 0V126" stroke="#fff" stroke-opacity=".12" stroke-width=".6" />
    </svg>
    <span class="eyelet"></span>
  </div>
</div>

<style>
  .volvelle {
    --dial: #f1e8d5;
    --dial-ink: #4a3d31;
    --gilt: #c9a66b;
    position: relative;
    width: min(100%, 540px);
    margin: 0 auto;
    aspect-ratio: 1;
  }
  :global(:root[data-theme='dark']) .volvelle {
    --dial: #d8cbb0;
    --dial-ink: #3d3127;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .volvelle {
      --dial: #d8cbb0;
      --dial-ink: #3d3127;
    }
  }
  .disc {
    position: relative;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 18px 22px rgba(40, 25, 12, 0.22)) drop-shadow(0 2px 3px rgba(40, 25, 12, 0.18));
    animation: disc-in 1.2s var(--ease-out) both;
  }
  @keyframes disc-in {
    from {
      opacity: 0;
      transform: rotate(-40deg) scale(0.94);
    }
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }
  .dial-paper {
    fill: var(--dial);
  }
  .grain {
    mix-blend-mode: multiply;
    opacity: 0.35;
  }
  .rule {
    fill: none;
    stroke: var(--dial-ink);
    stroke-width: 0.7;
    opacity: 0.8;
  }
  .rule.heavy {
    stroke-width: 1.6;
  }
  .rule.fine {
    stroke-width: 0.5;
    opacity: 0.6;
  }
  .rule.dashed {
    stroke-dasharray: 2 5;
  }
  .tick {
    stroke: var(--dial-ink);
    stroke-width: 0.6;
    opacity: 0.7;
  }
  .tick.long {
    stroke-width: 1;
    opacity: 0.9;
  }
  .numeral {
    fill: var(--dial-ink);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.04em;
  }
  .disc-edge {
    fill: #2a1f19;
    opacity: 0.5;
  }
  .slice {
    transition:
      opacity 0.6s ease,
      filter 0.6s ease;
  }
  .has-winner .slice:not(.win) {
    opacity: 0.32;
    filter: saturate(0.4);
  }
  .slice.win path {
    stroke: var(--gilt);
    stroke-width: 2.5;
    paint-order: stroke;
    animation: win 1.6s ease-in-out infinite alternate;
  }
  @keyframes win {
    to {
      filter: brightness(1.18);
    }
  }
  .t-title {
    fill: #f4ead6;
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: 0.005em;
  }
  .t-author {
    fill: #e2cfa4;
    font-family: var(--font-body);
    font-weight: 500;
    letter-spacing: 0.14em;
    opacity: 0.92;
  }
  .seam {
    stroke: var(--gilt);
    stroke-width: 0.9;
    opacity: 0.85;
  }
  .gilt {
    fill: none;
    stroke: var(--gilt);
    stroke-width: 1.4;
  }
  .gilt-dots {
    fill: none;
    stroke: var(--gilt);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-dasharray: 0.1 5.2;
    opacity: 0.9;
  }
  .label-paper {
    fill: var(--dial);
  }
  .ring-text {
    fill: var(--dial-ink);
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 7.6px;
    letter-spacing: 0.1em;
    white-space: pre;
  }
  .empty-disc {
    fill: color-mix(in srgb, var(--dial) 85%, #8a7355);
  }
  .empty-text {
    fill: var(--dial-ink);
    font-family: var(--font-display);
    font-size: 26px;
    font-style: italic;
    font-weight: 500;
  }

  /* brass rivet */
  .rivet {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: none;
    padding: 0;
    cursor: pointer;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 34% 28%, #f6e7c2 0%, #d9ba7d 22%, #a8844a 58%, #6f5328 100%);
    box-shadow:
      inset 0 0 0 1px rgba(255, 244, 214, 0.5),
      inset 0 -6px 12px rgba(70, 45, 15, 0.45),
      inset 0 5px 10px rgba(255, 245, 220, 0.35),
      0 3px 6px rgba(40, 25, 10, 0.45),
      0 0 0 3px rgba(90, 65, 30, 0.35);
    transition:
      filter 0.25s ease,
      transform 0.25s var(--ease-out);
  }
  .rivet-face {
    display: grid;
    place-items: center;
    width: 62%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 1px solid rgba(80, 55, 20, 0.45);
    box-shadow: inset 0 1px 0 rgba(255, 245, 220, 0.4);
    font-family: var(--font-display);
    font-size: clamp(16px, 3.4vw, 26px);
    line-height: 1;
    color: rgba(70, 45, 15, 0.8);
    text-shadow: 0 1px 0 rgba(255, 240, 210, 0.55);
  }
  .rivet:hover:not(:disabled) {
    filter: brightness(1.07);
    transform: translate(-50%, -50%) rotate(-12deg);
  }
  .rivet:active:not(:disabled) {
    transform: translate(-50%, -50%) scale(0.97);
  }
  .rivet:disabled {
    cursor: default;
  }
  .spinning .rivet-face {
    animation: rivet-glint 1.4s ease-in-out infinite;
  }
  @keyframes rivet-glint {
    50% {
      color: rgba(70, 45, 15, 0.45);
    }
  }

  /* silk ribbon pointer */
  .ribbon {
    position: absolute;
    top: -3.5%;
    left: 50%;
    width: 5.2%;
    height: 12.2%;
    margin-left: -2.6%;
    transform-origin: 50% 0;
    z-index: 2;
    filter: drop-shadow(0 3px 3px rgba(40, 15, 10, 0.35));
  }
  .ribbon svg {
    width: 100%;
    height: 100%;
    transform-origin: 50% 0;
    animation: sway 6s ease-in-out infinite;
  }
  .spinning .ribbon svg {
    animation: none;
  }
  @keyframes sway {
    0%,
    100% {
      transform: rotate(0.8deg);
    }
    50% {
      transform: rotate(-0.8deg);
    }
  }
  .eyelet {
    position: absolute;
    top: -5px;
    left: 50%;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #f6e7c2, #a8844a 60%, #6f5328);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  }
</style>
