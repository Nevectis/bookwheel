<script>
  import { fly, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import Icon from './Icon.svelte';
  import { club } from '../lib/store.svelte.js';
  import { t, locale } from '../lib/i18n.svelte.js';
  import { daysUntil, isIsoDay, isoDay, shortDay } from '../lib/dates.js';
  import { sortGoals } from '../lib/reading.js';
  import { toast } from '../lib/ui.svelte.js';

  let { book } = $props();

  const goals = $derived(sortGoals(book.goals));
  const today = isoDay();
  const nextId = $derived(goals.find((g) => g.date >= today)?.id);
  let date = $state('');
  let page = $state('');
  let adding = $state(false);
  let busy = $state(false);

  function reachedCount(goal) {
    const people = club.members.length;
    const n = club.members.filter((m) => {
      const e = club.entry(book.id, m.id);
      return e?.finished || (e?.page ?? 0) >= goal.page;
    }).length;
    return { n, m: people };
  }

  function when(iso) {
    const d = daysUntil(iso);
    if (d < 0) return t('goals.past');
    if (d === 0) return t('goals.today');
    if (d === 1) return t('goals.tomorrow');
    return t('goals.inDays', { n: d });
  }

  async function add(e) {
    e.preventDefault();
    const p = Math.floor(Number(page));
    if (!isIsoDay(date) || !Number.isFinite(p) || p <= 0) {
      toast(t('goals.invalid'), { tone: 'error' });
      return;
    }
    busy = true;
    try {
      await club.addGoal(book, { date, page: book.pageCount ? Math.min(p, book.pageCount) : p });
      date = '';
      page = '';
      adding = false;
    } catch {
      /* toast shown by store */
    } finally {
      busy = false;
    }
  }
</script>

<div class="goals">
  <div class="g-head">
    <h3><Icon name="flag" size={18} /> {t('goals.title')}</h3>
    {#if !adding}
      <button class="btn btn-ghost btn-sm" type="button" onclick={() => (adding = true)} data-testid="add-goal">
        <Icon name="plus" size={16} />
        {t('goals.add')}
      </button>
    {/if}
  </div>

  {#if !goals.length && !adding}
    <p class="empty">{t('goals.empty')}</p>
  {/if}

  {#if goals.length}
    <ol class="g-list">
      {#each goals as g (g.id)}
        {@const r = reachedCount(g)}
        {@const past = g.date < today}
        <li class="goal" class:past class:next={g.id === nextId} animate:flip={{ duration: 300 }} in:fly={{ y: 10, duration: 350 }} out:slide={{ duration: 220 }}>
          <span class="g-date">
            <Icon name="calendar" size={15} />
            {shortDay(g.date, locale())}
          </span>
          <span class="g-page">{t('goals.page')} <strong>{g.page}</strong></span>
          <span class="g-when">{when(g.date)}</span>
          <span class="g-reached" class:all={r.n === r.m}>
            {#if r.n === r.m}<Icon name="check" size={14} stroke={3} />{/if}
            {t('goals.reached', r)}
          </span>
          <button class="btn btn-ghost btn-icon btn-sm x" type="button" aria-label={t('goals.remove')} onclick={() => club.removeGoal(book, g.id)}>
            <Icon name="x" size={15} />
          </button>
        </li>
      {/each}
    </ol>
  {/if}

  {#if adding}
    <form class="g-form" onsubmit={add} transition:slide={{ duration: 260 }}>
      <label class="field">
        <span>{t('goals.date')}</span>
        <input type="date" bind:value={date} min={today} required data-testid="goal-date" />
      </label>
      <label class="field">
        <span>{t('goals.page')}</span>
        <input type="number" inputmode="numeric" min="1" max={book.pageCount || 20000} bind:value={page} required placeholder="50" data-testid="goal-page" />
      </label>
      <div class="g-actions">
        <button class="btn btn-ghost btn-sm" type="button" onclick={() => (adding = false)}>{t('common.cancel')}</button>
        <button class="btn btn-primary btn-sm" type="submit" disabled={busy}>{t('common.save')}</button>
      </div>
    </form>
  {/if}
</div>

<style>
  .goals {
    border-top: 1px dashed var(--line);
    padding-top: 18px;
    margin-top: 20px;
  }
  .g-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }
  h3 {
    font-size: 19px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h3 :global(svg) {
    color: var(--accent);
  }
  .empty {
    color: var(--ink-soft);
    font-size: 14.5px;
  }
  .g-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .goal {
    display: grid;
    grid-template-columns: auto auto 1fr auto auto;
    align-items: center;
    gap: 6px 12px;
    padding: 8px 8px 8px 12px;
    border-radius: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    font-size: 14px;
  }
  .goal.next {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    background: color-mix(in srgb, var(--accent-soft) 55%, var(--card-2));
    box-shadow: 0 6px 16px -12px var(--accent);
  }
  .goal.past {
    opacity: 0.62;
  }
  .g-date {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
  }
  .g-page strong {
    font-family: var(--font-mono);
  }
  .g-when {
    color: var(--ink-soft);
    font-size: 13px;
  }
  .g-reached {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink-soft);
    background: var(--card);
    border-radius: 999px;
    padding: 2px 9px;
    border: 1px solid var(--line);
  }
  .g-reached.all {
    color: var(--green);
    background: var(--green-soft);
    border-color: transparent;
  }
  .g-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
    padding: 14px;
    border-radius: 16px;
    background: var(--card-2);
    border: 1px solid var(--line);
  }
  .g-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  @media (max-width: 520px) {
    .goal {
      grid-template-columns: auto 1fr auto;
    }
    .g-when {
      display: none;
    }
    .g-reached {
      grid-column: 1 / 3;
      justify-self: start;
    }
    .x {
      grid-row: 1;
      grid-column: 3;
    }
  }
</style>
