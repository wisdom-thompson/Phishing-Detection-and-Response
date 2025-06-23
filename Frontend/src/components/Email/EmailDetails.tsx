import { useEffect } from 'react';
import './EmailDetails.scss';
import { EmailAnalysis } from "../../types";

interface EmailDetailsProps {
  email: EmailAnalysis;
  onClose: () => void;
  onDelete?: () => void;
}

export default function EmailDetails({ email, onClose, onDelete }: EmailDetailsProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleMarkAsSafe = () => {
    // Logic to mark email as safe would go here
    console.log(`Marking email ${email.email_id} as safe.`);
    onClose(); // Close modal after action
  };

  return (
    <div className="email-details-modal__overlay" onClick={onClose}>
      <div className="email-details-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="email-details-modal__header">
          <h2 className="email-details-modal__subject">{email.subject}</h2>
          <button className="email-details-modal__close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="email-details-modal__meta">
            <div><strong>From:</strong> {email.sender}</div>
            <div><strong>Received:</strong> {new Date(email.timestamp).toLocaleString()}</div>
        </div>
        <div className="email-details-modal__body">
          <p>{email.body || 'No content available.'}</p>
        </div>
        <div className="email-details-modal__footer">
            <button className="btn btn--secondary" onClick={handleMarkAsSafe}>Mark as Safe</button>
            {onDelete && <button className="btn btn--danger" onClick={onDelete}>Delete Permanently</button>}
        </div>
      </div>
    </div>
  );
}