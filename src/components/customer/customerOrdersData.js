export const customerOrders = [
  {
    id: '1',
    orderNumber: 'ORD-45869A34',
    totalAmount: '3900.00',
    balance: '3900.00',
    status: 'Pending',
    createdOn: '11/05/2026',
  },
  {
    id: '2',
    orderNumber: 'ORD-45869A34',
    totalAmount: '1110.00',
    balance: '1110.00',
    status: 'Pending',
    createdOn: '11/05/2026',
  },
  {
    id: '3',
    orderNumber: 'ORD-2849F2A1',
    totalAmount: '300.00',
    balance: '300.00',
    status: 'completed',
    createdOn: '11/05/2026',
  },
  {
    id: '4',
    orderNumber: 'ORD-0FB965E0',
    totalAmount: '345.00',
    balance: '345.00',
    status: 'Pending',
    createdOn: '11/05/2026',
  },
  {
    id: '5',
    orderNumber: 'ORD-2E082555',
    totalAmount: '120.00',
    balance: '120.00',
    status: 'completed',
    createdOn: '11/05/2026',
  },
  {
    id: '6',
    orderNumber: 'ORD-AF2F3419',
    totalAmount: '950.00',
    balance: '950.00',
    status: 'completed',
    createdOn: '11/05/2026',
  },
];

export function getCustomerOrderStats(orders) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const pendingOrders = orders.filter(
    (order) => order.status.toLowerCase() === 'pending'
  ).length;
  const readyForPickup = orders.filter(
    (order) => order.status.toLowerCase() === 'ready for pickup'
  ).length;

  return {
    totalOrders,
    totalSpent: totalSpent.toFixed(2),
    pendingOrders,
    readyForPickup,
  };
}

export function getRecentCustomerOrders(orders, limit = 6) {
  return orders.slice(0, limit);
}
