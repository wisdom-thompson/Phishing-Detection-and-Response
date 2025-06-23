import React from 'react';
import useAuth from '../../hooks/useAuth';
import './AccountSettings.scss';

export default function AccountSettings() {
  const { user, logout } = useAuth();

  return (
    <div className="settings-card">
      <h2 className="settings-card__title">Account</h2>
      <p className="settings-card__description">
        Manage your connected email account.
      </p>
      {user && (
        <div className="account-info">
            <div className="account-info__item">
                <span className="account-info__label">Email Address</span>
                <span className="account-info__value">{user.email}</span>
            </div>
            <div className="account-info__item">
                <span className="account-info__label">Connection Type</span>
                <span className="account-info__value">{user.loginType?.toUpperCase()}</span>
            </div>
        </div>
      )}
      <div className="settings-card__actions">
        <button className="btn btn--danger" onClick={logout}>
          Disconnect Account
        </button>
      </div>
    </div>
  );
} 