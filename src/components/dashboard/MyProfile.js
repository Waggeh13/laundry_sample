import { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import ChangePasswordModal from './ChangePasswordModal';
import UpdateProfileModal from './UpdateProfileModal';
import { useAuth } from '../../context/AuthContext';
import { showSuccessAlert } from '../../utils/alerts';
import {
  getProfileDisplayName,
  profileData as initialProfile,
  profileFromAuthUser,
} from './profileData';
import './MyProfile.css';

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

function MyProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState(() => profileFromAuthUser(user) || initialProfile);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile(profileFromAuthUser(user));
    }
  }, [user]);

  const handleUpdateProfile = async (form) => {
    await updateProfile({
      username: form.username.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
    });
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

  const displayName = getProfileDisplayName(profile);
  const isActive = profile.status === 'ACTIVE';

  return (
    <DashboardLayout pageTitle="Profile">
      <div className="profile-page">
        <div className="profile-page-header">
          <div>
            <h2 className="profile-page-title">My Profile</h2>
            <p className="profile-page-subtitle">
              Manage your account settings and personal details.
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
            <span
              className={`profile-banner-status ${
                isActive ? 'profile-status-active' : 'profile-status-inactive'
              }`}
            >
              {profile.status}
            </span>
          </div>
        </section>

        <section className="profile-info-card">
          <h3 className="profile-info-title">Personal Information</h3>
          <div className="profile-info-grid">
            <div className="profile-info-column">
              <div className="profile-info-field">
                <span className="profile-info-label">First Name</span>
                <span className="profile-info-value">{profile.firstName}</span>
              </div>
              <div className="profile-info-field">
                <span className="profile-info-label">Username</span>
                <span className="profile-info-value">{profile.username}</span>
              </div>
              <div className="profile-info-field">
                <span className="profile-info-label">Status</span>
                <span className="profile-info-value profile-status-value">
                  <span
                    className={`profile-status-dot ${
                      isActive ? 'profile-status-dot-active' : 'profile-status-dot-inactive'
                    }`}
                  />
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="profile-info-column">
              <div className="profile-info-field">
                <span className="profile-info-label">Last Name</span>
                <span className="profile-info-value">{profile.lastName}</span>
              </div>
              <div className="profile-info-field">
                <span className="profile-info-label">Updated By</span>
                <span className="profile-info-value">{profile.updatedBy}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <UpdateProfileModal
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
    </DashboardLayout>
  );
}

export default MyProfile;
