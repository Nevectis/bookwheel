<script>
  import { fly, fade, slide } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import HeroArt from './HeroArt.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { i18n, setLang, t } from '../lib/i18n.svelte.js';

  let tab = $state('signin');
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let info = $state('');
  let busy = $state(false);

  function authError(e) {
    const c = e?.code ?? '';
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(c))
      return t('auth.err.credentials');
    if (c === 'auth/email-already-in-use') return t('auth.err.emailInUse');
    if (c === 'auth/weak-password') return t('auth.err.weakPassword');
    if (c === 'auth/invalid-email' || c === 'auth/missing-email') return t('auth.err.invalidEmail');
    if (['auth/popup-closed-by-user', 'auth/popup-blocked', 'auth/cancelled-popup-request'].includes(c)) return t('auth.err.popup');
    if (c === 'auth/unauthorized-domain') return t('auth.err.domain');
    if (c === 'auth/operation-not-allowed') return t('auth.err.disabled');
    if (c === 'auth/network-request-failed') return t('auth.err.network');
    if (c === 'auth/too-many-requests') return t('auth.err.tooMany');
    return t('common.error');
  }

  async function run(fn) {
    error = '';
    info = '';
    busy = true;
    try {
      await fn();
    } catch (e) {
      console.warn(e);
      error = authError(e);
    } finally {
      busy = false;
    }
  }

  const submit = (e) => {
    e.preventDefault();
    run(() => (tab === 'signin' ? club.backend.signInEmail(email, password) : club.backend.registerEmail(name, email, password)));
  };
  const demo = (e) => {
    e.preventDefault();
    run(() => club.signInDemo(name));
  };
  const google = () => run(() => club.backend.signInGoogle());
  async function reset() {
    if (!email.trim()) {
      error = t('auth.needEmail');
      return;
    }
    await run(() => club.backend.resetPassword(email));
    if (!error) info = t('auth.resetSent');
  }
</script>

<main class="auth">
  <div class="lang">
    <button class:on={i18n.lang === 'de'} onclick={() => setLang('de')}>DE</button>
    <button class:on={i18n.lang === 'en'} onclick={() => setLang('en')}>EN</button>
  </div>

  <section class="brand" in:fade={{ duration: 800 }}>
    <HeroArt />
    <h1 class="logo">Book<span class="display-italic">wheel</span></h1>
    <p class="tag">{t('app.tagline')}</p>
  </section>

  <section class="card panel" in:fly={{ y: 30, duration: 700, delay: 150, easing: backOut }}>
    {#if club.mode === 'demo'}
      <p class="eyebrow"><Icon name="sparkles" size={14} /> {t('demo.title')}</p>
      <h2>{t('auth.welcome')}</h2>
      <p class="intro">{t('demo.intro')}</p>
      <form onsubmit={demo} class="form">
        <label class="field">
          <span>{t('auth.name')}</span>
          <input type="text" bind:value={name} maxlength="40" required autocomplete="given-name" data-testid="demo-name" />
        </label>
        <button class="btn btn-primary big" type="submit" disabled={busy} data-testid="demo-start">
          {t('demo.start')}
          <Icon name="right" size={18} stroke={2.6} />
        </button>
      </form>
      <p class="setup">
        <Icon name="book" size={14} />
        <a href="https://github.com/nevectis/bookwheel#readme" target="_blank" rel="noopener">{t('demo.setup')}: Firebase</a>
      </p>
    {:else}
      <h2>{t('auth.welcome')}</h2>
      <p class="intro">{t('auth.intro')}</p>

      <button class="btn google" type="button" onclick={google} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {t('auth.google')}
      </button>

      <div class="or"><span>{t('auth.or')}</span></div>

      <form onsubmit={submit} class="form">
        {#if tab === 'register'}
          <label class="field" transition:slide={{ duration: 220 }}>
            <span>{t('auth.name')}</span>
            <input type="text" bind:value={name} maxlength="40" required autocomplete="given-name" data-testid="reg-name" />
          </label>
        {/if}
        <label class="field">
          <span>{t('auth.email')}</span>
          <input type="email" bind:value={email} required autocomplete="email" data-testid="email" />
        </label>
        <label class="field">
          <span>{t('auth.password')}</span>
          <input
            type="password"
            bind:value={password}
            required
            minlength="6"
            autocomplete={tab === 'signin' ? 'current-password' : 'new-password'}
            data-testid="password"
          />
        </label>
        <button class="btn btn-primary big" type="submit" disabled={busy} data-testid="auth-submit">
          {tab === 'signin' ? t('auth.signIn') : t('auth.register')}
        </button>
      </form>

      <div class="switch">
        <button type="button" class="linkish" onclick={() => ((tab = tab === 'signin' ? 'register' : 'signin'), (error = ''))} data-testid="auth-toggle">
          {tab === 'signin' ? t('auth.toRegister') : t('auth.toSignIn')}
        </button>
        {#if tab === 'signin'}
          <button type="button" class="linkish" onclick={reset}>{t('auth.forgot')}</button>
        {/if}
      </div>
    {/if}

    {#if error}<p class="form-error" role="alert" in:fly={{ y: -6 }}>{error}</p>{/if}
    {#if info}<p class="info" role="status" in:fly={{ y: -6 }}>{info}</p>{/if}
  </section>
</main>

<style>
  .auth {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    align-items: center;
    gap: clamp(24px, 5vw, 80px);
    padding: clamp(24px, 6vw, 80px);
    max-width: 1200px;
    margin: 0 auto;
  }
  .lang {
    position: absolute;
    top: 18px;
    right: 18px;
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--card);
    border: 1px solid var(--line);
  }
  .lang button {
    border: none;
    background: none;
    padding: 5px 11px;
    border-radius: 999px;
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
    color: var(--ink-soft);
  }
  .lang button.on {
    background: var(--ink);
    color: var(--paper);
  }
  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
  }
  .logo {
    font-size: clamp(54px, 9vw, 96px);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 0.95;
    margin-top: 10px;
  }
  .tag {
    font-size: clamp(16px, 2vw, 19px);
    color: var(--ink-soft);
    max-width: 30ch;
  }
  .panel {
    padding: clamp(24px, 4vw, 40px);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--accent);
  }
  h2 {
    font-size: clamp(28px, 4vw, 36px);
  }
  .intro {
    color: var(--ink-soft);
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 4px;
  }
  .big {
    min-height: 50px;
    font-size: 16px;
  }
  .google {
    min-height: 50px;
    font-size: 15.5px;
    --btn-bg: var(--card);
    margin-top: 6px;
  }
  .or {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--ink-faint);
    font-size: 13px;
  }
  .or::before,
  .or::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--line);
  }
  .switch {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .linkish {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-weight: 700;
    cursor: pointer;
    font-size: 14px;
  }
  .setup {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .info {
    color: var(--green);
    font-weight: 600;
    font-size: 14px;
  }
  @media (max-width: 860px) {
    .auth {
      grid-template-columns: 1fr;
      padding-top: 64px;
    }
    .brand :global(.art) {
      width: min(230px, 60vw);
    }
  }
</style>
