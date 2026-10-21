import { useEffect, useState } from 'react';
import { listAdminsRequest, listEmployeesRequest } from '../../api/accounts';
import { listServicesRequest } from '../../api/services';
import OrderSheet from './OrderSheet';
import {
  addonsFromOrderItems,
  buildOrderItems,
  displayDateToInput,
  emptyInventory,
  orderItemsToInventory,
  orderServiceIds,
} from './orderSheetData';
import { useAddonCatalog } from './useAddonCatalog';
import './CreateOrder.css';
import './UpdateOrderModal.css';

const orderStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function isoToTime(value) {
  if (!value) return '';
  const match = String(value).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

function buildFormState(order, addonRows = []) {
  const inventory = {
    ...emptyInventory(addonRows),
    ...orderItemsToInventory(order?.items, addonRows),
  };
  return {
    orderStatus: (order?.orderStatus || '').toLowerCase(),
    assignedTo: order?.assignedToId != null ? String(order.assignedToId) : '',
    discount: String(parseFloat(order?.discount) || 0),
    estimatedCompletion: displayDateToInput(order?.estimatedCompletion),
    customerName: order?.customer || '',
    telephone: order?.customerPhone || '',
    address: order?.customerAddress || '',
    orderDate: displayDateToInput(order?.createdOn),
    orderTime: isoToTime(order?.createdAtRaw),
    inventory,
    selectedAddons: addonsFromOrderItems(order?.items, addonRows),
    selectedServiceIds: orderServiceIds(order),
    deliveryDate: displayDateToInput(order?.deliveryDate),
    deliveryTime: order?.deliveryTime || '',
    deliveredBy: '',
    receivedBy: '',
    pickedUp: !!order?.pickedUp,
    pickedUpAt: order?.pickedUpAt || '',
  };
}

function UpdateOrderModal({ isOpen, order, onClose, onSubmit }) {
  const {
    pickerItems: addonItems,
    pickerNames: addonRows,
    matchNames: addonMatchNames,
    loading: addonsLoading,
  } = useAddonCatalog({ includeInactive: true });
  const [form, setForm] = useState(() => buildFormState(order, addonMatchNames));
  const [staffOptions, setStaffOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setForm(buildFormState(order, addonMatchNames));
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, order, addonMatchNames]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;

    const toOption = (person, role) => ({
      value: String(person.id),
      label:
        `${person.first_name || ''} ${person.last_name || ''}`.trim() ||
        person.username ||
        `${role} #${person.id}`,
      role,
    });

    Promise.all([
      listAdminsRequest({ pageSize: 100 }).catch(() => null),
      listEmployeesRequest({ pageSize: 100 }).catch(() => null),
    ]).then(([admins, employees]) => {
      if (!active) return;
      const adminList = Array.isArray(admins?.results) ? admins.results : [];
      const employeeList = Array.isArray(employees?.results)
        ? employees.results
        : [];
      setStaffOptions([
        ...adminList.map((a) => toOption(a, 'Admin')),
        ...employeeList.map((e) => toOption(e, 'Employee')),
      ]);
    });

    setServicesLoading(true);
    listServicesRequest()
      .then((result) => {
        if (!active) return;
        const payload = result?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
          ? payload.results
          : [];
        const activeOptions = list
          .filter(
            (s) => String(s.status || 'active').toLowerCase() !== 'inactive'
          )
          .map((s) => ({ value: String(s.id), label: s.name }));

        // Keep any already-selected services visible even if now inactive.
        const known = new Set(activeOptions.map((o) => o.value));
        const extras = (Array.isArray(order?.services) ? order.services : [])
          .filter((s) => s?.id != null && !known.has(String(s.id)))
          .map((s) => ({ value: String(s.id), label: s.name }));

        setServiceOptions([...activeOptions, ...extras]);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, order]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleInventoryChange = (item, field, value) => {
    setForm((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [item]: {
          dirty: '',
          clean: '',
          unitPrice: '',
          remarks: '',
          ...(prev.inventory[item] || {}),
          [field]: value,
        },
      },
    }));
  };

  const toggleService = (serviceId) => {
    const id = String(serviceId);
    setForm((prev) => ({
      ...prev,
      selectedServiceIds: prev.selectedServiceIds.includes(id)
        ? prev.selectedServiceIds.filter((s) => s !== id)
        : [...prev.selectedServiceIds, id],
    }));
  };

  const toggleAddon = (name) => {
    setForm((prev) => {
      const selected = prev.selectedAddons || [];
      if (selected.includes(name)) {
        return {
          ...prev,
          selectedAddons: selected.filter((s) => s !== name),
          inventory: {
            ...prev.inventory,
            [name]: { dirty: '', clean: '', unitPrice: '', remarks: '' },
          },
        };
      }
      return {
        ...prev,
        selectedAddons: [...selected, name],
        inventory: {
          ...prev.inventory,
          [name]: prev.inventory[name] || {
            dirty: '',
            clean: '',
            unitPrice: '',
            remarks: '',
          },
        },
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.selectedServiceIds.length === 0) {
      setError('Please select at least one service required.');
      return;
    }

    const items = buildOrderItems(
      form.inventory,
      form.selectedAddons,
      addonMatchNames
    );
    if (items.length === 0) {
      setError(
        'Please enter at least one item with a dirty or cleaned quantity.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit?.({
        orderStatus: form.orderStatus,
        assignedTo: form.assignedTo,
        discount: form.discount,
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        estimatedCompletion: form.estimatedCompletion,
        serviceIds: form.selectedServiceIds,
        items,
        pickedUp: form.pickedUp,
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to update the order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !order) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="update-order-modal update-order-sheet-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-order-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="update-order-title" className="update-order-modal-title">
              Update Order
            </h2>
            <p className="modal-subtitle">
              Update the order sheet for #{order.orderNumber}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="update-order-modal-body" onSubmit={handleSubmit}>
          <div className="order-sheet-toolbar update-order-sheet-toolbar">
            <div className="order-sheet-toolbar-fields">
              <label className="order-sheet-toolbar-field">
                <span>Order Status</span>
                <select
                  value={form.orderStatus}
                  onChange={(e) =>
                    handleFieldChange('orderStatus', e.target.value)
                  }
                >
                  {orderStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="order-sheet-toolbar-field">
                <span>Assign To</span>
                <select
                  value={form.assignedTo}
                  onChange={(e) =>
                    handleFieldChange('assignedTo', e.target.value)
                  }
                >
                  <option value="">Unassigned</option>
                  {staffOptions.map((member) => (
                    <option
                      key={`${member.role}-${member.value}`}
                      value={member.value}
                    >
                      {member.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="order-sheet-toolbar-field">
                <span>Discount (GHS)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) => handleFieldChange('discount', e.target.value)}
                />
              </label>
              <label className="order-sheet-toolbar-field">
                <span>Estimated Completion</span>
                <input
                  type="date"
                  value={form.estimatedCompletion}
                  onChange={(e) =>
                    handleFieldChange('estimatedCompletion', e.target.value)
                  }
                />
              </label>
              <label className="order-sheet-toolbar-field order-sheet-toolbar-check">
                <input
                  type="checkbox"
                  checked={form.pickedUp}
                  onChange={(e) =>
                    handleFieldChange('pickedUp', e.target.checked)
                  }
                />
                <span>Picked up</span>
              </label>
            </div>
            <p className="update-order-sms-hint">
              Setting status to Completed, changing estimated completion, or
              marking Picked up sends an SMS to the customer automatically.
            </p>
          </div>

          <OrderSheet
            orderNumber={order.orderNumber || 'Auto'}
            customerName={form.customerName}
            telephone={form.telephone}
            address={form.address}
            orderDate={form.orderDate}
            orderTime={form.orderTime}
            inventory={form.inventory}
            selectedAddons={form.selectedAddons}
            addonRows={addonRows}
            addonItems={addonItems}
            addonsLoading={addonsLoading}
            services={serviceOptions}
            selectedServiceIds={form.selectedServiceIds}
            servicesLoading={servicesLoading}
            deliveryDate={form.deliveryDate}
            deliveryTime={form.deliveryTime}
            deliveredBy={form.deliveredBy}
            receivedBy={form.receivedBy}
            pickedUpAt={form.pickedUpAt}
            onTelephoneChange={(v) => handleFieldChange('telephone', v)}
            onAddressChange={(v) => handleFieldChange('address', v)}
            onInventoryChange={handleInventoryChange}
            onToggleAddon={toggleAddon}
            onToggleService={toggleService}
            onDeliveryDateChange={(v) => handleFieldChange('deliveryDate', v)}
            onDeliveryTimeChange={(v) => handleFieldChange('deliveryTime', v)}
            onDeliveredByChange={(v) => handleFieldChange('deliveredBy', v)}
            onReceivedByChange={(v) => handleFieldChange('receivedBy', v)}
          />

          {error && <p className="order-sheet-error">{error}</p>}

          <div className="update-order-modal-footer">
            <button
              type="button"
              className="order-sheet-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="order-sheet-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Updating…' : 'Update Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateOrderModal;
