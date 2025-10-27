import React from 'react';
import NotificationItem from '../NotificationItem/NotificationItem';
import './modal.css';

const NotificationsModal = ({ show, onClose, notifications, onDelete }) => {

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notifications-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-modal-header">
          <div>
            <h2>Notifications</h2>
            <p>Customize your regular availability for specific dates.</p>
          </div>
          <button className="modal-close-button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4L12 12M4 12L12 4" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="notifications-modal-body">
          {notifications.length === 0 ? (
            <div className="notifications-empty">
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;

