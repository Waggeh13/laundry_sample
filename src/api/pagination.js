export const MAX_PAGE_SIZE = 200;

export function clampPageSize(pageSize, fallback = 20) {
  const n = Number(pageSize);
  const size = Number.isFinite(n) && n > 0 ? n : fallback;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(size)));
}

// Normalize a paginated API envelope into a consistent shape.
// Handles `{ data: { results, count, page, ... } }`, `{ data: [...] }`, and
// bare page objects.
export function extractPagePayload(response, { fallbackPageSize = 50 } = {}) {
  let payload = response;

  if (payload && typeof payload === 'object' && 'data' in payload) {
    if (Array.isArray(payload.data)) {
      const list = payload.data;
      return {
        results: list,
        count: list.length,
        page: 1,
        pageSize: list.length || fallbackPageSize,
        totalPages: 1,
      };
    }
    if (payload.data && typeof payload.data === 'object') {
      payload = payload.data;
    }
  }

  const results = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
      ? payload
      : [];

  const countRaw = Number(payload?.count);
  const pageRaw = Number(payload?.page);
  const pageSizeRaw = Number(payload?.page_size);
  const totalPagesRaw = Number(payload?.total_pages);

  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? pageSizeRaw
      : fallbackPageSize;
  const count = Number.isFinite(countRaw) ? countRaw : results.length;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const totalPages = Math.max(
    1,
    Number.isFinite(totalPagesRaw) && totalPagesRaw > 0
      ? totalPagesRaw
      : Math.ceil(count / pageSize) || 1
  );

  return { results, count, page, pageSize, totalPages };
}

// Walk every backend page until exhausted. Use when the UI needs the full
// dataset (e.g. client-side filtering) but the API caps page_size (often 50).
export async function fetchAllPages(
  requestPage,
  { pageSize = 50, maxPages = 200 } = {}
) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  let count = 0;
  const requestedSize = clampPageSize(pageSize, 50);
  let resolvedPageSize = requestedSize;

  do {
    const raw = await requestPage(page, requestedSize);
    const payload = extractPagePayload(raw, { fallbackPageSize: requestedSize });
    all.push(...payload.results);
    count = payload.count;
    totalPages = payload.totalPages;
    resolvedPageSize = payload.pageSize || requestedSize;

    // Last page: short page or we've collected everything the count promises.
    if (
      payload.results.length === 0 ||
      payload.results.length < resolvedPageSize ||
      all.length >= count
    ) {
      break;
    }
    page += 1;
  } while (page <= totalPages && page <= maxPages);

  return { results: all, count: count || all.length };
}
