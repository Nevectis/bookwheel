import { firebaseConfig } from '../../config.js';

// Test builds point at the local Firebase emulators instead of a real project.
const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1';
const emulatorConfig = { apiKey: 'demo-key', authDomain: 'demo-bookwheel.firebaseapp.com', projectId: 'demo-bookwheel' };

export const firebaseReady = useEmulator || Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** `?demo` forces the local demo even on a configured site (handy for showing it off). */
function demoRequested() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').has('demo');
  } catch {
    return false;
  }
}

export async function loadBackend() {
  if (firebaseReady && !demoRequested()) {
    const { createFirebaseBackend } = await import('./firebase.js');
    return createFirebaseBackend({ config: useEmulator ? emulatorConfig : firebaseConfig, emulator: useEmulator });
  }
  const { createDemoBackend } = await import('./demo.js');
  return createDemoBackend();
}
