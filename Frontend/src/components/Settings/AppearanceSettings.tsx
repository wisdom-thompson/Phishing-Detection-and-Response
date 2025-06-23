import React from 'react';
import './AppearanceSettings.scss';

export default function AppearanceSettings() {
  return (
    <div className="settings-card">
      <h2 className="settings-card__title">Appearance</h2>
      <p className="settings-card__description">
        Customize the look and feel of your dashboard.
      </p>
      <div className="settings-card__content">
        {/* Theme options will go here */}
        <p>Theme controls are under construction.</p>
      </div>
    </div>
  );
} 