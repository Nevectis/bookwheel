<script>
  import { initials, safeColor } from '../lib/club.js';
  import { safeImageUrl } from '../lib/covers.js';

  let { member, size = 34, title = '' } = $props();
  let broken = $state(false);
  const photo = $derived(broken ? null : safeImageUrl(member?.photoURL));
</script>

<span class="avatar" style:--size="{size}px" style:--c={member?.color ? safeColor(member.color) : 'var(--ink-faint)'} title={title || member?.name}>
  {#if photo}
    <img src={photo} alt="" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
  {:else}
    {initials(member?.name)}
  {/if}
</span>
