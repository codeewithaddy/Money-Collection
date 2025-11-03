# Super Admin (Developer) Guide

## 🔐 Super Admin Protection

The super admin account (`anil`) is **permanently protected** and cannot be modified through the app UI. Only you (the developer) can change these credentials by modifying the code.

---

## ⚙️ How to Change Super Admin Credentials

### **Step 1: Change Username (if needed)**

**File:** `/src/screens/AdminManageUsers.js`

**Line 21:**
```javascript
const SUPER_ADMIN_USERNAME = "anil";  // Change this
```

**Example:** Change to "admin"
```javascript
const SUPER_ADMIN_USERNAME = "admin";
```

---

### **Step 2: Change Password & Display Name**

**File:** `/src/constants/users.js`

**Lines 2-4:**
```javascript
export default {
  anil: { password: "anil123", role: "admin", displayName: "Anil" },
  // ...
};
```

**Example:** Update credentials
```javascript
export default {
  admin: { password: "newPassword123", role: "admin", displayName: "Admin User" },
  // ...
};
```

---

### **Step 3: Update Initialize Script (Important!)**

**File:** `/src/utils/initializeUsers.js`

**Lines 6-12:**
```javascript
const INITIAL_USERS = [
  {
    username: "anil",
    password: "anil123",
    role: "admin",
    displayName: "Anil",
  },
  // ...
];
```

**Example:** Update to match your changes
```javascript
const INITIAL_USERS = [
  {
    username: "admin",
    password: "newPassword123",
    role: "admin",
    displayName: "Admin User",
  },
  // ...
];
```

---

### **Step 4: Update Firestore (If Already Initialized)**

If you've already initialized users in Firestore, you need to update the database:

**Option A: Through Firebase Console**
1. Go to Firebase Console
2. Select your project
3. Go to Firestore Database
4. Navigate to `users` collection
5. Find the super admin document
6. Update the fields manually

**Option B: Delete & Re-initialize**
1. Delete the `users` collection from Firestore
2. Rebuild and run the app
3. Click "Initialize Default Users" again

---

## 🔄 Auto-Sync

**Q: Does it automatically sync after code changes?**

**A:** Yes and No:

### ✅ **Automatic (If using hardcoded fallback):**
- If users aren't in Firestore yet
- Login will use updated hardcoded credentials immediately
- No rebuild needed after code change

### ❌ **Manual Sync Needed (If already in Firestore):**
- If users are already initialized in Firestore
- You must update Firestore manually (see Step 4 above)
- Or delete Firestore users and re-initialize

---

## 🛡️ Super Admin Features

### **Protected Actions:**
- ❌ Cannot be edited through Manage Users screen
- ❌ Cannot be deactivated by any admin
- ❌ Cannot have role changed through app
- ✅ Can only be modified through code

### **Visual Indicators:**
- 🔒 **Orange "SUPER ADMIN" badge** with lock icon
- 🔒 **Lock icons** on edit/deactivate buttons
- 🔒 **Disabled buttons** (grayed out)

### **Alert Messages:**
If someone tries to edit:
> "Super Admin Protected: The super admin account cannot be edited through the app. Only the developer can modify these credentials in the code."

---

## 📝 Complete Example

### **Change from "anil" to "admin":**

**1. AdminManageUsers.js (Line 21):**
```javascript
const SUPER_ADMIN_USERNAME = "admin";
```

**2. users.js:**
```javascript
export default {
  admin: { password: "secure123", role: "admin", displayName: "System Admin" },
  hemraj: { password: "hem123", role: "worker", displayName: "Hemraj" },
  raja: { password: "raja123", role: "worker", displayName: "Raja" },
};
```

**3. initializeUsers.js:**
```javascript
const INITIAL_USERS = [
  {
    username: "admin",
    password: "secure123",
    role: "admin",
    displayName: "System Admin",
  },
  // ... others
];
```

**4. Rebuild the app:**
```bash
npx react-native run-android
```

**5. Login with new credentials:**
- Username: `admin`
- Password: `secure123`

---

## ⚠️ Important Notes

1. **Always keep these 3 files in sync:**
   - `AdminManageUsers.js` (username constant)
   - `users.js` (hardcoded credentials)
   - `initializeUsers.js` (initialization script)

2. **Backup old credentials** before changing

3. **Test new credentials** immediately after changing

4. **Update Firestore** if users are already initialized

5. **Keep credentials secure** - don't commit to public repos

---

## 🔍 Where is Super Admin Used?

### **Files that reference super admin:**

1. **AdminManageUsers.js**
   - Line 21: Username constant
   - Line 105-110: Edit protection
   - Line 194-200: Deactivate protection
   - Line 317-322: Badge display
   - Line 347-353: Edit button disabled
   - Line 360-366: Deactivate button disabled

2. **LoginScreen.js**
   - Uses fallback from `users.js`
   - Shows hint to initialize users

3. **users.js**
   - Hardcoded credentials for fallback

4. **initializeUsers.js**
   - Default user data for Firestore

---

## 🎯 Quick Reference

| Task | Files to Change |
|------|----------------|
| **Change Username** | AdminManageUsers.js, users.js, initializeUsers.js |
| **Change Password** | users.js, initializeUsers.js |
| **Change Display Name** | users.js, initializeUsers.js |
| **Add Second Super Admin** | Not recommended - only one is protected |

---

## 💡 Best Practices

1. ✅ Use a **strong password** for super admin
2. ✅ Change default credentials before production
3. ✅ Keep credentials in environment variables (future enhancement)
4. ✅ Regular backup of Firestore data
5. ✅ Document any changes you make

---

**Remember: The super admin is your failsafe. Protect these credentials carefully!** 🔐
