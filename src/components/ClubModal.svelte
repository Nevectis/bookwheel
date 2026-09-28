<script>
  import { fly } from '../lib/motion.js';
  import { flip } from '../lib/motion.js';
  import Modal from './Modal.svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import { club, landed } from '../lib/store.svelte.js';
  import { t, locale } from '../lib/i18n.svelte.js';
  import { longDate } from '../lib/dates.js';
  import { confirmDialog, toast } from '../lib/ui.svelte.js';

  let { onclose } = $props();
  let copied = $state('');
  let renaming = $state(false);
  let newName = $state(club.meta?.name ?? '');

  const code = $derived(club.invite?.code ?? '');
  const link = $derived.by(() => {
    const u = new URL(location.href);
    u.hash = '';
    u.search = '';
    u.searchParams.set('invite', code);
    return u.toString();
  });

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      copied = what;
      setTimeout(() => (copied = ''), 1800);
    } catch {
      toast(text);
    }
  }

  async function regenerate() {
    const ok = await confirmDialog(t('clubm.newCode') + '?', { confirmLabel: t('clubm.newCode') });
    if (ok) club.regenerateInvite().catch(() => {});
  }
  async function remove(m) {
    const ok = await confirmDialog(t('clubm.removeConfirm', { name: m.name }), { confirmLabel: t('clubm.remove'), danger: true });
    if (ok) club.removeMember(m.id).catch(() => {});
  }
  async function leave() {
    const ok = await confirmDialog(t('clubm.leaveConfirm'), { confirmLabel: t('clubm.leave'), danger: true });
    if (!ok) return;
    onclose();
    club.leaveClub().catch(() => {});
  }
  async function rename(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await landed(club.renameClub(newName));
      renaming = false;
    } catch {
      /* toast shown by the store */
    }
  }
</script>

<Modal {onclose} labelledby="club-title" size="md">
  <p class="eyebrow">{t('clubm.title')}</p>
  {#if renaming}
    <form class="rename" onsubmit={rename}>
      <input type="text" bind:value={newName} maxlength="80" data-autofocus />
      <button class="btn btn-primary btn-sm" type="submit">{t('common.save')}</button>
      <button class="btn btn-ghost btn-sm" type="button" onclick={() => (renaming = false)}>{t('common.cancel')}</button>
    </form>
  {:else}
    <h2 id="club-title" class="club-name">
      {club.meta?.name}
      {#if club.isOwner}
        <button class="btn btn-ghost btn-icon btn-sm" type="button" onclick={() => (renaming = true)} aria-label={t('clubm.rename')}><Icon name="edit" size={16} /></button>
      {/if}
    </h2>
  {/if}

  <div class="invite">
    <p class="label">{t('clubm.invite')}</p>
    <div class="code" data-testid="invite-code" aria-label={code}>
      {#each code.split('') as ch, i}
        <span class:dash={ch === '-'} style:--i={i}>{ch}</span>
      {/each}
    </div>
    <p class="hint">{t('clubm.inviteHint')}</p>
    <div class="row">
      <button class="btn btn-sm" type="button" onclick={() => copy(code, 'code')}>
        <Icon name={copied === 'code' ? 'check' : 'copy'} size={15} />{copied === 'code' ? t('clubm.copied') : t('clubm.copyCode')}
      </button>
      <button class="btn btn-sm btn-primary" type="button" onclick={() => copy(link, 'link')}>
        <Icon name={copied === 'link' ? 'check' : 'link'} size={15} />{copied === 'link' ? t('clubm.copied') : t('clubm.copyLink')}
      </button>
      {#if club.isOwner}
        <button class="btn btn-sm btn-ghost" type="button" onclick={regenerate}><Icon name="spin" size={15} />{t('clubm.newCode')}</button>
      {/if}
    </div>
  </div>

  <h3 class="members-title">{t('clubm.members')} <span>{club.members.length}</span></h3>
  <ul class="members">
    {#each club.sortedMembers as m (m.id)}
      <li animate:flip={{ duration: 300 }} in:fly={{ x: -10 }}>
        <Avatar member={m} size={36} />
        <div class="m-text">
          <strong>
            {m.name}
            {#if m.id === club.user?.uid}<span class="you">{t('common.you')}</span>{/if}
          </strong>
          <span>
            {#if m.id === club.meta?.ownerUid}<Icon name="crown" size={12} /> {t('clubm.founder')} ·{/if}
            {longDate(m.joinedAt, locale())}
          </span>
        </div>
        {#if club.isOwner && m.id !== club.user?.uid}
          <button class="btn btn-ghost btn-sm" type="button" onclick={() => remove(m)}>{t('clubm.remove')}</button>
        {/if}
      </li>
    {/each}
  </ul>

  {#if !club.isOwner && club.mode !== 'demo'}
    <button class="btn btn-danger btn-sm leave" type="button" onclick={leave}><Icon name="logout" size={15} />{t('clubm.leave')}</button>
  {/if}
</Modal>

<style>
  .club-name {
    font-size: 36px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 6px 40px 22px 0;
  }
  .rename {
    display: flex;
    gap: 8px;
    margin: 8px 0 22px;
  }
  .invite {
    padding: 20px 20px 18px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--paper-2) 55%, var(--card));
    border: 1px solid var(--line);
  }
  .code {
    display: flex;
    gap: 5px;
    margin: 12px 0 12px;
    flex-wrap: wrap;
  }
  /* typewriter keys on card stock */
  .code span {
    display: grid;
    place-items: center;
    width: 36px;
    height: 46px;
    border-radius: 3px;
    background: #fbf6e9;
    color: #2a2420;
    font-family: var(--font-type);
    font-weight: 700;
    font-size: 24px;
    box-shadow:
      inset 0 -2px 0 rgba(60, 40, 20, 0.08),
      0 1px 2px rgba(60, 40, 20, 0.18);
    animation: type 0.35s steps(2, end) both;
    animation-delay: calc(var(--i) * 70ms);
  }
  .code span.dash {
    width: 14px;
    background: none;
    box-shadow: none;
    color: var(--ink-faint);
  }
  @keyframes type {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
  }
  .hint {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17.5px;
    color: var(--ink-soft);
    margin-bottom: 14px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .members-title {
    font-size: 24px;
    font-weight: 600;
    margin: 28px 0 6px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid var(--ink);
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .members-title span {
    font-family: var(--font-type);
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-soft);
  }
  .members {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .members li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
  }
  .m-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .m-text strong {
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 19px;
  }
  .m-text span {
    font-size: 12px;
    color: var(--ink-soft);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .you {
    font-family: var(--font-body);
    font-size: 10.5px !important;
    font-weight: 500 !important;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid var(--line-strong);
    color: var(--ink-soft) !important;
  }
  .leave {
    margin-top: 20px;
  }
</style>
