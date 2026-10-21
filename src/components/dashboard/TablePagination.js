import './AllServices.css';

function pageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

function TablePagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}) {
  const safeTotal = Math.max(1, totalPages || 1);
  const current = Math.max(1, page || 1);
  const safePage = Math.min(current, safeTotal);
  const pages = pageNumbers(safePage, safeTotal);

  return (
    <div className="services-pagination">
      <button
        type="button"
        className="pagination-btn"
        aria-label="Previous page"
        disabled={disabled || safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        ‹
      </button>
      {pages.map((p, index) => {
        const prev = pages[index - 1];
        const gap = prev != null && p - prev > 1;
        return (
          <span key={p} className="pagination-page-group">
            {gap ? <span className="pagination-ellipsis">…</span> : null}
            <button
              type="button"
              className={`pagination-btn${
                p === safePage ? ' pagination-btn-active' : ''
              }`}
              disabled={disabled}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          </span>
        );
      })}
      <button
        type="button"
        className="pagination-btn"
        aria-label="Next page"
        disabled={disabled || safePage >= safeTotal}
        onClick={() => onPageChange(safePage + 1)}
      >
        ›
      </button>
    </div>
  );
}

export default TablePagination;
