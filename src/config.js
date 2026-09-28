// ─── Bookwheel configuration ───────────────────────────────────────────────
//
// 1. Create a Firebase project and a *Web app* in it
//    (Firebase console → Project settings → General → Your apps → </>).
// 2. Paste the config object Firebase shows you below.
// 3. Commit & push — GitHub Pages rebuilds the site automatically.
//
// These values are not secrets: they only identify your project. What people
// can read or change is enforced by firestore.rules.
//
// While `apiKey` is empty the site runs in demo mode (sample club, stored only
// in the visitor's browser), so you can preview everything before setup.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Optional: a Google Books API key raises the rate limit of the cover search.
// Leave empty to search keyless (works fine for a book club).
export const googleBooksApiKey = '';
