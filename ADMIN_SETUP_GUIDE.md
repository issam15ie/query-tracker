# Admin Setup Guide - MOC Query Tracker

## 🔐 Registration Key Protection

The registration page is now protected with a **secret registration key** to prevent unauthorized account creation.

### Registration Key
```
moc-db-team-2025
```

**IMPORTANT**: This key is required to create new user accounts. Keep it confidential and only share it with authorized team members.

### Changing the Registration Key

To change the registration key, edit `server.js` line 414:

```javascript
const REGISTRATION_SECRET = 'your-new-secret-key-here';
```

Then restart the server.

## 👥 Creating User Accounts

### Method 1: Using the Registration Page

1. **Access the registration page**:
   ```
   http://localhost:3000/register.html
   OR
   http://10.10.44.224:3000/register.html
   ```

2. **Fill in the form**:
   - **Registration Key**: `moc-db-team-2025`
   - **Username**: (e.g., `issam`, `akbar`, `safa`, `ruba`)
   - **Full Name**: (e.g., `Issam Eid`)
   - **Email**: (optional)
   - **Password**: (minimum 6 characters)
   - **Confirm Password**: (must match)

3. **Click "Create Account"**

4. **Login** with the new credentials

### Method 2: Direct API Call (for bulk creation)

```bash
# Using PowerShell
$body = @{
    registration_key = "moc-db-team-2025"
    username = "issam"
    full_name = "Issam Eid"
    email = "issam@example.com"
    password = "secure_password"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

### Method 3: Direct Database Insert (advanced)

```bash
node -e "const sqlite3 = require('sqlite3'); const crypto = require('crypto'); const db = new sqlite3.Database('queries.db'); const username = 'issam'; const password = 'your_password'; const full_name = 'Issam Eid'; const hashedPassword = crypto.createHash('sha256').update(password).digest('hex'); db.run('INSERT INTO users (username, password, full_name, created_by) VALUES (?, ?, ?, ?)', [username, hashedPassword, full_name, 'admin'], (err) => { console.log(err ? 'Error: ' + err.message : 'User created successfully'); db.close(); });"
```

## 🚀 Initial Setup Steps

### 1. Start the Server
```bash
npm start
```

### 2. Create Admin Account
```bash
# Access registration page
http://localhost:3000/register.html

# Enter:
Registration Key: moc-db-team-2025
Username: admin
Full Name: Administrator
Password: (choose a strong password)
```

### 3. Create Team Member Accounts

Create accounts for your team:
- **issam** - Issam Eid
- **akbar** - Akbar (Full Name)
- **safa** - Safa (Full Name)
- **ruba** - Ruba (Full Name)

### 4. Share Login URL with Team

Give your team members:
- **Login URL**: `http://10.10.44.224:3000/login.html`
- **Their username and password**

**DO NOT** share the registration URL or registration key with regular users.

## 🔒 Security Best Practices

### 1. Registration Key
- ✅ Keep the registration key confidential
- ✅ Only share with trusted administrators
- ✅ Change it periodically
- ✅ Use a strong, unique key

### 2. Registration URL
- ✅ Don't link to `/register.html` from the login page
- ✅ Only share the registration URL with authorized personnel
- ✅ Consider using a more obscure URL (rename the file)

### 3. Password Policy
- ✅ Minimum 6 characters (enforced)
- ✅ Recommend using strong passwords
- ✅ Passwords are hashed with SHA-256

### 4. User Management
- ✅ Regularly review user accounts
- ✅ Deactivate unused accounts
- ✅ Monitor audit logs for suspicious activity

## 📊 Managing Users

### View All Users
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); db.all('SELECT id, username, full_name, email, role, created_at, is_active FROM users', (err, rows) => { console.table(rows); db.close(); });"
```

### Deactivate a User
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); const username = 'username_to_deactivate'; db.run('UPDATE users SET is_active = 0 WHERE username = ?', [username], (err) => { console.log(err ? 'Error' : 'User deactivated'); db.close(); });"
```

### Reactivate a User
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('queries.db'); const username = 'username_to_reactivate'; db.run('UPDATE users SET is_active = 1 WHERE username = ?', [username], (err) => { console.log(err ? 'Error' : 'User reactivated'); db.close(); });"
```

### Reset User Password
```bash
node -e "const sqlite3 = require('sqlite3'); const crypto = require('crypto'); const db = new sqlite3.Database('queries.db'); const username = 'username_here'; const newPassword = 'new_password'; const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex'); db.run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username], (err) => { console.log(err ? 'Error' : 'Password reset successfully'); db.close(); });"
```

## 🎯 User Instructions (to share with team)

### For Team Members

1. **Access the application**:
   ```
   http://10.10.44.224:3000
   ```

2. **Login** with your provided credentials

3. **Use the application**:
   - Add queries (automatically tracked with your username)
   - Edit queries (tracked in audit log)
   - All your actions are logged with your username and IP address

4. **Logout** when done

### If You Forget Your Password
- Contact the administrator to reset your password
- Self-service password reset is not available

## 📝 Notes

- **Registration Key**: `moc-db-team-2025` (keep confidential)
- **Registration URL**: `http://10.10.44.224:3000/register.html` (admin only)
- **Login URL**: `http://10.10.44.224:3000/login.html` (share with team)
- **Main App URL**: `http://10.10.44.224:3000` (redirects to login if not authenticated)

## 🔧 Troubleshooting

### Users Can't Login
1. Verify the account exists and is active
2. Check if password is correct
3. Review server logs for errors
4. Try creating a test account

### Registration Key Not Working
1. Verify you're using the correct key: `moc-db-team-2025`
2. Check for typos or extra spaces
3. Verify the server is running the latest code

### Need to Change Registration Key
1. Edit `server.js` line 414
2. Change `const REGISTRATION_SECRET = 'moc-db-team-2025';`
3. Restart the server
4. Update this documentation

## 📞 Support

For issues or questions:
1. Check server logs: Look at the terminal where `npm start` is running
2. Check audit logs: `http://localhost:3000/api/audit-log`
3. Review database: Use the commands in "Managing Users" section


