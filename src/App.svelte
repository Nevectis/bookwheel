<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import AuthScreen from './components/AuthScreen.svelte';
  import BookFormModal from './components/BookFormModal.svelte';
  import Chronicle from './components/Chronicle.svelte';
  import ClubGate from './components/ClubGate.svelte';
  import ClubModal from './components/ClubModal.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import CurrentBook from './components/CurrentBook.svelte';
  import Header from './components/Header.svelte';
  import Icon from './components/Icon.svelte';
  import ProfileModal from './components/ProfileModal.svelte';
  import ProgressTicker from './components/ProgressTicker.svelte';
  import ReviewModal from './components/ReviewModal.svelte';
  import Shelf from './components/Shelf.svelte';
  import SpinResultModal from './components/SpinResultModal.svelte';
  import Toasts from './components/Toasts.svelte';
  import WheelCard from './components/WheelCard.svelte';
  import { club } from './lib/store.svelte.js';
  import { i18n, t } from './lib/i18n.svelte.js';
  import { anyDialogOpen, applyTheme, ui } from './lib/ui.svelte.js';
  import { reveal } from './lib/actions.js';

  onMount(() => {
    applyTheme();
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

<div class="ambient" aria-hidden="true">
  <span class="blob b1"></span>
  <span class="blob b2"></span>
  <span class="blob b3"></span>
</div>

{#if club.phase === 'loading' || (club.phase === 'ready' && !club.dataReady)}
  <div class="loading" out:fade={{ duration: 250 }}>
    <span class="loader" aria-hidden="true"></span>
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
    <button class="btn" onclick={() => location.reload()}><Icon name="spin" size={16} /> Reload</button>
  </div>
{:else if club.phase === 'ready'}
  <div class="app" inert={dialogOpen} in:fade={{ duration: 400 }}>
    <span id="top"></span>
    {#if club.mode === 'demo'}
      <div class="demo-banner">
        <Icon name="sparkles" size={14} />
        {t('demo.banner')}
        <a href="https://github.com/nevectis/bookwheel#readme" target="_blank" rel="noopener">{t('demo.setup')} →</a>
      </div>
    {/if}
    <Header />

    <main class="container">
      <section class="hero" use:reveal>
        <p class="eyebrow">{t(greetKey, { name: club.me?.name ?? '' })}</p>
        <h1 class="hero-title">
          {#if club.current}
            {t('hero.titleReading')}
          {:else}
            {t('hero.title')}
          {/if}
        </h1>
      </section>

      <div class="stage-grid">
        <div class="col-wheel" use:reveal={80}><WheelCard /></div>
        <div class="col-current" use:reveal={180}><CurrentBook /></div>
      </div>

      <div class="ticker-wrap" use:reveal={120}><ProgressTicker /></div>

      <Shelf />
      <Chronicle />
    </main>

    <footer class="container foot">
      <span class="fmark">Book<em>wheel</em></span>
      <span>{club.meta?.name}</span>
      <a href="#top"><Icon name="arrowUp" size={15} /></a>
    </footer>
  </div>
{/if}

{#if ui.result}
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
  .ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .blob {
    position: absolute;
    width: 46vmax;
    height: 46vmax;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.9;
  }
  .b1 {
    background: radial-gradient(closest-side, var(--glow-1), transparent);
    top: -18vmax;
    left: -12vmax;
    animation: drift1 38s ease-in-out infinite alternate;
  }
  .b2 {
    background: radial-gradient(closest-side, var(--glow-2), transparent);
    top: 30vh;
    right: -20vmax;
    animation: drift2 44s ease-in-out infinite alternate;
  }
  .b3 {
    background: radial-gradient(closest-side, var(--glow-3), transparent);
    bottom: -24vmax;
    left: 20vw;
    animation: drift3 52s ease-in-out infinite alternate;
  }
  @keyframes drift1 {
    to {
      transform: translate(18vw, 22vh) scale(1.2);
    }
  }
  @keyframes drift2 {
    to {
      transform: translate(-22vw, -12vh) scale(0.85);
    }
  }
  @keyframes drift3 {
    to {
      transform: translate(-14vw, -20vh) scale(1.15);
    }
  }
  .app {
    position: relative;
    z-index: 2;
  }
  .demo-banner {
    position: relative;
    z-index: 41;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 700;
    color: #2a1d08;
    background: linear-gradient(90deg, #e2b85e, #f3d58e, #e2b85e);
    background-size: 200% 100%;
    animation: shimmer 8s linear infinite;
  }
  .demo-banner a {
    color: #6b1f33;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  .loading {
    position: fixed;
    inset: 0;
    z-index: 5;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    color: var(--ink-soft);
    text-align: center;
    padding: 20px;
  }
  .loader {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: conic-gradient(#8c2f45 0 60deg, #c1902f 0 120deg, #2f6f73 0 180deg, #b4533c 0 240deg, #5b4a9e 0 300deg, #3f7a57 0);
    box-shadow:
      0 0 0 5px #c1902f,
      0 10px 24px -8px rgba(0, 0, 0, 0.4);
    animation: load-spin 1.1s cubic-bezier(0.5, 0.1, 0.3, 1) infinite;
  }
  @keyframes load-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .err {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--ink);
  }
  main {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: clamp(56px, 9vw, 110px);
    padding-bottom: 60px;
  }
  .hero {
    padding-top: clamp(22px, 5vw, 48px);
    margin-bottom: calc(-1 * clamp(30px, 6vw, 70px));
  }
  .hero-title {
    font-size: clamp(38px, 7vw, 76px);
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1;
    margin-top: 10px;
    max-width: 16ch;
    font-variation-settings: 'SOFT' 100, 'WONK' 1;
  }
  .stage-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    gap: clamp(18px, 3vw, 28px);
    align-items: stretch;
  }
  .ticker-wrap {
    margin-top: calc(-1 * clamp(30px, 6vw, 80px));
  }
  .foot {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 14px;
    padding-top: 26px;
    padding-bottom: 40px;
    border-top: 1px solid var(--line);
    color: var(--ink-soft);
    font-size: 14px;
  }
  .fmark {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 18px;
    color: var(--ink);
  }
  .fmark em {
    color: var(--accent);
  }
  .foot a {
    margin-left: auto;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--line);
    color: var(--ink-soft);
  }
  .col-wheel,
  .col-current {
    min-width: 0;
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
    .foot {
      padding-bottom: 110px;
    }
  }
</style>
