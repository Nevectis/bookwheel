// The club's fixed genre list. Books store the `id`; the label is shown as-is in
// every language because these are the names the club uses day to day.
export const GENRES = [
  { id: 'fantasy', label: 'Fantasy', color: '#4b416e' },
  { id: 'romantasy', label: 'Romantasy', color: '#7a3c55' },
  { id: 'romance', label: 'Romance', color: '#a65a63' },
  { id: 'dark-romance', label: 'Dark Romance', color: '#3f1f2a' },
  { id: 'sci-fi', label: 'Sci-Fi', color: '#2c4b5c' },
  { id: 'historical-fiction', label: 'Historical Fiction', color: '#7a5432' },
  { id: 'thriller-mystery', label: 'Thriller/Mystery', color: '#30363f' },
  { id: 'horror', label: 'Horror', color: '#5f211d' },
  { id: 'non-fiction', label: 'Non-Fiction', color: '#3e5b46' },
  { id: 'young-adult', label: 'Young Adult', color: '#a86d3a' },
  {
    id: 'lgbtq',
    label: 'LGBTQ+',
    color: '#6a4f86',
    gradient: 'linear-gradient(135deg,#a8545a 0%,#b27a48 20%,#ad9a52 40%,#5f8660 60%,#4d6c96 80%,#72578f 100%)',
  },
  { id: 'literary-fiction', label: 'Literary Fiction', color: '#5a5a38' },
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
