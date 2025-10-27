# Approval Levels Setup Guide

## Overview
This guide explains how to configure approval levels per project for the Query Tracker approval system.

## How to Configure Approval Levels

### Option 1: Using the Admin Panel (Recommended)

1. **Navigate to Admin Panel**:
   - Click on "Admin Panel" in the sidebar (admin only)
   - Or go to: `http://localhost:3000/admin.html`

2. **Select the `approval_levels` table**:
   - From the "Select Table" dropdown, choose `approval_levels`
   - Click "Add New Record"

3. **Fill in the approval level information**:
   - `project_id`: Select the project ID from the projects table (e.g., 1 for TABEE, 2 for DLP, 3 for SAP)
   - `level_number`: Sequential level number (1, 2, 3, etc.)
   - `approver_username`: The username who can approve at this level (e.g., `issam.eid`)
   - `timeout_hours`: Hours before auto-escalation (default: 48)
   - `requires_all`: 0 for "any one approver" or 1 for "all approvers required"

4. **Example Configuration**:
   ```
   For TABEE Project (Level 1 - Manager Approval):
   - project_id: 1
   - level_number: 1
   - approver_username: manager.username
   - timeout_hours: 24
   - requires_all: 0

   For TABEE Project (Level 2 - DBA Lead Approval):
   - project_id: 1
   - level_number: 2
   - approver_username: dba.lead.username
   - timeout_hours: 48
   - requires_all: 1
   ```

### Option 2: Using API (for bulk configuration)

#### Get all projects first:
```bash
# Get list of projects to find project IDs
curl -X GET "http://localhost:3000/api/projects" -H "x-session-id: YOUR_SESSION_ID"
```

#### Create approval level using API:
```bash
curl -X POST "http://localhost:3000/api/approval-levels" \
  -H "x-session-id: YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "level_number": 1,
    "approver_username": "issam.eid",
    "timeout_hours": 24,
    "requires_all": 0
  }'
```

### Option 3: Direct Database Insert (Advanced)

```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('queries.db'); db.run('INSERT INTO approval_levels (project_id, level_number, approver_username, timeout_hours, requires_all) VALUES (?, ?, ?, ?, ?)', [1, 1, 'issam.eid', 24, 0], (err) => { if (err) console.log('Error:', err.message); else console.log('Approval level created'); db.close(); });"
```

## Example Configurations

### Configuration 1: TABEE Project - 2 Level Approval

```sql
-- Level 1: Manager Approval
INSERT INTO approval_levels (project_id, level_number, approver_username, timeout_hours, requires_all)
VALUES (1, 1, 'manager.username', 24, 0);

-- Level 2: DBA Lead Approval
INSERT INTO approval_levels (project_id, level_number, approver_username, timeout_hours, requires_all)
VALUES (1, 2, 'dba.lead.username', 48, 1);
```

### Configuration 2: DLP Project - Single Level Approval

```sql
-- Level 1: DBA Approval
INSERT INTO approval_levels (project_id, level_number, approver_username, timeout_hours, requires_all)
VALUES (2, 1, 'issam.eid', 48, 0);
```

### Configuration 3: Global Approval (No specific project)

```sql
-- Global Level 1: Admin Approval
INSERT INTO approval_levels (project_id, level_number, approver_username, timeout_hours, requires_all)
VALUES (NULL, 1, 'admin.username', 24, 0);
```

## How Approval Levels Work

### Workflow Example:
1. User submits a query for TABEE project
2. System creates approval records:
   - Level 1 approval assigned to `manager.username` (timeout: 24 hours)
   - Level 2 approval assigned to `dba.lead.username` (timeout: 48 hours)
3. Manager approves at Level 1
4. DBA Lead approves at Level 2
5. Query status changes to "Approved"
6. Notifications sent to submitter

### Multi-Approver (requires_all = 1):
- If `requires_all` is set to 1, ALL approvers at that level must approve before moving to next level
- If `requires_all` is set to 0, ANY ONE approver can approve to move forward

## Testing

1. **Configure approval levels** using one of the methods above
2. **Submit a new query** with a project assigned
3. **Check Approvals page** - you should see pending approvals
4. **Approve at each level** - query moves to next level
5. **Check notifications** - submitter receives notifications at each stage

## Troubleshooting

### Issue: No pending approvals showing
- **Solution**: Check that:
  1. Approval levels are configured for the query's project
  2. Your username matches the `approver_username` in approval_levels table
  3. Query has the correct project assigned

### Issue: Approval levels not being created automatically
- **Solution**: Automatic approval record creation is a future feature. Currently, you need to manually create them or use the API.

### Issue: Query stuck in "Pending Approval" forever
- **Solution**: Check approval_levels table to ensure approvers are correctly assigned and active

## API Endpoints

- `GET /api/approval-levels` - List all approval levels (admin only)
- `GET /api/approval-levels/project/:projectId` - Get levels for a project
- `POST /api/approval-levels` - Create new approval level (admin only)
- `PUT /api/approval-levels/:id` - Update approval level (admin only)
- `DELETE /api/approval-levels/:id` - Delete approval level (admin only)

## Next Steps

After configuring approval levels:
1. Test with sample queries
2. Monitor approval times
3. Adjust timeout hours as needed
4. Consider enabling email notifications (optional)
