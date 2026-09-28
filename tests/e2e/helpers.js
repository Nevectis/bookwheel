// Shared e2e helpers.

// Stand-in cover image (an SVG is a valid <img> source with a real size).
export const COVER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#1d4e89"/><circle cx="100" cy="150" r="60" fill="#f3d58e"/></svg>';

/** Stub the book-lookup APIs and cover hosts so tests never hit the network. */
export async function stubCatalogue(page, volumes = []) {
  await page.route('https://www.googleapis.com/books/v1/volumes**', (route) =>
    route.fulfill({ json: { items: volumes.map((v) => ({ volumeInfo: v })) } }),
  );
  await page.route('https://openlibrary.org/search.json**', (route) => route.fulfill({ json: { docs: [] } }));
  await page.route(/covers\.openlibrary\.org|books\.google\.com|example\.org\/cover/, (route) =>
    route.fulfill({ body: COVER_SVG, contentType: 'image/svg+xml' }),
  );
}

export const wheelCount = (page) => page.locator('.count-pill');
