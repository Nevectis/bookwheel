<script>
  import { onMount } from 'svelte';
  import Avatar from './Avatar.svelte';
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
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="30" fill="#c1902f" />
          <circle cx="32" cy="32" r="26" fill="#8c2f45" />
          <path d="M32 32 L32 6 A26 26 0 0 1 54.5 19 Z" fill="#b3475f" />
          <path d="M32 32 L54.5 19 A26 26 0 0 1 54.5 45 Z" fill="#e2b85e" />
          <path d="M32 32 L54.5 45 A26 26 0 0 1 32 58 Z" fill="#2f6f73" />
          <path d="M32 32 L32 58 A26 26 0 0 1 9.5 45 Z" fill="#b3475f" />
          <path d="M32 32 L9.5 45 A26 26 0 0 1 9.5 19 Z" fill="#e2b85e" />
          <circle cx="32" cy="32" r="8" fill="#fff7f3" />
        </svg>
      </span>
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
          <Avatar member={club.me ?? { name: club.user?.name, color: '#8c2f45' }} size={38} />
          <Icon name="down" size={16} />
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
      <Icon name={l.icon} size={20} />
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
      background 0.3s ease,
      box-shadow 0.3s ease,
      border-color 0.3s ease;
    border-bottom: 1px solid transparent;
  }
  .top.scrolled {
    background: color-mix(in srgb, var(--paper) 78%, transparent);
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
    border-bottom-color: var(--line);
    box-shadow: 0 8px 24px -18px rgba(0, 0, 0, 0.4);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 16px;
    height: 70px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    text-decoration: none;
    color: var(--ink);
    margin-right: auto;
    min-width: 0;
  }
  .mark {
    width: 40px;
    height: 40px;
    flex: none;
    transition: transform 0.9s var(--ease-out);
    filter: drop-shadow(0 3px 5px rgba(80, 30, 20, 0.3));
  }
  .brand:hover .mark {
    transform: rotate(300deg);
  }
  .words {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 21px;
    line-height: 1.05;
    letter-spacing: -0.01em;
  }
  .club {
    font-size: 12.5px;
    color: var(--ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .links {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--card) 70%, transparent);
    border: 1px solid var(--line);
  }
  .links a {
    position: relative;
    padding: 7px 15px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
    color: var(--ink-soft);
    text-decoration: none;
    transition:
      color 0.2s,
      background 0.3s;
  }
  .links a:hover {
    color: var(--ink);
  }
  .links a.active {
    color: var(--accent-ink);
    background: var(--accent);
  }
  .me {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px 3px 3px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--ink-soft);
    transition: box-shadow 0.2s;
  }
  .me:hover {
    box-shadow: var(--shadow-sm);
  }
  .who {
    display: flex;
    flex-direction: column;
    padding: 8px 11px 4px;
  }
  .who span {
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .seg {
    display: flex;
    gap: 3px;
    margin: 2px 6px 6px;
    padding: 3px;
    border-radius: 12px;
    background: var(--card-2);
  }
  .seg button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px 6px;
    border: none;
    border-radius: 9px;
    background: none;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .seg button.on {
    background: var(--card);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
  }
  .dock {
    display: none;
  }
  @media (max-width: 760px) {
    .links {
      display: none;
    }
    .bar {
      height: 62px;
    }
    .dock {
      position: fixed;
      z-index: 45;
      left: 50%;
      bottom: calc(12px + env(safe-area-inset-bottom));
      transform: translateX(-50%);
      display: flex;
      gap: 2px;
      padding: 6px;
      border-radius: 22px;
      background: color-mix(in srgb, var(--card) 88%, transparent);
      backdrop-filter: blur(14px) saturate(1.3);
      -webkit-backdrop-filter: blur(14px) saturate(1.3);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-lg);
    }
    .dock a {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 7px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 700;
      color: var(--ink-soft);
      text-decoration: none;
      transition:
        background 0.25s,
        color 0.25s;
    }
    .dock a.active {
      background: var(--accent);
      color: var(--accent-ink);
    }
  }
</style>
