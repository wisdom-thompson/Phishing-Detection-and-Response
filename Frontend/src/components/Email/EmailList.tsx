import "./EmailList.scss";
import { EmailAnalysis } from "../../types";
import { timeAgo } from "../../utils/time";

// --- Icons ---
const WarningIcon = () => <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" /></svg>;
const EmailIcon = () => <svg viewBox="0 0 24 24"><path fill="currentColor" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" /></svg>;
const WebIcon = () => <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>;
// --- End Icons ---

interface EmailListProps {
  emails: EmailAnalysis[];
  onSelectEmail: (email: EmailAnalysis) => void;
  selectedEmail: EmailAnalysis | null;
}

export default function EmailList({ emails, onSelectEmail, selectedEmail }: EmailListProps) {
  const phishingEmails = [...emails]
    .filter((email) => email.is_phishing)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3); // Show top 3 recent phishing emails

  if (phishingEmails.length === 0) {
    return (
      <div className="all-clear-container">
        <div className="all-clear-icon">✅</div>
        <p>No high-risk emails detected in the latest scan.</p>
      </div>
    );
  }

  return (
    <div className="email-card-grid">
      {phishingEmails.map((email) => (
        <div
          key={email.email_id}
          className={`risk-card ${selectedEmail?.email_id === email.email_id ? "selected" : ""}`}
          onClick={() => onSelectEmail(email)}
        >
          <div className="risk-card__header">
            <div className="risk-card__icon-container">
              <WarningIcon />
            </div>
            <div className="risk-card__title-group">
              <h3 className="risk-card__subject" title={email.subject}>
                {email.subject || "No Subject"}
              </h3>
              <span className="risk-card__timestamp">
                {timeAgo(email.timestamp)}
              </span>
            </div>
          </div>

          <div className="risk-card__body">
            <div className="risk-card__detail-item">
              <EmailIcon />
              <span>From: {email.sender}</span>
            </div>
            <div className="risk-card__detail-item">
              <WebIcon />
              <span>{email.urls.length} Suspicious URLs</span>
            </div>
          </div>

          <div className="risk-card__footer">
            <span className="risk-card__tag">High Risk</span>
            <span className="risk-card__tag">Internet Facing</span>
          </div>
        </div>
      ))}
    </div>
  );
}