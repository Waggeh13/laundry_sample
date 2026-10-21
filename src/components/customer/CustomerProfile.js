import { useEffect, useState } from 'react';
import CustomerLayout from './CustomerLayout';
import UpdateClientProfileModal from './UpdateClientProfileModal';
import ChangePasswordModal from '../dashboard/ChangePasswordModal';
import { getOwnProfileRequest } from '../../api/accounts';
import { useAuth } from '../../context/AuthContext';
import { showSuccessAlert } from '../../utils/alerts';
import '../dashboard/MyProfile.css';
import './CustomerProfile.css';

function mergeProfileFromApi(current, payload) {
  const u = payload?.user || payload?.data || payload || {};
  const firstName = u.first_name ?? current?.firstName ?? '';
  const lastName = u.last_name ?? current?.lastName ?? '';
  return {
    ...(current || {}),
    username: u.username ?? current?.username ?? '',
    firstName,
    lastName,
    name:
      `${firstName} ${lastName}`.trim() ||
      u.username ||
      current?.name ||
      '',
    phone: u.phone_number || current?.phone || '',
    whatsapp: u.whatsapp_number || current?.whatsapp || '',
    address: u.address || current?.address || '',
    preferredContact:
      u.preferred_contact_method || current?.preferredContact || '',
    status: (u.status || 'active').toString().toUpperCase(),
  };
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
    </svg>
  );
}

function IconPassword() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function displayOrDash(value) {
  const text = String(value || '').trim();
  return text || '—';
}

function capitalize(value) {
  const text = String(value || '').toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—';
}

function CustomerProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  useEffect(() => {
    setProfile(user);
  }, [user]);

  // Login response only has basic user fields. Contact/address details live on
  // GET /api/accounts/user/profile/, so load that when the profile page opens.
  useEffect(() => {
    let active = true;
    setLoading(true);
    getOwnProfileRequest()
      .then((data) => {
        if (!active) return;
        setProfile((current) => mergeProfileFromApi(current || user, data));
      })
      .catch(() => {
        // Keep whatever we already have from auth if the profile call fails.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleUpdateProfile = async (form) => {
    await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      address: form.address.trim(),
      preferredContact: form.preferredContact,
    });
    // Re-fetch so we reflect any server-side formatting of contact fields.
    try {
      const data = await getOwnProfileRequest();
      setProfile((current) => mergeProfileFromApi(current, data));
    } catch {
      // AuthContext already updated local user; leave that in place.
    }
    showSuccessAlert('Profile Updated', 'Your profile was updated successfully.');
  };

  const handleChangePassword = async (form) => {
    await changePassword(
      form.currentPassword,
      form.newPassword,
      form.confirmPassword
    );
    showSuccessAlert('Password Changed', 'Your password was updated successfully.');
  };

  const displayName =
    profile?.name ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    profile?.username ||
    'Customer';

  return (
    <CustomerLayout>
      <div className="profile-page customer-profile-page">
        <div className="profile-page-header">
          <div>
            <h2 className="profile-page-title">My Profile</h2>
            <p className="profile-page-subtitle">
              Manage your account details and password.
            </p>
          </div>
          <div className="profile-page-actions">
            <button
              type="button"
              className="profile-update-btn"
              onClick={() => setIsUpdateOpen(true)}
            >
              <IconEdit />
              Update Profile
            </button>
            <button
              type="button"
              className="profile-password-btn"
              onClick={() => setIsPasswordOpen(true)}
            >
              <IconPassword />
              Change Password
            </button>
          </div>
        </div>

        <section className="profile-banner">
          <div className="profile-banner-avatar">
            <IconUser />
          </div>
          <div className="profile-banner-details">
            <h3 className="profile-banner-name">{displayName}</h3>
            <span className="profile-banner-status profile-status-active">ACTIVE</span>
          </div>
        </section>

        <section className="profile-info-card">
          <h3 className="profile-info-title">Personal Information</h3>
          {loading ? (
            <p className="customer-profile-loading">Loading profile…</p>
          ) : (
            <div className="profile-info-grid">
              <div className="profile-info-column">
                <div className="profile-info-field">
                  <span className="profile-info-label">First Name</span>
                  <span className="profile-info-value">{displayOrDash(profile?.firstName)}</span>
                </div>
                <div className="profile-info-field">
                  <span className="profile-info-label">Username</span>
                  <span className="profile-info-value">{displayOrDash(profile?.username)}</span>
                </div>
                <div className="profile-info-field">
                  <span className="profile-info-label">Phone Number</span>
                  <span className="profile-info-value">{displayOrDash(profile?.phone)}</span>
                </div>
                <div className="profile-info-field">
                  <span className="profile-info-label">Preferred Contact</span>
                  <span className="profile-info-value">
                    {capitalize(profile?.preferredContact)}
                  </span>
                </div>
              </div>

              <div className="profile-info-column">
                <div className="profile-info-field">
                  <span className="profile-info-label">Last Name</span>
                  <span className="profile-info-value">{displayOrDash(profile?.lastName)}</span>
                </div>
                <div className="profile-info-field">
                  <span className="profile-info-label">WhatsApp Number</span>
                  <span className="profile-info-value">{displayOrDash(profile?.whatsapp)}</span>
                </div>
                <div className="profile-info-field">
                  <span className="profile-info-label">Address</span>
                  <span className="profile-info-value">{displayOrDash(profile?.address)}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <UpdateClientProfileModal
        isOpen={isUpdateOpen}
        profile={profile}
        onClose={() => setIsUpdateOpen(false)}
        onSubmit={handleUpdateProfile}
      />

      <ChangePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        onSubmit={handleChangePassword}
      />
    </CustomerLayout>
  );
}

export default CustomerProfile;
