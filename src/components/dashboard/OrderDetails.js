import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import OrderSheet from './OrderSheet';
import UpdateOrderModal from './UpdateOrderModal';
import CashPaymentModal from './CashPaymentModal';
import {
  canCollectPayment,
  canCompleteOrder,
  formatPaymentStatus,
  formatStatusLabel,
  paymentStatusBadgeClass,
} from './ordersData';
import { listClientsRequest } from '../../api/accounts';
import {
  apiOrderToRow,
  completeOrderRequest,
  getOrderByIdRequest,
  updateOrderRequest,
} from '../../api/orders';
import {
  extractOrderMoneyFromCashResult,
  mergeOrderMoney,
  recordCashPayment,
} from '../../api/payments';
import { showSuccessAlert } from '../../utils/alerts';
import {
  addonsFromOrderItems,
  displayDateToInput,
  orderItemsToInventory,
  orderServiceIds,
} from './orderSheetData';
import { useAddonCatalog } from './useAddonCatalog';
import './CreateOrder.css';
import './OrderDetails.css';

function isoToTime(value) {
  if (!value) return '';
  const match = String(value).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

// Orders often only return customer_id / customer_name. Phone and address live
// on the client profile, so look them up when the order payload omits them.
async function fillCustomerContact(row) {
  if (!row?.customerId) return row;
  if (row.customerPhone && row.customerAddress) return row;

  try {
    const result = await listClientsRequest({ pageSize: 200 });
    const list = Array.isArray(result?.results) ? result.results : [];
    const match = list.find(
      (c) => String(c?.customer?.id) === String(row.customerId)
    );
    if (!match) return row;

    const profile =
      match.customer && typeof match.customer === 'object' ? match.customer : {};
    return {
      ...row,
      customerPhone:
        row.customerPhone ||
        match.phone_number ||
        profile.phone_number ||
        '',
      customerAddress:
        row.customerAddress || match.address || profile.address || '',
    };
  } catch {
    return row;
  }
}

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    pickerItems: addonItems,
    pickerNames: addonRows,
    matchNames: addonMatchNames,
    loading: addonsLoading,
  } = useAddonCatalog({ includeInactive: true });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isCashOpen, setIsCashOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getOrderByIdRequest(id)
      .then(async (result) => {
        if (!active) return;
        if (!result?.data) {
          setError('Order not found.');
          return;
        }
        const row = await fillCustomerContact(apiOrderToRow(result.data));
        if (active) setOrder(row);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Unable to load this order.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const sheet = useMemo(() => {
    if (!order) return null;
    return {
      inventory: orderItemsToInventory(order.items, addonMatchNames),
      selectedAddons: addonsFromOrderItems(order.items, addonMatchNames),
      services: (Array.isArray(order.services) ? order.services : []).map(
        (s) => ({ value: String(s.id), label: s.name })
      ),
      selectedServiceIds: orderServiceIds(order),
      orderDate: displayDateToInput(order.createdOn),
      orderTime: isoToTime(order.createdAtRaw),
      deliveryDate: displayDateToInput(order.deliveryDate),
    };
  }, [order, addonMatchNames]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Order Management">
        <div className="order-sheet-page">
          <p className="order-not-found">Loading order…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !order || !sheet) {
    return (
      <DashboardLayout pageTitle="Order Management">
        <div className="order-sheet-page">
          <p className="order-not-found">{error || 'Order not found.'}</p>
          <button
            type="button"
            className="order-sheet-cancel-btn"
            onClick={() => navigate('/orders')}
          >
            Back to Orders
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const handleUpdateOrder = async (form) => {
    const result = await updateOrderRequest(id, {
      assignedTo: form.assignedTo ? Number(form.assignedTo) : undefined,
      orderStatus: form.orderStatus,
      discountAmount: Number(form.discount) || 0,
      deliveryDate: form.deliveryDate,
      deliveryTime: form.deliveryTime,
      estimatedCompletionDate: form.estimatedCompletion,
      serviceIds: form.serviceIds,
      items: form.items,
      pickedUp: form.pickedUp,
    });
    if (result?.data) {
      const row = await fillCustomerContact(apiOrderToRow(result.data));
      setOrder(row);
    }
    showSuccessAlert(
      'Order Updated',
      result?.message || `Order ${order.orderNumber} was updated successfully.`
    );
  };

  const handleCashPayment = async ({ orderId, amount, paidAt }) => {
    const result = await recordCashPayment({ orderId, amount, paidAt });
    const money = extractOrderMoneyFromCashResult(result);
    if (money) {
      setOrder((current) => mergeOrderMoney(current, money));
    } else if (result?.order || result?.data) {
      const raw = result.order || result.data;
      if (raw?.id || raw?.order_number) {
        const row = await fillCustomerContact(apiOrderToRow(raw));
        setOrder(row);
      }
    } else {
      // Fallback: re-fetch the order so money fields stay accurate.
      const refreshed = await getOrderByIdRequest(id);
      if (refreshed?.data) {
        const row = await fillCustomerContact(apiOrderToRow(refreshed.data));
        setOrder(row);
      }
    }
    showSuccessAlert(
      'Cash Payment Recorded',
      result?.message ||
        `Cash payment of GHS ${Number(amount).toFixed(2)} was recorded.`
    );
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const result = await completeOrderRequest(id);
      if (result?.data) {
        const row = await fillCustomerContact(apiOrderToRow(result.data));
        setOrder(row);
      } else {
        setOrder((current) =>
          current ? { ...current, orderStatus: 'COMPLETED' } : current
        );
      }
      showSuccessAlert(
        'Order Completed',
        result?.message || `Order ${order.orderNumber} was completed.`
      );
    } finally {
      setCompleting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Order Management">
      <div className="order-sheet-page">
        <div className="order-sheet-toolbar">
          <button
            type="button"
            className="order-sheet-back-btn"
            onClick={() => navigate('/orders')}
          >
            Back
          </button>
          <div className="order-sheet-toolbar-fields order-details-status-pills">
            <span
              className={`order-details-pill payment-status-${paymentStatusBadgeClass(
                order.paymentStatus
              )}`}
            >
              Payment: {formatPaymentStatus(order.paymentStatus)}
            </span>
            <span className="order-details-pill">
              Status: {formatStatusLabel(order.orderStatus)}
            </span>
            <span className="order-details-pill">
              Assigned: {order.assignedTo || 'Unassigned'}
            </span>
            <span className="order-details-pill">
              Total: GHS {order.totalAmount}
            </span>
            <span className="order-details-pill">
              Paid: GHS {order.amountPaid}
            </span>
            <span className="order-details-pill">
              Balance: GHS {order.balance}
            </span>
            {order.pickedUp ? (
              <span className="order-details-pill order-details-pill-ok">
                Picked up
              </span>
            ) : null}
            {canCollectPayment(order) ? (
              <button
                type="button"
                className="order-sheet-cancel-btn"
                onClick={() => setIsCashOpen(true)}
              >
                Record Cash
              </button>
            ) : null}
            {canCompleteOrder(order) ? (
              <button
                type="button"
                className="order-sheet-submit-btn"
                onClick={handleComplete}
                disabled={completing}
              >
                {completing ? 'Completing…' : 'Complete'}
              </button>
            ) : null}
            <button
              type="button"
              className="order-sheet-submit-btn"
              onClick={() => setIsUpdateOpen(true)}
            >
              Update Order
            </button>
          </div>
        </div>

        <OrderSheet
          readOnly
          orderNumber={order.orderNumber || 'Auto'}
          customerName={order.customer}
          telephone={order.customerPhone}
          address={order.customerAddress}
          orderDate={sheet.orderDate}
          orderTime={sheet.orderTime}
          inventory={sheet.inventory}
          selectedAddons={sheet.selectedAddons}
          addonRows={addonRows}
          addonItems={addonItems}
          addonsLoading={addonsLoading}
          services={sheet.services}
          selectedServiceIds={sheet.selectedServiceIds}
          deliveryDate={sheet.deliveryDate}
          deliveryTime={order.deliveryTime}
          pickedUpAt={order.pickedUpAt}
        />
      </div>

      <UpdateOrderModal
        isOpen={isUpdateOpen}
        order={order}
        onClose={() => setIsUpdateOpen(false)}
        onSubmit={handleUpdateOrder}
      />

      <CashPaymentModal
        isOpen={isCashOpen}
        order={order}
        onClose={() => setIsCashOpen(false)}
        onSubmit={handleCashPayment}
      />
    </DashboardLayout>
  );
}

export default OrderDetails;
