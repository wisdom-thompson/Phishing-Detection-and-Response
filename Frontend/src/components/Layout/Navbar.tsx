import "./Navbar.scss";

const SearchIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" /></svg>
);
const SettingsIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.35C8.61,5.59,8.08,5.92,7.58,6.29L5.19,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.69,8.87 C2.58,9.08,2.63,9.34,2.81,9.48l2.03,1.58C4.8,11.36,4.78,11.67,4.78,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.36-2.54c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>
);
const ExportIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,1L8,5H11V14H13V5H16M18,23H6C4.89,23 4,22.11 4,21V9A2,2 0 0,1 6,7H9V9H6V21H18V9H15V7H18A2,2 0 0,1 20,9V21A2,2 0 0,1 18,23Z" /></svg>
)

export const Navbar = () => {
  const handleCustomise = () => {
    alert('Customise button clicked! This feature is not yet implemented.');
  };

  const handleExport = () => {
    alert('Export button clicked! This feature is not yet implemented.');
  };

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <h1 className="navbar__title">Dashboard</h1>
      </div>
      <div className="navbar__center">
        <div className="search-bar">
          <SearchIcon />
          <input type="text" placeholder="Search..." />
        </div>
      </div>
      <div className="navbar__right">
        <button className="navbar__btn" onClick={handleCustomise}>
            <SettingsIcon />
            <span>Customise</span>
        </button>
        <button className="navbar__btn navbar__btn--primary" onClick={handleExport}>
            <ExportIcon />
            <span>Export</span>
        </button>
      </div>
    </nav>
  );
};