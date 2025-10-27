# MOC Query Tracker - Permissions & Access Control Guide

## 🔐 Role-Based Access Control (RBAC) System

The Query Tracker now includes a comprehensive permissions system that controls what users can do.

## 👥 User Roles

### Admin Role
- **Full access** to all features
- Can edit ANY query (created by anyone)
- Can delete ANY query (created by anyone)
- Can register new users
- **Current Admin**: `issam.eid`

### User Role (Regular Users)
- Can create queries
- Can edit ONLY their own queries
- Can delete ONLY their own queries
- Cannot register new users
- **Current Users**: `ruba.alshamrani`, `akbar.khan`, `safa.boumaiza`

## 🎯 Permissions System

### Three Main Permissions

1. **Can Edit Others** (`can_edit_others`)
   - Allows editing queries created by other users
   - Admin role has this by default

2. **Can Delete Others** (`can_delete_others`)
   - Allows deleting queries created by other users
   - Admin role has this by default

3. **Can Register Users** (`can_register_users`)
   - Allows registering new users without registration key
   - Admin role has this by default

## 📊 Current User Permissions

| Username | Role | Edit Others | Delete Others | Register Users |
|----------|------|-------------|---------------|----------------|
| `issam.eid` | **admin** | ✅ Yes | ✅ Yes | ✅ Yes |
| `ruba.alshamrani` | user | ❌ No | ❌ No | ❌ No |
| `akbar.khan` | user | ❌ No | ❌ No | ❌ No |
| `safa.boumaiza` | user | ❌ No | ❌ No | ❌ No |

## 🛡️ Access Control Rules

### Creating Queries
- ✅ **All users** can create queries
- Queries are automatically attributed to the logged-in user

### Viewing Queries
- ✅ **All users** can view all queries
- ✅ **All users** can view query history
- ✅ **All users** can send queries via Outlook

### Editing Queries
- ✅ **Users** can edit their own queries
- ✅ **Admin** can edit ANY query
- ✅ **Users with `can_edit_others` permission** can edit any query
- ❌ **Regular users** CANNOT edit others' queries

### Deleting Queries
- ✅ **Users** can delete their own queries
- ✅ **Admin** can delete ANY query
- ✅ **Users with `can_delete_others` permission** can delete any query
- ❌ **Regular users** CANNOT delete others' queries

### Registering Users
- ✅ **Admin** can register users
- ✅ **Users with `can_register_users` permission** can register users
- ✅ **Anyone with registration key** can register users
- ❌ **Regular users** cannot register without the key

## 🔧 Managing Permissions

### View All Users with Permissions
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.all('SELECT username, role, can_edit_others, can_delete_others, can_register_users, is_active FROM users', (err, rows) => { console.table(rows); db.close(); });"
```

### Make a User Admin
```bash
# Example: Make ruba.alshamrani an admin
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET role = ?, can_edit_others = 1, can_delete_others = 1, can_register_users = 1 WHERE username = ?', ['admin', 'ruba.alshamrani'], (err) => { console.log(err ? 'Error' : 'User updated to admin'); db.close(); });"
```

### Grant Specific Permission
```bash
# Grant "can_edit_others" permission to a user
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET can_edit_others = 1 WHERE username = ?', ['akbar.khan'], (err) => { console.log(err ? 'Error' : 'Permission granted'); db.close(); });"

# Grant "can_delete_others" permission
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET can_delete_others = 1 WHERE username = ?', ['safa.boumaiza'], (err) => { console.log(err ? 'Error' : 'Permission granted'); db.close(); });"

# Grant "can_register_users" permission
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET can_register_users = 1 WHERE username = ?', ['ruba.alshamrani'], (err) => { console.log(err ? 'Error' : 'Permission granted'); db.close(); });"
```

### Revoke Specific Permission
```bash
# Revoke "can_edit_others" permission
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET can_edit_others = 0 WHERE username = ?', ['akbar.khan'], (err) => { console.log(err ? 'Error' : 'Permission revoked'); db.close(); });"
```

### Demote Admin to Regular User
```bash
# Example: Demote a user from admin to regular user
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET role = ?, can_edit_others = 0, can_delete_others = 0, can_register_users = 0 WHERE username = ?', ['user', 'username_here'], (err) => { console.log(err ? 'Error' : 'User demoted to regular user'); db.close(); });"
```

## 🎨 Frontend Behavior

### Button Visibility
- **Edit button**: Only shown if user owns the query OR has edit permission
- **Delete button**: Only shown if user owns the query OR has delete permission
- **History button**: Always shown to all users
- **Send via Outlook button**: Always shown to all users

### Permission Denied Messages
When a user tries to edit/delete a query they don't have permission for:
- **Frontend**: Buttons are hidden (user won't see them)
- **Backend**: Returns 403 Forbidden with message "Permission denied"

## 📝 Use Cases

### Scenario 1: Regular User (ruba.alshamrani)
- ✅ Can create queries
- ✅ Can edit her own queries
- ✅ Can delete her own queries
- ❌ Cannot edit akbar's queries
- ❌ Cannot delete safa's queries
- ❌ Cannot register new users

### Scenario 2: Admin (issam.eid)
- ✅ Can create queries
- ✅ Can edit ANY query (his own + others')
- ✅ Can delete ANY query (his own + others')
- ✅ Can register new users
- ✅ Full system access

### Scenario 3: User with Edit Permission
```bash
# Grant akbar.khan permission to edit others' queries
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET can_edit_others = 1 WHERE username = ?', ['akbar.khan'], (err) => { console.log(err ? 'Error' : 'Permission granted'); db.close(); });"
```
After this:
- ✅ Can edit ANY query
- ❌ Still cannot delete others' queries (unless granted)
- ❌ Still cannot register users (unless granted)

## 🔒 Security Features

### Database Level
- Permissions stored in users table
- Checked on every edit/delete operation
- Audit log records all permission-denied attempts

### Backend Level
- Middleware checks authentication
- Permission checks before edit/delete
- Returns 403 Forbidden if unauthorized

### Frontend Level
- Buttons hidden based on permissions
- Better user experience
- Prevents confusion

## 🚨 Important Notes

1. **Admin Role**: Always has all permissions, regardless of individual permission flags
2. **Owner Check**: Users can always edit/delete their own queries
3. **Registration Key**: Still works for anyone, even without `can_register_users` permission
4. **Session-Based**: Permissions are loaded at login and stored in session
5. **Re-login Required**: After changing permissions, user must logout and login again

## 📞 Common Tasks

### Check User Permissions
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.get('SELECT username, role, can_edit_others, can_delete_others, can_register_users FROM users WHERE username = ?', ['issam.eid'], (err, row) => { console.table([row]); db.close(); });"
```

### List All Admins
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.all('SELECT username, full_name FROM users WHERE role = ?', ['admin'], (err, rows) => { console.table(rows); db.close(); });"
```

### List Users with Special Permissions
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.all('SELECT username, full_name, can_edit_others, can_delete_others, can_register_users FROM users WHERE can_edit_others = 1 OR can_delete_others = 1 OR can_register_users = 1', (err, rows) => { console.table(rows); db.close(); });"
```

## 🎯 Best Practices

1. **Limit Admin Accounts**: Only give admin role to trusted users
2. **Grant Specific Permissions**: Instead of making someone admin, grant only needed permissions
3. **Regular Audits**: Review user permissions regularly
4. **Audit Log**: Monitor the audit_log table for permission-denied attempts
5. **User Training**: Inform users about what they can and cannot do

## 📊 Audit Logging

All permission-denied attempts are logged:
- Check server logs for: `Permission denied: username tried to edit/delete query by owner`
- Review audit_log table for all operations
- Monitor for suspicious activity

## 🔄 Migration Notes

- Existing users: All set to role='user' with no special permissions
- issam.eid: Updated to role='admin' with all permissions
- New columns added: `can_edit_others`, `can_delete_others`, `can_register_users`
- Backward compatible: Old queries still work, just with new permission checks


