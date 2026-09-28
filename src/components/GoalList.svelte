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
    <h3>{t('goals.title')}</h3>
    {#if !adding}
      <button class="btn btn-ghost btn-sm" type="button" onclick={() => (adding = true)} data-testid="add-goal">
        <Icon name="plus" size={15} stroke={1.6} />
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
        <li class="goal" class:past class:next={g.id === nextId} animate:flip={{ duration: 300 }} in:fly={{ y: 8, duration: 350 }} out:slide={{ duration: 220 }}>
          <span class="g-date">{shortDay(g.date, locale())}</span>
          <span class="g-page">{t('goals.page')} <strong>{g.page}</strong></span>
          <span class="g-when">{when(g.date)}</span>
          <span class="g-reached" class:all={r.n === r.m}>
            {#if r.n === r.m}<Icon name="check" size={13} stroke={2.4} />{/if}
            {t('goals.reached', r)}
          </span>
          <button class="btn btn-ghost btn-icon btn-sm x" type="button" aria-label={t('goals.remove')} onclick={() => club.removeGoal(book, g.id)}>
            <Icon name="x" size={14} stroke={1.6} />
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
    margin-top: 30px;
    container: goals / inline-size;
  }
  .g-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid var(--ink);
  }
  h3 {
    font-size: 24px;
    font-weight: 600;
  }
  .empty {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17px;
    color: var(--ink-soft);
    padding: 12px 0;
  }
  .g-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .goal {
    position: relative;
    display: grid;
    grid-template-columns: 76px auto 1fr auto auto;
    align-items: center;
    gap: 6px 14px;
    padding: 9px 0 9px 14px;
    border-bottom: 1px solid var(--line);
    font-size: 14px;
  }
  .goal::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 5px;
    height: 5px;
    margin-top: -2.5px;
    border-radius: 50%;
    background: var(--line-strong);
  }
  .goal.next::before {
    background: var(--oxblood);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--oxblood) 18%, transparent);
  }
  .goal.past {
    color: var(--ink-soft);
  }
  .g-date {
    font-family: var(--font-type);
    font-size: 13.5px;
  }
  .g-page {
    font-family: var(--font-display);
    font-size: 18px;
    white-space: nowrap;
  }
  .g-page strong {
    font-weight: 700;
    font-variant-numeric: oldstyle-nums;
  }
  .g-when {
    white-space: nowrap;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17px;
    color: var(--ink-soft);
  }
  .goal.next .g-when {
    color: var(--oxblood);
  }
  .g-reached {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .g-reached.all {
    color: var(--green);
  }
  .g-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 14px;
    padding: 16px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--paper-2) 55%, var(--card));
    border: 1px solid var(--line);
  }
  .g-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  /* narrow card: the tally moves under the page number */
  @container goals (max-width: 470px) {
    .goal {
      grid-template-columns: 76px auto 1fr auto;
    }
    .goal::before {
      top: 22px;
    }
    .g-when {
      justify-self: end;
    }
    .g-reached {
      grid-row: 2;
      grid-column: 2 / 4;
      justify-self: start;
    }
    .x {
      grid-row: 1;
      grid-column: 4;
    }
  }
  @container goals (max-width: 300px) {
    .goal {
      grid-template-columns: auto 1fr auto;
    }
    .g-when {
      display: none;
    }
    .x {
      grid-column: 3;
    }
  }
</style>
