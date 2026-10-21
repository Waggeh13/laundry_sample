// Ghana phone helpers used by customer/staff create & update forms.
// Accepted: local 0XXXXXXXXX (10 digits) or +233XXXXXXXXX (12 digits with +).

export function isValidGhanaPhone(value) {
  const raw = String(value || '').trim().replace(/[\s-]/g, '');
  if (/^0\d{9}$/.test(raw)) return true;
  if (/^\+233\d{9}$/.test(raw)) return true;
  return false;
}

export function ghanaPhoneHint() {
  return 'Use a Ghana number: 0XXXXXXXXX or +233XXXXXXXXX';
}
