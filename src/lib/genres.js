// The club's fixed genre list. Books store the `id`; the label is shown as-is in
// every language because these are the names the club uses day to day.
export const GENRES = [
  { id: 'fantasy', label: 'Fantasy', color: '#5b4a9e' },
  { id: 'romantasy', label: 'Romantasy', color: '#b2456e' },
  { id: 'romance', label: 'Romance', color: '#d96a86' },
  { id: 'dark-romance', label: 'Dark Romance', color: '#4d1a2c' },
  { id: 'sci-fi', label: 'Sci-Fi', color: '#23708a' },
  { id: 'historical-fiction', label: 'Historical Fiction', color: '#8a5a2b' },
  { id: 'thriller-mystery', label: 'Thriller/Mystery', color: '#34445a' },
  { id: 'horror', label: 'Horror', color: '#7c2418' },
  { id: 'non-fiction', label: 'Non-Fiction', color: '#3f6f47' },
  { id: 'young-adult', label: 'Young Adult', color: '#d27a24' },
  {
    id: 'lgbtq',
    label: 'LGBTQ+',
    color: '#7d4fb5',
    gradient: 'linear-gradient(135deg,#e0474c 0%,#f0913a 20%,#e8c63a 40%,#4aa55b 60%,#3d7fd0 80%,#8a4fc0 100%)',
  },
  { id: 'literary-fiction', label: 'Literary Fiction', color: '#5d5a33' },
];

const byId = new Map(GENRES.map((g) => [g.id, g]));

export function genreById(id) {
  return byId.get(id) ?? { id, label: id || '—', color: '#6d5f55' };
}

/** CSS background for a genre swatch (the LGBTQ+ one is a rainbow). */
export function genreSwatch(id) {
  const g = genreById(id);
  return g.gradient ?? g.color;
}

// Keyword → genre, checked in order, so the more specific entries come first
// ("dark romance" before "romance", "young adult" before everything else).
const GUESSES = [
  [/lgbt|queer|gay|lesbian|transgender/i, 'lgbtq'],
  [/young adult|juvenile|jugendbuch|teen/i, 'young-adult'],
  [/dark romance/i, 'dark-romance'],
  [/romantasy|fantasy romance|romantic fantasy/i, 'romantasy'],
  [/science fiction|sci-fi|dystopi|space opera/i, 'sci-fi'],
  [/fantasy/i, 'fantasy'],
  [/horror|ghost|paranormal/i, 'horror'],
  [/thriller|mystery|crime|suspense|detective|krimi/i, 'thriller-mystery'],
  [/historical|historisch/i, 'historical-fiction'],
  [/romance|love stor|liebesroman/i, 'romance'],
  [/literary|literarisch|classics/i, 'literary-fiction'],
  [/biograph|history|self-help|psycholog|science|business|nonfiction|non-fiction|sachbuch|memoir|philosoph|health|cooking|travel/i, 'non-fiction'],
];

/** Best-effort genre guess from catalogue categories (e.g. Google Books). */
export function guessGenre(categories) {
  const text = (categories ?? []).join(' | ');
  if (!text) return null;
  for (const [re, id] of GUESSES) if (re.test(text)) return id;
  if (/fiction/i.test(text)) return 'literary-fiction';
  return null;
}
