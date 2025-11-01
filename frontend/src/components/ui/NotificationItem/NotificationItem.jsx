import React, { useState } from 'react';
import { NotifScheduleIcon, NotifRescheduleIcon, NotifCancelIcon, NotifCloseIcon, NotifArrowIcon } from '../../SVGICONS/Svg';
import './NotificationItem.css';

const NotificationItem = ({ notification, onDelete, onShowInCalendar }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const getIcon = () => {
    switch (notification.type) {
      case 'scheduled':
        return <NotifScheduleIcon style={{ width: '16px', height: '18px' }} />;
      case 'rescheduled':
        return <NotifRescheduleIcon style={{ width: '18px', height: '14px' }} />;
      case 'cancelled':
        return <NotifCancelIcon style={{ width: '10px', height: '12px' }} />;
      default:
        return null;
    }
  };

  const getIconBgColor = () => {
    switch (notification.type) {
      case 'scheduled':
        return '#8CE057';
      case 'rescheduled':
        return '#F8C611';
      case 'cancelled':
        return '#FF5F5F';
      default:
        return '#E0E9FE';
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    // Wait for animation to complete before calling onDelete
    setTimeout(() => {
      onDelete(notification.id);
    }, 300);
  };

  return (
    <div className={`notification-item ${isDeleting ? 'deleting' : ''}`}>
      <div 
        className="notification-icon-container"
        style={{ backgroundColor: getIconBgColor() }}
      >
        {getIcon()}
      </div>
      
      <div className="notification-content">
        <p className="notification-text">
          <strong>{notification.customerName}</strong> has {notification.type === 'cancelled' ? 'cancelled' : notification.type === 'rescheduled' ? 'rescheduled' : 'scheduled'} <strong>{notification.serviceName}</strong> for <strong>{notification.dateTime}</strong>
        </p>
        <div className="notification-footer">
          <span className="notification-time">{notification.timestamp}</span>
        {(notification.type === 'scheduled' || notification.type === 'rescheduled') && notification.action && (
          <button 
            className="notification-action-button"
            onClick={(e) => {
              e.stopPropagation();
              if (onShowInCalendar) {
                onShowInCalendar(notification);
              }
            }}
          >
            Show in Calendar
            <NotifArrowIcon />
          </button>
        )}
        </div>
      </div>

      <button className="notification-delete" onClick={handleDelete}>
        <NotifCloseIcon />
      </button>
    </div>
  );
};

export default NotificationItem;

