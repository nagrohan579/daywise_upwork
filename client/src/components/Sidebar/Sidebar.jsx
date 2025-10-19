import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoMdClose } from "react-icons/io";

import {
  AvailabilityIcon,
  CalendarIcon,
  ServiceIcon,
  BrandingIcon,
  LinkIcon,
  SettingIcon,
  AccountIcon,
  BiilingIcon,
  LogoutIcon,
} from "../SVGICONS/Svg";
import "./Sidebar.css";

// Mock Icons (replace with actual SVG or library icons like Lucide, Feather)
const Icon = ({ children }) => (
  <span style={{ width: "20px", height: "20px" }}>{children}</span>
);

const navItems = [
  { name: "Bookings", path: "/booking", icon: <CalendarIcon /> },
  { name: "Services", path: "/service", icon: <ServiceIcon /> },
  { name: "Availability", path: "/availability", icon: <AvailabilityIcon /> },
  { name: "Branding", path: "/branding", icon: <BrandingIcon /> },
  { name: "My Link", path: "/my-link", icon: <LinkIcon /> },
  { name: "Settings", path: "/setting", icon: <SettingIcon /> },
  { name: "Account", path: "/account", icon: <AccountIcon /> },
  { name: "Billing", path: "/billing", icon: <BiilingIcon /> },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  return (
    <>
      <div className={`sidebar-container ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <Link to={"/"}>
            <img src="/assets/images/logo.svg" alt="Daywise Logo" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.name} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${
                    location.pathname === item.path ? "is-active" : ""
                  }`}
                  onClick={toggleSidebar}
                >
                  <Icon>{item.icon}</Icon>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="logout-container">
          <Link to="/logout" className="logout-link" onClick={toggleSidebar}>
            <Icon>
              <LogoutIcon />
            </Icon>
            Logout
          </Link>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
    </>
  );
};

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Disable body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isSidebarOpen]);

  // Close sidebar if window size changes from mobile to desktop
  useEffect(() => {
    const handleResize = () => {
      // Assuming 992px is the desktop breakpoint from CSS
      if (window.innerWidth >= 992) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="app-layout">
      {/* Hamburger button visible only on mobile  */}
      <button
        className="hamburger-button"
        style={{ position: isSidebarOpen ? "fixed" : "" }}
      >
        {isSidebarOpen ? (
          <>
            <IoMdClose color="#121212" size={30} onClick={toggleSidebar} />
            <Link to={"/"}>
              <img
                src="/assets/images/logo.svg"
                alt="Daywise Logo"
                width={135}
              />
            </Link>
          </>
        ) : (
          <GiHamburgerMenu color="#121212" size={24} onClick={toggleSidebar} />
        )}
        {!isSidebarOpen && (
          <svg
            width="20"
            height="18"
            viewBox="0 0 24 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M23.4596 8.98324L19.476 2.08416C18.7555 0.836655 17.4246 0.0673828 15.9835 0.0673828H8.01645C6.57535 0.0673828 5.24451 0.836655 4.52396 2.08416L0.540413 8.98324C-0.180138 10.2307 -0.180138 11.768 0.540413 13.0168L4.52396 19.9159C5.24451 21.1634 6.57535 21.9327 8.01645 21.9327H15.9835C17.4246 21.9327 18.7555 21.1634 19.476 19.9159L23.4596 13.0168C24.1801 11.7693 24.1801 10.232 23.4596 8.98324ZM20.9774 12.2821C20.9697 12.3001 20.9646 12.318 20.9556 12.336C20.9428 12.3642 20.9261 12.3911 20.912 12.418C20.912 12.4206 20.9095 12.4232 20.9082 12.4245C20.8864 12.4668 20.8646 12.5104 20.8402 12.5527L19.2632 15.2849L17.767 17.8747C17.2118 18.8376 16.1848 19.43 15.0732 19.43H8.92932C7.81772 19.43 6.79075 18.8376 6.23559 17.8747L3.16363 12.5539C2.60847 11.5911 2.60847 10.4064 3.16363 9.44353L6.23559 4.12273C6.65613 3.3932 7.34847 2.87779 8.1421 2.6688C8.56264 2.52264 9.0101 2.44315 9.4691 2.44315H11.0653C11.582 2.44315 12.0013 2.8624 12.0013 3.3791V10.0654C12.0013 10.5808 12.4205 10.9987 12.9372 10.9987H14.3899H18.3273L20.1107 10.9975C20.7787 10.9975 21.2236 11.6731 20.9787 12.2809L20.9774 12.2821Z"
              fill="#0053F1"
            />
          </svg>
        )}
      </button>

      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="main-content-area">{children}</main>
    </div>
  );
};

export default AppLayout;
