import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Sidebar.scss';

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#238636"/>
    <path d="M14 20C14 16.6863 16.6863 14 20 14C23.3137 14 26 16.6863 26 20C26 21.6569 25.3284 23.1569 24.2426 24.2426C23.1569 25.3284 21.6569 26 20 26C16.6863 26 14 23.3137 14 20Z" stroke="white" strokeWidth="2"/>
    <path d="M20 14C20 10.6863 22.6863 8 26 8" stroke="white" strokeWidth="2"/>
    <path d="M14 26C10.6863 26 8 23.3137 8 20" stroke="white" strokeWidth="2"/>
  </svg>
);
const DashboardIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z" /></svg>
);
const ListIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3,4H21V6H3V4M3,11H21V13H3V11M3,18H21V20H3V18Z" /></svg>
);
const SettingsIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M19.1,4.9C18.4,4.2 17.6,3.6 16.7,3.2C15.8,2.7 14.8,2.4 13.8,2.2V4.2C14.4,4.4 15,4.7 15.5,5.1C16,5.5 16.5,6 16.9,6.5L18.3,5.1C17.9,4.7 17.5,4.3 17.1,4L19.1,4.9M4.9,19.1C5.6,19.8 6.4,20.4 7.3,20.8C8.2,21.3 9.2,21.6 10.2,21.8V19.8C9.6,19.6 9,19.3 8.5,18.9C8,18.5 7.5,18 7.1,17.5L5.7,18.9C6.1,19.3 6.5,19.7 6.9,20L4.9,19.1M4.9,4.9L6.9,4C7.3,4.3 7.7,4.7 8.1,5.1L6.5,6.5C6,6 5.5,5.5 5.1,5.1C4.7,4.7 4.4,4.4 4.2,3.8C3.6,4.4 3.2,5.2 2.7,6.1C2.4,7.1 2.2,8.1 2.2,9.2H4.2C4.4,8.6 4.7,8 5.1,7.5C5.5,7 6,6.5 6.5,6.1L4.9,4.9Z" /></svg>
);
const NetworkIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,3C7.4,3,3.4,4.41,0.4,6.65L12,21.5L23.6,6.65C20.6,4.41,16.6,3,12,3M12,5C15.15,5,18.05,6.05,20.5,7.85L12,18.05L3.5,7.85C5.95,6.05,8.85,5,12,5" /></svg>
);
const LogoutIcon = () => (
    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" /></svg>
);


export default function Sidebar() {
    const { logout } = useAuth();

    return (
        <div className="sidebar">
            <div className="sidebar__logo">
                <Logo />
            </div>
            <nav className="sidebar__nav">
                <NavLink to="/dashboard" className={({ isActive }) => "sidebar__nav-item" + (isActive ? " active" : "")}>
                    <DashboardIcon />
                </NavLink>
                <NavLink to="/emails" className={({ isActive }) => "sidebar__nav-item" + (isActive ? " active" : "")} title="All Emails">
                    <ListIcon />
                </NavLink>
                <NavLink to="/network" className={({ isActive }) => "sidebar__nav-item" + (isActive ? " active" : "")} title="Network Scan">
                    <NetworkIcon />
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => "sidebar__nav-item" + (isActive ? " active" : "")} title="Settings">
                    <SettingsIcon />
                </NavLink>
            </nav>
            <div className="sidebar__footer">
                <button className="sidebar__nav-item sidebar__logout-btn" onClick={logout} aria-label="Logout" title="Logout">
                    <LogoutIcon />
                </button>
            </div>
        </div>
    )
} 