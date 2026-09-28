<script>
  // Shown after sign-in to people who aren't members yet: found the club
  // (first person) or join it with the invite code.
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import HeroArt from './HeroArt.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { normalizeCode } from '../lib/club.js';

  let { mode } = $props();
  const fromUrl = new URLSearchParams(location.search).get('invite') ?? '';
  let clubName = $state('');
  let memberName = $state(club.user?.name ?? '');
  let code = $state(normalizeCode(fromUrl));
  let error = $state('');
  let busy = $state(false);

  async function submit(e) {
    e.preventDefault();
    error = '';
    busy = true;
    try {
      if (mode === 'create') await club.createClub(clubName, memberName);
      else await club.joinClub(code, memberName);
      if (fromUrl) history.replaceState(null, '', location.pathname + location.hash);
    } catch (err) {
      console.warn(err);
      error = err?.code === 'bad-code' ? t('club.badCode') : t('common.error');
    } finally {
      busy = false;
    }
  }
</script>

<main class="gate">
  <div class="art-wrap"><HeroArt /></div>
  <form class="card panel" onsubmit={submit} in:fly={{ y: 30, duration: 700, easing: backOut }}>
    {#if mode === 'create'}
      <p class="eyebrow"><Icon name="crown" size={14} /> Bookwheel</p>
      <h1>{t('club.createTitle')}</h1>
      <p class="intro">{t('club.createIntro')}</p>
      <label class="field">
        <span>{t('club.name')}</span>
        <input type="text" bind:value={clubName} maxlength="80" required placeholder={t('club.namePlaceholder')} data-testid="club-name" />
      </label>
    {:else}
      <p class="eyebrow"><Icon name="envelope" size={14} /> Bookwheel</p>
      <h1>{t('club.joinTitle', { club: club.clubName || 'Bookwheel' })}</h1>
      <p class="intro">{t('club.joinIntro')}</p>
      <label class="field">
        <span>{t('club.code')}</span>
        <input
          class="code"
          type="text"
          bind:value={code}
          onblur={() => (code = normalizeCode(code))}
          maxlength="12"
          required
          placeholder="ABCD-EFGH"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          data-testid="join-code"
        />
      </label>
    {/if}
    <label class="field">
      <span>{t('auth.name')}</span>
      <input type="text" bind:value={memberName} maxlength="40" required data-testid="member-name" />
    </label>
    {#if error}<p class="form-error" role="alert" in:fly={{ y: -6 }}>{error}</p>{/if}
    <button class="btn btn-primary big" type="submit" disabled={busy} data-testid="gate-submit">
      {mode === 'create' ? t('club.create') : t('club.join')}
      <Icon name="right" size={18} stroke={2.6} />
    </button>
    <p class="who">
      {t('club.signedInAs', { who: club.user?.email ?? club.user?.name ?? '' })} ·
      <button type="button" class="linkish" onclick={() => club.signOut()}>{t('club.switchAccount')}</button>
    </p>
  </form>
</main>

<style>
  .gate {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 32px 18px;
  }
  .art-wrap :global(.art) {
    width: min(200px, 50vw);
  }
  .panel {
    width: min(460px, 100%);
    padding: clamp(24px, 4vw, 36px);
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
  h1 {
    font-size: clamp(28px, 5vw, 36px);
  }
  .intro {
    color: var(--ink-soft);
  }
  .code {
    font-family: var(--font-mono);
    font-size: 22px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-align: center;
  }
  .big {
    min-height: 50px;
    font-size: 16px;
  }
  .who {
    font-size: 13px;
    color: var(--ink-soft);
    text-align: center;
  }
  .linkish {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
  }
</style>
