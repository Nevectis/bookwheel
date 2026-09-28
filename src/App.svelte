<script>
  import { onMount } from 'svelte';
  import { fade } from './lib/motion.js';
  import AuthScreen from './components/AuthScreen.svelte';
  import BookFormModal from './components/BookFormModal.svelte';
  import Chronicle from './components/Chronicle.svelte';
  import ClubGate from './components/ClubGate.svelte';
  import ClubModal from './components/ClubModal.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import CurrentBook from './components/CurrentBook.svelte';
  import Header from './components/Header.svelte';
  import Icon from './components/Icon.svelte';
  import Mark from './components/Mark.svelte';
  import ProfileModal from './components/ProfileModal.svelte';
  import ProgressTicker from './components/ProgressTicker.svelte';
  import ReviewModal from './components/ReviewModal.svelte';
  import Shelf from './components/Shelf.svelte';
  import SpinResultModal from './components/SpinResultModal.svelte';
  import Toasts from './components/Toasts.svelte';
  import WheelCard from './components/WheelCard.svelte';
  import { club } from './lib/store.svelte.js';
  import { i18n, t } from './lib/i18n.svelte.js';
  import { anyDialogOpen, initTheme, otherDialogOpen, ui } from './lib/ui.svelte.js';
  import { reveal, scrollToSection } from './lib/actions.js';

  onMount(() => {
    initTheme();
    document.documentElement.lang = i18n.lang;
    club.init();
  });

  const hour = new Date().getHours();
  const greetKey = hour < 11 ? 'hero.morning' : hour < 18 ? 'hero.day' : 'hero.evening';
  const dialogOpen = $derived(anyDialogOpen());

  $effect(() => {
    document.documentElement.style.overflow = dialogOpen ? 'hidden' : '';
  });
</script>

<div class="lamp" aria-hidden="true"></div>

{#if club.phase === 'loading' || (club.phase === 'ready' && !club.dataReady)}
  <div class="loading" out:fade={{ duration: 250 }}>
    <Mark size={64} spin />
    <p>{t('app.loading')}</p>
  </div>
{:else if club.phase === 'signed-out'}
  <AuthScreen />
{:else if club.phase === 'create' || club.phase === 'join'}
  <ClubGate mode={club.phase} />
{:else if club.phase === 'error'}
  <div class="loading">
    <p class="err">{t('common.error')}</p>
    <code>{club.error}</code>
    <button class="btn" onclick={() => location.reload()}><Icon name="spin" size={16} /> {t('common.reload')}</button>
  </div>
{:else if club.phase === 'ready'}
  <div class="app" inert={dialogOpen} in:fade={{ duration: 400 }}>
    <span id="top"></span>
    <a class="skip" href="#main">{t('common.skip')}</a>
    {#if club.mode === 'demo'}
      <aside class="demo-banner">
        <span>{t('demo.banner')}</span>
        <a href="https://github.com/nevectis/bookwheel#readme" target="_blank" rel="noopener">{t('demo.setup')} →</a>
      </aside>
    {/if}
    <Header />

    <main class="container" id="main" tabindex="-1">
      <section class="hero" use:reveal>
        <p class="eyebrow">{t(greetKey, { name: club.me?.name ?? '' })}</p>
        <h1 class="hero-title">
          {#if club.current}
            {t('hero.reading1')}<br /><em>{t('hero.reading2')}</em>
          {:else}
            {t('hero.next1')}<br /><em>{t('hero.next2')}</em>
          {/if}
        </h1>
        <p class="hero-stats">
          {t('hero.stats', { members: club.members.length, shelf: club.shelf.length, read: club.picked.length })}
        </p>
      </section>

      <div class="stage-grid">
        <div class="col-wheel" use:reveal={80}><WheelCard /></div>
        <div class="col-current" use:reveal={180}><CurrentBook /></div>
      </div>

      <div class="ticker-wrap" use:reveal={120}><ProgressTicker /></div>

      <p class="fleuron" aria-hidden="true">❦</p>
      <Shelf />
      <p class="fleuron" aria-hidden="true">❦</p>
      <Chronicle />
    </main>

    <footer class="foot">
      <div class="back-endpaper">
        <div class="plate">
          <a class="fbrand" href="#top" onclick={(e) => scrollToSection(e, 'top')}>
            <Mark size={38} />
            <span>Bookwheel</span>
          </a>
          <p class="colophon">{t('footer.colophon', { club: club.meta?.name ?? '' })}</p>
          <a class="up" href="#top" onclick={(e) => scrollToSection(e, 'top')}>
            <Icon name="arrowUp" size={14} stroke={1.6} />
            {t('footer.top')}
          </a>
        </div>
      </div>
    </footer>
  </div>
{/if}

<!-- Someone else's spin never pops up over (or steals focus from) a dialog you're using. -->
{#if ui.result && !otherDialogOpen()}
  <SpinResultModal bookId={ui.result.bookId} byName={ui.result.byName} onclose={() => (ui.result = null)} />
{/if}
{#if ui.review}
  <ReviewModal bookId={ui.review.bookId} congrats={ui.review.congrats} onclose={() => (ui.review = null)} />
{/if}
{#if ui.bookForm}
  <BookFormModal mode={ui.bookForm.mode} bookId={ui.bookForm.bookId} onclose={() => (ui.bookForm = null)} />
{/if}
{#if ui.clubOpen}
  <ClubModal onclose={() => (ui.clubOpen = false)} />
{/if}
{#if ui.profileOpen}
  <ProfileModal onclose={() => (ui.profileOpen = false)} />
{/if}
{#if ui.confirm}
  <ConfirmDialog />
{/if}
<Toasts />

<style>
  .lamp {
    position: fixed;
    inset: -20vh 0 auto;
    height: 90vh;
    z-index: 0;
    pointer-events: none;
    background: radial-gradient(60% 55% at 50% 0%, var(--lamp), transparent 70%);
    animation: flicker 9s ease-in-out infinite;
  }
  @keyframes flicker {
    0%,
    100% {
      opacity: 1;
    }
    30% {
      opacity: 0.86;
    }
    34% {
      opacity: 0.95;
    }
    62% {
      opacity: 0.9;
    }
  }
  .app {
    position: relative;
    z-index: 2;
  }
  .skip {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 200;
    padding: 10px 16px;
    border-radius: 6px;
    background: var(--ink);
    color: var(--paper);
    font-weight: 500;
    text-decoration: none;
  }
  .skip:not(:focus) {
    clip-path: inset(50%);
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    white-space: nowrap;
  }
  main:focus {
    outline: none;
  }
  .demo-banner {
    position: relative;
    z-index: 41;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 7px 16px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--gold-soft) 55%, var(--paper));
  }
  .demo-banner a {
    color: var(--ink);
    text-decoration-color: var(--gold);
  }
  .loading {
    position: fixed;
    inset: 0;
    z-index: 5;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 18px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 20px;
    color: var(--ink-soft);
    text-align: center;
    padding: 20px;
  }
  .err {
    font-family: var(--font-display);
    font-size: 24px;
    color: var(--ink);
  }
  main {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: clamp(56px, 8vw, 96px);
    padding-bottom: 80px;
  }
  .hero {
    padding-top: clamp(30px, 6vw, 70px);
    margin-bottom: calc(-1 * clamp(20px, 4vw, 48px));
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .hero-title {
    font-size: clamp(46px, 8vw, 96px);
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 0.95;
    margin-top: 18px;
  }
  .hero-title em {
    font-style: italic;
    font-weight: 500;
    color: var(--oxblood);
  }
  .hero-stats {
    margin-top: 22px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    color: var(--ink-soft);
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .hero-stats::before,
  .hero-stats::after {
    content: '';
    width: 36px;
    height: 1px;
    background: var(--line-strong);
  }
  .fleuron {
    margin: calc(-1 * clamp(20px, 4vw, 44px)) auto;
    width: min(420px, 70%);
  }
  .stage-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    gap: clamp(18px, 3vw, 30px);
    align-items: stretch;
  }
  .col-wheel,
  .col-current {
    min-width: 0;
  }
  .ticker-wrap {
    margin-top: calc(-1 * clamp(24px, 5vw, 60px));
  }
  .foot {
    position: relative;
    z-index: 2;
    margin-top: 48px;
  }
  /* the back endpaper: marbled paper with the club's bookplate */
  .back-endpaper {
    position: relative;
    display: grid;
    place-items: center;
    padding: clamp(56px, 8vw, 96px) 16px clamp(64px, 9vw, 110px);
    background: url('/textures/marble.jpg') center / cover;
    border-top: 1px solid var(--line-strong);
    box-shadow: inset 0 18px 24px -18px rgba(20, 12, 5, 0.55);
  }
  .back-endpaper::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--endpaper-dim, transparent);
    pointer-events: none;
  }
  :global(:root[data-theme='dark']) .back-endpaper {
    --endpaper-dim: rgba(14, 10, 7, 0.45);
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .back-endpaper {
      --endpaper-dim: rgba(14, 10, 7, 0.45);
    }
  }
  .plate {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: min(520px, 100%);
    padding: 30px 32px 26px;
    text-align: center;
    background: var(--card);
    color: var(--ink);
    border: 1px solid var(--gold);
    outline: 1px solid color-mix(in srgb, var(--gold) 55%, transparent);
    outline-offset: -8px;
    box-shadow:
      0 2px 3px rgba(20, 10, 4, 0.25),
      0 24px 44px -20px rgba(20, 10, 4, 0.6);
  }
  .fbrand {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: var(--ink);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 30px;
  }
  .colophon {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    line-height: 1.4;
    color: var(--ink-soft);
    max-width: 40ch;
    text-wrap: balance;
  }
  .up {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-soft);
    text-decoration: none;
    padding: 11px 14px;
    border-radius: 6px;
  }
  .up:hover {
    color: var(--ink);
    background: var(--card-2);
  }
  @media (max-width: 1000px) {
    .stage-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .col-current {
      order: -1;
    }
  }
  @media (max-width: 760px) {
    .back-endpaper {
      padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px));
    }
    .plate {
      padding: 24px 20px 20px;
    }
    .hero-stats {
      flex-wrap: wrap;
      justify-content: center;
      text-align: center;
      font-size: 17px;
    }
    .hero-stats::before,
    .hero-stats::after {
      display: none;
    }
    .demo-banner {
      letter-spacing: 0.1em;
      gap: 4px 10px;
    }
  }
</style>
