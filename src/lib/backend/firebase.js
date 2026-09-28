// Firebase backend: Authentication for sign-in, Cloud Firestore for all club
// data (with offline cache and live updates). See firestore.rules for who may
// read and write what.
//
// Data model (one club per Firebase project):
//   club/meta               { name, ownerUid, createdAt, currentBookId, lastPick }
//   club/invite             { code }                       – members only
//   members/{uid}           { name, color, photoURL, joinedAt, joinCode }
//   books/{id}              { title, author, genre, coverUrl, pageCount, status: shelf|picked,
//                             month, pickedAt, pickedBy, goals: [{id,date,page}], … }
//   progress/{bookId_uid}   { uid, bookId, name, page, finished, rating, review, … }
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  arrayUnion,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { MEMBER_COLORS, cleanBookInput, cleanText, makeInviteCode, normalizeCode, pickMemberColor } from '../club.js';
import { progressId } from '../reading.js';

const fail = (code) => Object.assign(new Error(code), { code });

export function createFirebaseBackend({ config, emulator = false }) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = emulator
    ? initializeFirestore(app, {})
    : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const metaRef = doc(db, 'club', 'meta');
  const inviteRef = doc(db, 'club', 'invite');
  const memberRef = (uid) => doc(db, 'members', uid);
  const bookRef = (id) => doc(db, 'books', id);

  let pendingName = '';
  let members = [];
  let meta = null;

  const uid = () => {
    const u = auth.currentUser;
    if (!u) throw fail('unauthenticated');
    return u.uid;
  };
  const toUser = (u) =>
    u && {
      uid: u.uid,
      name: u.displayName || pendingName || (u.email ?? '').split('@')[0],
      email: u.email,
      photoURL: u.photoURL,
    };
  const myName = () => members.find((m) => m.id === auth.currentUser?.uid)?.name ?? toUser(auth.currentUser)?.name ?? '';
  const photo = () => {
    const p = auth.currentUser?.photoURL;
    return typeof p === 'string' && p.startsWith('https://') && p.length <= 1000 ? p : null;
  };

  return {
    mode: emulator ? 'emulator' : 'firebase',

    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => cb(toUser(u)));
    },
    async signInGoogle() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    },
    async signInEmail(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    async registerEmail(name, email, password) {
      pendingName = cleanText(name, 40);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (pendingName) await updateProfile(cred.user, { displayName: pendingName });
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(auth, email.trim());
    },
    async signOut() {
      await signOut(auth);
    },

    async clubStatus() {
      const [m, me] = await Promise.all([getDoc(metaRef), getDoc(memberRef(uid()))]);
      return { clubExists: m.exists(), clubName: m.data()?.name ?? '', isMember: me.exists() };
    },
    async createClub({ clubName, memberName }) {
      const me = uid();
      const code = makeInviteCode();
      const now = Date.now();
      const batch = writeBatch(db);
      batch.set(metaRef, {
        name: cleanText(clubName, 80),
        ownerUid: me,
        createdAt: now,
        currentBookId: null,
        lastPick: null,
      });
      batch.set(inviteRef, { code });
      batch.set(memberRef(me), {
        name: cleanText(memberName, 40),
        color: pickMemberColor([]),
        photoURL: photo(),
        joinedAt: now,
        joinCode: code,
      });
      await batch.commit();
    },
    async joinClub({ code, memberName }) {
      // Non-members can't see who uses which colour yet; the store swaps
      // to a free one after joining if this collides.
      const color = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
      try {
        await setDoc(memberRef(uid()), {
          name: cleanText(memberName, 40),
          color,
          photoURL: photo(),
          joinedAt: Date.now(),
          joinCode: normalizeCode(code),
        });
      } catch (e) {
        if (e?.code === 'permission-denied') throw fail('bad-code');
        throw e;
      }
    },

    subscribe(onData, onError) {
      const strip = ({ joinCode, ...rest }) => rest;
      const unsubs = [
        onSnapshot(
          metaRef,
          (s) => {
            meta = s.exists() ? s.data() : null;
            onData('meta', meta);
          },
          onError,
        ),
        onSnapshot(inviteRef, (s) => onData('invite', s.exists() ? s.data() : null), () => onData('invite', null)),
        onSnapshot(
          collection(db, 'members'),
          (s) => {
            members = s.docs.map((d) => ({ id: d.id, ...strip(d.data()) }));
            onData('members', members);
          },
          onError,
        ),
        onSnapshot(collection(db, 'books'), (s) => onData('books', s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError),
        onSnapshot(collection(db, 'progress'), (s) => onData('progress', s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError),
      ];
      return () => unsubs.forEach((u) => u());
    },

    async addBook(input) {
      const ref = doc(collection(db, 'books'));
      await setDoc(ref, {
        ...cleanBookInput(input),
        addedBy: uid(),
        addedByName: myName(),
        addedAt: Date.now(),
        status: 'shelf',
        goals: [],
      });
      return ref.id;
    },
    async updateBook(id, patch) {
      await updateDoc(bookRef(id), patch);
    },
    async deleteBook(id) {
      const batch = writeBatch(db);
      batch.delete(bookRef(id));
      if (meta?.currentBookId === id) batch.update(metaRef, { currentBookId: null });
      await batch.commit();
    },
    async restoreBook(book) {
      const { id, ...data } = book;
      await setDoc(bookRef(id), data);
    },

    async pickBook(bookId, month) {
      const me = uid();
      const name = myName();
      await runTransaction(db, async (tx) => {
        const b = await tx.get(bookRef(bookId));
        const m = await tx.get(metaRef);
        if (!b.exists() || b.data().status !== 'shelf') throw fail('not-available');
        const at = Date.now();
        tx.update(bookRef(bookId), {
          status: 'picked',
          month,
          pickedAt: at,
          pickedBy: me,
          pickedByName: name,
          prevCurrentId: m.data()?.currentBookId ?? null,
          goals: [],
        });
        tx.update(metaRef, { currentBookId: bookId, lastPick: { bookId, by: me, byName: name, at } });
      });
    },
    async unpickBook(bookId) {
      await runTransaction(db, async (tx) => {
        const b = await tx.get(bookRef(bookId));
        const m = await tx.get(metaRef);
        if (!b.exists()) return;
        let prev = b.data().prevCurrentId ?? null;
        if (prev) {
          const p = await tx.get(bookRef(prev));
          if (!p.exists() || p.data().status !== 'picked') prev = null;
        }
        tx.update(bookRef(bookId), {
          status: 'shelf',
          month: deleteField(),
          pickedAt: deleteField(),
          pickedBy: deleteField(),
          pickedByName: deleteField(),
          prevCurrentId: deleteField(),
          goals: [],
        });
        const patch = {};
        if (m.data()?.currentBookId === bookId) patch.currentBookId = prev;
        if (m.data()?.lastPick?.bookId === bookId) patch.lastPick = null;
        if (Object.keys(patch).length) tx.update(metaRef, patch);
      });
    },
    async setCurrentBook(bookId) {
      await updateDoc(metaRef, { currentBookId: bookId });
    },
    async setBookMonth(bookId, month) {
      await updateDoc(bookRef(bookId), { month });
    },
    async addGoal(bookId, { date, page }) {
      const id = doc(collection(db, 'books')).id.slice(0, 10);
      await updateDoc(bookRef(bookId), { goals: arrayUnion({ id, date, page, createdBy: uid() }) });
    },
    async removeGoal(bookId, goalId) {
      await runTransaction(db, async (tx) => {
        const b = await tx.get(bookRef(bookId));
        if (!b.exists()) return;
        tx.update(bookRef(bookId), { goals: (b.data().goals ?? []).filter((g) => g.id !== goalId) });
      });
    },
    async saveProgress(bookId, patch) {
      const me = uid();
      await setDoc(
        doc(db, 'progress', progressId(bookId, me)),
        { ...patch, uid: me, bookId, name: myName(), updatedAt: Date.now() },
        { merge: true },
      );
    },

    async updateProfile({ name, color }) {
      const patch = {};
      if (name) patch.name = cleanText(name, 40);
      if (color) patch.color = color;
      await updateDoc(memberRef(uid()), patch);
      if (patch.name && auth.currentUser) await updateProfile(auth.currentUser, { displayName: patch.name });
    },
    async renameClub(name) {
      await updateDoc(metaRef, { name: cleanText(name, 80) });
    },
    async regenerateInvite() {
      await setDoc(inviteRef, { code: makeInviteCode() });
    },
    async removeMember(memberId) {
      await deleteDoc(memberRef(memberId));
    },
    async leaveClub() {
      await deleteDoc(memberRef(uid()));
    },
  };
}
