<script>
  import { onMount } from 'svelte';
  import Avatar from './Avatar.svelte';
  import Mark from './Mark.svelte';
  import Icon from './Icon.svelte';
  import Menu from './Menu.svelte';
  import { club } from '../lib/store.svelte.js';
  import { i18n, setLang, t } from '../lib/i18n.svelte.js';
  import { applyTheme, setSound, ui } from '../lib/ui.svelte.js';
  import { scrollToSection } from '../lib/actions.js';

  const links = [
    { id: 'wheel', icon: 'spin', key: 'nav.wheel' },
    { id: 'current', icon: 'book', key: 'nav.current' },
    { id: 'shelf', icon: 'books', key: 'nav.shelf' },
    { id: 'chronicle', icon: 'calendar', key: 'nav.chronicle' },
  ];
  let active = $state('wheel');
  let scrolled = $state(false);

  onMount(() => {
    const onScroll = () => (scrolled = window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) active = e.target.id;
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    const t = setTimeout(() => links.forEach((l) => document.getElementById(l.id) && io.observe(document.getElementById(l.id))), 300);
    return () => {
      clearTimeout(t);
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  });
</script>

<header class="top" class:scrolled>
  <div class="container bar">
    <a class="brand" href="#top" aria-label="Bookwheel" onclick={(e) => scrollToSection(e, 'top')}>
      <Mark size={40} />
      <span class="words">
        <span class="name">Bookwheel</span>
        <span class="club">{club.meta?.name ?? ''}</span>
      </span>
    </a>

    <nav class="links" aria-label="Sections">
      {#each links as l}
        <a href="#{l.id}" class:active={active === l.id} aria-current={active === l.id ? 'true' : undefined} onclick={(e) => scrollToSection(e, l.id)}>
          {t(l.key)}
        </a>
      {/each}
    </nav>

    <Menu label={t('menu.profile')} testid="user-menu">
      {#snippet trigger()}
        <span class="me">
          <Avatar member={club.me ?? { name: club.user?.name, color: '#2d4a3e' }} size={36} />
          <Icon name="down" size={15} stroke={1.6} />
        </span>
      {/snippet}
      {#snippet children()}
        <div class="who">
          <strong>{club.me?.name}</strong>
          {#if club.user?.email}<span>{club.user.email}</span>{/if}
        </div>
        <div class="sep"></div>
        <button class="mi" role="menuitem" data-close onclick={() => (ui.profileOpen = true)}><Icon name="user" size={17} />{t('menu.profile')}</button>
        <button class="mi" role="menuitem" data-close onclick={() => (ui.clubOpen = true)} data-testid="open-club"><Icon name="users" size={17} />{t('menu.club')}</button>
        <div class="sep"></div>
        <p class="mlabel">{t('menu.language')}</p>
        <div class="seg">
          <button class:on={i18n.lang === 'de'} onclick={() => setLang('de')}>Deutsch</button>
          <button class:on={i18n.lang === 'en'} onclick={() => setLang('en')}>English</button>
        </div>
        <p class="mlabel">{t('menu.theme')}</p>
        <div class="seg">
          <button class:on={ui.theme === 'system'} onclick={() => applyTheme('system')}><Icon name="auto" size={14} />{t('theme.system')}</button>
          <button class:on={ui.theme === 'light'} onclick={() => applyTheme('light')}><Icon name="sun" size={14} />{t('theme.light')}</button>
          <button class:on={ui.theme === 'dark'} onclick={() => applyTheme('dark')}><Icon name="moon" size={14} />{t('theme.dark')}</button>
        </div>
        <button class="mi" role="menuitemcheckbox" aria-checked={ui.sound} onclick={() => setSound(!ui.sound)}>
          <Icon name={ui.sound ? 'sound' : 'mute'} size={17} />{t('menu.sound')}: {ui.sound ? t('menu.on') : t('menu.off')}
        </button>
        <div class="sep"></div>
        {#if club.mode === 'demo'}
          <button class="mi" role="menuitem" data-close onclick={() => club.resetDemo()}><Icon name="undo" size={17} />{t('demo.reset')}</button>
        {/if}
        <button class="mi" role="menuitem" data-close onclick={() => club.signOut()}><Icon name="logout" size={17} />{t('menu.signOut')}</button>
      {/snippet}
    </Menu>
  </div>
</header>

<nav class="dock" aria-label="Sections">
  {#each links as l}
    <a href="#{l.id}" class:active={active === l.id} onclick={(e) => scrollToSection(e, l.id)}>
      <Icon name={l.icon} size={19} stroke={1.6} />
      <span>{t(l.key)}</span>
    </a>
  {/each}
</nav>

<style>
  .top {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 40;
    transition:
      background 0.35s ease,
      box-shadow 0.35s ease,
      border-color 0.35s ease;
    border-bottom: 1px solid transparent;
  }
  .top.scrolled {
    background: color-mix(in srgb, var(--paper) 84%, transparent);
    backdrop-filter: blur(14px) saturate(1.15);
    -webkit-backdrop-filter: blur(14px) saturate(1.15);
    border-bottom-color: var(--line);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 20px;
    height: 76px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: var(--ink);
    margin-right: auto;
    min-width: 0;
  }
  .words {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 26px;
    line-height: 1;
    letter-spacing: 0.005em;
  }
  .club {
    margin-top: 3px;
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .links {
    display: flex;
    gap: 6px;
  }
  .links a {
    position: relative;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
    text-decoration: none;
    transition: color 0.25s ease;
  }
  .links a::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 3px;
    height: 1.5px;
    background: var(--gold);
    transform: scaleX(0);
    transition: transform 0.45s var(--ease-out);
  }
  .links a:hover {
    color: var(--ink);
  }
  .links a.active {
    color: var(--ink);
  }
  .links a.active::after {
    transform: scaleX(1);
  }
  .me {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px 4px 4px;
    border-radius: 999px;
    color: var(--ink-soft);
    transition: background 0.2s;
  }
  .me:hover {
    background: color-mix(in srgb, var(--paper-2) 80%, transparent);
  }
  .who {
    display: flex;
    flex-direction: column;
    padding: 8px 11px 4px;
  }
  .who strong {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
  }
  .who span {
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .seg {
    display: flex;
    gap: 2px;
    margin: 2px 6px 8px;
    padding: 3px;
    border-radius: 8px;
    border: 1px solid var(--line);
  }
  .seg button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px 6px;
    border: none;
    border-radius: 6px;
    background: none;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .seg button.on {
    background: var(--ink);
    color: var(--paper);
  }
  .dock {
    display: none;
  }
  @media (max-width: 760px) {
    .links {
      display: none;
    }
    .bar {
      height: 64px;
    }
    .name {
      font-size: 23px;
    }
    .dock {
      position: fixed;
      z-index: 45;
      left: 50%;
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      display: flex;
      gap: 0;
      padding: 5px;
      border-radius: 14px;
      background: color-mix(in srgb, var(--card) 92%, transparent);
      backdrop-filter: blur(14px) saturate(1.2);
      -webkit-backdrop-filter: blur(14px) saturate(1.2);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-lg);
    }
    .dock a {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 7px 13px 8px;
      border-radius: 10px;
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-faint);
      text-decoration: none;
      transition: color 0.25s;
    }
    .dock a.active {
      color: var(--ink);
    }
    .dock a.active::after {
      content: '';
      position: absolute;
      bottom: 2px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--gold);
    }
  }
</style>
