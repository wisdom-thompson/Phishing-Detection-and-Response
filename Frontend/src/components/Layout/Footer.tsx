import './Footer.scss';

// You can use any icon library or create your own SVG
const SecurityIcon = () => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="security-icon"
  >
    <path 
      d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__content">
          <div className="footer__brand">
            <SecurityIcon />
            <p className="footer__text">
              © {currentYear} Phishing Shield by{" "}
              <a
                href="https://github.com/wisdom-thompson"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__link footer__link--primary"
              >
                Wisdom
              </a>
            </p>
          </div>
          <div className="footer__links">
            <a
              href="https://www.linkedin.com/in/owhorji-wisdom-b23944194/"
              className="footer__link footer__link--secondary"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};