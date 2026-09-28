<script>
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import Modal from './Modal.svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
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
    await club.renameClub(newName);
    renaming = false;
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
    font-size: 30px;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 40px 18px 0;
  }
  .rename {
    display: flex;
    gap: 8px;
    margin: 8px 0 18px;
  }
  .invite {
    padding: 18px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--gold-soft), var(--accent-soft));
  }
  .code {
    display: flex;
    gap: 5px;
    margin: 10px 0;
    flex-wrap: wrap;
  }
  .code span {
    display: grid;
    place-items: center;
    width: 36px;
    height: 46px;
    border-radius: 10px;
    background: var(--card);
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 22px;
    box-shadow: var(--shadow-sm);
    animation: drop 0.5s var(--ease-spring) both;
    animation-delay: calc(var(--i) * 45ms);
  }
  .code span.dash {
    width: 14px;
    background: none;
    box-shadow: none;
  }
  @keyframes drop {
    from {
      transform: translateY(-12px) rotate(-8deg);
      opacity: 0;
    }
  }
  .hint {
    font-size: 13px;
    color: var(--ink-soft);
    margin-bottom: 12px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .members-title {
    font-size: 19px;
    margin: 22px 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .members-title span {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--ink-faint);
  }
  .members {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .members li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: 14px;
    background: var(--card-2);
  }
  .m-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .m-text strong {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .m-text span {
    font-size: 12.5px;
    color: var(--ink-soft);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .you {
    font-size: 10px !important;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--accent);
    color: var(--accent-ink) !important;
  }
  .leave {
    margin-top: 18px;
  }
</style>
