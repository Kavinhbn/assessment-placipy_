// @ts-nocheck
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class NotificationService {
    private notificationsTableName: string;
    private assessmentsTableName: string;
    private studentsTableName: string;

    constructor() {
        // Use the same table as assessments for notifications
        // Or use a dedicated notifications table if you prefer
        this.notificationsTableName = process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy';
        this.assessmentsTableName = process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy';
        this.studentsTableName = process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy';
    }

    /**
     * Extract domain from email address
     */
    private getDomainFromEmail(email: string): string {
        if (!email || !email.includes('@')) {
            return 'ksrce.ac.in'; // Default domain
        }
        return email.split('@')[1];
    }

    /**
     * Create a notification for a single user (send notification but don't store in DB)
     */
    async createNotificationForUser(
        userId: string,
        email: string,
        type: 'assessment_published' | 'result_published' | 'reminder' | 'announcement',
        title: string,
        message: string,
        link: string,
        priority: 'high' | 'medium' | 'low',
        metadata?: any
    ): Promise<any> {
        try {
            const domain = this.getDomainFromEmail(email);
            const notificationId = uuidv4();
            const createdAt = new Date().toISOString();

            const notification = {
                PK: `CLIENT#${domain}`,
                SK: `NOTIF#${notificationId}`,
                userId,
                email: email.toLowerCase(), // Ensure email is lowercase
                type,
                title,
                message,
                link,
                priority,
                isRead: false,
                createdAt,
                ...(metadata && { metadata })
            };

            // Send notification (e.g., via email, push notification, etc.) but don't store in DB
            console.log(`Notification sent (not stored in DB): ${notification.SK} for user ${email}`);
            // Here you would implement actual notification sending logic (email, push, etc.)
            
            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Failed to create notification: ' + error.message);
        }
    }

    /**
     * Create notifications for multiple students (send notifications but don't store in DB)
     */
    async createNotificationsForStudents(
        studentEmails: string[],
        type: 'assessment_published' | 'result_published' | 'announcement',
        title: string,
        message: string,
        link: string,
        priority: 'high' | 'medium' | 'low',
        metadata?: any
    ): Promise<any[]> {
        try {
            const notifications = [];
            
            for (const email of studentEmails) {
                const lowerCaseEmail = email.toLowerCase();
                const domain = this.getDomainFromEmail(lowerCaseEmail);
                
                // Use the student's email as userId
                const userId = lowerCaseEmail;

                const notification = await this.createNotificationForUser(
                    userId,
                    lowerCaseEmail,
                    type,
                    title,
                    message,
                    link,
                    priority,
                    metadata
                );
                notifications.push(notification);
            }

            return notifications;
        } catch (error) {
            console.error('Error creating notifications for students:', error);
            throw new Error('Failed to create notifications: ' + error.message);
        }
    }

    /**
     * Get notifications for a user (returns empty since we're not storing in DB)
     */
    async getNotificationsForUser(
        email: string,
        limit: number = 50,
        lastKey?: any
    ): Promise<{ items: any[]; lastKey?: any }> {
        try {
            // Return empty array since we're not storing notifications in DB
            console.log(`Returning empty notifications for user ${email} (notifications not stored in DB)`);
            return {
                items: [],
                lastKey: undefined
            };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw new Error('Failed to fetch notifications: ' + error.message);
        }
    }

    /**
     * Mark a notification as read (no-op since we're not storing in DB)
     */
    async markAsRead(notificationId: string, email: string): Promise<any> {
        try {
            // No-op since we're not storing notifications in DB
            console.log(`Marking notification ${notificationId} as read (no DB operation)`);
            return { success: true };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw new Error('Failed to mark notification as read: ' + error.message);
        }
    }

    /**
     * Mark all notifications as read for a user (no-op since we're not storing in DB)
     */
    async markAllAsRead(email: string): Promise<number> {
        try {
            // No-op since we're not storing notifications in DB
            console.log(`Marking all notifications as read for user ${email} (no DB operation)`);
            return 0;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw new Error('Failed to mark all notifications as read: ' + error.message);
        }
    }

    /**
     * Delete old notifications (no-op since we're not storing in DB)
     */
    async deleteOldNotifications(daysOld: number = 60): Promise<number> {
        try {
            // No-op since we're not storing notifications in DB
            console.log(`Deleting old notifications (no DB operation)`);
            return 0;
        } catch (error) {
            console.error('Error deleting old notifications:', error);
            throw new Error('Failed to delete old notifications: ' + error.message);
        }
    }

    /**
     * Check if reminder has been sent (still need to track this to avoid duplicate notifications)
     */
    async hasReminderBeenSent(assessmentId: string, email: string, reminderType: string): Promise<boolean> {
        try {
            // We still need to track sent reminders to avoid duplicates
            // But we won't store the actual notifications
            const domain = this.getDomainFromEmail(email);
            const PK = `CLIENT#${domain}`;
            const SK = `REMINDER#${assessmentId}#${email}#${reminderType}`;

            const params = {
                TableName: this.notificationsTableName,
                Key: {
                    PK,
                    SK
                }
            };

            const result = await dynamodb.get(params).promise();
            return !!result.Item;
        } catch (error) {
            console.error('Error checking if reminder was sent:', error);
            return false; // Assume not sent if there's an error
        }
    }

    /**
     * Mark reminder as sent (we still track this to avoid duplicate notifications)
     */
    async markReminderAsSent(assessmentId: string, email: string, reminderType: string): Promise<void> {
        try {
            // We still track sent reminders to avoid duplicates
            // But we won't store the actual notifications
            const domain = this.getDomainFromEmail(email);
            const PK = `CLIENT#${domain}`;
            const SK = `REMINDER#${assessmentId}#${email}#${reminderType}`;
            const createdAt = new Date().toISOString();

            const params = {
                TableName: this.notificationsTableName,
                Item: {
                    PK,
                    SK,
                    email: email.toLowerCase(),
                    assessmentId,
                    reminderType,
                    createdAt
                }
            };

            await dynamodb.put(params).promise();
        } catch (error) {
            console.error('Error marking reminder as sent:', error);
            throw new Error('Failed to mark reminder as sent: ' + error.message);
        }
    }

    /**
     * Get all students for a domain (for bulk notifications)
     * This is needed for sending notifications, so we keep this functionality
     */
    async getStudentsByDomain(domain: string): Promise<string[]> {
        try {
            const PK = `CLIENT#${domain}`;
            const params = {
                TableName: this.studentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': PK,
                    ':skPrefix': 'STUDENT#'
                }
            };

            const result = await dynamodb.query(params).promise();
            // Ensure all emails are lowercase
            return (result.Items || []).map(item => item.email ? item.email.toLowerCase() : '').filter(Boolean);
        } catch (error) {
            console.error('Error fetching students by domain:', error);
            throw new Error('Failed to fetch students: ' + error.message);
        }
    }

    /**
     * Get students by department and domain
     * This is needed for sending notifications, so we keep this functionality
     */
    async getStudentsByDepartment(domain: string, department: string): Promise<string[]> {
        try {
            const PK = `CLIENT#${domain}`;
            const params = {
                TableName: this.studentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                FilterExpression: 'department = :department',
                ExpressionAttributeValues: {
                    ':pk': PK,
                    ':skPrefix': 'STUDENT#',
                    ':department': department
                }
            };

            const result = await dynamodb.query(params).promise();
            // Ensure all emails are lowercase
            return (result.Items || []).map(item => item.email ? item.email.toLowerCase() : '').filter(Boolean);
        } catch (error) {
            console.error('Error fetching students by department:', error);
            throw new Error('Failed to fetch students: ' + error.message);
        }
    }
}

module.exports = new NotificationService();