export const emptyClientForm = {
  username: '',
  firstName: '',
  lastName: '',
  phone: '',
  whatsapp: '',
  address: '',
  preferredContact: 'Phone',
  notes: '',
};

function formatNotesUpdatedDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatJoinedDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function clientToForm(client) {
  if (!client) return emptyClientForm;

  const nameParts = client.name ? client.name.split(' ') : [];

  return {
    username: client.username || '',
    firstName: client.firstName || nameParts[0] || '',
    lastName: client.lastName || nameParts.slice(1).join(' ') || '',
    phone: client.phone,
    whatsapp: client.whatsapp || client.phone || '',
    address: client.address || '',
    preferredContact: client.preferredContact || 'Phone',
    notes: client.notes || '',
  };
}

export function formToClient(form, existingClient = null) {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const notes = form.notes.trim();

  if (existingClient) {
    const notesChanged = notes !== (existingClient.notes || '');

    return {
      ...existingClient,
      username: form.username.trim(),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim() || form.username.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      address: form.address.trim(),
      preferredContact: form.preferredContact,
      notes,
      notesUpdated: notesChanged
        ? formatNotesUpdatedDate()
        : existingClient.notesUpdated || '',
    };
  }

  const joinedDate = formatJoinedDate();

  return {
    id: String(Date.now()),
    username: form.username.trim(),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || form.username.trim(),
    phone: form.phone.trim(),
    whatsapp: form.whatsapp.trim(),
    address: form.address.trim(),
    preferredContact: form.preferredContact,
    notes,
    notesUpdated: notes ? formatNotesUpdatedDate() : '',
    joinedDate,
    status: 'ACTIVE',
    totalOrders: 0,
    totalSpent: '0.00',
  };
}
