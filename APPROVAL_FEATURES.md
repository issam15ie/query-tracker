# Approval & Notification System

## Overview
The Query Tracker now includes a comprehensive approval workflow and notification system for managing query approvals and user notifications.

## Features Implemented

### 1. Approval Workflow
- **Multi-level approval system** with configurable levels
- **Approval Dashboard** showing pending approvals, statistics, and approval metrics
- **Approve/Reject UI** with optional comments
- **Auto-assign approvers** per project (foundation laid for future implementation)
- **Approval history tracking** for audit purposes
- **Query status updates** based on approval status

### 2. Notifications System
- **In-app notification center** with bell icon and badge
- **Notification preferences** (can be enabled/disabled)
- **Email notification support** (currently disabled, can be enabled)
- **Real-time notification updates**
- **Unread notification counter**
- **Notification history tracking**

### 3. Database Schema

#### New Tables Created:
1. **approval_levels**: Defines approval workflows per project
   - `id`, `project_id`, `level_number`, `approver_username`, `timeout_hours`, `requires_all`

2. **query_approvals**: Tracks individual approval records
   - `id`, `query_id`, `level`, `approver_username`, `status`, `comments`, `approved_at`

3. **notifications**: Stores user notifications
   - `id`, `user_id`, `user_username`, `type`, `message`, `related_query_id`, `is_read`

4. **notification_preferences**: User notification settings
   - `user_id`, `email_enabled`, `query_submitted`, `query_approved`, `query_rejected`, etc.

### 4. API Endpoints

#### Approval Endpoints:
- `GET /api/approvals/pending` - Get pending approvals for current user
- `POST /api/approvals/:queryId/approve` - Approve a query
- `POST /api/approvals/:queryId/reject` - Reject a query
- `GET /api/queries/:queryId/approvals` - Get approval history for a query
- `GET /api/approvals/dashboard-stats` - Get approval statistics (admin only)

#### Notification Endpoints:
- `GET /api/notifications` - Get user's notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `GET /api/notifications/unread-count` - Get unread notification count
- `GET /api/notification-preferences` - Get user notification preferences
- `PUT /api/notification-preferences` - Update notification preferences

### 5. UI Components

#### New Pages:
1. **Approvals Dashboard** (`/approvals.html`)
   - Pending approvals list
   - Approval statistics
   - Approval action modals
   - Notification bell with unread count
   - Notification dropdown

### 6. Email Notifications (Currently Disabled)

**Status**: Email notifications are **disabled by default** but the infrastructure is in place.

To enable email notifications:
1. Set up an email service (SMTP configuration)
2. Update the `createNotification()` function to send emails based on user preferences
3. Configure notification preferences via the API or UI
4. Users can control email notifications in their preferences

**Notification Preference Fields:**
- `email_enabled`: Master switch for email notifications
- `query_submitted`: Notify when query is submitted
- `query_approved`: Notify when query is approved
- `query_rejected`: Notify when query is rejected
- `comment_added`: Notify when comment is added
- `status_changed`: Notify when status changes
- `assigned`: Notify when query is assigned
- `query_completed`: Notify when query is completed

## Usage

### For Approvers:
1. Navigate to **Approvals** page from the sidebar
2. View pending approvals in the list
3. Click **Approve** or **Reject** for each query
4. Add optional comments
5. Confirm the action

### For Users:
1. Submit a query through the normal process
2. Query will be set to "Pending Approval" status
3. In-app notifications will be created for:
   - Query submission confirmation
   - Approval/rejection notifications
   - Status updates
4. Check the notification bell icon for updates

### For Admins:
1. View approval statistics on the Approvals dashboard
2. Monitor approval times and rejection rates
3. Configure approval levels per project (via admin panel in future)
4. Manage notification preferences for all users

## Future Enhancements

1. **Auto-assignment by project**: Configure automatic approver assignment based on project
2. **Escalation**: Automatic escalation if approval times out
3. **Email integration**: Full email notification system
4. **Approval templates**: Predefined approval workflows
5. **Multi-approver requirements**: Require multiple approvers before moving to next level
6. **Approval delegation**: Allow approvers to delegate approvals

## Configuration Notes

- Email notifications are **disabled** by default (`email_enabled: false`)
- All in-app notifications are **enabled** by default
- Users can customize notification preferences via the API
- Approval levels are configured per project in the `approval_levels` table
- Each approval level has a configurable timeout (default: 48 hours)

## Testing

To test the approval system:
1. Submit a new query
2. Query status will be "Pending Approval"
3. Navigate to the Approvals page (as an approver)
4. Approve or reject the query
5. Check notifications for both submitter and approver
6. View approval history on the query detail page

## GitHub Integration

The approval system is now committed and pushed to:
**Repository**: https://github.com/issam15ie/query-tracker.git
**Branch**: main
