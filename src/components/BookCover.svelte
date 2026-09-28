<script>
  // A book cover: the real image when there is one, otherwise a typeset
  // cloth-bound cover in the genre's colour. Always looks like a physical book.
  import { genreById, genreSwatch } from '../lib/genres.js';
  import { safeImageUrl } from '../lib/covers.js';

  let { book, width = '100%', shine = true, class: cls = '' } = $props();

  let failed = $state(false);
  let loaded = $state(false);
  const src = $derived(safeImageUrl(book?.coverUrl));
  $effect(() => {
    src; // reset when the image changes
    failed = false;
    loaded = false;
  });
  const genre = $derived(genreById(book?.genre));
</script>

<div class="cover {cls}" class:has-img={src && !failed} class:shine style:width style:--g={genre.color} style:--gs={genreSwatch(book?.genre)} style:--deepen={genre.gradient ? 0.45 : null}>
  <div class="fallback" aria-hidden={src && !failed && loaded ? 'true' : undefined}>
    <div class="frame">
      <span class="orn">❦</span>
      <span class="ft">{book?.title ?? ''}</span>
      <span class="rule"></span>
      <span class="fa">{book?.author ?? ''}</span>
    </div>
  </div>
  {#if src && !failed}
    <img
      {src}
      alt={book?.title ?? ''}
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      class:loaded
      onload={(e) => {
        // Open Library returns a 1×1 pixel when it has no cover.
        if (e.currentTarget.naturalWidth < 10) failed = true;
        else loaded = true;
      }}
      onerror={() => (failed = true)}
    />
  {/if}
  <span class="spine" aria-hidden="true"></span>
</div>

<style>
  .cover {
    position: relative;
    aspect-ratio: 2 / 3;
    border-radius: 2px 5px 5px 2px;
    overflow: hidden;
    container-type: inline-size;
    background: var(--g);
    box-shadow:
      0 1px 1px rgba(0, 0, 0, 0.14),
      0 12px 22px -12px rgba(30, 18, 10, 0.6),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    flex: none;
    isolation: isolate;
  }
  /* cloth binding with gilt tooling */
  .fallback {
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.07) 0 1px, transparent 1px 3px),
      radial-gradient(130% 90% at 30% 8%, rgba(255, 240, 210, 0.16), transparent 60%),
      radial-gradient(140% 100% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.28)),
      /* deepens the cloth so the gilt lettering reads on every genre colour */
      linear-gradient(rgba(20, 12, 6, var(--deepen, 0.28)), rgba(20, 12, 6, var(--deepen, 0.28))),
      var(--gs);
    color: #e6cc92;
    display: grid;
    padding: 8cqi 8cqi 8cqi 14cqi;
  }
  .frame {
    border: max(1px, 0.7cqi) solid rgba(214, 180, 118, 0.75);
    outline: max(1px, 0.4cqi) solid rgba(214, 180, 118, 0.45);
    outline-offset: -2.6cqi;
    border-radius: 1px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5cqi;
    padding: 9cqi 7cqi;
    text-align: center;
    min-height: 0;
    overflow: hidden;
  }
  .orn {
    font-family: var(--font-display);
    color: #d9bb7e;
    font-size: 12cqi;
    line-height: 1;
  }
  .ft {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 12.5cqi;
    line-height: 1.02;
    color: #f3e2b6;
    text-shadow:
      0 -1px 0 rgba(0, 0, 0, 0.35),
      0 1px 0 rgba(255, 235, 190, 0.12);
    display: -webkit-box;
    -webkit-line-clamp: 5;
    line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    hyphens: auto;
  }
  .rule {
    width: 26%;
    height: max(1px, 0.6cqi);
    background: rgba(214, 180, 118, 0.8);
  }
  .fa {
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 5.6cqi;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #ead3a0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.6s ease;
  }
  img.loaded {
    opacity: 1;
  }
  /* spine hinge + page-edge shading */
  .spine {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.32) 0%,
      rgba(255, 255, 255, 0.16) 2.4%,
      rgba(0, 0, 0, 0.14) 4.5%,
      rgba(0, 0, 0, 0.22) 8.5%,
      rgba(255, 255, 255, 0.06) 9.6%,
      transparent 14%,
      transparent 94%,
      rgba(0, 0, 0, 0.1) 100%
    );
  }
  .shine::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background: radial-gradient(circle at var(--mx, 30%) var(--my, 12%), rgba(255, 245, 220, 0.22), transparent 55%);
    mix-blend-mode: soft-light;
  }
</style>
