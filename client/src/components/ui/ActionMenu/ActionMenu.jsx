import React, { useState, useRef, useEffect } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import "./ActionMenu.css";

const ActionMenu = ({ items = [] }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  // Close menu when clicked outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="action-menu" ref={menuRef}>
      <button className="action-trigger" onClick={() => setOpen(!open)}>
        <BsThreeDotsVertical size={18} color="#64748B" />
      </button>
      {open && (
        <div className="action-dropdown">
          {items.map((item, idx) => (
            <div 
              key={idx} 
              className="action-item" 
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon && <span className="action-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
