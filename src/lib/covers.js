// Book lookup for the "add book" form: Google Books and Open Library are both
// free, keyless (a Google key only raises the rate limit) and CORS-enabled, so
// the browser can query them directly from GitHub Pages.

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function safeImageUrl(url) {
  if (typeof url !== 'string') return null;
  const s = url.trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(s)) return s;
  if (/^http:\/\//i.test(s)) return 'https://' + s.slice(7);
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  return null;
}

export function googleCover(imageLinks) {
  const raw = imageLinks?.thumbnail || imageLinks?.smallThumbnail;
  if (!raw) return null;
  return safeImageUrl(raw.replace(/&edge=curl/g, ''));
}

export function fromGoogle(item) {
  const v = item?.volumeInfo ?? {};
  if (!v.title) return null;
  return {
    source: 'google',
    title: v.subtitle && v.title.length < 30 ? `${v.title}: ${v.subtitle}` : v.title,
    author: (v.authors ?? []).join(', '),
    coverUrl: googleCover(v.imageLinks),
    pageCount: Number.isInteger(v.pageCount) && v.pageCount > 0 ? v.pageCount : null,
    categories: v.categories ?? [],
  };
}

export function fromOpenLibrary(doc) {
  if (!doc?.title) return null;
  return {
    source: 'openlibrary',
    title: doc.title,
    author: (doc.author_name ?? []).slice(0, 3).join(', '),
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    pageCount: Number.isInteger(doc.number_of_pages_median) ? doc.number_of_pages_median : null,
    categories: (doc.subject ?? []).slice(0, 12),
  };
}

/** Google results first (better metadata), then Open Library fills gaps. */
export function mergeResults(google, openLibrary, limit = 8) {
  const out = [];
  const seen = new Map();
  for (const r of [...google, ...openLibrary]) {
    if (!r) continue;
    const key = norm(r.title) + '|' + norm(r.author).split(' ')[0];
    const existing = seen.get(key);
    if (existing) {
      if (!existing.coverUrl && r.coverUrl) existing.coverUrl = r.coverUrl;
      if (!existing.pageCount && r.pageCount) existing.pageCount = r.pageCount;
      continue;
    }
    const copy = { ...r };
    seen.set(key, copy);
    out.push(copy);
  }
  // Results with a cover are far more useful here.
  return out.sort((a, b) => Number(!!b.coverUrl) - Number(!!a.coverUrl)).slice(0, limit);
}

export async function searchBooks(query, { signal, apiKey = '', fetchImpl = fetch } = {}) {
  const q = String(query ?? '').trim();
  if (q.length < 2) return [];
  const g = new URL('https://www.googleapis.com/books/v1/volumes');
  g.searchParams.set('q', q);
  g.searchParams.set('maxResults', '10');
  g.searchParams.set('printType', 'books');
  if (apiKey) g.searchParams.set('key', apiKey);
  const o = new URL('https://openlibrary.org/search.json');
  o.searchParams.set('q', q);
  o.searchParams.set('limit', '8');
  o.searchParams.set('fields', 'title,author_name,cover_i,number_of_pages_median,subject');

  const [gr, or] = await Promise.allSettled([
    fetchImpl(g, { signal }).then((r) => (r.ok ? r.json() : { items: [] })),
    fetchImpl(o, { signal }).then((r) => (r.ok ? r.json() : { docs: [] })),
  ]);
  if (signal?.aborted) return [];
  const google = gr.status === 'fulfilled' ? (gr.value.items ?? []).map(fromGoogle) : [];
  const ol = or.status === 'fulfilled' ? (or.value.docs ?? []).map(fromOpenLibrary) : [];
  return mergeResults(google, ol);
}

/**
 * Shrink an uploaded image to a small JPEG data URL so it can live inside the
 * book's Firestore document (no Cloud Storage needed).
 */
export async function compressImage(file, { maxW = 360, maxH = 540, maxBytes = 160_000 } = {}) {
  if (!file || !/^image\//.test(file.type)) throw new Error('not-an-image');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('unreadable-image'));
      i.src = url;
    });
    const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let quality = 0.86;
    let data = canvas.toDataURL('image/jpeg', quality);
    while (data.length > maxBytes && quality > 0.4) {
      quality -= 0.1;
      data = canvas.toDataURL('image/jpeg', quality);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
