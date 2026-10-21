import {
  ITEM_ROWS,
  SERVICE_CONDITION,
  inventoryTotals,
} from './orderSheetData';
import './CreateOrder.css';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ItemRow({ item, row, readOnly, onInventoryChange }) {
  return (
    <tr>
      <td className="order-sheet-item-name">{item}</td>
      <td>
        {readOnly ? (
          row.dirty || ''
        ) : (
          <input
            type="number"
            min="0"
            value={row.dirty || ''}
            onChange={(e) => onInventoryChange?.(item, 'dirty', e.target.value)}
          />
        )}
      </td>
      <td>
        {readOnly ? (
          row.clean || ''
        ) : (
          <input
            type="number"
            min="0"
            value={row.clean || ''}
            onChange={(e) => onInventoryChange?.(item, 'clean', e.target.value)}
          />
        )}
      </td>
      <td>
        {readOnly ? (
          row.unitPrice ? formatMoney(row.unitPrice) : ''
        ) : (
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.unitPrice || ''}
            onChange={(e) =>
              onInventoryChange?.(item, 'unitPrice', e.target.value)
            }
          />
        )}
      </td>
      <td>
        {readOnly ? (
          row.remarks || ''
        ) : (
          <input
            type="text"
            value={row.remarks || ''}
            onChange={(e) =>
              onInventoryChange?.(item, 'remarks', e.target.value)
            }
          />
        )}
      </td>
    </tr>
  );
}

function OrderSheet({
  readOnly = false,
  orderNumber = 'Auto',
  customerName = '',
  customerSelect = null,
  telephone = '',
  address = '',
  orderDate = '',
  orderTime = '',
  inventory,
  selectedAddons = [],
  addonRows = [],
  addonItems = [],
  addonsLoading = false,
  services = [],
  selectedServiceIds = [],
  servicesLoading = false,
  deliveryDate = '',
  deliveryTime = '',
  deliveredBy = '',
  receivedBy = '',
  receivedBySelect = null,
  pickedUpAt = '',
  onTelephoneChange,
  onAddressChange,
  onInventoryChange,
  onToggleAddon,
  onToggleService,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onDeliveredByChange,
  onReceivedByChange,
}) {
  const totals = inventoryTotals(inventory || {}, addonRows);
  const selected = new Set((selectedServiceIds || []).map(String));
  const addonSet = new Set(selectedAddons || []);
  const catalogItems =
    Array.isArray(addonItems) && addonItems.length > 0
      ? addonItems
      : (Array.isArray(addonRows) ? addonRows : []).map((name) => ({
          name,
          category: 'General',
        }));
  const catalogAddons = catalogItems.map((item) => item.name);
  const addonGroups = (() => {
    const map = new Map();
    catalogItems.forEach((item) => {
      const category = item.category || 'General';
      if (!map.has(category)) map.set(category, []);
      map.get(category).push(item.name);
    });
    return [...map.entries()];
  })();
  // In read-only mode, also show add-ons that have quantities even if the
  // parent forgot to preselect them. Historical names may be outside the catalog.
  const visibleAddons = [
    ...catalogAddons.filter((name) => {
      if (addonSet.has(name)) return true;
      if (!readOnly) return false;
      const row = inventory?.[name];
      return Number(row?.dirty) > 0 || Number(row?.clean) > 0;
    }),
    ...[...addonSet].filter((name) => !catalogAddons.includes(name)),
  ];

  return (
    <div className={`order-sheet${readOnly ? ' order-sheet-readonly' : ''}`}>
      <div className="order-sheet-title-bar">
        <h2>ORDER SHEET</h2>
        <div className="order-sheet-serial">
          <span>No.</span>
          <span className="order-sheet-serial-value">{orderNumber || 'Auto'}</span>
        </div>
      </div>

      <section className="order-sheet-customer">
        {customerSelect ? (
          <label className="order-sheet-line-field order-sheet-line-full">
            <span>Customer Name {readOnly ? null : <em>*</em>}</span>
            {customerSelect}
          </label>
        ) : null}

        <div className="order-sheet-line-field order-sheet-line-full">
          <span>{customerSelect ? 'Name on sheet' : 'Customer Name'}</span>
          <input type="text" value={customerName} readOnly />
        </div>

        <div className="order-sheet-line-field">
          <span>Telephone No</span>
          <input
            type="text"
            value={telephone}
            readOnly={readOnly}
            onChange={
              readOnly ? undefined : (e) => onTelephoneChange?.(e.target.value)
            }
          />
        </div>

        <div className="order-sheet-line-field order-sheet-line-full">
          <span>Address</span>
          <input
            type="text"
            value={address}
            readOnly={readOnly}
            onChange={
              readOnly ? undefined : (e) => onAddressChange?.(e.target.value)
            }
          />
        </div>

        <div className="order-sheet-date-row">
          <div className="order-sheet-line-field">
            <span>Order Date</span>
            <input type="date" value={orderDate} readOnly />
          </div>
          <div className="order-sheet-line-field">
            <span>Time</span>
            <input type="time" value={orderTime} readOnly />
          </div>
        </div>
      </section>

      {!readOnly ? (
        <section className="order-sheet-addons">
          <h3>ADD-ONS</h3>
          <p className="order-sheet-addons-hint">
            Select specialty items to add rows below. Use SHIRTS and TOP for
            everyday tops.
          </p>
          {addonsLoading ? (
            <p className="order-sheet-services-empty">Loading add-ons…</p>
          ) : catalogAddons.length === 0 ? (
            <p className="order-sheet-services-empty">
              No add-ons available in the catalog.
            </p>
          ) : (
            <div className="order-sheet-addons-groups">
              {addonGroups.map(([category, names]) => (
                <div key={category} className="order-sheet-addons-group">
                  {addonGroups.length > 1 ? (
                    <h4 className="order-sheet-addons-category">{category}</h4>
                  ) : null}
                  <div className="order-sheet-addons-grid">
                    {names.map((name) => (
                      <label key={name} className="order-sheet-check">
                        <input
                          type="checkbox"
                          checked={addonSet.has(name)}
                          onChange={() => onToggleAddon?.(name)}
                        />
                        <span>{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="order-sheet-table-wrap">
        <table className="order-sheet-table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>NUMBER OF DIRTY ITEMS</th>
              <th>NUMBER OF CLEANED ITEMS</th>
              <th>UNIT PRICE (GHS)</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {ITEM_ROWS.map((item) => (
              <ItemRow
                key={item}
                item={item}
                row={inventory?.[item] || {}}
                readOnly={readOnly}
                onInventoryChange={onInventoryChange}
              />
            ))}
            {visibleAddons.length > 0 ? (
              <tr className="order-sheet-addon-section-row">
                <td colSpan="5">Add-ons</td>
              </tr>
            ) : null}
            {visibleAddons.map((item) => (
              <ItemRow
                key={item}
                item={item}
                row={inventory?.[item] || {}}
                readOnly={readOnly}
                onInventoryChange={onInventoryChange}
              />
            ))}
            <tr className="order-sheet-total-row">
              <td>TOTAL</td>
              <td>{totals.dirty || ''}</td>
              <td>{totals.clean || ''}</td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="order-sheet-amount-note">
        Estimated amount: <strong>GHS {formatMoney(totals.amount)}</strong>
      </div>

      <section className="order-sheet-services">
        <h3>SERVICES REQUIRED</h3>
        {servicesLoading ? (
          <p className="order-sheet-services-empty">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="order-sheet-services-empty">
            No active services available.
          </p>
        ) : (
          <div className="order-sheet-services-grid">
            {services.map((service) => (
              <label key={service.value} className="order-sheet-check">
                <input
                  type="checkbox"
                  checked={selected.has(String(service.value))}
                  disabled={readOnly}
                  onChange={
                    readOnly ? undefined : () => onToggleService?.(service.value)
                  }
                />
                <span>{service.label}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="order-sheet-footer-grid">
        <div className="order-sheet-delivery">
          <div className="order-sheet-date-row">
            <label className="order-sheet-line-field">
              <span>Delivery Date</span>
              <input
                type="date"
                value={deliveryDate}
                readOnly={readOnly}
                onChange={
                  readOnly
                    ? undefined
                    : (e) => onDeliveryDateChange?.(e.target.value)
                }
              />
            </label>
            <label className="order-sheet-line-field">
              <span>Time</span>
              <input
                type="time"
                value={deliveryTime}
                readOnly={readOnly}
                onChange={
                  readOnly
                    ? undefined
                    : (e) => onDeliveryTimeChange?.(e.target.value)
                }
              />
            </label>
          </div>
          <label className="order-sheet-line-field order-sheet-line-full">
            <span>Delivered By</span>
            <input
              type="text"
              value={deliveredBy}
              readOnly={readOnly}
              onChange={
                readOnly
                  ? undefined
                  : (e) => onDeliveredByChange?.(e.target.value)
              }
            />
          </label>
          <label className="order-sheet-line-field order-sheet-line-full">
            <span>Received By</span>
            {receivedBySelect ? (
              receivedBySelect
            ) : (
              <input
                type="text"
                value={receivedBy}
                readOnly={readOnly}
                onChange={
                  readOnly
                    ? undefined
                    : (e) => onReceivedByChange?.(e.target.value)
                }
              />
            )}
          </label>
          {pickedUpAt ? (
            <div className="order-sheet-line-field order-sheet-line-full">
              <span>Picked Up At</span>
              <input type="text" value={pickedUpAt} readOnly />
            </div>
          ) : null}
        </div>

        <aside className="order-sheet-conditions">
          <h4>Conditions of Service</h4>
          <p>{SERVICE_CONDITION}</p>
        </aside>
      </section>
    </div>
  );
}

export default OrderSheet;
