// Live club state (fed by the backend's realtime listeners) plus every action
// the UI can take. Components read from `club` and call its methods.
import { loadBackend } from './backend/index.js';
import { pickMemberColor } from './club.js';
import { suggestMonth } from './dates.js';
import { t } from './i18n.svelte.js';
import { progressId, ratingSummary } from './reading.js';
import { settleConfirm, toast, ui } from './ui.svelte.js';

const FRESH_PICK_MS = 10 * 60_000;

/**
 * Waits for a write to be confirmed, but not for long: Firestore applies writes
 * locally at once and only confirms them when the server has them, which never
 * happens offline. Rejects only if the write fails within that moment (later
 * failures still get their error toast from the store).
 */
export function landed(write, ms = 1200) {
  write.catch(() => {});
  return Promise.race([write, new Promise((resolve) => setTimeout(resolve, ms))]);
}

class ClubStore {
  backend = null;
  mode = $state('demo');
  /** loading | signed-out | create | join | ready | error */
  phase = $state('loading');
  error = $state('');
  user = $state(null);
  clubName = $state('');

  meta = $state(null);
  invite = $state(null);
  members = $state([]);
  books = $state([]);
  progress = $state([]);
  loaded = $state({ meta: false, members: false, books: false, progress: false });

  dataReady = $derived(this.loaded.meta && this.loaded.members && this.loaded.books && this.loaded.progress);
  me = $derived(this.members.find((m) => m.id === this.user?.uid) ?? null);
  isOwner = $derived(!!this.user && this.meta?.ownerUid === this.user.uid);
  shelf = $derived(this.books.filter((b) => b.status === 'shelf').sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0)));
  picked = $derived(
    this.books
      .filter((b) => b.status === 'picked')
      .sort((a, b) => (b.month ?? '').localeCompare(a.month ?? '') || (b.pickedAt ?? 0) - (a.pickedAt ?? 0)),
  );
  current = $derived(this.books.find((b) => b.id === this.meta?.currentBookId && b.status === 'picked') ?? null);
  sortedMembers = $derived([...this.members].sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)));

  #unsubscribe = null;
  #seenPickAt = undefined;
  #colorChecked = false;
  #authSeq = 0; // ignores club lookups that finish after the user changed
  #lastRecheck = 0;

  async init() {
    try {
      this.backend = await loadBackend();
    } catch (e) {
      console.error(e);
      this.error = String(e?.message ?? e);
      this.phase = 'error';
      return;
    }
    this.mode = this.backend.mode;
    this.backend.onAuth((user) => this.#onAuth(user));
  }

  async #onAuth(user) {
    if (user && this.user?.uid === user.uid && this.phase === 'ready') {
      this.user = user; // profile change only
      return;
    }
    this.#leave();
    this.#authSeq++;
    this.user = user;
    if (!user) {
      this.phase = 'signed-out';
      return;
    }
    this.phase = 'loading';
    await this.refreshStatus();
  }

  async refreshStatus() {
    const seq = this.#authSeq;
    try {
      const s = await this.backend.clubStatus();
      if (seq !== this.#authSeq) return; // signed out or switched account meanwhile
      this.clubName = s.clubName;
      if (s.isMember) this.#enter();
      else {
        this.#leave();
        this.phase = s.clubExists ? 'join' : 'create';
      }
    } catch (e) {
      if (seq !== this.#authSeq) return;
      console.error(e);
      this.error = String(e?.code ?? e?.message ?? e);
      this.phase = 'error';
    }
  }

  #enter() {
    this.#leave();
    this.phase = 'ready';
    this.#unsubscribe = this.backend.subscribe(
      (key, value) => {
        this[key] = value;
        this.loaded[key] = true;
        if (key === 'meta') this.#onMeta(value);
        if (key === 'members') this.#onMembers(value);
      },
      (err) => {
        // Usually "permission-denied" after being removed from the club.
        // Re-check at most every few seconds so a misconfigured project can't loop.
        console.warn('Listener error', err);
        if (err?.code === 'permission-denied' && Date.now() - this.#lastRecheck > 5000) {
          this.#lastRecheck = Date.now();
          this.refreshStatus();
        }
      },
    );
  }

  #leave() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#seenPickAt = undefined;
    this.#colorChecked = false;
    this.meta = null;
    this.invite = null;
    this.members = [];
    this.books = [];
    this.progress = [];
    this.loaded = { meta: false, members: false, books: false, progress: false };
    // Nothing club-related may stay open over the sign-in or join screen.
    ui.result = ui.review = ui.bookForm = null;
    ui.clubOpen = ui.profileOpen = false;
    if (ui.confirm) settleConfirm(false);
  }

  #onMeta(meta) {
    const pick = meta?.lastPick;
    if (this.#seenPickAt === undefined) {
      this.#seenPickAt = pick?.at ?? 0; // baseline: don't replay old spins
      return;
    }
    if (pick && pick.at > this.#seenPickAt) {
      this.#seenPickAt = pick.at;
      // The first snapshot can come from the offline cache, so a spin from days
      // ago may still look "new" here: only announce spins from the last minutes.
      const fresh = Date.now() - pick.at < FRESH_PICK_MS;
      if (fresh && pick.by !== this.user?.uid && !ui.result) ui.result = { bookId: pick.bookId, byName: pick.byName || '?' };
    }
  }

  #onMembers(members) {
    if (!this.user) return;
    const mine = members.find((m) => m.id === this.user.uid);
    if (!mine) {
      // Removed from the club (or left in another tab).
      this.#leave();
      this.refreshStatus();
      return;
    }
    if (!this.#colorChecked) {
      this.#colorChecked = true;
      const clash = members.some((m) => m.id !== mine.id && m.color === mine.color && (m.joinedAt ?? 0) <= (mine.joinedAt ?? 0));
      if (clash) this.backend.updateProfile({ color: pickMemberColor(members.filter((m) => m.id !== mine.id)) }).catch(() => {});
    }
  }

  // ── lookups ────────────────────────────────────────────────────────────
  book(id) {
    return this.books.find((b) => b.id === id) ?? null;
  }
  member(uid) {
    return this.members.find((m) => m.id === uid) ?? null;
  }
  nameOf(uid, fallback = '') {
    return this.member(uid)?.name ?? fallback;
  }
  entry(bookId, uid = this.user?.uid) {
    return this.progress.find((p) => p.id === progressId(bookId, uid)) ?? this.progress.find((p) => p.bookId === bookId && p.uid === uid) ?? null;
  }
  entriesFor(bookId) {
    return this.progress.filter((p) => p.bookId === bookId);
  }
  summary(book) {
    return ratingSummary(book, this.members, this.progress, this.user?.uid ?? null);
  }

  // ── actions ────────────────────────────────────────────────────────────
  async #run(fn, { ok, errorKey = 'common.error' } = {}) {
    try {
      const r = await fn();
      if (ok) toast(ok, { tone: 'success' });
      return r;
    } catch (e) {
      console.error(e);
      toast(t(e?.code === 'storage-full' ? 'common.storageFull' : errorKey), { tone: 'error' });
      throw e;
    }
  }
  #quiet(promise) {
    return promise.catch(() => {});
  }

  signInDemo(name) {
    return this.backend.signInDemo(String(name ?? '').trim() || t('auth.guest'));
  }
  signOut() {
    return this.backend.signOut();
  }
  async createClub(clubName, memberName) {
    try {
      await this.backend.createClub({ clubName, memberName });
    } catch (e) {
      // Someone else may have founded it a moment earlier: show "join" instead.
      await this.refreshStatus();
      throw e;
    }
    await this.refreshStatus();
  }
  async joinClub(code, memberName) {
    await this.backend.joinClub({ code, memberName });
    await this.refreshStatus();
  }

  addBook(input) {
    return this.#run(() => this.backend.addBook(input), { ok: t('shelf.added', { title: input.title }) });
  }
  updateBook(id, patch) {
    return this.#run(() => this.backend.updateBook(id, patch));
  }
  async removeBook(book) {
    const snapshot = $state.snapshot(book);
    await this.#run(() => this.backend.deleteBook(book.id));
    toast(t('shelf.removed', { title: book.title }), {
      actionLabel: t('common.undo'),
      action: () => this.#quiet(this.#run(() => this.backend.restoreBook(snapshot))),
    });
  }

  /** When a spin starts: which pick it follows (to refuse it if someone else picks meanwhile). */
  pickMarker() {
    return this.meta?.lastPick?.at ?? 0;
  }
  /** Marks the book as picked for the suggested month and makes it current. */
  pick(book, since = null) {
    return this.backend.pickBook(book.id, suggestMonth(this.picked), since);
  }
  unpick(book) {
    return this.#run(() => this.backend.unpickBook(book.id), { ok: t('result.undone', { title: book.title }) });
  }
  setCurrent(book) {
    return this.#quiet(this.#run(() => this.backend.setCurrentBook(book.id)));
  }
  setMonth(book, month) {
    return this.#quiet(this.#run(() => this.backend.setBookMonth(book.id, month)));
  }
  addGoal(book, goal) {
    return this.#run(() => this.backend.addGoal(book.id, goal), { ok: t('goals.added') });
  }
  removeGoal(book, goalId) {
    return this.#quiet(this.#run(() => this.backend.removeGoal(book.id, goalId)));
  }

  saveProgress(book, page) {
    return this.#run(() => this.backend.saveProgress(book.id, { page }));
  }
  markFinished(book) {
    const prev = this.entry(book.id);
    return this.#run(() =>
      this.backend.saveProgress(book.id, {
        finished: true,
        finishedAt: prev?.finishedAt ?? Date.now(),
        page: book.pageCount || prev?.page || 0,
      }),
    );
  }
  markUnfinished(book) {
    return this.#run(() => this.backend.saveProgress(book.id, { finished: false }));
  }
  rate(book, rating, review) {
    const prev = this.entry(book.id);
    return this.#run(() =>
      this.backend.saveProgress(book.id, {
        finished: true,
        finishedAt: prev?.finishedAt ?? Date.now(),
        page: book.pageCount || prev?.page || 0,
        rating,
        review: review.trim().slice(0, 4000),
        reviewedAt: Date.now(),
      }),
    );
  }

  updateProfile(patch) {
    return this.#run(() => this.backend.updateProfile(patch), { ok: t('profile.saved') });
  }
  renameClub(name) {
    return this.#run(() => this.backend.renameClub(name));
  }
  regenerateInvite() {
    return this.#run(() => this.backend.regenerateInvite(), { ok: t('clubm.newCodeDone') });
  }
  removeMember(uid) {
    return this.#run(() => this.backend.removeMember(uid));
  }
  leaveClub() {
    return this.#run(() => this.backend.leaveClub());
  }
  resetDemo() {
    return this.backend.resetDemo?.();
  }
}

export const club = new ClubStore();
