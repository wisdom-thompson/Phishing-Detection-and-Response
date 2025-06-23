import "./Analytics.scss";
import { EmailAnalysis } from "../../types";

interface IconProps {
  className?: string;
}

const ShieldIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z" />
  </svg>
);

interface AnalyticsProps {
  emails: EmailAnalysis[];
}

export default function Analytics({ emails }: AnalyticsProps) {
  const totalEmails = emails.length;
  const phishingEmailsCount = emails.filter((email) => email.is_phishing).length;
  const hasThreats = phishingEmailsCount > 0;

  return (
    <div className={`scan-card ${hasThreats ? 'scan-card--threats' : 'scan-card--no-threats'}`}>
      <div className="scan-card__icon-container">
        <ShieldIcon className="scan-card__icon" />
      </div>
      <div className="scan-card__content">
        <p className="scan-card__status">
          {hasThreats ? `${phishingEmailsCount} Threats Detected` : 'No Threats Detected'}
        </p>
        <p className="scan-card__subtitle">
          The anti-phishing databases are up to date.
        </p>
        <p className="scan-card__meta">
          Total emails processed: {totalEmails}
        </p>
      </div>
      <div className="scan-card__actions">
        <button className="scan-card__btn">Scan Now</button>
      </div>
    </div>
  );
}