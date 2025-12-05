import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import NotificationService from '../services/notification.service';
import type { Notification } from '../services/notification.service';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    lastNotificationId: string | null;
    // Add method to add temporary notifications
    addTemporaryNotification: (notification: Omit<Notification, 'createdAt' | 'isRead' | 'SK' | 'PK'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const popupShownRef = useRef<Set<string>>(new Set());
    const tempNotificationsRef = useRef<Notification[]>([]);

    // Add temporary notification (not stored in DB)
    const addTemporaryNotification = useCallback((notificationData: Omit<Notification, 'createdAt' | 'isRead' | 'SK' | 'PK'>) => {
        const tempNotification: Notification = {
            ...notificationData,
            createdAt: new Date().toISOString(),
            isRead: false,
            SK: `TEMP_NOTIF#${Date.now()}`,
            PK: 'TEMP'
        };
        
        // Add to temporary notifications array
        tempNotificationsRef.current = [tempNotification, ...tempNotificationsRef.current].slice(0, 50); // Keep only last 50
        
        // Update state to trigger re-render
        setNotifications(prev => [tempNotification, ...prev.slice(0, 49)]); // Keep only last 50
        setUnreadCount(prev => prev + 1);
        
        // Trigger popup event
        window.dispatchEvent(new CustomEvent('newNotification', { detail: tempNotification }));
        
        return tempNotification;
    }, []);

    // Fetch notifications (will return empty since we're not storing in DB)
    const fetchNotifications = useCallback(async () => {
        try {
            // Since notifications are not stored in DB, we'll use temporary notifications
            const tempNotifications = tempNotificationsRef.current;
            
            // Sort by createdAt descending (newest first)
            const sortedNotifications = [...tempNotifications].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });

            // Check for new notifications
            if (lastNotificationId && sortedNotifications.length > 0) {
                const newestId = sortedNotifications[0].SK || sortedNotifications[0].createdAt;
                if (newestId !== lastNotificationId) {
                    // Find new notifications
                    const newNotifications = sortedNotifications.filter(notif => {
                        const notifId = notif.SK || notif.createdAt;
                        return notifId !== lastNotificationId && !notif.isRead && !popupShownRef.current.has(notifId);
                    });

                    // Show popup for new unread notifications
                    if (newNotifications.length > 0) {
                        const newest = newNotifications[0];
                        const notifId = newest.SK || newest.createdAt;
                        if (!popupShownRef.current.has(notifId)) {
                            popupShownRef.current.add(notifId);
                            // Trigger popup event
                            window.dispatchEvent(new CustomEvent('newNotification', { detail: newest }));
                        }
                    }
                }
            } else if (sortedNotifications.length > 0) {
                // First load - set last notification ID
                const newestId = sortedNotifications[0].SK || sortedNotifications[0].createdAt;
                setLastNotificationId(newestId);
            }

            setNotifications(sortedNotifications);
            setUnreadCount(sortedNotifications.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [lastNotificationId]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            // Update temporary notifications
            tempNotificationsRef.current = tempNotificationsRef.current.map(notif => {
                if (notif.SK === notificationId) {
                    return { ...notif, isRead: true };
                }
                return notif;
            });
            
            // Update state
            setNotifications(prev => 
                prev.map(notif => {
                    if (notif.SK === notificationId) {
                        return { ...notif, isRead: true };
                    }
                    return notif;
                })
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            // Update temporary notifications
            tempNotificationsRef.current = tempNotificationsRef.current.map(notif => ({ ...notif, isRead: true }));
            
            // Update state
            setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, []);

    // Poll for new notifications every 20 seconds
    useEffect(() => {
        pollingIntervalRef.current = setInterval(() => {
            fetchNotifications();
        }, 20000); // 20 seconds

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [fetchNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                lastNotificationId,
                addTemporaryNotification
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}