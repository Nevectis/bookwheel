# Bookwheel

An animated book-club website: fill the shelf, spin the wheel for the next
book, set reading goals, follow everyone's progress, then mark the book as read
and rate it. Everyone else's ratings unlock for you once you've rated it yourself.

- **Hosting:** GitHub Pages (static site, deployed by GitHub Actions)
- **Sign-in & data:** Firebase Authentication + Cloud Firestore (free Spark plan is enough)
- **Languages:** German and English (follows the browser, switchable in the menu)
- **Themes:** light, dark, or automatic

Until Firebase is configured, the site runs in **demo mode**: a sample club
stored only in the visitor's browser, so you can try everything straight away.

## Features

| Feature | Where |
| --- | --- |
| Add books to the **shelf** with title, author, genre and cover. Type a title to look it up (Google Books + Open Library fill in cover and page count), or upload / paste a cover. | *Regal* |
| Every shelf book is on the **wheel**. Slices show **title and author only**. | *Rad* |
| **Genre filter** before spinning: *All genres* or any combination of Fantasy, Romantasy, Romance, Dark Romance, Sci-Fi, Historical Fiction, Thriller/Mystery, Horror, Non-Fiction, Young Adult, LGBTQ+, Literary Fiction | *Rad* |
| Spinning gives a **popup** with cover, title, author **and genre**. The book leaves the wheel and lands in the **list for its month** (changeable). Other members who are online get the popup too. | Popup, *Chronik* |
| The picked book becomes the **current book** (cover + title), which the whole club is reading. | *Aktuell* |
| **Reading goals**: "by 10 Oct everyone reaches page 50" (date + page). Everyone updates their current page. | *Aktuell* |
| Under the wheel, a **strip of little pop-ups** shows each person, the book and how far they are (including whether they're on track). | *Wer liest wie weit?* |
| **Mark as read**, then give **1–5 stars and a review**, straight away or later. | *Aktuell*, *Chronik* |
| The **average** appears under the book in its month (e.g. 4.3 → four full stars and a partly filled fifth), together with everyone's reviews. To avoid spoilers they stay sealed for you **until you've rated the book yourself**. Nobody has to wait for the whole club. (This is a courtesy spoiler shield in the app: members' browsers still receive the ratings, so someone digging through developer tools could peek.) | *Chronik* |
| Club with **invite code / invite link**. The founder can rename the club, issue a new code and remove members (removing someone also retires the old code). | Menu → *Club & Einladung* |

## Setup (about 15 minutes)

### 1. Turn on GitHub Pages

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow from the
   **Actions** tab). The site appears at `https://<user>.github.io/<repo>/`,
   e.g. `https://nevectis.github.io/bookwheel/`.

At this point the site runs in demo mode.

### 2. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** (Google
   Analytics is not needed).
2. **Build → Authentication → Get started → Sign-in method**: enable
   **Google** and **Email/Password**.
3. **Authentication → Settings → Authorized domains → Add domain**: add your
   Pages domain, e.g. `nevectis.github.io`.
4. **Build → Firestore Database → Create database**: choose a location close to
   you (e.g. `eur3` or `europe-west3`) and start in **production mode**.
5. **Firestore → Rules**: replace the contents with [`firestore.rules`](firestore.rules)
   from this repository and click **Publish**.
   (Alternatively: `npx firebase-tools deploy --only firestore:rules --project <project-id>`.)
6. **Project settings (⚙) → General → Your apps → Web (`</>`)**: register an
   app (no Firebase Hosting needed) and copy the `firebaseConfig` values.

### 3. Connect the site

Paste the config into [`src/config.js`](src/config.js):

```js
export const firebaseConfig = {
  apiKey: 'AIza…',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.firebasestorage.app',
  messagingSenderId: '…',
  appId: '…',
};
```

These values are not secrets: they only identify the project. Who may read or
write what is enforced by the Firestore rules. Commit and push. The Actions
workflow rebuilds and redeploys the site.

### 4. Found your club

1. Open the site and sign in. **The first person to sign in founds the club**
   (do this right after deploying) and becomes the founder.
2. Open the menu (your avatar) → **Club & Einladung** → **Link kopieren**,
   and send the link to your friends. They sign in and join with the code
   already filled in. The code alone works too.
3. Anyone signed in without the code only sees the club's name, so they can be told to ask for the code. Nothing else.

> Tip: `?demo` at the end of the URL always opens the local demo, even on a
> configured site, which is handy for showing Bookwheel off without touching real data.

## Design

The look is a reading room: aged paper, bottle-green bookcloth, an oxblood
ribbon and muted gilt. Type is set in Cormorant Garamond (display), Jost
(interface) and Courier Prime (anything "typed" onto a card). The fonts are
bundled with the site (via Fontsource), so no requests go to Google Fonts. The wheel is
drawn as a *volvelle*, the rotating paper disc found in old books.

The textures in `public/textures/` are generated, not downloaded:
`marble.jpg` is Turkish "stone" marbling made with Aubrey Jaffer's
mathematical ink-drop model, and `paper.jpg` is a tileable fibre texture.

## How it works

```
src/
  App.svelte               page layout, phases (sign-in → join → club)
  components/              Wheel, WheelCard, CurrentBook, GoalList, ProgressTicker,
                           Shelf, BookFormModal, SpinResultModal, ReviewModal,
                           Chronicle(+Entry), ClubModal, AuthScreen, ClubGate, …
  lib/
    backend/firebase.js    Firebase Auth + Firestore (realtime listeners, transactions)
    backend/demo.js        same interface on localStorage, with a seeded sample club
    store.svelte.js        live club state + all actions
    wheel.js               wheel geometry, landing maths, easing, slice morphing
    reading.js             goals, progress, sealed rating summary / average
    covers.js              book lookup (Google Books, Open Library), image compression
    strings.js             German + English UI text
firestore.rules            security rules (one club per Firebase project)
```

Firestore layout:

| Path | Contents |
| --- | --- |
| `club/meta` | club name, founder, current book, last spin (members only) |
| `club/public` | just the club name, readable by anyone signed in |
| `club/invite` | invite code (members only) |
| `members/{uid}` | name, colour, join date |
| `books/{id}` | title, author, genre, cover, pages, `status: shelf \| picked`, month, goals |
| `progress/{bookId}_{uid}` | page, read yes/no, stars, review (writable only by that person) |

Uploaded covers are shrunk in the browser (≈360×540 JPEG) and stored in the
book document, so no Cloud Storage (and no paid plan) is needed.

## Development

```bash
npm install
npm run dev            # http://localhost:5173 (demo mode unless src/config.js is filled in)
npm test               # unit tests (wheel maths, goals, ratings, lookup, strings)
npm run test:rules     # security-rule tests on the Firestore emulator (needs Java 21)
npm run test:e2e       # browser test of the whole flow in demo mode
npm run test:e2e:emulator  # two users in two browsers against the Auth + Firestore emulators
npm run build          # production build into dist/
```

Pull requests run all of the above in the **CI** workflow. Pushes to `main`
deploy to Pages.
