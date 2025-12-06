import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/useNotifications';

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();

  const badgeColor = useMemo(() => {
    const unread = notifications.filter(n => !n.isRead);
    const priorities = unread.map(n => n.priority);
    if (priorities.includes('high')) return '#EF4444';
    if (priorities.includes('medium')) return '#F59E0B';
    if (priorities.length > 0) return '#6B7280';
    return 'transparent';
  }, [notifications]);

  const hasUnread = unreadCount > 0;

  return (
    <button
      aria-label="Notifications"
      title="Notifications"
      onClick={() => navigate('/student/notifications')}
      style={{
        position: 'relative',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Bell size={24} color={hasUnread ? '#523C48' : '#6B7280'} />
      {hasUnread && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: badgeColor,
            color: '#FFFFFF',
            borderRadius: 12,
            padding: '0 6px',
            fontSize: 11,
            fontWeight: 700,
            minWidth: 18,
            lineHeight: '18px',
            textAlign: 'center'
          }}
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
