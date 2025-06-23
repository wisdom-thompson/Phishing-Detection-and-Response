import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import useAuth from "../hooks/useAuth";
import { analyzeEmails } from "../services/api";
import { Navbar } from "../components/Layout/Navbar";
import EmailDetails from "../components/Email/EmailDetails";
import { Footer } from "../components/Layout/Footer";
import { fetchGoogleEmails } from "../hooks/fetchGoogleEmails";
import { EmailAnalysis } from "../types";
import CircularWithValueLabel from "../components/Progress";
import Analytics from "../components/Dashboard/Analytics";
import EmailList from "../components/Email/EmailList";
import { updateEmails } from "./utils";
import Sidebar from "../components/Layout/Sidebar";
import MajorRisks from "../components/Dashboard/MajorRisks";
import "./Dashboard.scss";

export default function Dashboard() {
  const { user } = useAuth();
  const [imapEmails, setImapEmails] = useState<EmailAnalysis[]>([]);
  const [googleEmails, setGoogleEmails] = useState<EmailAnalysis[]>([]);
  const [_imapLoading, setImapLoading] = useState(false);
  const [_googleLoading, setGoogleLoading] = useState(false);
  const [imapError, setImapError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailAnalysis | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const loginType = sessionStorage.getItem("loginType");
  const token = sessionStorage.getItem("gmailToken");

  const allEmails = loginType === "imap" ? imapEmails : googleEmails;
  const totalEmails = allEmails.length;
  const phishingEmails = allEmails.filter(e => e.is_phishing).length;
  const safeEmails = totalEmails - phishingEmails;

  // Use real data for the radial chart
  const emailOverviewData = [
    { name: "Safe", value: safeEmails, fill: "#238636" },
    { name: "Phishing", value: phishingEmails, fill: "#da3633" },
  ];

  const totalStatus = totalEmails;

  const handleDelete = () => {
    if (googleEmails.length > 0 && selectedEmail) {
      sessionStorage.removeItem(selectedEmail.email_id);
      setSelectedEmail(null);
    }
  };

  // Helper function to fetch IMAP emails
  const fetchImapEmails = useCallback(async () => {
    if (!user || loginType !== "imap") return;
    setImapLoading(true);
    setImapError(null);
    try {
      const storedPassword = sessionStorage.getItem("userPassword");
      const response: any = await analyzeEmails({
        email: user.email,
        password: storedPassword || user.password,
        loginType: "imap",
      });
      if (response?.emails) {
        setImapEmails((prevEmails) =>
          updateEmails(prevEmails, response.emails, "imap")
        );
      }
    } catch (err: any) {
      console.error("Error fetching IMAP emails:", err);
      setImapError(err.message || "Failed to fetch IMAP emails.");
    } finally {
      setImapLoading(false);
    }
  }, [user, loginType]);

  // Helper function to fetch Google emails
  const fetchGoogleMailEmails = useCallback(async () => {
    if (!token || loginType !== "google") return;
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const fetchedEmails = await fetchGoogleEmails(token);
      if (Array.isArray(fetchedEmails) && fetchedEmails.length > 0) {
        setGoogleEmails((prevEmails) =>
          updateEmails(prevEmails, fetchedEmails, "google")
        );
      }
    } catch (err: any) {
      console.error("Error in fetchGoogleMailEmails:", err);
      setGoogleError(err.message || "Failed to fetch Google emails.");
    } finally {
      setGoogleLoading(false);
    }
  }, [token, loginType]);

  useEffect(() => {
    if (loginType === "imap") {
      const cachedEmails = sessionStorage.getItem("imapEmails");
      if (cachedEmails) {
        setImapEmails(JSON.parse(cachedEmails));
      }
    } else if (loginType === "google") {
      const cachedEmails = sessionStorage.getItem("googleEmails");
      if (cachedEmails) {
        setGoogleEmails(JSON.parse(cachedEmails));
      }
    }
  }, [loginType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (loginType === "imap") {
      await fetchImapEmails();
    } else if (loginType === "google") {
      await fetchGoogleMailEmails();
    }
    setRefreshing(false);
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Navbar />
        <div className="dashboard__container">
          <div className="dashboard__grid">
            {/* Analytics Section */}
            <div className="card card--analytics fade-in">
              <Analytics
                emails={allEmails}
              />
            </div>

            {/* Email Overview Chart */}
            <div className="card card--chart fade-in">
              <div className="card__header">
                <h2 className="card__title">Email Overview</h2>
                <button className="card__menu-btn">...</button>
              </div>
              <div className="chart-container--radial">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="100%"
                    barSize={10}
                    data={emailOverviewData}
                    startAngle={180}
                    endAngle={-180}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                    />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="radial-chart__total"
                    >
                      {totalStatus}
                    </text>
                     <text
                      x="50%"
                      y="65%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="radial-chart__label"
                    >
                      All Emails
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                {emailOverviewData.map((entry, index) => (
                  <div key={`legend-${index}`} className="legend-item">
                    <span
                      className={`legend-item__color legend-item__color--${entry.name.toLowerCase()}`}
                    />
                    <span className="legend-item__label">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card--major-risks fade-in">
              <MajorRisks />
            </div>

            {/* Email List Section */}
            <div className="card card--email-list fade-in">
              <div className="email-section__header">
                <h2 className="card__title">Top 3 date at risk</h2>
                <button
                  className="btn btn--outlined"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              
              <div className="email-section__content">
                {refreshing ? (
                  <div className="email-section__overlay">
                    <CircularWithValueLabel />
                  </div>
                ) : imapError || googleError ? (
                  <div className="email-section__error">
                    {imapError || googleError}
                  </div>
                ) : (
                  <EmailList
                    emails={allEmails}
                    onSelectEmail={setSelectedEmail}
                    selectedEmail={selectedEmail}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
      
      {/* Email Details Modal - rendered outside the grid */}
      {selectedEmail && (
        <EmailDetails
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}