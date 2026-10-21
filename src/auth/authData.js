export const ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'superadmin',
  CUSTOMER: 'customer',
};

export const demoUsers = [
  {
    email: 'maddie@kolendo.com',
    username: 'maddie',
    firstName: 'Maddie',
    lastName: 'Smith',
    role: ROLES.SUPER_ADMIN,
  },
  {
    email: 'pixel@gmail.com',
    username: 'goole',
    firstName: 'deadpool',
    lastName: 'pixel',
    role: ROLES.SUPER_ADMIN,
  },
  {
    email: 'admin@kolendo.com',
    username: 'admin_user',
    firstName: 'Admin',
    lastName: 'User',
    role: ROLES.ADMIN,
  },
  {
    email: 'julia.waiver@email.com',
    username: 'julia_waiver',
    firstName: 'Julia',
    lastName: 'Waiver',
    role: ROLES.CUSTOMER,
  },
];

const STORAGE_KEY = 'kolendo_auth_user';

// Superadmins and admins can manage staff; employees (who share the ADMIN app
// role for routing) cannot. Accepts the full user so we can read the original
// backend role stored on `rawRole`.
export function canAccessStaff(user) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.role === ROLES.ADMIN) {
    return !(user.rawRole || '').includes('employee');
  }
  return false;
}

// Admin / superadmin can manage the shared add-on catalog; employees list only.
export function canManageAddons(user) {
  return canAccessStaff(user);
}

// Superadmin-only finance reports (transactions list + summary downloads).
export function canAccessReports(user) {
  return Boolean(user && user.role === ROLES.SUPER_ADMIN);
}

export function isCustomer(role) {
  return role === ROLES.CUSTOMER;
}

export function getHomeRoute(role) {
  if (role === ROLES.CUSTOMER) return '/customer/dashboard';
  return '/dashboard';
}

const POST_LOGIN_NEXT_KEY = 'kolendo_post_login_next';

export function storePostLoginNext(next) {
  try {
    if (next) sessionStorage.setItem(POST_LOGIN_NEXT_KEY, String(next));
    else sessionStorage.removeItem(POST_LOGIN_NEXT_KEY);
  } catch {
    // ignore
  }
}

export function takePostLoginNext() {
  try {
    const value = sessionStorage.getItem(POST_LOGIN_NEXT_KEY);
    sessionStorage.removeItem(POST_LOGIN_NEXT_KEY);
    return value || '';
  } catch {
    return '';
  }
}

// Only allow same-origin relative paths. Deep links from SMS use /orders/:id;
// map those to the customer portal order route.
export function resolvePostLoginPath(next, role) {
  const fallback = getHomeRoute(role);
  if (!next || typeof next !== 'string') return fallback;

  const trimmed = next.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    /:\/\//.test(trimmed)
  ) {
    return fallback;
  }

  if (role === ROLES.CUSTOMER) {
    const orderMatch = trimmed.match(/^\/orders\/([^/?#]+)/i);
    if (orderMatch) return `/customer/orders/${orderMatch[1]}`;
  }

  return trimmed;
}

export function getDisplayRole(role) {
  if (role === ROLES.SUPER_ADMIN) return 'Super Admin';
  if (role === ROLES.ADMIN) return 'Admin';
  if (role === ROLES.CUSTOMER) return 'Customer';
  return role;
}

function deriveRole(source) {
  const rawRole = (
    source.role ||
    source.user_type ||
    source.userType ||
    source.account_type ||
    ''
  )
    .toString()
    .toLowerCase();

  if (rawRole.includes('super')) return ROLES.SUPER_ADMIN;
  if (rawRole.includes('customer') || rawRole.includes('client')) {
    return ROLES.CUSTOMER;
  }
  if (
    rawRole.includes('admin') ||
    rawRole.includes('staff') ||
    rawRole.includes('employee')
  ) {
    return ROLES.ADMIN;
  }

  if (source.is_superuser) return ROLES.SUPER_ADMIN;
  if (source.is_staff) return ROLES.ADMIN;

  return ROLES.CUSTOMER;
}

export function normalizeUser(payload) {
  const source =
    payload && typeof payload === 'object'
      ? payload.user || payload.data || payload
      : {};

  const firstName = source.first_name || source.firstName || '';
  const lastName = source.last_name || source.lastName || '';
  const username = source.username || source.user_name || '';
  const email = source.email || '';
  const fullName =
    source.name || `${firstName} ${lastName}`.trim() || username || email;

  const rawRole = (
    source.role ||
    source.user_type ||
    source.userType ||
    source.account_type ||
    ''
  )
    .toString()
    .toLowerCase();

  return {
    id: source.id ?? source.pk ?? null,
    email,
    username,
    firstName,
    lastName,
    name: fullName,
    role: deriveRole(source),
    // Preserve the original backend role so we can tell admins and employees
    // apart even though both map to the ADMIN app role for routing.
    rawRole,
    // Optional client profile fields (may come from own-profile update or
    // a detail endpoint; list login payloads often omit these).
    phone: source.phone_number || source.phone || '',
    whatsapp: source.whatsapp_number || source.whatsapp || '',
    address: source.address || '',
    preferredContact:
      source.preferred_contact_method || source.preferredContact || 'phone',
  };
}

export function resolveUserFromEmail(email) {
  const normalized = email.trim().toLowerCase();
  const match = demoUsers.find((user) => user.email.toLowerCase() === normalized);

  if (match) {
    return {
      email: match.email,
      username: match.username,
      firstName: match.firstName,
      lastName: match.lastName,
      name: `${match.firstName} ${match.lastName}`.trim(),
      role: match.role,
    };
  }

  const [localPart] = normalized.split('@');

  return {
    email: normalized,
    username: localPart,
    firstName: 'User',
    lastName: '',
    name: 'User',
    role: ROLES.SUPER_ADMIN,
  };
}

export function loadStoredUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  sessionStorage.removeItem(STORAGE_KEY);
}
