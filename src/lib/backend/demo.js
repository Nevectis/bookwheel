// Demo backend: the same interface as the Firebase backend, but everything
// lives in this browser's localStorage. It ships with a sample club so the
// site is fully explorable before Firebase is configured.
import { addMonths, isoDay, monthKey } from '../dates.js';
import { cleanBookInput, cleanText, makeInviteCode, pickMemberColor } from '../club.js';
import { progressId } from '../reading.js';

const KEY = 'bookwheel:demo-v2';
const ME = 'demo-me';
const DAY = 86_400_000;

const cover = (isbn) => (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : null);

export function seedDemo(now = new Date()) {
  const t = now.getTime();
  const m0 = monthKey(now);
  const members = {
    anna: { name: 'Anna', color: '#b2456e', joinedAt: t - 400 * DAY, photoURL: null },
    ben: { name: 'Ben', color: '#23708a', joinedAt: t - 390 * DAY, photoURL: null },
    clara: { name: 'Clara', color: '#d27a24', joinedAt: t - 380 * DAY, photoURL: null },
    deniz: { name: 'Deniz', color: '#3f7a57', joinedAt: t - 300 * DAY, photoURL: null },
  };
  const who = ['anna', 'ben', 'clara', 'deniz'];
  const books = {};
  const shelf = [
    ['Babel', 'R. F. Kuang', 'fantasy', '9780063021426', 545],
    ['Project Hail Mary', 'Andy Weir', 'sci-fi', '9780593135204', 476],
    ['A Court of Thorns and Roses', 'Sarah J. Maas', 'romantasy', '9781619634442', 419],
    ['Haunting Adeline', 'H. D. Carlton', 'dark-romance', null, 581],
    ['The Silent Patient', 'Alex Michaelides', 'thriller-mystery', '9781250301697', 336],
    ['Mexican Gothic', 'Silvia Moreno-Garcia', 'horror', '9780525620785', 301],
    ['Red, White & Royal Blue', 'Casey McQuiston', 'lgbtq', '9781250316776', 421],
    ['Atomic Habits', 'James Clear', 'non-fiction', '9780735211292', 320],
    ['Heartstopper', 'Alice Oseman', 'young-adult', '9781338617436', 288],
    ['The Pillars of the Earth', 'Ken Follett', 'historical-fiction', '9780451166890', 983],
    ['Book Lovers', 'Emily Henry', 'romance', '9780593334836', 377],
    ['The Midnight Library', 'Matt Haig', 'literary-fiction', '9780525559474', 304],
  ];
  shelf.forEach(([title, author, genre, isbn, pageCount], i) => {
    const by = who[i % who.length];
    books[`s${i + 1}`] = {
      title,
      author,
      genre,
      coverUrl: cover(isbn),
      pageCount,
      addedBy: by,
      addedByName: members[by].name,
      addedAt: t - (60 - i * 3) * DAY,
      status: 'shelf',
      goals: [],
    };
  });

  const picked = [
    ['p3', 'The Name of the Wind', 'Patrick Rothfuss', 'fantasy', '9780756404741', 662, addMonths(m0, -3), 'clara'],
    ['p2', 'The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'lgbtq', '9781501161933', 389, addMonths(m0, -2), 'ben'],
    ['p1', 'Gone Girl', 'Gillian Flynn', 'thriller-mystery', '9780307588371', 419, addMonths(m0, -1), 'deniz'],
    ['p0', 'Fourth Wing', 'Rebecca Yarros', 'romantasy', '9781649374042', 498, m0, 'anna'],
  ];
  picked.forEach(([id, title, author, genre, isbn, pageCount, month, by], i) => {
    books[id] = {
      title,
      author,
      genre,
      coverUrl: cover(isbn),
      pageCount,
      addedBy: by,
      addedByName: members[by].name,
      addedAt: t - (200 - i * 10) * DAY,
      status: 'picked',
      month,
      pickedAt: t - (3 - i) * 30 * DAY - 9 * DAY,
      pickedBy: by,
      pickedByName: members[by].name,
      prevCurrentId: i > 0 ? picked[i - 1][0] : null,
      goals: [],
    };
  });
  books.p0.goals = [
    { id: 'g1', date: isoDay(new Date(t - 5 * DAY)), page: 80, createdBy: 'anna' },
    { id: 'g2', date: isoDay(new Date(t + 4 * DAY)), page: 200, createdBy: 'anna' },
    { id: 'g3', date: isoDay(new Date(t + 16 * DAY)), page: 498, createdBy: 'ben' },
  ];

  const progress = {};
  const put = (bookId, uid, fields) => {
    progress[progressId(bookId, uid)] = {
      uid,
      bookId,
      name: uid === ME ? '' : members[uid].name,
      page: 0,
      finished: false,
      updatedAt: t - DAY,
      ...fields,
    };
  };
  const done = (bookId, uid, rating, review, pages) =>
    put(bookId, uid, { page: pages, finished: true, finishedAt: t - 40 * DAY, rating, review, reviewedAt: t - 40 * DAY });

  done('p3', 'anna', 5, 'Kvothe! Diese Sprache! Ich will sofort Band 2.', 662);
  done('p3', 'ben', 4, 'Langsamer Einstieg, dann konnte ich nicht mehr aufhören.', 662);
  done('p3', 'clara', 5, '', 662);
  done('p3', 'deniz', 4, 'Wunderschön erzählt, aber zu lang.', 662);
  done('p3', ME, 5, '', 662);
  done('p2', 'anna', 5, 'Hat mich komplett zerstört — im besten Sinne.', 389);
  done('p2', 'ben', 4, '', 389);
  done('p2', 'clara', 4, 'Evelyn ist eine der besten Figuren seit Langem.', 389);
  done('p2', 'deniz', 3, 'Gut, aber ein bisschen vorhersehbar.', 389);
  done('p2', ME, 4, '', 389);
  done('p1', 'anna', 4, 'Amy ist furchterregend.', 419);
  done('p1', 'ben', 5, 'Der Twist in der Mitte!!', 419);
  done('p1', 'clara', 3, '', 419);
  done('p1', 'deniz', 4, 'Spannend bis zur letzten Seite.', 419);
  put('p1', ME, { page: 380 });
  put('p0', 'anna', { page: 236, updatedAt: t - 2 * 3600_000 });
  put('p0', 'ben', { page: 95, updatedAt: t - 26 * 3600_000 });
  put('p0', 'clara', { page: 61, updatedAt: t - 4 * DAY });
  put('p0', 'deniz', { page: 204, updatedAt: t - 5 * 3600_000 });

  return {
    meta: { name: 'Die Seitenspringer', ownerUid: 'anna', createdAt: t - 400 * DAY, currentBookId: 'p0', lastPick: null },
    invite: { code: makeInviteCode() },
    members,
    books,
    progress,
    user: null,
  };
}

const fail = (code) => Object.assign(new Error(code), { code });
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** Stored data we can trust enough to run on (otherwise start a fresh sample club). */
export function isDemoState(s) {
  return (
    isObj(s) &&
    isObj(s.meta) &&
    typeof s.meta.name === 'string' &&
    isObj(s.invite) &&
    isObj(s.members) &&
    isObj(s.books) &&
    isObj(s.progress) &&
    Object.values(s.books).every((b) => isObj(b) && typeof b.title === 'string') &&
    Object.values(s.members).every((m) => isObj(m) && typeof m.name === 'string')
  );
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // blocked (private mode, sandboxed frame): run in memory
  }
}

export function createDemoBackend({ storage = browserStorage(), now = () => new Date() } = {}) {
  let state = load();
  const authListeners = new Set();
  const dataListeners = new Set();
  let counter = 0;

  function load() {
    try {
      const raw = storage?.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (isDemoState(parsed)) return parsed;
    } catch {
      /* fall through to a fresh seed */
    }
    return seedDemo(now());
  }
  /** False when the browser refused to store it (usually: storage full). */
  function save() {
    try {
      storage?.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return !storage; // no storage at all: we run in memory on purpose
    }
  }
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const list = (obj) => Object.entries(obj).map(([id, v]) => ({ id, ...clone(v) }));

  function emit() {
    for (const cb of dataListeners) {
      cb('meta', clone(state.meta));
      cb('invite', clone(state.invite));
      cb('members', list(state.members));
      cb('books', list(state.books));
      cb('progress', list(state.progress));
    }
  }
  function commit() {
    const saved = save();
    queueMicrotask(emit);
    // The change still shows (in memory), but tell the user it won't survive a reload.
    if (!saved) throw fail('storage-full');
  }
  const user = () => state.user && { uid: ME, name: state.user.name, email: null, photoURL: null };
  const myName = () => state.members[ME]?.name ?? state.user?.name ?? '';
  const newId = (p) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;
  const need = (id) => {
    const b = state.books[id];
    if (!b) throw fail('not-found');
    return b;
  };

  // Keep several tabs of the same browser in sync.
  globalThis.addEventListener?.('storage', (e) => {
    if (e.key !== KEY) return;
    state = load();
    emit();
    for (const cb of authListeners) cb(user());
  });

  return {
    mode: 'demo',

    onAuth(cb) {
      authListeners.add(cb);
      queueMicrotask(() => cb(user()));
      return () => authListeners.delete(cb);
    },
    async signInDemo(name) {
      const clean = String(name || '').trim().slice(0, 40) || 'Gast';
      state.user = { name: clean };
      if (!state.members[ME]) {
        state.members[ME] = {
          name: clean,
          color: pickMemberColor(Object.values(state.members)),
          joinedAt: now().getTime() - 120 * DAY,
          photoURL: null,
        };
      } else {
        state.members[ME].name = clean;
      }
      for (const p of Object.values(state.progress)) if (p.uid === ME) p.name = clean;
      try {
        commit();
      } catch {
        /* storage full: the demo still works for this visit */
      }
      for (const cb of authListeners) cb(user());
    },
    async signOut() {
      state.user = null;
      save();
      for (const cb of authListeners) cb(null);
    },
    async resetDemo() {
      const keepUser = state.user;
      state = seedDemo(now());
      state.user = null;
      save();
      queueMicrotask(emit);
      if (keepUser) await this.signInDemo(keepUser.name);
    },

    async clubStatus() {
      return { clubExists: true, clubName: state.meta.name, isMember: !!state.members[ME] };
    },

    subscribe(onData) {
      dataListeners.add(onData);
      queueMicrotask(emit);
      return () => dataListeners.delete(onData);
    },

    async addBook(input) {
      const id = newId('b');
      state.books[id] = {
        ...cleanBookInput(input),
        addedBy: ME,
        addedByName: myName(),
        addedAt: now().getTime(),
        status: 'shelf',
        goals: [],
      };
      commit();
      return id;
    },
    async updateBook(id, patch) {
      Object.assign(need(id), clone(patch));
      commit();
    },
    async deleteBook(id) {
      delete state.books[id];
      if (state.meta.currentBookId === id) state.meta.currentBookId = null;
      commit();
    },
    async restoreBook(book) {
      const { id, ...data } = clone(book);
      state.books[id] = data;
      commit();
    },

    async pickBook(bookId, month, since = null) {
      if (since != null && (state.meta.lastPick?.at ?? 0) !== since) throw fail('someone-else-spun');
      const b = state.books[bookId];
      if (!b || b.status !== 'shelf') throw fail('not-available');
      const at = now().getTime();
      Object.assign(b, {
        status: 'picked',
        month,
        pickedAt: at,
        pickedBy: ME,
        pickedByName: myName(),
        prevCurrentId: state.meta.currentBookId ?? null,
        goals: [],
      });
      state.meta.currentBookId = bookId;
      state.meta.lastPick = { bookId, by: ME, byName: myName(), at };
      commit();
    },
    async unpickBook(bookId) {
      const b = need(bookId);
      let prev = b.prevCurrentId ?? null;
      if (prev && state.books[prev]?.status !== 'picked') prev = null;
      b.status = 'shelf';
      for (const k of ['month', 'pickedAt', 'pickedBy', 'pickedByName', 'prevCurrentId']) delete b[k];
      b.goals = [];
      if (state.meta.currentBookId === bookId) state.meta.currentBookId = prev;
      if (state.meta.lastPick?.bookId === bookId) state.meta.lastPick = null;
      commit();
    },
    async setCurrentBook(bookId) {
      state.meta.currentBookId = bookId;
      commit();
    },
    async setBookMonth(bookId, month) {
      need(bookId).month = month;
      commit();
    },
    async addGoal(bookId, { date, page }) {
      const b = need(bookId);
      b.goals = [...(b.goals ?? []), { id: newId('g'), date, page, createdBy: ME }];
      commit();
    },
    async removeGoal(bookId, goalId) {
      const b = need(bookId);
      b.goals = (b.goals ?? []).filter((g) => g.id !== goalId);
      commit();
    },
    async saveProgress(bookId, patch) {
      const id = progressId(bookId, ME);
      state.progress[id] = {
        ...(state.progress[id] ?? { page: 0, finished: false }),
        ...clone(patch),
        uid: ME,
        bookId,
        name: myName(),
        updatedAt: now().getTime(),
      };
      commit();
    },

    async updateProfile({ name, color }) {
      const m = state.members[ME];
      const clean = cleanText(name ?? '', 40);
      if (clean) {
        m.name = clean;
        state.user.name = clean;
      }
      if (color) m.color = color;
      commit();
      for (const cb of authListeners) cb(user());
    },
    async renameClub(name) {
      const clean = cleanText(name, 80);
      if (!clean) throw fail('invalid-argument');
      state.meta.name = clean;
      commit();
    },
    async regenerateInvite() {
      state.invite = { code: makeInviteCode() };
      commit();
    },
    async removeMember(uid) {
      delete state.members[uid];
      state.invite = { code: makeInviteCode() }; // the old code no longer lets them back in
      commit();
    },
    async leaveClub() {
      /* The demo club always keeps you as a member. */
    },
  };
}
