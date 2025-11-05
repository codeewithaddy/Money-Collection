# 🚀 Release Guide: Version 4.2.0

**Release Date:** November 5, 2025  
**What's New:** Fixed app update feature with proper storage permissions and installation handling

---

## 📝 Changes in v4.2.0

### ✅ Fixed Issues
- ✅ Storage permission handling using `react-native-permissions`
- ✅ Android 13+ compatibility (uses app-specific directory)
- ✅ Download directory creation and validation
- ✅ Proper APK installation with correct intents and flags
- ✅ Removed GitHub manual download fallback (focus on in-app updates)
- ✅ Better error messages and retry mechanism

### 🗑️ Removed
- ❌ Camera permission testing code (no longer needed)
- ❌ "Download from GitHub" fallback in error messages

### 📦 Updated Dependencies
- Already using `react-native-permissions` for storage access

---

## 🔢 Step 1: Update Version Numbers

### 1.1 Update `updateConfig.js`

File: `src/config/updateConfig.js`

```javascript
CURRENT_VERSION: '4.2.0',  // Change from '4.1.0' to '4.2.0'
```

### 1.2 Update `build.gradle`

File: `android/app/build.gradle`

```gradle
defaultConfig {
    applicationId "com.myapp"
    versionCode 420        // Change from 411 to 420
    versionName "4.2.0"    // Change from "4.1.1" to "4.2.0"
}
```

**Version Code Formula:** Major.Minor.Patch → 4.2.0 → 420

---

## 🛠️ Step 2: Build Release APK

### 2.1 Clean Build

```bash
cd android
./gradlew clean
cd ..
```

### 2.2 Build Release APK

```bash
cd android
./gradlew assembleRelease
cd ..
```

### 2.3 Locate the APK

The release APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 2.4 Rename APK (Optional but Recommended)

```bash
cp android/app/build/outputs/apk/release/app-release.apk ~/Desktop/MoneyCollection_4.2.0.apk
```

---

## 🧪 Step 3: Test the Release APK

### 3.1 Uninstall Current App

```bash
adb uninstall com.myapp
```

### 3.2 Install Release APK

```bash
adb install ~/Desktop/MoneyCollection_4.2.0.apk
```

### 3.3 Test Checklist

- [ ] App opens successfully
- [ ] Login works
- [ ] All features work (Admin/Worker dashboards)
- [ ] PDF export works
- [ ] No crashes in production mode

---

## 📤 Step 4: Create GitHub Release

### 4.1 Prepare Release Notes

**Title:** `v4.2.0 - App Update Feature Fixed`

**Description:**
```markdown
## 🎉 What's New in v4.2.0

### ✅ Fixed
- **App Update Feature**: Now properly handles storage permissions and APK installation
- **Android 13+ Support**: Uses app-specific directory (no storage permission needed)
- **Better Error Handling**: Clear error messages with retry option
- **Improved Reliability**: Creates download directory if missing, validates file before installation

### 🔧 Technical Improvements
- Implemented `react-native-permissions` for storage access
- Proper Android intents for package installation
- Validation of downloaded APK files
- Better permission dialog flow for Android 12 and below

### 📦 Requirements
- Android 7.0+ (API 24+)
- ~50MB storage space for download
- Internet connection for updates

---

## 📥 Installation

1. Download `MoneyCollection_4.2.0.apk`
2. Enable "Install from Unknown Sources" if prompted
3. Open the APK and tap "Install"
4. Grant necessary permissions when asked

## 🔄 Updating from v4.1.x

The in-app update feature now works! Just:
1. Open the app
2. Update notification will appear
3. Tap "Update Now"
4. Follow the prompts
5. Your data will be preserved!

---

**Full Changelog:** v4.1.0...v4.2.0
```

### 4.2 Create Release on GitHub

1. **Go to your repository:**
   ```
   https://github.com/codeewithaddy/Money-Collection
   ```

2. **Click "Releases"** (right sidebar)

3. **Click "Create a new release"** or "Draft a new release"

4. **Fill in the details:**
   - **Tag:** `v4.2.0`
   - **Release title:** `v4.2.0 - App Update Feature Fixed`
   - **Description:** Paste the release notes from Step 4.1
   - **Attach files:** Upload `MoneyCollection_4.2.0.apk`

5. **Publish release:**
   - ✅ Check "Set as the latest release"
   - ✅ Click "Publish release"

---

## 🔍 Step 5: Verify Release

### 5.1 Check GitHub API

Visit this URL in browser:
```
https://api.github.com/repos/codeewithaddy/Money-Collection/releases/latest
```

Verify:
- ✅ `"tag_name": "v4.2.0"`
- ✅ APK download URL is present in `assets` array
- ✅ `name` shows correct filename

### 5.2 Test In-App Update

1. **Install v4.1.0** (previous version)
2. **Open the app**
3. **Wait 2-3 seconds** for update check
4. **Update popup should appear** showing v4.2.0
5. **Tap "Update Now"**
6. **Download should complete** successfully
7. **Tap "Install"**
8. **Package Installer opens**
9. **Should show "This app will replace an existing app"**
10. **Tap "Install/Update"**
11. **App installs successfully!**
12. **Open app - data should be preserved**

---

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.2.0 | Nov 5, 2025 | Fixed app update feature, storage permissions |
| 4.1.1 | Oct 2025 | Bug fixes |
| 4.1.0 | Oct 2025 | Added update feature (initial) |
| 4.0.0 | Sep 2025 | Major release |

---

## 🐛 Known Issues

None currently! The app update feature is now fully functional.

---

## 📱 Post-Release Checklist

- [ ] GitHub release created and published
- [ ] APK downloadable from release page
- [ ] API returns correct latest version
- [ ] Tested in-app update flow
- [ ] Verified app works after update
- [ ] Data preserved after update
- [ ] Updated documentation
- [ ] Announced to users (if applicable)

---

## 🔐 Important Notes

### Signature Consistency
- ✅ Always use the **same keystore** for releases
- ✅ Store keystore safely and backup
- ❌ Never change keystore - users won't be able to update!

### Update Behavior
- Updates preserve all user data
- Old APK is automatically deleted by Android
- Users stay logged in after update
- Download folder: `/Android/data/com.myapp/files/` (Android 13+)
- Download folder: `/Download/` (Android 12-)

---

## 📞 Support

If users face issues:
1. Check Android version (must be 7.0+)
2. Ensure internet connection
3. Check storage space (~50MB needed)
4. Try uninstall and fresh install if update fails

---

**Built with ❤️ by Adarsh**
