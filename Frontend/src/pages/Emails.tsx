import { useEffect, useState, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import { fetchGoogleEmails } from "../hooks/fetchGoogleEmails";
import { analyzeEmails } from "../services/api";
import { EmailAnalysis } from "../types";
import { updateEmails } from "./utils";
import Sidebar from "../components/Layout/Sidebar";
import { Navbar } from "../components/Layout/Navbar";
import { Footer } from "../components/Layout/Footer";
import EmailDetails from "../components/Email/EmailDetails";
import "./Emails.scss";

export default function EmailsPage() {
  const { user } = useAuth();
  const [imapEmails, setImapEmails] = useState<EmailAnalysis[]>([]);
  const [googleEmails, setGoogleEmails] = useState<EmailAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailAnalysis | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loginType = sessionStorage.getItem("loginType");
  const token = sessionStorage.getItem("gmailToken");

  const allEmails = (loginType === "imap" ? imapEmails : googleEmails).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filteredEmails = allEmails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (loginType === "imap" && user) {
        const storedPassword = sessionStorage.getItem("userPassword");
        const response: any = await analyzeEmails({
          email: user.email,
          password: storedPassword || user.password,
          loginType: "imap",
        });
        if (response?.emails) {
          setImapEmails((prev) => updateEmails(prev, response.emails, "imap"));
        }
      } else if (loginType === "google" && token) {
        const fetchedEmails = await fetchGoogleEmails(token);
        if (Array.isArray(fetchedEmails) && fetchedEmails.length > 0) {
          setGoogleEmails((prev) => updateEmails(prev, fetchedEmails, "google"));
        }
      }
    } catch (err: any) {
      console.error("Error fetching emails:", err);
      setError(err.message || "Failed to fetch emails.");
    } finally {
      setLoading(false);
    }
  }, [loginType, user, token]);

  useEffect(() => {
    const cachedEmails = sessionStorage.getItem(
      loginType === "imap" ? "imapEmails" : "googleEmails"
    );
    if (cachedEmails) {
      if (loginType === "imap") setImapEmails(JSON.parse(cachedEmails));
      if (loginType === "google") setGoogleEmails(JSON.parse(cachedEmails));
    } else {
      fetchEmails();
    }
  }, [loginType, fetchEmails]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Navbar />
        <div className="emails-page">
          <div className="emails-page__header">
            <h1>All Scanned Emails</h1>
            <input
              type="text"
              placeholder="Search by sender or subject..."
              className="emails-page__search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="emails-table-container">
            <table className="emails-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="centered-message">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="centered-message error-message">{error}</td>
                  </tr>
                ) : filteredEmails.length > 0 ? (
                  filteredEmails.map((email) => (
                    <tr key={email.email_id} onClick={() => setSelectedEmail(email)}>
                      <td>
                        <span className={`status-badge ${email.is_phishing ? 'status--phishing' : 'status--safe'}`}>
                          {email.is_phishing ? 'Phishing' : 'Safe'}
                        </span>
                      </td>
                      <td>{email.sender}</td>
                      <td>{email.subject}</td>
                      <td>{new Date(email.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="centered-message">No emails found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Footer />
      </main>
      {selectedEmail && (
        <EmailDetails
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
} 