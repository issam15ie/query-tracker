# MOC Query Tracker - Authentication Guide

## Overview
The Query Tracker now includes a complete user authentication system with login and user registration capabilities.

## Features

### 1. User Authentication
- **Secure Login**: Users must log in with username and password
- **Password Hashing**: Passwords are hashed using SHA-256 for security
- **Session Management**: User sessions are maintained across page refreshes
- **Automatic Logout**: Sessions expire when user logs out

### 2. User Registration
- **Self-Service Registration**: New users can create their own accounts
- **Required Fields**:
  - Username (unique)
  - Full Name
  - Password (minimum 6 characters)
- **Optional Fields**:
  - Email address

### 3. Audit Logging
- **Automatic Tracking**: All insert/edit/delete operations are logged
- **User Attribution**: Queries are automatically attributed to the logged-in user
- **IP Address Tracking**: Client IP addresses are captured for all operations
- **Audit Log Fields**:
  - Operation type (INSERT/UPDATE/DELETE)
  - Table name
  - Record ID
  - Old values (for updates/deletes)
  - New values (for inserts/updates)
  - Username
  - IP address
  - Timestamp

## How to Use

### First Time Setup

1. **Start the Server**:
   ```bash
   npm start
   ```

2. **Create First User**:
   - Navigate to: `http://localhost:3000/register.html`
   - Fill in the registration form:
     - Username: `issam`
     - Full Name: `Issam Eid`
     - Password: (choose a secure password)
   - Click "Create Account"

3. **Login**:
   - You'll be redirected to the login page
   - Enter your username and password
   - Click "Login"

### Daily Usage

1. **Access the Application**:
   - Navigate to: `http://localhost:3000`
   - If not logged in, you'll be redirected to the login page

2. **Login**:
   - Enter your username and password
   - Your session will be saved

3. **Use the Application**:
   - Add queries (automatically attributed to your user)
   - Edit queries (your username will be recorded in audit log)
   - Delete queries (tracked in audit log)

4. **Logout**:
   - Click the "Logout" button in the top right
   - You'll be redirected to the login page

### Creating Additional Users

1. **From Login Page**:
   - Click "Create Account" link
   - Fill in the registration form
   - Click "Create Account"

2. **Recommended Users to Create**:
   - issam
   - akbar
   - safa
   - ruba

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/current-user` - Get current user info

### Queries (All require authentication)
- `GET /api/queries` - Get all queries
- `POST /api/queries` - Add new query
- `POST /api/queries/:id/edit` - Edit query
- `DELETE /api/queries/:id` - Delete query

### Audit Log
- `GET /api/audit-log` - View audit log (last 100 entries)

## Database Tables

### users
- `id` - Primary key
- `username` - Unique username
- `password` - Hashed password
- `full_name` - User's full name
- `email` - Optional email
- `role` - User role (default: 'user')
- `created_at` - Account creation timestamp
- `created_by` - Who created the account
- `is_active` - Account status

### audit_log
- `id` - Primary key
- `operation_type` - INSERT/UPDATE/DELETE
- `table_name` - queries
- `record_id` - Query ID
- `old_values` - JSON of previous values
- `new_values` - JSON of new values
- `user_name` - Who performed the action
- `ip_address` - Client IP address
- `timestamp` - When the action occurred

## Security Features

1. **Password Hashing**: All passwords are hashed before storage
2. **Session-Based Authentication**: Secure session management
3. **Protected API Routes**: All query operations require authentication
4. **Automatic Session Expiry**: Sessions are cleared on logout
5. **IP Address Logging**: All operations are logged with client IP

## Network Access

The application is accessible on your network at:
- Local: `http://localhost:3000`
- Network: `http://10.10.44.224:3000` (or your server's IP)

Team members can:
1. Access the application via network IP
2. Create their own accounts
3. Login and use the system
4. All operations will be tracked with their username and IP address

## Troubleshooting

### Can't Login
- Verify username and password are correct
- Check that the account is active
- Try creating a new account

### Session Expired
- Simply login again
- Sessions are maintained until logout

### Forgot Password
- Currently, passwords cannot be reset
- Contact administrator to create a new account

## Admin Tasks

### View Audit Log
```bash
# Using curl
curl http://localhost:3000/api/audit-log

# Using PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/audit-log"
```

### View Users
```bash
# Using sqlite3 (if installed)
sqlite3 queries.db "SELECT * FROM users;"

# Using Node.js
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.all('SELECT id, username, full_name, email, role, created_at FROM users', (err, rows) => { console.table(rows); db.close(); });"
```

### Deactivate User
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.run('UPDATE users SET is_active = 0 WHERE username = ?', ['username_here'], (err) => { console.log(err ? 'Error' : 'User deactivated'); db.close(); });"
```

## Notes

- All queries are now automatically attributed to the logged-in user
- The user dropdown has been removed from insert/edit forms
- Audit logging captures all operations with user and IP information
- Sessions are stored in memory and will be cleared on server restart


