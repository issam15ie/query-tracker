# Profile Settings & Permissions Management Guide

## Overview
The Profile Settings page allows users to view their account information and permissions. Administrators can also manage all users' permissions from this page.

## Accessing Profile Settings

### For All Users
1. Log in to the application
2. Click the **"Profile Settings"** button in the header (next to the Logout button)
3. You will be redirected to the Profile Settings page

## Features

### 1. My Information Section
Displays your account details:
- **Username**: Your login username
- **Full Name**: Your display name
- **Email**: Your email address (if provided)
- **Role**: Your role (USER or ADMIN)

### 2. My Permissions Section
Shows what actions you're allowed to perform:
- **Edit Other Users' Queries**: Whether you can edit queries created by other users
- **Delete Other Users' Queries**: Whether you can delete queries created by other users
- **Register New Users**: Whether you can register new users

### 3. User Management Section (Admin Only)
Only visible to administrators. Shows a table of all users with:
- Username
- Full Name
- Role (User/Admin)
- Permissions (Edit Others, Delete Others, Register Users)
- Account Status (Active/Inactive)
- Actions (Edit button)

## Managing User Permissions (Admin Only)

### To Edit a User's Permissions:
1. Navigate to Profile Settings
2. Scroll down to the "User Management" section
3. Click the **Edit** icon (pencil) next to the user you want to modify
4. A modal will open where you can:
   - Change the user's role (User/Admin)
   - Toggle permissions:
     - Can edit other users' queries
     - Can delete other users' queries
     - Can register new users
   - Activate/Deactivate the account
5. Click **"Save Changes"** to apply

### Permission Effects:

#### Role: Admin
- Has full access to all features
- Can view and manage all users
- Can edit/delete any query
- Can register new users
- Permissions checkboxes are additional (admin already has all permissions)

#### Role: User
- Can only edit/delete their own queries by default
- Permissions can be granted individually:
  - **Edit Others**: Allows editing queries created by other users
  - **Delete Others**: Allows deleting queries created by other users
  - **Register Users**: Allows accessing the user registration page

#### Account Status
- **Active**: User can log in and use the application
- **Inactive**: User cannot log in (useful for temporarily disabling accounts)

## API Endpoints

### For All Authenticated Users:
- `GET /api/auth/current-user` - Get current user information

### For Admins Only:
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user details
- `PUT /api/users/:id/permissions` - Update user permissions

## Security Notes

1. Only administrators can view the User Management section
2. All permission changes are logged
3. Users cannot modify their own permissions
4. Inactive accounts are automatically blocked from logging in
5. All API endpoints are protected with session authentication

## Navigation

- **Back to Queries**: Click the "Back to Queries" button in the header to return to the main application
- The profile page is accessible at: `http://your-server:3000/profile.html`

## Current Users

As of setup, the following users exist:
- **issam.eid** (Admin) - Full permissions
- **ruba.alshamrani** (User) - Standard permissions
- **akbar.khan** (User) - Standard permissions
- **safa.boumaiza** (User) - Standard permissions

All users have the default password: `admin`

## Troubleshooting

### "Permission denied" error
- Make sure you're logged in as an admin to access user management
- Regular users can only view their own information

### Changes not appearing
- Refresh the page after making changes
- Check the browser console for any errors

### Can't access profile page
- Ensure you're logged in
- Clear browser cache and try again
- Check that the server is running

## Future Enhancements

Potential improvements for the permissions system:
1. Password change functionality
2. Email notifications for permission changes
3. Audit log viewer for permission changes
4. Bulk user management
5. Role templates/presets
6. Custom permission groups


