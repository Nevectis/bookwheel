<script>
  import { flip } from '../lib/motion.js';
  import { fly } from '../lib/motion.js';
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
      <h2 id="chron-title" class="section-title"><em>{t('chron.title')}</em></h2>
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
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    color: var(--ink-soft);
    padding: 28px;
    border-radius: 10px;
    border: 1px dashed var(--line-strong);
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
    left: 10px;
    top: 18px;
    bottom: 18px;
    width: 1px;
    background: linear-gradient(180deg, var(--gold), var(--line-strong) 70%, transparent);
  }
  .month {
    position: relative;
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: 18px 28px;
    padding-bottom: 34px;
  }
  .m-label {
    position: relative;
    padding-left: 36px;
    padding-top: 4px;
    display: flex;
    flex-direction: column;
  }
  .node {
    position: absolute;
    left: 1px;
    top: 16px;
    width: 13px;
    height: 13px;
    transform: rotate(45deg);
    background: var(--paper);
    border: 1px solid var(--gold);
    box-shadow: 0 0 0 4px var(--paper);
  }
  .month.now .node {
    background: var(--oxblood);
    border-color: var(--oxblood);
  }
  .m-name {
    font-family: var(--font-display);
    font-size: 38px;
    font-weight: 500;
    font-style: italic;
    line-height: 1;
    text-transform: capitalize;
  }
  .month.now .m-name {
    color: var(--oxblood);
  }
  .m-year {
    font-family: var(--font-type);
    font-size: 13px;
    letter-spacing: 0.1em;
    color: var(--ink-soft);
    margin-top: 4px;
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
    }
    .m-label {
      flex-direction: row;
      align-items: baseline;
      gap: 12px;
    }
    .m-name {
      font-size: 30px;
    }
    .m-books {
      padding-left: 30px;
    }
  }
  @media (max-width: 420px) {
    .m-books {
      padding-left: 22px;
    }
    .timeline::before {
      left: 7px;
    }
    .node {
      left: 1px;
      width: 11px;
      height: 11px;
    }
    .m-label {
      padding-left: 26px;
    }
  }
</style>
