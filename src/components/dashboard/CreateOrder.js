import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import OrderSheet from './OrderSheet';
import {
  listAdminsRequest,
  listClientsRequest,
  listEmployeesRequest,
  listSuperadminsRequest,
} from '../../api/accounts';
import { listServicesRequest } from '../../api/services';
import { createOrderRequest } from '../../api/orders';
import { fetchAllPages } from '../../api/pagination';
import { showSuccessAlert } from '../../utils/alerts';
import { useAuth } from '../../context/AuthContext';
import { buildOrderItems, emptyInventory } from './orderSheetData';
import { useAddonCatalog } from './useAddonCatalog';
import CustomerSearchSelect from './CustomerSearchSelect';
import './CreateOrder.css';

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

function CreateOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    pickerItems: addonItems,
    pickerNames: addonRows,
    matchNames: addonMatchNames,
    loading: addonsLoading,
  } = useAddonCatalog({ includeInactive: true });

  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [telephone, setTelephone] = useState('');
  const [address, setAddress] = useState('');
  const [orderDate] = useState(todayIso);
  const [orderTime] = useState(nowTime);
  const [inventory, setInventory] = useState(() => emptyInventory());
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveredBy, setDeliveredBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [discount, setDiscount] = useState('0');

  const [customerOptions, setCustomerOptions] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const toStaffOption = (person, role) => ({
      value: String(person.id),
      label:
        `${person.first_name || ''} ${person.last_name || ''}`.trim() ||
        person.username ||
        `${role} #${person.id}`,
      role,
    });

    const currentId = user?.id != null ? String(user.id) : null;
    const selfRole = (() => {
      const raw = (user?.rawRole || user?.role || '').toString().toLowerCase();
      if (raw.includes('super')) return 'Super Admin';
      if (raw.includes('employee')) return 'Employee';
      return 'Admin';
    })();
    const selfOption = currentId
      ? {
          value: currentId,
          label:
            user.name ||
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.username ||
            `#${currentId}`,
          role: selfRole,
        }
      : null;

    Promise.all([
      listSuperadminsRequest({ pageSize: 100 }).catch(() => null),
      listAdminsRequest({ pageSize: 100 }).catch(() => null),
      listEmployeesRequest({ pageSize: 100 }).catch(() => null),
    ]).then(([superadmins, admins, employees]) => {
      if (!active) return;
      const superadminList = Array.isArray(superadmins?.results)
        ? superadmins.results
        : [];
      const adminList = Array.isArray(admins?.results) ? admins.results : [];
      const employeeList = Array.isArray(employees?.results)
        ? employees.results
        : [];
      let options = [
        ...superadminList.map((s) => toStaffOption(s, 'Super Admin')),
        ...adminList.map((a) => toStaffOption(a, 'Admin')),
        ...employeeList.map((e) => toStaffOption(e, 'Employee')),
      ];

      if (selfOption) {
        const fromList = options.find((o) => o.value === currentId);
        options = options.filter((o) => o.value !== currentId);
        options.unshift({
          ...(fromList || selfOption),
          label: `${(fromList || selfOption).label} (You)`,
          isSelf: true,
        });
        setAssignedTo(currentId);
        setReceivedBy(currentId);
      }

      setStaffOptions(options);
    });

    setCustomersLoading(true);
    fetchAllPages(
      (page, pageSize) => listClientsRequest({ page, pageSize }),
      { pageSize: 50 }
    )
      .then(({ results }) => {
        if (!active) return;
        setCustomerOptions(
          results
            .map((c) => {
              const profile =
                c.customer && typeof c.customer === 'object' ? c.customer : {};
              const customerIdValue =
                c.customer?.id ?? profile?.id ?? null;
              if (customerIdValue == null) return null;
              return {
                value: String(customerIdValue),
                label:
                  `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
                  c.username ||
                  `Customer #${customerIdValue}`,
                name:
                  `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
                  c.username ||
                  '',
                phone: c.phone_number || profile.phone_number || '',
                address: c.address || profile.address || '',
                phoneNeedsCorrection: Boolean(
                  c.phone_needs_correction ?? profile.phone_needs_correction
                ),
              };
            })
            .filter(Boolean)
        );
      })
      .catch(() => {
        if (active) setError('Unable to load customers.');
      })
      .finally(() => {
        if (active) setCustomersLoading(false);
      });

    listServicesRequest()
      .then((result) => {
        if (!active) return;
        const payload = result?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
          ? payload.results
          : [];
        setServiceOptions(
          list
            // Only offer active services for new selection.
            .filter((s) => String(s.status || 'active').toLowerCase() !== 'inactive')
            .map((s) => ({ value: String(s.id), label: s.name }))
        );
      })
      .catch(() => {
        if (active) setError('Unable to load services.');
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Ensure inventory has slots for catalog add-ons once they load.
  useEffect(() => {
    setInventory((prev) => ({
      ...emptyInventory(addonMatchNames),
      ...prev,
    }));
  }, [addonMatchNames]);

  const totalItems = useMemo(
    () => buildOrderItems(inventory, selectedAddons, addonMatchNames).length,
    [inventory, selectedAddons, addonMatchNames]
  );

  const handleCustomerSelect = (value) => {
    setCustomerId(value);
    const selected = customerOptions.find((c) => c.value === value);
    if (!selected) {
      setCustomerName('');
      setTelephone('');
      setAddress('');
      return;
    }
    setCustomerName(selected.name || selected.label);
    setTelephone(selected.phone || '');
    setAddress(selected.address || '');
    if (selected.phoneNeedsCorrection) {
      setError(
        'This customer’s phone number needs correction before you can create an order. Update their phone on the Clients page.'
      );
    } else {
      setError('');
    }
  };

  const handleInventoryChange = (item, field, value) => {
    setInventory((prev) => ({
      ...prev,
      [item]: { ...prev[item], [field]: value },
    }));
  };

  const toggleService = (serviceId) => {
    const id = String(serviceId);
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleAddon = (name) => {
    setSelectedAddons((prev) => {
      if (prev.includes(name)) {
        // Clear quantities when an add-on is unchecked so it isn't re-sent.
        setInventory((inv) => ({
          ...inv,
          [name]: { dirty: '', clean: '', unitPrice: '', remarks: '' },
        }));
        return prev.filter((s) => s !== name);
      }
      return [...prev, name];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    const selectedCustomer = customerOptions.find((c) => c.value === customerId);
    if (selectedCustomer?.phoneNeedsCorrection) {
      setError(
        'This customer’s phone number needs correction before you can create an order. Update their phone on the Clients page.'
      );
      return;
    }

    if (selectedServiceIds.length === 0) {
      setError('Please select at least one service required.');
      return;
    }

    const items = buildOrderItems(inventory, selectedAddons, addonMatchNames);
    if (items.length === 0) {
      setError(
        'Please enter at least one item with a dirty or cleaned quantity.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await createOrderRequest({
        customerId,
        serviceIds: selectedServiceIds,
        items,
        assignedTo,
        discountAmount: discount,
        deliveryDate,
        deliveryTime,
        estimatedCompletionDate: deliveryDate,
      });
      showSuccessAlert(
        'Order Created',
        result?.data?.order_number
          ? `Order ${result.data.order_number} was created successfully.`
          : result?.message || 'Order created successfully.'
      );
      navigate('/orders');
    } catch (err) {
      setError(err?.message || 'Unable to create the order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Order Management">
      <form className="order-sheet-page" onSubmit={handleSubmit}>
        <div className="order-sheet-toolbar">
          <button
            type="button"
            className="order-sheet-back-btn"
            onClick={() => navigate('/orders')}
          >
            Back
          </button>
          <div className="order-sheet-toolbar-fields">
            <label className="order-sheet-toolbar-field">
              <span>Assign To</span>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
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
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </label>
          </div>
        </div>

        <OrderSheet
          customerName={customerName}
          telephone={telephone}
          address={address}
          orderDate={orderDate}
          orderTime={orderTime}
          inventory={inventory}
          selectedAddons={selectedAddons}
          addonRows={addonRows}
          addonItems={addonItems}
          addonsLoading={addonsLoading}
          services={serviceOptions}
          selectedServiceIds={selectedServiceIds}
          servicesLoading={servicesLoading}
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          deliveredBy={deliveredBy}
          receivedBy={receivedBy}
          customerSelect={
            <CustomerSearchSelect
              options={customerOptions}
              value={customerId}
              onChange={handleCustomerSelect}
              loading={customersLoading}
              placeholder="Search or select customer"
            />
          }
          receivedBySelect={
            <select
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
            >
              <option value="">Select staff</option>
              {staffOptions.map((member) => (
                <option
                  key={`received-${member.role}-${member.value}`}
                  value={member.value}
                >
                  {member.label}
                </option>
              ))}
            </select>
          }
          onTelephoneChange={setTelephone}
          onAddressChange={setAddress}
          onInventoryChange={handleInventoryChange}
          onToggleAddon={toggleAddon}
          onToggleService={toggleService}
          onDeliveryDateChange={setDeliveryDate}
          onDeliveryTimeChange={setDeliveryTime}
          onDeliveredByChange={setDeliveredBy}
        />

        {error && <p className="order-sheet-error">{error}</p>}

        <div className="order-sheet-actions">
          <button
            type="submit"
            className="order-sheet-submit-btn"
            disabled={submitting || totalItems === 0}
          >
            {submitting ? 'Creating…' : 'Create Order'}
          </button>
          <button
            type="button"
            className="order-sheet-cancel-btn"
            onClick={() => navigate('/orders')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}

export default CreateOrder;
