<script>
  // An open book: marbled endpaper with a bookplate on the left page,
  // the content (sign-in, club setup) on the right page.
  import { fade, fly } from '../lib/motion.js';
  import { cubicOut } from 'svelte/easing';
  import Mark from './Mark.svelte';
  import { i18n, setLang, t } from '../lib/i18n.svelte.js';

  let { owner = 'Bookwheel', motto = '', children } = $props();
</script>

<main class="spread">
  <aside class="endpaper" in:fade={{ duration: 900 }}>
    <div class="plate" in:fly={{ y: 16, duration: 1000, delay: 200, easing: cubicOut }}>
      <Mark size={68} />
      <span class="ex">Ex Libris</span>
      <span class="owner">{owner}</span>
      {#if motto}<span class="motto">{motto}</span>{/if}
    </div>
  </aside>
  <section class="leaf">
    <div class="lang" role="group" aria-label={t('menu.language')}>
      <button class:on={i18n.lang === 'de'} aria-pressed={i18n.lang === 'de'} onclick={() => setLang('de')}>DE</button>
      <button class:on={i18n.lang === 'en'} aria-pressed={i18n.lang === 'en'} onclick={() => setLang('en')}>EN</button>
    </div>
    <div class="content" in:fly={{ y: 20, duration: 900, delay: 150, easing: cubicOut }}>
      {@render children()}
    </div>
  </section>
</main>

<style>
  .spread {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .endpaper {
    position: relative;
    display: grid;
    place-items: center;
    padding: 40px;
    background: url('/textures/marble.jpg') center / cover;
  }
  /* the gutter where the pages meet */
  .endpaper::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 60px;
    background: linear-gradient(90deg, transparent, rgba(30, 18, 8, 0.38));
    pointer-events: none;
  }
  .plate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: min(340px, 86%);
    padding: 34px 28px 30px;
    text-align: center;
    color: #2a2420;
    background:
      url('/textures/paper.jpg') center / 400px,
      #f4ecdb;
    background-blend-mode: soft-light;
    border: 1px solid #b89a5c;
    outline: 1px solid rgba(184, 154, 92, 0.55);
    outline-offset: -8px;
    box-shadow:
      0 2px 3px rgba(20, 10, 4, 0.3),
      0 26px 50px -20px rgba(20, 10, 4, 0.7);
    transform: rotate(-1.2deg);
  }
  .ex {
    margin-top: 12px;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 26px;
    line-height: 1;
    color: #8a6a3a;
  }
  .owner {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(34px, 4vw, 46px);
    line-height: 1.02;
    text-wrap: balance;
  }
  .motto {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid rgba(184, 154, 92, 0.6);
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    line-height: 1.35;
    color: #5f5247;
    max-width: 26ch;
  }
  .leaf {
    position: relative;
    display: grid;
    place-items: center;
    padding: clamp(56px, 7vw, 90px) clamp(22px, 6vw, 80px);
  }
  .leaf::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 50px;
    background: linear-gradient(90deg, rgba(60, 35, 15, 0.14), transparent);
    pointer-events: none;
  }
  .content {
    width: min(420px, 100%);
  }
  .lang {
    position: absolute;
    top: 20px;
    right: 22px;
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 8px;
    border: 1px solid var(--line-strong);
  }
  .lang button {
    border: none;
    background: none;
    padding: 4px 10px;
    border-radius: 5px;
    font-weight: 500;
    font-size: 11.5px;
    letter-spacing: 0.14em;
    cursor: pointer;
    color: var(--ink-soft);
  }
  .lang button.on {
    background: var(--ink);
    color: var(--paper);
  }
  @media (max-width: 860px) {
    .spread {
      grid-template-columns: 1fr;
    }
    .endpaper {
      min-height: 0;
      padding: 56px 24px 40px;
    }
    .endpaper::after {
      top: auto;
      left: 0;
      width: auto;
      height: 36px;
      background: linear-gradient(180deg, transparent, rgba(30, 18, 8, 0.32));
    }
    .leaf::before {
      width: auto;
      height: 30px;
      right: 0;
      background: linear-gradient(180deg, rgba(60, 35, 15, 0.12), transparent);
    }
    .plate {
      padding: 26px 22px 22px;
    }
    .leaf {
      padding-top: 40px;
    }
  }
</style>
