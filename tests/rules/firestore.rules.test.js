// Security-rule tests. Run with `npm run test:rules` (starts the Firestore emulator).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

let env;
const CODE = 'ABCD-EFGH';

const member = (name, code = CODE) => ({ name, color: '#b2456e', photoURL: null, joinedAt: Date.now(), joinCode: code });
const book = (addedBy, extra = {}) => ({
  title: 'Babel',
  author: 'R. F. Kuang',
  genre: 'fantasy',
  coverUrl: null,
  pageCount: 545,
  addedBy,
  addedByName: 'Alice',
  addedAt: Date.now(),
  status: 'shelf',
  goals: [],
  ...extra,
});

const as = (uid) => env.authenticatedContext(uid).firestore();

async function bootstrap(db) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'club/meta'), { name: 'Seitenspringer', ownerUid: 'alice', createdAt: 1, currentBookId: null, lastPick: null });
  batch.set(doc(db, 'club/public'), { name: 'Seitenspringer' });
  batch.set(doc(db, 'club/invite'), { code: CODE });
  batch.set(doc(db, 'members/alice'), member('Alice'));
  return batch.commit();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bookwheel',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env?.cleanup());
beforeEach(() => env.clearFirestore());

describe('club setup', () => {
  it('lets the first signed-in person found the club', async () => {
    await assertSucceeds(bootstrap(as('alice')));
  });

  it('refuses a founder claiming someone else as owner', async () => {
    const db = as('mallory');
    await assertFails(setDoc(doc(db, 'club/meta'), { name: 'X', ownerUid: 'alice', createdAt: 1, currentBookId: null, lastPick: null }));
  });

  it('keeps everything private from signed-out visitors', async () => {
    await bootstrap(as('alice'));
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'club/meta')));
    await assertFails(getDocs(collection(anon, 'books')));
  });
});

describe('joining', () => {
  beforeEach(() => bootstrap(as('alice')));

  it('shows non-members only that the club exists', async () => {
    const bob = as('bob');
    await assertSucceeds(getDoc(doc(bob, 'club/public')));
    await assertFails(getDoc(doc(bob, 'club/meta'))); // founder, current book, last spin: members only
    await assertFails(setDoc(doc(bob, 'club/public'), { name: 'Bobs Club' }));
    await assertSucceeds(getDoc(doc(bob, 'members/bob')));
    await assertFails(getDoc(doc(bob, 'club/invite')));
    await assertFails(getDocs(collection(bob, 'books')));
    await assertFails(getDocs(collection(bob, 'members')));
    await assertFails(setDoc(doc(bob, 'books/x'), book('bob')));
  });

  it('needs the right invite code', async () => {
    const bob = as('bob');
    await assertFails(setDoc(doc(bob, 'members/bob'), member('Bob', 'WRNG-CODE')));
    await assertSucceeds(setDoc(doc(bob, 'members/bob'), member('Bob')));
    await assertSucceeds(getDocs(collection(bob, 'books')));
    await assertSucceeds(getDoc(doc(bob, 'club/invite')));
  });

  it('only accepts a plausible join date and a real colour', async () => {
    const bob = as('bob');
    await assertFails(setDoc(doc(bob, 'members/bob'), { ...member('Bob'), joinedAt: 0 }));
    await assertFails(setDoc(doc(bob, 'members/bob'), { ...member('Bob'), joinedAt: Date.now() + 7 * 86400000 }));
    await assertFails(setDoc(doc(bob, 'members/bob'), { ...member('Bob'), color: 'url(//evil.example/x)' }));
    await assertSucceeds(setDoc(doc(bob, 'members/bob'), member('Bob')));
    await assertFails(updateDoc(doc(bob, 'members/bob'), { color: 'red; background: url(x)' }));
  });

  it('never lets you create a membership for someone else', async () => {
    await assertFails(setDoc(doc(as('bob'), 'members/carol'), member('Carol')));
  });

  it('stops the founder’s role being taken over', async () => {
    const bob = as('bob');
    await setDoc(doc(bob, 'members/bob'), member('Bob'));
    await assertFails(updateDoc(doc(bob, 'club/meta'), { ownerUid: 'bob' }));
    await assertFails(setDoc(doc(bob, 'club/invite'), { code: 'BOBS-CODE' }));
    await assertFails(updateDoc(doc(bob, 'club/meta'), { name: 'Bobs Club' }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'club/meta'), { name: 'Neue Seiten' }));
    await assertSucceeds(setDoc(doc(as('alice'), 'club/invite'), { code: 'NEWC-ODE2' }));
  });

  it('keeps the public name in step with the club, founder only', async () => {
    const alice = as('alice');
    const rename = (db, name) => {
      const batch = writeBatch(db);
      batch.update(doc(db, 'club/meta'), { name });
      batch.set(doc(db, 'club/public'), { name });
      return batch.commit();
    };
    await assertSucceeds(rename(alice, 'Neue Seiten'));
    await assertFails(setDoc(doc(alice, 'club/public'), { name: 'Something else' })); // must match club/meta
    await setDoc(doc(as('bob'), 'members/bob'), member('Bob'));
    await assertFails(rename(as('bob'), 'Bobs Club'));
  });

  it('protects join metadata and lets you change your name/colour', async () => {
    const bob = as('bob');
    await setDoc(doc(bob, 'members/bob'), member('Bob'));
    await assertSucceeds(updateDoc(doc(bob, 'members/bob'), { name: 'Bobby', color: '#23708a' }));
    await assertFails(updateDoc(doc(bob, 'members/bob'), { joinedAt: 0 }));
    await assertFails(updateDoc(doc(bob, 'members/alice'), { name: 'Hacked' }));
  });

  it('lets the founder remove members, but not the other way round', async () => {
    await setDoc(doc(as('bob'), 'members/bob'), member('Bob'));
    await assertFails(deleteDoc(doc(as('bob'), 'members/alice')));
    await assertSucceeds(deleteDoc(doc(as('alice'), 'members/bob')));
  });

  it('retires the old invite code when the founder removes someone', async () => {
    await setDoc(doc(as('bob'), 'members/bob'), member('Bob'));
    const alice = as('alice');
    const batch = writeBatch(alice);
    batch.delete(doc(alice, 'members/bob'));
    batch.set(doc(alice, 'club/invite'), { code: 'FRSH-CODE' });
    await assertSucceeds(batch.commit());
    await assertFails(setDoc(doc(as('bob'), 'members/bob'), member('Bob'))); // old code
  });
});

describe('books, picks and progress', () => {
  beforeEach(async () => {
    await bootstrap(as('alice'));
    await setDoc(doc(as('bob'), 'members/bob'), member('Bob'));
  });

  it('lets members fill the shelf and pick a book', async () => {
    const bob = as('bob');
    await assertSucceeds(setDoc(doc(bob, 'books/b1'), book('bob')));
    await assertSucceeds(
      updateDoc(doc(bob, 'books/b1'), { status: 'picked', month: '2026-10', pickedAt: 5, pickedBy: 'bob', pickedByName: 'Bob', prevCurrentId: null }),
    );
    await assertSucceeds(updateDoc(doc(bob, 'club/meta'), { currentBookId: 'b1', lastPick: { bookId: 'b1', by: 'bob', byName: 'Bob', at: 5 } }));
    await assertSucceeds(updateDoc(doc(bob, 'books/b1'), { goals: [{ id: 'g1', date: '2026-10-10', page: 50, createdBy: 'bob' }] }));
  });

  it('only accepts well-formed picks and months', async () => {
    const bob = as('bob');
    await setDoc(doc(bob, 'books/b1'), book('bob'));
    const pick = (extra = {}) => ({ bookId: 'b1', by: 'bob', byName: 'Bob', at: Date.now(), ...extra });
    await assertFails(updateDoc(doc(bob, 'club/meta'), { lastPick: pick({ by: 'alice' }) })); // in someone else's name
    await assertFails(updateDoc(doc(bob, 'club/meta'), { lastPick: pick({ at: Date.now() + 365 * 86400000 }) })); // far future
    await assertFails(updateDoc(doc(bob, 'club/meta'), { lastPick: pick({ junk: 'x'.repeat(1000) }) }));
    await assertSucceeds(updateDoc(doc(bob, 'club/meta'), { currentBookId: 'b1', lastPick: pick() }));
    // Alice may change the current book without touching Bob's pick.
    await assertSucceeds(updateDoc(doc(as('alice'), 'club/meta'), { currentBookId: null }));
    await assertFails(updateDoc(doc(bob, 'books/b1'), { status: 'picked', month: 'garbage' }));
    await assertFails(updateDoc(doc(bob, 'books/b1'), { status: 'picked', month: '2026-13' }));
    await assertSucceeds(updateDoc(doc(bob, 'books/b1'), { status: 'picked', month: '2026-12' }));
  });

  it('validates book fields', async () => {
    const bob = as('bob');
    await assertFails(setDoc(doc(bob, 'books/b1'), book('bob', { title: '' })));
    await assertFails(setDoc(doc(bob, 'books/b1'), book('bob', { status: 'burned' })));
    await assertFails(setDoc(doc(bob, 'books/b1'), book('bob', { pageCount: -3 })));
    await assertFails(setDoc(doc(bob, 'books/b1'), book('bob', { isAdmin: true })));
    await setDoc(doc(bob, 'books/b1'), book('bob'));
    await assertFails(updateDoc(doc(bob, 'books/b1'), { addedBy: 'alice' }));
  });

  it('allows only your own progress and valid ratings', async () => {
    const bob = as('bob');
    await setDoc(doc(bob, 'books/b1'), book('bob'));
    await assertSucceeds(setDoc(doc(bob, 'progress/b1_bob'), { uid: 'bob', bookId: 'b1', name: 'Bob', page: 50, updatedAt: 1 }, { merge: true }));
    await assertSucceeds(
      setDoc(doc(bob, 'progress/b1_bob'), { uid: 'bob', bookId: 'b1', finished: true, rating: 4, review: 'Toll!', reviewedAt: 2 }, { merge: true }),
    );
    await assertFails(setDoc(doc(bob, 'progress/b1_alice'), { uid: 'alice', bookId: 'b1', page: 1 }));
    await assertFails(setDoc(doc(bob, 'progress/b1_alice'), { uid: 'bob', bookId: 'b1', page: 1 }));
    await assertFails(setDoc(doc(bob, 'progress/b1_bob'), { uid: 'bob', bookId: 'b1', rating: 6 }, { merge: true }));
    await assertFails(setDoc(doc(bob, 'progress/b1_bob'), { uid: 'bob', bookId: 'b1', rating: 3.5 }, { merge: true }));
    await assertSucceeds(getDoc(doc(as('alice'), 'progress/b1_bob')));
  });

  it('locks former members out', async () => {
    await deleteDoc(doc(as('alice'), 'members/bob'));
    const bob = as('bob');
    await assertFails(getDocs(collection(bob, 'books')));
    await assertFails(setDoc(doc(bob, 'books/b2'), book('bob')));
  });
});
