# Testing Guide - New Features

## How to Test the New Features in the Application

### 1. Dashboard Permission (✅ READY TO TEST)

**What it is:** A new permission that controls who can view the dashboard statistics.

**How to test:**

1. **Login as admin** (`issam.eid` / `admin`)
2. **Go to Profile Settings** (click your name in the header)
3. **Scroll to "My Permissions"** section
4. You should see a new permission: **"View Dashboard: Yes"** (admins have it by default)
5. **Scroll to "User Management"** section (admin only)
6. You'll see a new column: **"View Dashboard"**
7. **Click Edit** on any user
8. You'll see a new checkbox: **"Can view dashboard"**
9. **Check the box** for a user and save
10. **Logout and login as that user** to test dashboard access

**API Test:**
```javascript
// In browser console after login
fetch('/api/dashboard/stats', {
    headers: { 'x-session-id': localStorage.getItem('sessionId') }
})
.then(r => r.json())
.then(data => console.log('Dashboard Stats:', data));
```

**Expected Result:**
- ✅ Admin users: Can always access dashboard
- ✅ Users with permission: Can access dashboard
- ❌ Users without permission: Get 403 Forbidden error

---

### 2. Comments System (✅ API READY, UI PENDING)

**What it is:** Ability to add and view comments on queries for team collaboration.

**Current Status:** Backend API is ready, but UI is not yet added to the query cards.

**How to test (via API):**

```javascript
// In browser console
const sessionId = localStorage.getItem('sessionId');

// Add a comment to query #64 (change to your query ID)
fetch('/api/queries/64/comments', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
    },
    body: JSON.stringify({
        comment_text: 'This query needs to be reviewed by the team'
    })
})
.then(r => r.json())
.then(data => console.log('Comment added:', data));

// Get all comments for query #64
fetch('/api/queries/64/comments', {
    headers: { 'x-session-id': sessionId }
})
.then(r => r.json())
.then(comments => console.log('Comments:', comments));
```

**What's Missing:** 
- UI component to show comments below each query
- Text box to add new comments
- Comment list with timestamps and usernames

---

### 3. Database Schema Updates (✅ VISIBLE IN APP)

**What it is:** New columns added to track status, priority, assignment, and completion.

**How to see it:**

1. **Login to the application**
2. **Look at any query card** - you'll see:
   - **Status Badge** (yellow for Pending, blue for In Progress, etc.)
   - **Priority Badge** (yellow for Medium, red for High, etc.)
   - **Assigned Badge** (if query is assigned to someone)

3. **Add a new query:**
   - You'll see **Priority** dropdown (Low, Medium, High, Critical)
   - You'll see **Status** dropdown (Pending, In Progress, etc.)

4. **Use the search filters:**
   - Select a **Status** from dropdown
   - Select a **Priority** from dropdown
   - Click Search

5. **Check database info:**
   - Open: `http://10.10.44.224:3000/api/db-info`
   - You'll see columns: `status`, `priority`, `assigned_to`, `completed_at`

**Visual Indicators:**
- ✅ **Status Pending** = Yellow badge
- ✅ **Status In Progress** = Blue badge  
- ✅ **Status Completed** = Green badge
- ✅ **Status Rejected** = Red badge
- ✅ **Status On Hold** = Gray badge
- ✅ **Priority Critical** = Red badge with pulsing animation!

---

### 4. Status & Priority Filtering (✅ WORKING)

**How to test:**

1. **Go to Search section**
2. **Select "Pending" from Status dropdown**
3. **Click Search**
4. You should see only queries with "Pending" status
5. **Select "High" from Priority dropdown**
6. **Click Search**
7. You should see only queries that are both Pending AND High priority

---

### 5. Direct Query Links in Email (✅ WORKING)

**How to test:**

1. **Click "Send via Outlook" on any query**
2. **Look at the email body** - you'll see:
   ```
   View Query: http://10.10.44.224:3000/?query=64
   ```
3. **Copy that link**
4. **Open it in a new browser tab**
5. **Watch the magic:**
   - Page loads
   - Scrolls to that specific query
   - Highlights it with yellow border
   - Pulses with animation
   - Auto-expands if collapsed

---

## Quick Test Checklist

### ✅ Features You Can Test NOW:

- [x] **Dashboard Permission** - Go to Profile Settings → See new permission
- [x] **Status Badges** - Look at query cards → See colored status badges
- [x] **Priority Badges** - Look at query cards → See priority indicators
- [x] **Status Filter** - Search section → Select status → Click Search
- [x] **Priority Filter** - Search section → Select priority → Click Search
- [x] **Add Query with Priority** - Add new query → Select priority/status
- [x] **Email Query Link** - Send email → Copy link → Open in new tab → Watch highlight
- [x] **Database Schema** - Visit `/api/db-info` → See new columns

### 🔄 Features with API Only (No UI Yet):

- [ ] **Comments System** - Use browser console to test API
- [ ] **Dashboard Page** - Use `/api/dashboard/stats` to see data

---

## How to Enable Dashboard Permission for a User

1. **Login as admin** (`issam.eid` / `admin`)
2. **Go to Profile Settings**
3. **Scroll to "User Management"**
4. **Find the user** you want to give permission to
5. **Click Edit** (pencil icon)
6. **Check "Can view dashboard"**
7. **Click "Save Changes"**
8. **Done!** That user can now access dashboard stats

---

## Testing Dashboard API

```javascript
// Complete test script
async function testDashboard() {
    const sessionId = localStorage.getItem('sessionId');
    
    const response = await fetch('/api/dashboard/stats', {
        headers: { 'x-session-id': sessionId }
    });
    
    if (response.status === 403) {
        console.log('❌ No permission to view dashboard');
        console.log('Ask admin to enable "View Dashboard" permission');
        return;
    }
    
    const stats = await response.json();
    
    console.log('📊 DASHBOARD STATISTICS:');
    console.log('========================');
    console.log('Total Queries:', stats.total);
    console.log('\n📈 By Status:');
    stats.byStatus.forEach(s => console.log(`  ${s.status}: ${s.count}`));
    console.log('\n⚡ By Priority:');
    stats.byPriority.forEach(p => console.log(`  ${p.priority}: ${p.count}`));
    console.log('\n👥 Top Users:');
    stats.byUser.forEach(u => console.log(`  ${u.user_name}: ${u.count} queries`));
    console.log('\n🌍 By Environment:');
    stats.byEnvironment.forEach(e => console.log(`  ${e.environment}: ${e.count}`));
    console.log('\n⏱️ Average Completion Time:', stats.avgCompletionTime, 'hours');
}

// Run the test
testDashboard();
```

---

## What's Next?

The following features are **ready on the backend** but need **UI components**:

1. **Comments UI** - Add a comments section below each query card
2. **Dashboard Page** - Create a visual dashboard with charts and graphs

Would you like me to implement these UI components now?


