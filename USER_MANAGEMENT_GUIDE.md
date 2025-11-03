# User Management System - Complete Guide

## Overview
The Money Collection app now has a complete User Management system where admins can add, edit, and manage users directly from the app without rebuilding!

## Features Implemented

### For Admins:
- View all users with their roles and status
- Add new users (username, password, display name, role)
- Edit existing users (change password, name, role)
- Deactivate users (they cannot login but data is preserved)
- Reactivate deactivated users
- Search users by name or username
- One-click initialization of default users
- Cannot deactivate your own account (safety feature)

### For Login:
- Fetches users from Firestore (not hardcoded)
- Checks if user is active before allowing login
- Shows appropriate error messages
- Works offline after first fetch (Firestore caching)

## Firestore Structure

users (collection)
  - anil (document ID = username)
      - password: "anil123"
      - role: "admin"
      - displayName: "Anil"
      - isActive: true
      - createdAt: timestamp
      - updatedAt: timestamp

## How to Use

### First Time Setup:
1. Login as Admin (use existing credentials: anil/anil123)
2. Navigate to Manage Users from Admin Dashboard
3. Click "Initialize Default Users" button if no users exist
4. This creates the 3 default users in Firestore

### Adding a New User:
1. Click the add icon in top right
2. Fill in username, password, display name, and select role
3. Click "Add User"
4. User can immediately login with these credentials

### Editing a User:
1. Click edit icon on any user
2. Modify password, display name, or role
3. Username cannot be changed
4. Click "Update"

### Deactivating a User:
1. Click deactivate icon on user card
2. Confirm deactivation
3. User cannot login anymore
4. You cannot deactivate your own account

## Security Features

- Duplicate username prevention
- Self-protection (cannot deactivate own account)
- Network checks for all operations
- Active status check on login
- Username immutability
- Real-time sync across devices

## Files Modified/Created

1. src/screens/LoginScreen.js - Updated to fetch from Firestore
2. src/screens/AdminManageUsers.js - New user management screen
3. src/screens/AdminDashboard.js - Added Manage Users button
4. src/navigation/AppNavigator.js - Added route for AdminManageUsers
5. src/utils/initializeUsers.js - One-time setup utility

## Migration Notes

Old system had hardcoded users in src/constants/users.js
New system stores users in Firestore database
First admin must click "Initialize Default Users" to migrate
