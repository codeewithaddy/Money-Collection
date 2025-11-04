# 🚀 OTA Update System - Complete Setup Guide

**Version:** 4.0.1  
**Type:** FREE Self-Hosted OTA Updates  
**Platform:** GitHub Releases

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Initial Setup](#initial-setup)
4. [Releasing Updates](#releasing-updates)
5. [User Experience](#user-experience)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### **What You Get:**
- ✅ **FREE** - No charges (uses GitHub)
- ✅ **Auto-update notifications** - Users see popup
- ✅ **One-click install** - Download & install from app
- ✅ **Optional updates** - Users can skip
- ✅ **Version management** - Tracks who uses what
- ✅ **Offline support** - Checks only when online

### **How Users See It:**
1. Open app → See "Update Available" popup
2. Read what's new
3. Tap "Update Now" or "Later"
4. If update → Downloads APK → Installs automatically
5. App restarts with new version

---

## 🔧 How It Works

### **Architecture:**

```
Your Code Changes
      ↓
Build APK (npx react-native run-android --variant=release)
      ↓
Upload to GitHub Releases (manual)
      ↓
User Opens App
      ↓
App Checks GitHub API for Latest Release
      ↓
If New Version → Show Update Modal
      ↓
User Taps "Update Now"
      ↓
Download APK from GitHub
      ↓
Install APK
      ↓
App Restarts with New Version
```

### **Components:**

1. **`updateConfig.js`** - Version & settings
2. **`UpdateChecker.js`** - Checks GitHub for updates
3. **`UpdateModal.js`** - Shows update UI
4. **`App.js`** - Integrates update check
5. **GitHub Releases** - Hosts APK files

---

## 🚀 Initial Setup

### **Step 1: Create GitHub Repository**

1. Go to https://github.com
2. Create new repository: `Money-Collection`
3. Make it **Public** (required for free hosting)
4. Note your username (e.g., `codeewithaddy`)

### **Step 2: Update Configuration**

Edit `src/config/updateConfig.js`:

```javascript
export const UPDATE_CONFIG = {
  // ⚠️ CHANGE THESE TO YOUR GITHUB INFO
  GITHUB_OWNER: 'codeewithaddy',  // Your GitHub username
  GITHUB_REPO: 'Money-Collection',
  
  // Current app version (match with build.gradle)
  CURRENT_VERSION: '4.0.1',
  
  // Update check interval (24 hours)
  CHECK_INTERVAL: 24 * 60 * 60 * 1000,
  
  // GitHub API URL
  RELEASE_API_URL: 'https://api.github.com/repos/codeewithaddy/Money-Collection/releases/latest',
  
  // Force update (false = optional, true = mandatory)
  FORCE_UPDATE: false,
  
  // Minimum required version
  MIN_REQUIRED_VERSION: '3.0.0',
};
```

### **Step 3: Update App Version in build.gradle**

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.myapp"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 401          // Increment this for each release
        versionName "4.0.1"     // Match with updateConfig.js
    }
}
```

### **Step 4: Build Release APK**

```bash
cd android
./gradlew assembleRelease
```

APK location:
```
android/app/build/outputs/apk/release/app-release.apk
```

### **Step 5: Create GitHub Release**

1. Go to your GitHub repo
2. Click "Releases" → "Create a new release"
3. **Tag version**: `v4.0.1` (must match CURRENT_VERSION)
4. **Release title**: `Version 4.0.1`
5. **Description**: Write release notes (users will see this)
   ```
   ## What's New in 4.0.1
   
   ✨ NEW FEATURES:
   - PIN Security with WhatsApp-style timing
   - OTA Updates (you're seeing this!)
   - Excel-style PDF export with share
   
   🐛 BUG FIXES:
   - Fixed PIN timing issues
   - Added loading screens
   - Better error handling
   
   🔒 SECURITY:
   - Clock change protection
   - Null user checks
   - Enhanced PIN validation
   ```
6. **Attach APK**: Upload `app-release.apk`
7. Click "Publish release"

---

## 📦 Releasing Updates (Every Time You Make Changes)

### **Quick Steps:**

```bash
# 1. Update version in TWO places:
# - src/config/updateConfig.js → CURRENT_VERSION: '4.0.2'
# - android/app/build.gradle → versionName "4.0.2" & versionCode 402

# 2. Build release APK
cd android
./gradlew assembleRelease

# 3. Create GitHub Release
# - Go to GitHub → Releases → New Release
# - Tag: v4.0.2
# - Upload: android/app/build/outputs/apk/release/app-release.apk
# - Write release notes
# - Publish

# 4. Done! Users will see update within 24 hours
```

### **Detailed Workflow:**

#### **1. Make Your Code Changes**
```bash
# Example: Add new feature
# Edit files...
# Test changes...
```

#### **2. Update Version Numbers**

**File 1:** `src/config/updateConfig.js`
```javascript
CURRENT_VERSION: '4.0.2',  // ← Change this
```

**File 2:** `android/app/build.gradle`
```gradle
versionCode 402        // ← Increment (401, 402, 403...)
versionName "4.0.2"    // ← Match with updateConfig.js
```

#### **3. Build Signed Release APK**

```bash
cd "/home/adarsh/Desktop/money collection/MyApp/android"
./gradlew clean
./gradlew assembleRelease
```

**APK Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

**APK Size:** ~30-50 MB (users will download this)

#### **4. Create GitHub Release**

**Go to:** https://github.com/YOUR_USERNAME/Money-Collection/releases/new

**Fill in:**
- **Tag**: `v4.0.2` (must start with 'v')
- **Title**: `Version 4.0.2`
- **Description**:
  ```markdown
  ## 🎉 What's New
  
  - Added feature X
  - Fixed bug Y
  - Improved performance
  
  ## 📱 Installation
  
  Download and install the APK below, or update from within the app!
  ```
- **Attach**: Click "Attach files" → Select `app-release.apk`
- **Publish**: Click "Publish release"

#### **5. Users Get Notified**

- Next time they open app → See update popup
- Can update or skip
- Update downloads from GitHub
- Installs automatically

---

## 👥 User Experience

### **Update Available (Optional)**

```
┌─────────────────────────────────┐
│                                 │
│         🔄 [Icon]               │
│     Update Available            │
│      Version 4.0.2              │
│                                 │
│  Size: 35 MB                    │
│                                 │
│  What's New:                    │
│  ┌─────────────────────────┐   │
│  │ - New PIN security      │   │
│  │ - Fixed bugs            │   │
│  │ - Better performance    │   │
│  └─────────────────────────┘   │
│                                 │
│  [ Later ]  [ Update Now ]      │
│                                 │
└─────────────────────────────────┘
```

### **Download in Progress**

```
┌─────────────────────────────────┐
│                                 │
│      Downloading... 45%         │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░           │
│                                 │
└─────────────────────────────────┘
```

### **Update Required (Mandatory)**

```
┌─────────────────────────────────┐
│                                 │
│         ⚠️ [Icon]               │
│     Update Required             │
│      Version 4.0.2              │
│                                 │
│  ⚠️ Update Required             │
│  This update is required to     │
│  continue using the app.        │
│                                 │
│        [ Update Now ]           │
│                                 │
└─────────────────────────────────┘
```

---

## ⚙️ Configuration

### **Update Frequency**

**In `updateConfig.js`:**
```javascript
CHECK_INTERVAL: 24 * 60 * 60 * 1000,  // 24 hours (default)

// Options:
// - 1 hour:  1 * 60 * 60 * 1000
// - 12 hours: 12 * 60 * 60 * 1000
// - 1 day: 24 * 60 * 60 * 1000
// - 1 week: 7 * 24 * 60 * 60 * 1000
```

### **Force Update**

```javascript
FORCE_UPDATE: false,  // Optional (user can skip)
// OR
FORCE_UPDATE: true,   // Mandatory (must update)
```

### **Minimum Version**

```javascript
MIN_REQUIRED_VERSION: '3.0.0',

// Users on version < 3.0.0 MUST update
// Users on version >= 3.0.0 can skip
```

### **Version Comparison**

```javascript
// Versions are compared numerically:
// 4.0.1 < 4.0.2 ✅
// 3.9.9 < 4.0.0 ✅
// 4.0.10 > 4.0.2 ✅
```

---

## 🔧 Advanced Configuration

### **Change Update Source**

If you want to host APKs somewhere else:

**In `UpdateChecker.js`:**
```javascript
async checkForUpdate() {
  // Instead of GitHub, use your own server
  const response = await fetch('https://yourserver.com/api/latest-version');
  
  // Expected JSON format:
  // {
  //   "version": "4.0.2",
  //   "downloadUrl": "https://yourserver.com/app-v4.0.2.apk",
  //   "releaseNotes": "What's new...",
  //   "size": 35000000
  // }
}
```

### **Custom Update UI**

Edit `src/components/UpdateModal.js` to customize:
- Colors
- Layout
- Text
- Buttons
- Animation

---

## 🐛 Troubleshooting

### **Problem 1: "Update check skipped"**

**Cause:** Checked recently (within 24 hours)

**Solution:**
```javascript
// Force check on app start (for testing)
// In App.js:
const checkForUpdates = async () => {
  // Comment out this check during testing:
  // const shouldCheck = await UpdateChecker.shouldCheckForUpdate();
  
  const update = await UpdateChecker.checkForUpdate();
  // ...
};
```

---

### **Problem 2: "No updates available"**

**Causes:**
1. GitHub release not public
2. Wrong GitHub username/repo in config
3. Version tag doesn't match (must be `v4.0.1`)
4. No APK attached to release

**Check:**
```bash
# Test GitHub API directly:
curl https://api.github.com/repos/YOUR_USERNAME/Money-Collection/releases/latest

# Should return JSON with:
# - tag_name: "v4.0.1"
# - assets: [{name: "app-release.apk", browser_download_url: "..."}]
```

---

### **Problem 3: "Download failed"**

**Causes:**
1. No internet connection
2. APK URL incorrect
3. GitHub rate limit (60 requests/hour for unauthenticated)

**Solution:**
- Check internet
- Verify APK URL in GitHub release
- Wait if rate limited

---

### **Problem 4: "Installation failed"**

**Causes:**
1. "Install from unknown sources" disabled
2. Signature mismatch (different signing key)
3. Insufficient storage

**Solution:**
1. **Enable unknown sources:**
   - Settings → Security → Install unknown apps
   - Enable for your app

2. **Check signature:**
   - Must use same keystore for all releases
   - Don't mix debug and release builds

3. **Free up space:**
   - Need ~100 MB free

---

### **Problem 5: "Update doesn't show"**

**Causes:**
1. User dismissed update
2. Same version
3. Check interval not passed

**Debug:**
```javascript
// In App.js, add logging:
const checkForUpdates = async () => {
  console.log('Checking for updates...');
  
  const shouldCheck = await UpdateChecker.shouldCheckForUpdate();
  console.log('Should check:', shouldCheck);
  
  const update = await UpdateChecker.checkForUpdate();
  console.log('Update found:', update);
  
  if (update) {
    const isDismissed = await UpdateChecker.isDismissed(update.version);
    console.log('Is dismissed:', isDismissed);
  }
};
```

---

## 📊 Statistics & Analytics

### **Track Update Adoption**

Add analytics to know who updates:

```javascript
// In UpdateModal.js, when user taps "Update Now":
const downloadAndInstall = async () => {
  // Log to your analytics
  console.log('User updating from', CURRENT_VERSION, 'to', updateInfo.version);
  
  // OR send to your server:
  fetch('https://yourserver.com/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event: 'update_started',
      from_version: CURRENT_VERSION,
      to_version: updateInfo.version,
      user_id: currentUserId,
    }),
  });
  
  // Continue with download...
};
```

---

## ✅ Checklist for Each Release

Before publishing update:

- [ ] Code changes tested
- [ ] Version updated in `updateConfig.js`
- [ ] Version updated in `build.gradle` (both code & name)
- [ ] Release APK built (`./gradlew assembleRelease`)
- [ ] APK tested on device
- [ ] Release notes written
- [ ] GitHub release created with correct tag (`v4.0.x`)
- [ ] APK uploaded to GitHub release
- [ ] Release published
- [ ] Test update notification (use different device with old version)

---

## 🎯 Best Practices

### **Version Numbering:**
```
MAJOR.MINOR.PATCH

4.0.1
│ │ └─ Patch (bug fixes)
│ └─── Minor (new features, backward compatible)
└───── Major (breaking changes)

Examples:
- Bug fix: 4.0.1 → 4.0.2
- New feature: 4.0.2 → 4.1.0
- Major rewrite: 4.1.0 → 5.0.0
```

### **Release Notes:**
```markdown
## ✨ NEW
- Feature description

## 🐛 FIXED
- Bug description

## 🔒 SECURITY
- Security improvement

## ⚠️ BREAKING
- Breaking change (if any)
```

### **Update Frequency:**
```
- Critical bug: Release immediately
- New features: Weekly/bi-weekly
- Minor improvements: Monthly
```

---

## 💰 Cost Breakdown

**Completely FREE!** 🎉

| Service | Cost |
|---------|------|
| GitHub Releases | ✅ FREE |
| APK Hosting | ✅ FREE |
| Bandwidth | ✅ FREE (unlimited) |
| Updates | ✅ FREE (unlimited) |
| **TOTAL** | **₹0 / $0** |

**vs Play Store:**
- Play Store Registration: $25 one-time
- This solution: **$0**

---

## 📱 Example: Releasing Version 4.0.2

### **Scenario:** You fixed a bug and want to release update

```bash
# 1. Update versions
# updateConfig.js: CURRENT_VERSION: '4.0.2'
# build.gradle: versionCode 402, versionName "4.0.2"

# 2. Build APK
cd android
./gradlew assembleRelease

# 3. Go to GitHub
# - Releases → New Release
# - Tag: v4.0.2
# - Title: Version 4.0.2 - Bug Fixes
# - Description:
#   "Fixed critical PIN timing bug
#    Improved error handling
#    Better performance"
# - Attach: app-release.apk
# - Publish

# 4. Within 24 hours, users see:
# "Update Available - Version 4.0.2"

# 5. They tap "Update Now"
# - Downloads 35 MB
# - Installs automatically
# - App restarts
# - Bug fixed! ✅
```

---

## 🎉 Summary

### **What You Built:**
- ✅ FREE OTA update system
- ✅ GitHub-hosted distribution
- ✅ One-click user updates
- ✅ Optional/forced updates
- ✅ Version management
- ✅ Professional update UI

### **How It Works:**
1. You build APK
2. Upload to GitHub Releases
3. Users get notification
4. They tap update
5. Downloads & installs
6. Everyone on latest version!

### **Benefits:**
- **No Play Store fees** ($0 vs $25)
- **Instant updates** (no review wait)
- **Full control** (your hosting)
- **Unlimited bandwidth** (GitHub)
- **Unlimited updates** (free forever)

---

**You now have a professional, FREE, WhatsApp-style update system!** 🚀

---

**Prepared by:** AI Code Assistant  
**Date:** November 5, 2025  
**Status:** ✅ READY TO USE
