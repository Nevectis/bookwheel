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

<div class="cover {cls}" class:has-img={src && !failed} class:shine style:width style:--g={genre.color} style:--gs={genreSwatch(book?.genre)}>
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
    border-radius: 3px 7px 7px 3px;
    overflow: hidden;
    container-type: inline-size;
    background: var(--g);
    box-shadow:
      0 1px 1px rgba(0, 0, 0, 0.12),
      0 10px 22px -10px rgba(30, 18, 10, 0.55),
      inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    flex: none;
    isolation: isolate;
  }
  .fallback {
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.035) 0 2px, transparent 2px 5px),
      repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 0 2px, transparent 2px 5px),
      radial-gradient(120% 90% at 30% 10%, rgba(255, 255, 255, 0.18), transparent 60%),
      var(--gs);
    color: #fbf1df;
    display: grid;
    padding: 9cqi 9cqi 9cqi 13cqi;
  }
  .frame {
    border: max(1px, 0.9cqi) solid rgba(242, 208, 138, 0.7);
    outline: max(1px, 0.5cqi) solid rgba(242, 208, 138, 0.35);
    outline-offset: 2.2cqi;
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5cqi;
    padding: 8cqi 6cqi;
    text-align: center;
    min-height: 0;
    overflow: hidden;
  }
  .orn {
    color: #f2d08a;
    font-size: 11cqi;
    line-height: 1;
  }
  .ft {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 11.5cqi;
    line-height: 1.08;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
    display: -webkit-box;
    -webkit-line-clamp: 5;
    line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-variation-settings: 'SOFT' 100;
  }
  .rule {
    width: 30%;
    height: max(1px, 0.7cqi);
    background: rgba(242, 208, 138, 0.8);
  }
  .fa {
    font-family: var(--font-mono);
    font-size: 6.4cqi;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.9;
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
    transition: opacity 0.5s ease;
  }
  img.loaded {
    opacity: 1;
  }
  .spine {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.28) 0%,
      rgba(255, 255, 255, 0.22) 2.5%,
      rgba(0, 0, 0, 0.12) 5%,
      transparent 9%,
      transparent 92%,
      rgba(0, 0, 0, 0.08) 100%
    );
  }
  .shine::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--mx, 30%) var(--my, 15%),
      rgba(255, 255, 255, 0.28),
      transparent 55%
    );
    mix-blend-mode: soft-light;
  }
</style>
