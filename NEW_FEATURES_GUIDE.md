# Query Tracker - New Features Guide

## Overview
This document describes the new features added to the Query Tracker application.

## 1. Query Status Tracking

### Features:
- **Status Field**: Each query now has a status that can be:
  - `Pending` (default) - Yellow badge
  - `In Progress` - Blue badge
  - `Completed` - Green badge
  - `Rejected` - Red badge
  - `On Hold` - Gray badge

- **Status Badges**: Color-coded badges displayed on each query card
- **Status Filtering**: Filter queries by status in the search section
- **Completion Tracking**: Automatically records `completed_at` timestamp when status changes to "Completed"

### API Endpoint:
```
PUT /api/queries/:id/status
Body: { "status": "Completed", "assigned_to": "username" }
```

## 2. Priority Levels

### Features:
- **Priority Field**: Each query has a priority level:
  - `Low` - Green badge
  - `Medium` (default) - Yellow badge
  - `High` - Red badge
  - `Critical` - Dark red with pulsing animation

- **Priority Badges**: Color-coded badges with visual indicators
- **Priority Filtering**: Filter queries by priority in the search section

## 3. Comments System

### Features:
- **Add Comments**: Users can add comments to any query
- **View Comments**: All comments are displayed chronologically
- **User Attribution**: Each comment shows who posted it and when
- **Audit Trail**: Comments are logged in the audit system

### API Endpoints:
```
GET /api/queries/:id/comments
POST /api/queries/:id/comments
Body: { "comment_text": "Your comment here" }
```

## 4. Dashboard & Statistics

### Features:
- **Total Queries**: Count of all queries in the system
- **Status Breakdown**: Distribution of queries by status
- **Priority Breakdown**: Distribution of queries by priority
- **User Activity**: Top 10 users by query count
- **Environment Distribution**: Queries by environment
- **Recent Activity**: Last 7 days of query submissions
- **Average Completion Time**: Average time to complete queries (in hours)

### API Endpoint:
```
GET /api/dashboard/stats
```

Returns comprehensive statistics in JSON format.

## 5. Direct Query Links

### Features:
- **Email Links**: Emails now include a direct link to the query
  - Format: `http://your-server:3000/?query=123`
- **Auto-Highlight**: Clicking the link will:
  - Scroll to the specific query
  - Highlight it with a yellow border and animation
  - Auto-expand if collapsed
- **URL Parameters**: Support for `?query=ID` parameter

### Usage:
When you send an email via Outlook, the recipient can click the "View Query" link to be taken directly to that query in the application.

## 6. Assignment Feature

### Features:
- **Assign Queries**: Queries can be assigned to specific users
- **Assignment Badge**: Shows who the query is assigned to
- **Status Update**: Assignment can be updated when changing status

## 7. Enhanced Search & Filtering

### New Filters:
- **Status Filter**: Dropdown to filter by query status
- **Priority Filter**: Dropdown to filter by priority level
- **Combined Filters**: All filters work together

### Search Capabilities:
- Full-text search in query content, users, and purposes
- Filter by schema, environment, status, and priority
- Results update in real-time

## 8. Database Schema Updates

### New Columns in `queries` table:
- `status` TEXT DEFAULT 'Pending'
- `priority` TEXT DEFAULT 'Medium'
- `assigned_to` TEXT DEFAULT NULL
- `completed_at` DATETIME DEFAULT NULL

### New `comments` table:
```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE
)
```

## 9. UI Enhancements

### Visual Improvements:
- **Status Badges**: Color-coded with icons
- **Priority Badges**: Visual hierarchy with animations for critical items
- **Query Highlighting**: Smooth scroll and highlight animation
- **Responsive Layout**: Better form organization

### Form Updates:
- Priority selector in add/edit forms
- Status selector in add/edit forms
- Better layout with grouped fields

## Usage Examples

### Adding a Query with Priority:
1. Fill in the query form
2. Select priority (Low, Medium, High, Critical)
3. Select initial status (usually Pending)
4. Submit

### Filtering Queries:
1. Go to the Search section
2. Select desired status from "All Statuses" dropdown
3. Select desired priority from "All Priorities" dropdown
4. Click Search

### Updating Query Status:
Use the API endpoint:
```javascript
fetch('/api/queries/123/status', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'In Progress',
    assigned_to: 'john.doe'
  })
})
```

### Adding a Comment:
Use the API endpoint:
```javascript
fetch('/api/queries/123/comments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    comment_text: 'Working on this query now'
  })
})
```

### Viewing Dashboard Stats:
```javascript
fetch('/api/dashboard/stats')
  .then(res => res.json())
  .then(stats => {
    console.log('Total queries:', stats.total);
    console.log('By status:', stats.byStatus);
    console.log('By priority:', stats.byPriority);
    console.log('Average completion time:', stats.avgCompletionTime, 'hours');
  })
```

## Migration Notes

- All existing queries will automatically get:
  - `status` = 'Pending'
  - `priority` = 'Medium'
  - `assigned_to` = NULL
  - `completed_at` = NULL

- The database migration happens automatically on server start
- No manual intervention required

## Future Enhancements (Not Yet Implemented)

The following features are planned but not yet implemented:
- Comments UI in the query cards
- Dashboard page with charts and graphs
- Email notifications on status changes
- Query templates
- Bulk operations
- Advanced analytics

## Technical Details

### Backend Changes:
- 3 new API endpoints
- Database schema migration
- Enhanced search functionality
- Audit logging for comments

### Frontend Changes:
- Updated query cards with badges
- New form fields
- Enhanced search filters
- URL parameter handling
- Highlight animations

### CSS Additions:
- Status badge styles
- Priority badge styles
- Highlight animation
- Responsive improvements

## Browser Compatibility

All features work on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance Considerations

- Database indexes on status and priority columns recommended for large datasets
- Comments are loaded on-demand per query
- Dashboard stats use optimized SQL queries
- Caching recommended for production deployments


