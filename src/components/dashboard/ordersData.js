export const ordersData = [
  {
    id: '1',
    orderNumber: 'ORD-45869A34',
    customer: 'Julia Waiver',
    assignedTo: 'Maddie Smith',
    createdOn: '20/05/2026',
    totalAmount: '3900.00',
    amountPaid: '0.00',
    paymentStatus: 'pending',
    orderStatus: 'PENDING',
    pickupDate: '25/05/2026',
    deliveryDate: '26/05/2026',
    estimatedCompletion: '26/05/2026',
    deliveryNotes: 'Please leave at the front desk if no one is at home.',
    specialInstructions: 'Handle silk items with care. Use cold water to wash only.',
    items: [
      {
        name: 'Full Laundry Service',
        quantity: 3,
        unitPrice: '1300.00',
        description: 'Premium wash and fold including ironing for all items',
      },
      {
        name: 'Dry Cleaning',
        quantity: 1,
        unitPrice: '0.00',
        description: '-',
      },
    ],
    subtotal: '3900.00',
    discount: '0.00',
  },
  {
    id: '2',
    orderNumber: 'ORD-5678f6u55',
    customer: 'Aida B',
    assignedTo: 'Maddie Smith',
    createdOn: '18/05/2026',
    totalAmount: '545.50',
    amountPaid: '0.00',
    paymentStatus: 'pending',
    orderStatus: 'PENDING',
    pickupDate: '22/05/2026',
    deliveryDate: '23/05/2026',
    estimatedCompletion: '23/05/2026',
    deliveryNotes: 'Call before delivery.',
    specialInstructions: 'Separate whites from colors.',
    items: [
      {
        name: 'Wash & Fold',
        quantity: 2,
        unitPrice: '272.75',
        description: 'Standard wash and fold service',
      },
    ],
    subtotal: '545.50',
    discount: '0.00',
  },
  {
    id: '3',
    orderNumber: 'ORD-6784454e5',
    customer: 'Jason Kai',
    assignedTo: 'Unassigned',
    createdOn: '19/05/2026',
    totalAmount: '200.00',
    amountPaid: '0.00',
    paymentStatus: 'unpaid',
    orderStatus: 'PENDING',
    pickupDate: '24/05/2026',
    deliveryDate: '25/05/2026',
    estimatedCompletion: '25/05/2026',
    deliveryNotes: 'Ring doorbell twice.',
    specialInstructions: 'No fabric softener on sportswear.',
    items: [
      {
        name: 'Iron Only',
        quantity: 4,
        unitPrice: '50.00',
        description: 'Pressing for shirts and trousers',
      },
    ],
    subtotal: '200.00',
    discount: '0.00',
  },
  {
    id: '4',
    orderNumber: 'ORD-463336464',
    customer: 'Kaizen Smith',
    assignedTo: 'Maddie Smith',
    createdOn: '15/05/2026',
    totalAmount: '550.00',
    amountPaid: '550.00',
    paymentStatus: 'paid',
    orderStatus: 'COMPLETED',
    pickupDate: '16/05/2026',
    deliveryDate: '17/05/2026',
    estimatedCompletion: '17/05/2026',
    deliveryNotes: 'Delivered to reception.',
    specialInstructions: 'Steam press all formal wear.',
    items: [
      {
        name: 'Dry Cleaning',
        quantity: 2,
        unitPrice: '275.00',
        description: 'Suits and formal jackets',
      },
    ],
    subtotal: '550.00',
    discount: '0.00',
  },
  {
    id: '5',
    orderNumber: 'ORD-8921A12B',
    customer: 'Maria Lopez',
    assignedTo: 'James Osei',
    createdOn: '17/05/2026',
    totalAmount: '1250.00',
    amountPaid: '1250.00',
    paymentStatus: 'paid',
    orderStatus: 'COMPLETED',
    pickupDate: '18/05/2026',
    deliveryDate: '20/05/2026',
    estimatedCompletion: '20/05/2026',
    deliveryNotes: 'Leave with security guard.',
    specialInstructions: 'Use hypoallergenic detergent.',
    items: [
      {
        name: 'Bedding & Linens',
        quantity: 2,
        unitPrice: '625.00',
        description: 'Duvet covers and pillowcases',
      },
    ],
    subtotal: '1250.00',
    discount: '0.00',
  },
  {
    id: '6',
    orderNumber: 'ORD-3344C98D',
    customer: 'David Mensah',
    assignedTo: 'James Osei',
    createdOn: '21/05/2026',
    totalAmount: '780.00',
    amountPaid: '0.00',
    paymentStatus: 'unpaid',
    orderStatus: 'PENDING',
    pickupDate: '27/05/2026',
    deliveryDate: '28/05/2026',
    estimatedCompletion: '28/05/2026',
    deliveryNotes: 'Customer prefers morning delivery.',
    specialInstructions: 'Fold dress shirts on hangers.',
    items: [
      {
        name: 'Wash & Iron',
        quantity: 6,
        unitPrice: '130.00',
        description: 'Business shirts and trousers',
      },
    ],
    subtotal: '780.00',
    discount: '0.00',
  },
];

export function getOrderById(id) {
  return ordersData.find((order) => order.id === id);
}

export function formatPaymentStatus(status) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'partially_paid') return 'Partial';
  if (raw === 'paid') return 'Paid';
  if (raw === 'pending' || raw === 'unpaid') return 'Pending';
  return formatStatusLabel(status);
}

export function formatStatusLabel(status) {
  const text = String(status || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  if (!text) return '';
  return text.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function paymentStatusBadgeClass(status) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'partially_paid') return 'partially_paid';
  if (raw === 'paid') return 'paid';
  if (raw === 'unpaid') return 'pending';
  return raw || 'pending';
}

export function canCollectPayment(order) {
  const status = String(order?.paymentStatus || '').toLowerCase();
  if (status === 'paid') return false;
  const balance = Number(order?.balance);
  return Number.isFinite(balance) ? balance > 0 : status !== 'paid';
}

export function canCompleteOrder(order) {
  const status = String(order?.orderStatus || '').toLowerCase();
  return status !== 'completed' && status !== 'cancelled';
}
