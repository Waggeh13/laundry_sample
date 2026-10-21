export const ITEM_ROWS = [
  'SHIRTS',
  'TOP',
  'BOTTOMS',
  'SOCKS',
  'TOWELS',
  'BEDSHEETS',
  'DUVETS',
  'CURTAINS',
  'OTHERS',
];

// Fallback when the add-on catalog API is unavailable. Prefer live catalog names.
export const DEFAULT_ADDON_ITEM_ROWS = [
  'SINGLETS',
  'BOXERS',
  'UNDERWEAR',
  'INNER',
  'VEST',
  'BLANKETS',
  'PILLOWCASE',
  'SMOCK',
  'JALABIA',
  'NIGHTWEAR',
  'KAFTAN',
  'KENTE CLOTH',
  'KENTE SLIT AND KABA',
  'KENTE DRESS',
  'SLIT AND KABA',
  'SLIT',
  'KABA',
  'JACKET',
  'BEADS DRESS',
  'LACE DRESS',
  'SUIT U/D',
  'SUIT TOP',
  'SUIT BOTTOM',
  'SKIRT AND TOP',
  "MEN'S CLOTH",
  'SHORTS',
  'SKIRTS',
  'FACE TOWEL',
  'HANDKERCHIEF',
  'GRADUATION GOWN',
];

/** @deprecated Use DEFAULT_ADDON_ITEM_ROWS or catalog API names. */
export const ADDON_ITEM_ROWS = DEFAULT_ADDON_ITEM_ROWS;

export const ALL_ITEM_ROWS = [...ITEM_ROWS, ...DEFAULT_ADDON_ITEM_ROWS];

export const SERVICE_CONDITION =
  '1. The company reserves the right to dispose of items uncollected 3 months after the date received.';

const ITEM_SET = new Set(ITEM_ROWS);

function emptyRow() {
  return { dirty: '', clean: '', unitPrice: '', remarks: '' };
}

export function allItemRows(addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  const addons = Array.isArray(addonRows) ? addonRows : DEFAULT_ADDON_ITEM_ROWS;
  return [...ITEM_ROWS, ...addons];
}

export function emptyInventory(addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  return allItemRows(addonRows).reduce((acc, item) => {
    acc[item] = emptyRow();
    return acc;
  }, {});
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

// Normalize API item names into sheet keys.
// Legacy TOPS → SHIRTS (backend migration). TOP remains its own core row.
export function resolveItemKey(itemName, addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  const name = normalizeName(itemName);
  if (!name) return 'OTHERS';
  if (name === 'TOPS') return 'SHIRTS';
  if (ITEM_SET.has(name)) return name;

  const addons = Array.isArray(addonRows) ? addonRows : DEFAULT_ADDON_ITEM_ROWS;
  const addonMatch = addons.find((row) => normalizeName(row) === name);
  if (addonMatch) return addonMatch;

  // Historical / custom specialty name not in the current catalog — keep as-is.
  return name;
}

export function isAddonItem(name, addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  const key = resolveItemKey(name, addonRows);
  if (!key || key === 'OTHERS') return false;
  return !ITEM_SET.has(key);
}

// Which add-ons are present on an order (for pre-checking the picker).
export function addonsFromOrderItems(items, addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  const selected = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = resolveItemKey(item?.itemName, addonRows);
    if (isAddonItem(key, addonRows) && !selected.includes(key)) {
      selected.push(key);
    }
  });
  return selected;
}

// Build the API's order_items_data rows from the sheet inventory.
export function buildOrderItems(inventory, selectedAddons = null, addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  const addonFilter = Array.isArray(selectedAddons)
    ? new Set(selectedAddons)
    : null;
  const names = new Set(allItemRows(addonRows));

  if (addonFilter) {
    addonFilter.forEach((name) => names.add(name));
  }

  Object.keys(inventory || {}).forEach((name) => {
    const row = inventory[name] || {};
    const dirty = Number(row.dirty) || 0;
    const clean = Number(row.clean) || 0;
    if (dirty > 0 || clean > 0) names.add(name);
  });

  return [...names]
    .map((name) => {
      if (
        addonFilter &&
        isAddonItem(name, addonRows) &&
        !addonFilter.has(name)
      ) {
        const row = inventory?.[name] || {};
        const dirty = Number(row.dirty) || 0;
        const clean = Number(row.clean) || 0;
        if (dirty <= 0 && clean <= 0) return null;
      }

      const row = inventory?.[name] || {};
      const dirty = Number(row.dirty) || 0;
      const clean = Number(row.clean) || 0;
      if (dirty <= 0 && clean <= 0) return null;
      return {
        itemName: name,
        dirtyQuantity: dirty,
        cleanQuantity: clean,
        unitPrice: Number(row.unitPrice) || 0,
        notes: (row.remarks || '').trim(),
      };
    })
    .filter(Boolean);
}

// Map order items (from apiOrderToRow) back into the sheet inventory shape.
export function orderItemsToInventory(items, addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  const inventory = emptyInventory(addonRows);
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = resolveItemKey(item?.itemName, addonRows);
    const price = Number(item?.unitPrice) || 0;
    const existing = inventory[key] || emptyRow();
    const dirty =
      (Number(existing.dirty) || 0) + (Number(item?.dirtyQuantity) || 0);
    const clean =
      (Number(existing.clean) || 0) + (Number(item?.cleanQuantity) || 0);
    inventory[key] = {
      dirty: dirty ? String(dirty) : '',
      clean: clean ? String(clean) : '',
      unitPrice: price ? String(price) : existing.unitPrice || '',
      remarks: item?.notes || existing.remarks || '',
    };
  });
  return inventory;
}

export function inventoryTotals(inventory, addonRows = DEFAULT_ADDON_ITEM_ROWS) {
  const keys = new Set([
    ...allItemRows(addonRows),
    ...Object.keys(inventory || {}),
  ]);

  return [...keys].reduce(
    (acc, key) => {
      const row = inventory?.[key] || {};
      const dirty = Number(row.dirty) || 0;
      const clean = Number(row.clean) || 0;
      const price = Number(row.unitPrice) || 0;
      acc.dirty += dirty;
      acc.clean += clean;
      acc.amount += price * (dirty + clean);
      return acc;
    },
    { dirty: 0, clean: 0, amount: 0 }
  );
}

// Convert a DD/MM/YYYY (or ISO) date string into a value for <input type="date">.
export function displayDateToInput(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return String(dateStr).slice(0, 10);
  const parts = String(dateStr).split('/');
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Extract the selected service ids (as strings) from an order row.
export function orderServiceIds(order) {
  if (Array.isArray(order?.serviceIds)) return order.serviceIds.map(String);
  if (Array.isArray(order?.services)) {
    return order.services
      .map((s) => (s?.id != null ? String(s.id) : null))
      .filter(Boolean);
  }
  return [];
}
