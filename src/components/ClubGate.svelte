<script>
  // Shown after sign-in to people who aren't members yet: found the club
  // (first person) or join it with the invite code.
  import { fly } from 'svelte/transition';
  import BookSpread from './BookSpread.svelte';
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

<BookSpread owner={mode === 'join' && club.clubName ? club.clubName : 'Bookwheel'} motto={t('app.tagline')}>
  <form class="panel" onsubmit={submit}>
    {#if mode === 'create'}
      <p class="eyebrow">Bookwheel</p>
      <h1>{t('club.createTitle')}</h1>
      <p class="intro">{t('club.createIntro')}</p>
      <label class="field">
        <span>{t('club.name')}</span>
        <input type="text" bind:value={clubName} maxlength="80" required placeholder={t('club.namePlaceholder')} data-testid="club-name" />
      </label>
    {:else}
      <p class="eyebrow">Bookwheel</p>
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
    </button>
    <p class="who">
      {t('club.signedInAs', { who: club.user?.email ?? club.user?.name ?? '' })} ·
      <button type="button" class="linkish" onclick={() => club.signOut()}>{t('club.switchAccount')}</button>
    </p>
  </form>
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
  h1 {
    font-size: clamp(36px, 4.6vw, 50px);
    font-weight: 500;
    line-height: 1.02;
  }
  .intro {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    line-height: 1.4;
    color: var(--ink-soft);
    margin-bottom: 4px;
  }
  .code {
    font-family: var(--font-type);
    font-weight: 700;
    font-size: 24px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    text-align: center;
  }
  .big {
    min-height: 50px;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 21px;
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
    color: var(--link);
    font-weight: 500;
    cursor: pointer;
    font-size: 13px;
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
    text-underline-offset: 3px;
  }
</style>
