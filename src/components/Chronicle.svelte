<script>
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import ChronicleEntry from './ChronicleEntry.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t, locale } from '../lib/i18n.svelte.js';
  import { monthKey, monthName } from '../lib/dates.js';
  import { reveal } from '../lib/actions.js';

  const groups = $derived.by(() => {
    const map = new Map();
    for (const b of club.picked) {
      const k = b.month ?? '';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(b);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  });
  const thisMonth = monthKey();
</script>

<section id="chronicle" aria-labelledby="chron-title">
  <div class="section-head" use:reveal>
    <div>
      <p class="eyebrow">{t('nav.chronicle')}</p>
      <h2 id="chron-title" class="section-title">{t('chron.title')}</h2>
      <p class="section-sub">{t('chron.sub')}</p>
    </div>
  </div>

  {#if !groups.length}
    <p class="empty" use:reveal>{t('chron.empty')}</p>
  {:else}
    <ol class="timeline">
      {#each groups as [key, books] (key)}
        <li class="month" class:now={key === thisMonth} animate:flip={{ duration: 400 }} in:fly={{ y: 20, duration: 500 }} use:reveal>
          <div class="m-label">
            <span class="node" aria-hidden="true"></span>
            <span class="m-name">{monthName(key, locale()) || '—'}</span>
            <span class="m-year">{key.slice(0, 4)}</span>
          </div>
          <div class="m-books">
            {#each books as book (book.id)}
              <ChronicleEntry {book} />
            {/each}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .empty {
    color: var(--ink-soft);
    padding: 24px;
    border-radius: 20px;
    border: 1.5px dashed var(--line-strong);
    text-align: center;
  }
  .timeline {
    list-style: none;
    margin: 0;
    padding: 0 0 0 4px;
    position: relative;
  }
  .timeline::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 16px;
    bottom: 16px;
    width: 2px;
    background: linear-gradient(180deg, var(--accent), var(--gold) 50%, var(--line));
    border-radius: 2px;
  }
  .month {
    position: relative;
    display: grid;
    grid-template-columns: 170px 1fr;
    gap: 18px 24px;
    padding-bottom: 30px;
  }
  .m-label {
    position: relative;
    padding-left: 36px;
    padding-top: 6px;
    display: flex;
    flex-direction: column;
  }
  .node {
    position: absolute;
    left: 0;
    top: 10px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--card);
    border: 3px solid var(--gold);
    box-shadow: 0 0 0 4px var(--paper);
  }
  .month.now .node {
    border-color: var(--accent);
    background: var(--accent);
    animation: node-pulse 2s ease-out infinite;
  }
  @keyframes node-pulse {
    0% {
      box-shadow:
        0 0 0 4px var(--paper),
        0 0 0 4px color-mix(in srgb, var(--accent) 50%, transparent);
    }
    100% {
      box-shadow:
        0 0 0 4px var(--paper),
        0 0 0 14px transparent;
    }
  }
  .m-name {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    font-style: italic;
    line-height: 1.05;
    text-transform: capitalize;
  }
  .m-year {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.15em;
    color: var(--ink-faint);
  }
  .m-books {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  @media (max-width: 760px) {
    .month {
      grid-template-columns: 1fr;
      gap: 10px;
      padding-left: 0;
    }
    .m-label {
      flex-direction: row;
      align-items: baseline;
      gap: 10px;
    }
    .m-name {
      font-size: 24px;
    }
    .m-books {
      padding-left: 36px;
    }
  }
  @media (max-width: 420px) {
    .m-books {
      padding-left: 24px;
    }
    .timeline::before {
      left: 7px;
    }
    .node {
      width: 12px;
      height: 12px;
      left: 1px;
    }
    .m-label {
      padding-left: 24px;
    }
  }
</style>
