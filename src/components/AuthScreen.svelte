<script>
  import { fly, slide } from '../lib/motion.js';
  import BookSpread from './BookSpread.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';

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

<BookSpread owner="Bookwheel" motto={t('app.tagline')}>
  <section class="panel">
    {#if club.mode === 'demo'}
      <p class="eyebrow">{t('demo.title')}</p>
      <h2>{t('auth.welcome')}</h2>
      <p class="intro">{t('demo.intro')}</p>
      <form onsubmit={demo} class="form">
        <label class="field">
          <span>{t('auth.name')}</span>
          <input type="text" bind:value={name} maxlength="40" required autocomplete="given-name" data-testid="demo-name" />
        </label>
        <button class="btn btn-primary big" type="submit" disabled={busy} data-testid="demo-start">
          {t('demo.start')}
        </button>
      </form>
      <p class="setup">
        <a href="https://github.com/nevectis/bookwheel#readme" target="_blank" rel="noopener">{t('demo.setup')}: Firebase</a>
      </p>
    {:else}
      <p class="eyebrow">Bookwheel</p>
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
</BookSpread>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .eyebrow {
    color: var(--oxblood);
  }
  h2 {
    font-size: clamp(38px, 5vw, 52px);
    font-weight: 500;
    line-height: 1;
  }
  .intro {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    line-height: 1.4;
    color: var(--ink-soft);
    margin-bottom: 6px;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 4px;
  }
  .big {
    min-height: 50px;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 21px;
    letter-spacing: 0.01em;
  }
  .google {
    min-height: 48px;
    font-size: 14.5px;
    margin-top: 6px;
  }
  .or {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17px;
    color: var(--ink-soft);
  }
  .or::before,
  .or::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--line-strong);
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
    color: var(--link);
    font-weight: 500;
    cursor: pointer;
    font-size: 14px;
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
    text-underline-offset: 3px;
  }
  .setup {
    font-size: 13px;
    color: var(--ink-soft);
    letter-spacing: 0.04em;
  }
  .setup a {
    text-decoration-color: var(--gold);
  }
  .info {
    color: var(--green);
    font-size: 14px;
  }
</style>
