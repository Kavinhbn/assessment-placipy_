import axios from 'axios';

const API_BASE_URL = '/api/student/notifications';

export interface Notification {
    PK?: string;
    SK?: string;
    userId?: string;
    email?: string;
    type: 'assessment_published' | 'result_published' | 'announcement';
    title: string;
    message: string;
    link: string;
    priority: 'high' | 'medium' | 'low';
    isRead: boolean;
    createdAt: string;
    metadata?: any;
}

class NotificationService {
    private getAuthHeaders() {
        const token = localStorage.getItem('accessToken');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get all notifications for the current user
     * Returns empty array since notifications are not stored in DB
     */
    async getNotifications(limit: number = 50, lastKey?: string): Promise<{ items: Notification[]; lastKey?: string }> {
        try {
            // Since notifications are not stored in DB, return empty array
            console.log('Returning empty notifications (notifications not stored in DB)');
            return {
                items: [],
                lastKey: undefined
            };
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
        }
    }

    /**
     * Mark a notification as read
     * No-op since notifications are not stored in DB
     */
    async markAsRead(notificationId: string): Promise<void> {
        try {
            // No-op since notifications are not stored in DB
            console.log(`Marking notification ${notificationId} as read (no DB operation)`);
        } catch (error: any) {
            console.error('Error marking notification as read:', error);
            throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
        }
    }

    /**
     * Mark all notifications as read
     * No-op since notifications are not stored in DB
     */
    async markAllAsRead(): Promise<void> {
        try {
            // No-op since notifications are not stored in DB
            console.log('Marking all notifications as read (no DB operation)');
        } catch (error: any) {
            console.error('Error marking all notifications as read:', error);
            throw new Error(error.response?.data?.message || 'Failed to mark all notifications as read');
        }
    }
}

export default new NotificationService();