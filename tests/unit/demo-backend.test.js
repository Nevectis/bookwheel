import { describe, expect, it } from 'vitest';
import { createDemoBackend, isDemoState } from '../../src/lib/backend/demo.js';

const KEY = 'bookwheel:demo-v2';

function memoryStorage(initial = {}, { full = false } = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      if (full) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
      data[k] = String(v);
    },
    removeItem: (k) => delete data[k],
  };
}
const read = (storage) => JSON.parse(storage.data[KEY]);
const book = { title: 'Piranesi', author: 'Susanna Clarke', genre: 'fantasy' };

describe('demo backend', () => {
  it('starts a fresh sample club when the stored data is unusable', async () => {
    for (const junk of ['null', '{}', '[]', '{"meta":null}', 'not json']) {
      const storage = memoryStorage({ [KEY]: junk });
      const backend = createDemoBackend({ storage });
      const status = await backend.clubStatus();
      expect(status.clubName).toBeTruthy();
    }
    expect(isDemoState({ meta: { name: 'x' }, invite: {}, members: {}, books: {}, progress: {} })).toBe(true);
    expect(isDemoState({ meta: { name: 'x' }, invite: {}, members: {}, books: { b: null }, progress: {} })).toBe(false);
  });

  it('refuses a spin when someone else picked in the meantime', async () => {
    const storage = memoryStorage();
    const backend = createDemoBackend({ storage });
    await backend.signInDemo('Niels');
    const a = await backend.addBook(book);
    const b = await backend.addBook({ ...book, title: 'Babel' });
    const since = read(storage).meta.lastPick?.at ?? 0;
    await backend.pickBook(a, '2026-10', since);
    await expect(backend.pickBook(b, '2026-10', since)).rejects.toMatchObject({ code: 'someone-else-spun' });
    await expect(backend.pickBook(a, '2026-10')).rejects.toMatchObject({ code: 'not-available' });
  });

  it('retires the invite code when a member is removed', async () => {
    const storage = memoryStorage();
    const backend = createDemoBackend({ storage });
    await backend.signInDemo('Niels');
    const before = read(storage).invite.code;
    await backend.removeMember('anna');
    expect(read(storage).members.anna).toBeUndefined();
    expect(read(storage).invite.code).not.toBe(before);
  });

  it('cleans names like the Firebase backend does', async () => {
    const storage = memoryStorage();
    const backend = createDemoBackend({ storage });
    await backend.signInDemo('Niels');
    await expect(backend.renameClub('   ')).rejects.toMatchObject({ code: 'invalid-argument' });
    await backend.renameClub('  Die   Leseratten  ');
    await backend.updateProfile({ name: 'x'.repeat(80) });
    expect(read(storage).meta.name).toBe('Die Leseratten');
    expect(read(storage).members['demo-me'].name).toHaveLength(40);
  });

  it('keeps working but says so when the browser storage is full', async () => {
    const storage = memoryStorage({}, { full: true });
    const backend = createDemoBackend({ storage });
    await backend.signInDemo('Niels'); // signing in still works
    await expect(backend.addBook(book)).rejects.toMatchObject({ code: 'storage-full' });
  });
});
