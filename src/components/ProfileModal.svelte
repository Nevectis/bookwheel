<script>
  import Modal from './Modal.svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { MEMBER_COLORS } from '../lib/club.js';

  let { onclose } = $props();
  let name = $state(club.me?.name ?? '');
  let color = $state(club.me?.color ?? MEMBER_COLORS[0]);
  let busy = $state(false);

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return;
    busy = true;
    try {
      await club.updateProfile({ name: name.trim(), color });
      onclose();
    } catch {
      busy = false;
    }
  }
</script>

<Modal {onclose} labelledby="profile-title" size="sm">
  <form class="profile" onsubmit={save}>
    <div class="preview">
      <Avatar member={{ name, color, photoURL: club.me?.photoURL }} size={72} />
      <h2 id="profile-title">{t('profile.title')}</h2>
    </div>
    <label class="field">
      <span>{t('profile.name')}</span>
      <input type="text" bind:value={name} maxlength="40" required />
    </label>
    <fieldset>
      <legend class="label">{t('profile.color')}</legend>
      <div class="swatches">
        {#each MEMBER_COLORS as c}
          <label class="sw" class:on={color === c} style:--c={c}>
            <input type="radio" name="color" value={c} bind:group={color} class="sr-only" />
            {#if color === c}<Icon name="check" size={16} stroke={3} />{/if}
          </label>
        {/each}
      </div>
    </fieldset>
    <div class="actions">
      <button class="btn btn-ghost" type="button" onclick={onclose}>{t('common.cancel')}</button>
      <button class="btn btn-primary" type="submit" disabled={busy}>{t('common.save')}</button>
    </div>
  </form>
</Modal>

<style>
  .profile {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .preview {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  h2 {
    font-size: 26px;
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }
  legend {
    margin-bottom: 8px;
  }
  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sw {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--c);
    display: grid;
    place-items: center;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 0 0 2px var(--card);
    transition: transform 0.2s var(--ease-spring);
  }
  .sw:hover {
    transform: scale(1.1);
  }
  .sw.on {
    box-shadow:
      0 0 0 2px var(--card),
      0 0 0 4px var(--c);
  }
  .sw:focus-within {
    outline: 2.5px solid var(--accent);
    outline-offset: 3px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
