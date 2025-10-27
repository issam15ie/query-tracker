# Approval & Notification Features - Detailed Plan

## 🎯 Overview
Add professional approval workflow and notification system to ensure proper governance, compliance, and team communication.

---

## ✅ 1. APPROVAL WORKFLOW

### Feature: Multi-Level Approval System

#### A. Basic Approval (Single Level)
```
Query Submitted → Pending Approval → Approved/Rejected → Executed
```

**How It Works:**
- User submits query
- Query status = "Pending Approval"
- Admin/DBA receives notification
- Admin reviews and approves/rejects
- Query status changes to "Approved" or "Rejected"
- Notification sent to submitter

#### B. Advanced Approval (Multi-Level)
```
Query Submitted → Pending Tier 1 → Pending Tier 2 → Approved → Executed
```

**How It Works:**
- Tier 1: Direct Manager Approval
- Tier 2: Database Team Approval
- Tier 3: (Optional) DBA Lead Final Approval

**Configuration Options:**
- Configure approval levels per project
- Assign approvers per level
- Require all levels or "any one"
- Set timeout for approval (auto-reject after X hours)

---

### Features Details:

#### 1.1 **Approval Matrix**
```javascript
// Example Configuration
{
  project: "DLP",
  requiresApproval: true,
  levels: 2,
  level1: {
    approvers: ["manager.dba", "team.lead"],
    requireAll: false, // Any one can approve
    timeout: 24, // hours
  },
  level2: {
    approvers: ["dba.lead"],
    requireAll: true,
    timeout: 48,
  },
  emergencyBypass: ["super.admin"] // Can skip approval
}
```

#### 1.2 **Approval UI**
- "Approval Pending" badge on queries
- Show pending approval level
- Show current approvers
- Show approval timeline
- Approve/Reject buttons with comments

#### 1.3 **Approval History**
Track:
- Who approved at each level
- When approved
- Approval comments
- Rejection reasons

#### 1.4 **Auto-Assign Approvers**
- Based on project
- Based on query priority
- Based on schema
- Round-robin assignment

---

## 🔔 2. NOTIFICATION SYSTEM

### Email Notifications

#### 2.1 **Notification Types**

##### A. Query Submitted
```
To: [Approvers]
Subject: New Query #123 Awaiting Approval
Body: Query #123 was submitted by John Doe for DLP project
      Priority: High
      [View Query] [Approve] [Reject]
```

##### B. Query Approved
```
To: [Query Submitter]
Subject: Query #123 Approved
Body: Your query #123 has been approved by Jane Smith
      [View Query]
```

##### C. Query Rejected
```
To: [Query Submitter]
Subject: Query #123 Rejected
Body: Your query #123 was rejected by Jane Smith
      Reason: [Approval comment]
      [View Query] [Edit and Resubmit]
```

##### D. Comment Added
```
To: [Query Owner, Commenters]
Subject: New Comment on Query #123
Body: John Doe added a comment on query #123
      Comment: "Please check the WHERE clause"
      [View Query]
```

##### E. Status Changed
```
To: [Query Owner, Followers]
Subject: Query #123 Status Changed
Body: Query #123 status changed from "Pending" to "In Progress"
      By: Jane Smith
      [View Query]
```

##### F. Query Assigned
```
To: [Assigned User]
Subject: Query #123 Assigned to You
Body: Query #123 has been assigned to you for execution
      Priority: High
      Due: [Date]
      [View Query]
```

##### G. Query Completed
```
To: [Query Owner, Project Team]
Subject: Query #123 Completed
Body: Query #123 has been marked as completed
      Executed by: Jane Smith
      Execution time: 2.3 seconds
      [View Query]
```

#### 2.2 **Notification Preferences**

Users can configure:
```javascript
{
  querySubmitted: true,
  queryApproved: true,
  queryRejected: true,
  commentAdded: {
    myQueries: true,
    queriesIFollow: true,
    allQueries: false
  },
  statusChanged: {
    myQueries: true,
    assignedToMe: true
  },
  assignedToMe: true,
  queryCompleted: {
    myQueries: true,
    projectQueries: true
  },
  digestMode: false, // Daily summary vs instant
  digestTime: "09:00"
}
```

#### 2.3 **Notification Frequency**
- **Instant**: Email immediately
- **Digest**: One email per day with all updates
- **Summary**: One email per week
- **Off**: No emails

---

## 📊 3. APPROVAL DASHBOARD

### For Approvers:
```
┌─────────────────────────────────────────┐
│  Pending Approvals (5)                   │
├─────────────────────────────────────────┤
│  Query #123                              │
│  Priority: High | Tabee Project         │
│  Submitted by: John Doe                  │
│  Submitted: 2 hours ago                  │
│  [Approve] [Reject] [View Details]      │
├─────────────────────────────────────────┤
│  Query #124                              │
│  Priority: Medium | DLP Project         │
│  Submitted by: Jane Smith                │
│  Submitted: 5 hours ago                  │
│  [Approve] [Reject] [View Details]      │
└─────────────────────────────────────────┘
```

### For Submitters:
```
┌─────────────────────────────────────────┐
│  My Pending Approvals (2)                │
├─────────────────────────────────────────┤
│  Query #123 - Pending Approval           │
│  Level 1: Waiting for Manager            │
│  Assigned to: John Manager               │
│  Submitted: 2 hours ago                  │
├─────────────────────────────────────────┤
│  Query #124 - Approved                   │
│  Approved by: DBA Team                   │
│  Ready to execute                        │
└─────────────────────────────────────────┘
```

---

## 🎨 4. UI ENHANCEMENTS

### A. Query Cards
- Show approval status badge
- Show "Pending Approval" indicator
- Show approver list
- Show approval timeline

### B. Approval Modal
```html
Approve Query #123?
[Yes, Approve] [Reject] [Add Comment]

Comments (optional):
____________________________________

[Cancel]
```

### C. Rejection Modal
```html
Reject Query #123?
Reason (required):
☐ Incorrect syntax
☐ Missing information
☐ Security concern
☐ Out of scope
☐ Other: ______________

Additional comments:
____________________________________

[Cancel] [Confirm Rejection]
```

---

## 📈 5. APPROVAL METRICS & REPORTS

### Dashboard Widgets:
- Average approval time
- Pending approvals count
- Approval rate by user
- Average time to approval by level
- Rejection rate
- Most common rejection reasons

### Reports:
- Approval audit trail
- User approval history
- Approval bottlenecks
- SLA compliance (approval within X hours)

---

## ⚙️ 6. IMPLEMENTATION PHASES

### Phase 1: Basic Approval (Week 1)
- ✅ Single-level approval
- ✅ Basic notifications (email)
- ✅ Approve/Reject UI
- ✅ Approval history

### Phase 2: Notification System (Week 2)
- ✅ Email notification system
- ✅ Notification preferences
- ✅ Email templates
- ✅ Notification center in UI

### Phase 3: Multi-Level Approval (Week 3)
- ✅ Multi-level workflow configuration
- ✅ Approval chain tracking
- ✅ Conditional routing

### Phase 4: Advanced Features (Week 4)
- ✅ Auto-assignment
- ✅ Timeout and escalation
- ✅ Approval dashboard
- ✅ Analytics and reporting

---

## 🔧 7. DATABASE SCHEMA ADDITIONS

### New Tables:

#### `approval_levels`
```sql
CREATE TABLE approval_levels (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  level_number INTEGER,
  approver_role TEXT,
  requires_all BOOLEAN,
  timeout_hours INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### `query_approvals`
```sql
CREATE TABLE query_approvals (
  id INTEGER PRIMARY KEY,
  query_id INTEGER,
  level INTEGER,
  approver_username TEXT,
  status TEXT, -- 'pending', 'approved', 'rejected'
  comments TEXT,
  approved_at DATETIME,
  FOREIGN KEY (query_id) REFERENCES queries(id)
);
```

#### `notification_preferences`
```sql
CREATE TABLE notification_preferences (
  user_id INTEGER PRIMARY KEY,
  query_submitted BOOLEAN,
  query_approved BOOLEAN,
  query_rejected BOOLEAN,
  comment_added BOOLEAN,
  status_changed BOOLEAN,
  assigned BOOLEAN,
  query_completed BOOLEAN,
  digest_mode BOOLEAN,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### `notifications`
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  type TEXT,
  message TEXT,
  related_query_id INTEGER,
  is_read BOOLEAN,
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🚀 QUICK START

I can implement:
1. **Basic Approval System** (2-3 hours)
2. **Email Notifications** (2-3 hours)
3. **Approval Dashboard** (2-3 hours)

**Total: ~8-9 hours for complete approval & notification system**

---

## 💡 Benefits

✅ **Governance**: Proper approval process
✅ **Accountability**: Know who approved what and when
✅ **Communication**: Stay informed of all changes
✅ **Compliance**: Audit trail for approvals
✅ **Productivity**: Automated notifications
✅ **Quality**: Review before execution

---

Would you like me to start implementing these features?
