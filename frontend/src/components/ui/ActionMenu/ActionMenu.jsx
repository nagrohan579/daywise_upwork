import React, { useState, useRef, useEffect } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import "./ActionMenu.css";

const ActionMenu = ({ items = [], isOpen: controlledIsOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const menuRef = useRef();
  
  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  // Close menu when clicked outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

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
              className={`action-item ${item.disabled ? 'action-item-disabled' : ''}`}
              onClick={() => {
                // Always call onClick, even if disabled (allows showing toast messages)
                if (item.onClick) {
                  item.onClick();
                }
                // Only close menu if not disabled
                if (!item.disabled) {
                  setOpen(false);
                }
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
