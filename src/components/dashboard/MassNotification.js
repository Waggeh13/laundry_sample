import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import DashboardLayout from './DashboardLayout';
import { listClientsRequest } from '../../api/accounts';
import { fetchAllPages } from '../../api/pagination';
import { apiClientToRow } from '../../api/customers';
import { sendClientBroadcastSmsRequest } from '../../api/notifications';
import { showSuccessAlert } from '../../utils/alerts';
import './AllServices.css';
import './MassNotification.css';

const MAX_MESSAGE_LENGTH = 480;
const MAX_RECIPIENTS = 500;

const SAMPLE = {
  first_name: 'Ama',
  last_name: 'Mensah',
  username: 'ama_m',
};

function applyPlaceholders(template, values) {
  return String(template || '')
    .replaceAll('{{first_name}}', values.first_name || '')
    .replaceAll('{{last_name}}', values.last_name || '')
    .replaceAll('{{username}}', values.username || '');
}

function skipReasonLabel(reason) {
  const map = {
    no_phone: 'No phone',
    invalid_phone: 'Invalid phone',
    phone_needs_correction: 'Phone needs correction',
    inactive: 'Inactive',
    not_client: 'Not a client',
    not_found: 'Not found',
    no_customer_profile: 'No customer profile',
    duplicate_phone: 'Duplicate phone',
  };
  return map[reason] || String(reason || 'Skipped').replace(/_/g, ' ');
}

function MassNotification() {
  const [message, setMessage] = useState(
    'Hi {{first_name}}, Bubblebytes promo this week…'
  );
  const [allActive, setAllActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientsError, setClientsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingClients(true);
    setClientsError('');
    fetchAllPages(
      (page, pageSize) => listClientsRequest({ page, pageSize }),
      { pageSize: 50 }
    )
      .then(({ results }) => {
        if (!active) return;
        setClients(results.map(apiClientToRow));
      })
      .catch((err) => {
        if (!active) return;
        setClients([]);
        setClientsError(err?.message || 'Unable to load clients.');
      })
      .finally(() => {
        if (active) setLoadingClients(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeClients = useMemo(
    () => clients.filter((c) => String(c.status).toUpperCase() === 'ACTIVE'),
    [clients]
  );

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activeClients;
    return activeClients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.username?.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query)
    );
  }, [activeClients, search]);

  const trimmed = message.trim();
  const selectedCount = selectedIds.size;
  const recipientCount = allActive ? activeClients.length : selectedCount;
  const preview = applyPlaceholders(trimmed, SAMPLE);
  const canSend =
    trimmed.length > 0 &&
    trimmed.length <= MAX_MESSAGE_LENGTH &&
    (allActive || selectedCount > 0) &&
    !submitting;

  const toggleId = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredClients.forEach((c) => next.add(String(c.id)));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!trimmed) {
      setError('Enter a message to send.');
      return;
    }
    if (!allActive && selectedCount === 0) {
      setError('Select at least one client, or choose all active clients.');
      return;
    }
    if (!allActive && selectedCount > MAX_RECIPIENTS) {
      setError(`Select at most ${MAX_RECIPIENTS} clients per send.`);
      return;
    }

    const confirm = await Swal.fire({
      icon: 'question',
      title: allActive ? 'SMS all active clients?' : 'Send SMS?',
      text: allActive
        ? `Message every active client with a usable phone (up to ${MAX_RECIPIENTS} per request).`
        : `Send to ${selectedCount} selected client${selectedCount === 1 ? '' : 's'}.`,
      showCancelButton: true,
      confirmButtonText: 'Send now',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#191489',
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    setError('');
    setLastResult(null);
    try {
      const result = await sendClientBroadcastSmsRequest({
        message: trimmed,
        allActive,
        userIds: allActive ? [] : Array.from(selectedIds),
      });
      const data = result?.data || {};
      setLastResult(data);
      if (!allActive) clearSelection();
      const summary = [
        `Requested ${data.requested ?? '—'}`,
        `targeted ${data.targeted ?? '—'}`,
        `sent ${data.sent ?? '—'}`,
        `pending ${data.pending ?? '—'}`,
        `skipped ${data.skipped ?? '—'}`,
      ].join(' · ');
      showSuccessAlert(
        result?.message || 'Broadcast SMS queued',
        summary
      );
    } catch (err) {
      setError(err?.message || 'Unable to send the broadcast SMS.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Client SMS">
      <div className="services-page">
        <div className="services-page-header">
          <div>
            <h2 className="services-page-title">Client SMS</h2>
            <p className="mass-notification-subtitle">
              Personalized SMS to selected clients or all active clients.
              Placeholders: {'{{first_name}}'}, {'{{last_name}}'}, {'{{username}}'}.
            </p>
          </div>
        </div>

        <form className="mass-notification-layout" onSubmit={handleSubmit}>
          <section className="mass-notification-card">
            <label className="mass-notification-label" htmlFor="mass-message">
              Message
            </label>
            <textarea
              id="mass-message"
              className="mass-notification-textarea"
              rows={7}
              maxLength={MAX_MESSAGE_LENGTH}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi {{first_name}}, …"
              disabled={submitting}
            />
            <div className="mass-notification-meta">
              <span>
                {trimmed.length}/{MAX_MESSAGE_LENGTH}
              </span>
              <span>
                {allActive
                  ? `${activeClients.length} active clients`
                  : `${selectedCount} selected`}
              </span>
            </div>

            <label className="mass-notification-check">
              <input
                type="checkbox"
                checked={allActive}
                onChange={(e) => setAllActive(e.target.checked)}
                disabled={submitting}
              />
              <span>Send to all active clients (ignores selection)</span>
            </label>

            <div className="mass-notification-preview-block">
              <span className="mass-notification-label">Preview</span>
              <p className="mass-notification-preview">
                {preview || 'Your personalized message will appear here.'}
              </p>
              <span className="mass-notification-preview-note">
                Sample: {SAMPLE.first_name} {SAMPLE.last_name} (@{SAMPLE.username})
              </span>
            </div>

            {error ? <div className="mass-notification-error">{error}</div> : null}

            <div className="mass-notification-actions">
              <button
                type="button"
                className="services-reset-btn"
                onClick={() => {
                  setMessage('');
                  setError('');
                  setLastResult(null);
                }}
                disabled={submitting || !message}
              >
                Clear message
              </button>
              <button
                type="submit"
                className="add-service-btn"
                disabled={!canSend}
              >
                {submitting
                  ? 'Sending…'
                  : allActive
                    ? 'Send to all active'
                    : `Send to ${selectedCount || 0}`}
              </button>
            </div>
          </section>

          <section className="mass-notification-card mass-notification-clients">
            <div className="mass-notification-clients-header">
              <div>
                <h3 className="mass-notification-clients-title">Recipients</h3>
                <p className="mass-notification-subtitle">
                  Active clients only · max {MAX_RECIPIENTS} per request
                </p>
              </div>
              <div className="mass-notification-client-actions">
                <button
                  type="button"
                  className="services-reset-btn"
                  onClick={selectPage}
                  disabled={allActive || submitting || filteredClients.length === 0}
                >
                  Select visible
                </button>
                <button
                  type="button"
                  className="services-reset-btn"
                  onClick={clearSelection}
                  disabled={allActive || submitting || selectedCount === 0}
                >
                  Clear
                </button>
              </div>
            </div>

            <input
              type="search"
              className="services-search-input"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={allActive || submitting}
            />

            {allActive ? (
              <p className="mass-notification-hint">
                All active clients will be messaged. Selection is ignored.
              </p>
            ) : null}

            <div className="mass-notification-client-list">
              {loadingClients ? (
                <p className="mass-notification-hint">Loading clients…</p>
              ) : clientsError ? (
                <p className="mass-notification-error">{clientsError}</p>
              ) : filteredClients.length === 0 ? (
                <p className="mass-notification-hint">No matching active clients.</p>
              ) : (
                filteredClients.map((client) => {
                  const id = String(client.id);
                  const checked = selectedIds.has(id);
                  return (
                    <label
                      key={id}
                      className={`mass-notification-client-row${
                        allActive ? ' is-disabled' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId(id)}
                        disabled={allActive || submitting}
                      />
                      <span className="mass-notification-client-main">
                        <strong>{client.name || client.username || '—'}</strong>
                        <span>
                          {client.phone || 'No phone'}
                          {client.phoneNeedsCorrection
                            ? ' · needs phone fix'
                            : ''}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </section>
        </form>

        {lastResult ? (
          <section className="mass-notification-card mass-notification-result">
            <h3 className="mass-notification-clients-title">Last send</h3>
            <div className="mass-notification-counts">
              <span>Requested: {lastResult.requested ?? '—'}</span>
              <span>Targeted: {lastResult.targeted ?? '—'}</span>
              <span>Sent: {lastResult.sent ?? '—'}</span>
              <span>Pending: {lastResult.pending ?? '—'}</span>
              <span>Skipped: {lastResult.skipped ?? '—'}</span>
              <span>
                Failed: {lastResult.failed_permanent ?? '—'}
              </span>
            </div>
            {Array.isArray(lastResult.skips) && lastResult.skips.length > 0 ? (
              <ul className="mass-notification-skips">
                {lastResult.skips.map((skip, index) => (
                  <li key={`${skip.user_id}-${index}`}>
                    User #{skip.user_id}: {skipReasonLabel(skip.reason)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mass-notification-hint">No skips reported.</p>
            )}
          </section>
        ) : null}

        {recipientCount > MAX_RECIPIENTS && !allActive ? (
          <p className="mass-notification-error">
            Selection exceeds {MAX_RECIPIENTS} recipients. Deselect some clients.
          </p>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default MassNotification;
