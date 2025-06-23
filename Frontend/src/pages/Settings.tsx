import { useState } from "react";
import Sidebar from "../components/Layout/Sidebar";
import { Navbar } from "../components/Layout/Navbar";
import { Footer } from "../components/Layout/Footer";
import AppearanceSettings from "../components/Settings/AppearanceSettings";
import AccountSettings from "../components/Settings/AccountSettings";
import "./Settings.scss";

type SettingsTab = "appearance" | "account";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Navbar />
        <div className="settings-page">
          <div className="settings-page__header">
            <h1>Settings</h1>
            <p>Manage your account, appearance, and other preferences.</p>
          </div>

          <div className="settings-page__tabs">
            <button
              className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </button>
            <button
              className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          </div>

          <div className="settings-page__content">
            {activeTab === "appearance" && <AppearanceSettings />}
            {activeTab === "account" && <AccountSettings />}
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
} 