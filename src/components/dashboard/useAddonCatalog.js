import { useEffect, useMemo, useState } from 'react';
import { listAddonCatalogRequest } from '../../api/addonCatalog';
import { DEFAULT_ADDON_ITEM_ROWS } from './orderSheetData';

// Loads the shared add-on catalog for order sheets and admin screens.
// Falls back to DEFAULT_ADDON_ITEM_ROWS if the API is unreachable.
export function useAddonCatalog({ includeInactive = false } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    listAddonCatalogRequest({ includeInactive })
      .then((list) => {
        if (!active) return;
        setRows(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!active) return;
        setRows([]);
        if (err?.status === 404) {
          setError(
            'Add-on catalog API is not on the server yet (404). Deploy /api/addon-catalog/ on the backend. Order sheets use the built-in fallback list until then.'
          );
        } else {
          setError(err?.message || 'Unable to load add-on catalog.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [includeInactive]);

  // Active catalog entries for checkboxes (name + category for grouping).
  const pickerItems = useMemo(() => {
    const active = rows.filter((r) => r.isActive && r.name);
    if (active.length > 0) {
      return active.map((r) => ({
        name: r.name,
        category: r.category || 'General',
      }));
    }
    return DEFAULT_ADDON_ITEM_ROWS.map((name) => ({
      name,
      category: 'General',
    }));
  }, [rows]);

  const pickerNames = useMemo(
    () => pickerItems.map((item) => item.name),
    [pickerItems]
  );

  // Active + inactive names for matching historical order lines.
  const matchNames = useMemo(() => {
    const names = rows.map((r) => r.name).filter(Boolean);
    return names.length > 0 ? names : DEFAULT_ADDON_ITEM_ROWS;
  }, [rows]);

  const catalogUnavailable = Boolean(error) && rows.length === 0;

  return {
    rows,
    setRows,
    pickerItems,
    pickerNames,
    matchNames,
    loading,
    error,
    catalogUnavailable,
    usingFallback: rows.length === 0,
  };
}
