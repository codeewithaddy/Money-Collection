# 🚀 GitHub Release Guide - v4.1.0

**Version:** 4.1.0  
**Version Code:** 410  
**Date:** November 5, 2025

---

## ✅ Pre-Release Checklist

Before creating the GitHub release, verify:

- [x] Version updated in `android/app/build.gradle` → `versionCode 410`, `versionName "4.1.0"`
- [x] Version updated in `src/config/updateConfig.js` → `CURRENT_VERSION: '4.1.0'`
- [x] Version updated in `package.json` → `"version": "4.1.0"`
- [ ] All code changes committed to GitHub
- [ ] App tested on physical device
- [ ] All features working correctly
- [ ] No crashes or critical bugs

---

## 📋 STEP-BY-STEP RELEASE PROCESS

### **STEP 1: Build the Release APK**

#### Option A: Using Automated Script (Recommended)
```bash
cd /home/adarsh/Desktop/money\ collection/MyApp
./build_and_test.sh
```

#### Option B: Manual Build
```bash
cd /home/adarsh/Desktop/money\ collection/MyApp/android
./gradlew clean
./gradlew assembleRelease
```

**Expected Output:**
```
BUILD SUCCESSFUL in 2m 30s
```

**APK Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

**Copy to Desktop:**
```bash
cp android/app/build/outputs/apk/release/app-release.apk ~/Desktop/MoneyCollection-v4.1.0.apk
```

---

### **STEP 2: Test the APK**

Before releasing, test the APK on your device:

```bash
# Install on device
adb install ~/Desktop/MoneyCollection-v4.1.0.apk

# Or transfer to phone and install manually
```

**Test these features:**
- [ ] App opens successfully
- [ ] Login works
- [ ] Can view collections
- [ ] Can add/edit collections
- [ ] PDF generation works
- [ ] Version shows "4.1.0" on login screen
- [ ] No crashes

**If any issues found:** Fix them, rebuild, and test again.

---

### **STEP 3: Commit & Push Code to GitHub**

Make sure all your code changes are on GitHub:

```bash
cd /home/adarsh/Desktop/money\ collection/MyApp

# Check what files changed
git status

# Add all changes
git add -A

# Commit with version number
git commit -m "Release v4.1.1

- Updated version to 4.1.1
- Fixed update system with native module
- Added proper APK installation
- Improved permission handling
- Enhanced download progress tracking"

# Push to GitHub
git push origin main
```

**Verify:** Go to https://github.com/codeewithaddy/Money-Collection and check if your code is there.

---

### **STEP 4: Create GitHub Release**

#### 4.1: Go to Releases Page
```
https://github.com/codeewithaddy/Money-Collection/releases
```

#### 4.2: Click "Create a new release" or "Draft a new release"

#### 4.3: Fill in Release Information

**Tag version:**
```
v4.1.1
```
- Click "Choose a tag"
- Type: `v4.1.1`
- Click "Create new tag: v4.1.1 on publish"

**Target branch:**
```
main
```

**Release title:**
```
Money Collection v4.1.0 - Update System Fixed
```

**Release description:**
```markdown
# Money Collection v4.1.0

## 🎉 What's New

### ✅ Update System Improvements
- Fixed APK installation with native module
- Added proper "Install Unknown Apps" permission handling
- Improved download progress tracking
- Added automatic settings page redirect
- Enhanced error handling and user feedback

### 🔧 Bug Fixes
- Fixed FileProvider integration for Android 7.0+
- Fixed permission requests on Android 8.0+
- Fixed APK installation flow
- Improved update download reliability

### 📱 Features
- Real-time download progress (0% → 100%)
- Automatic permission requests
- One-tap update installation
- Data preservation during updates
- Beautiful update UI

## 📥 Installation

### For New Users:
1. Download `MoneyCollection-v4.1.0.apk` below
2. Allow "Install unknown apps" if prompted
3. Install the APK
4. Open the app and login

### For Existing Users (v4.0.0):
**Automatic Update:**
- Open the app
- Update notification will appear
- Tap "Update Now" → "Download"
- Wait for download to complete
- Tap "Install"
- Allow permissions if asked
- App will update automatically

**Manual Update:**
1. Download `MoneyCollection-v4.1.0.apk` below
2. Open the file
3. Tap "Install"
4. Your data will be preserved

## 📊 Version Info

- **Version:** 4.1.0
- **Version Code:** 410
- **Package:** com.myapp
- **Min Android:** 5.0 (API 21)
- **Target Android:** Latest

## 🔒 Permissions

- **Internet:** Check for updates, sync data
- **Storage:** Download updates, save PDFs
- **Install Packages:** Install app updates

## ⚠️ Important Notes

- All your data will be preserved during update
- No need to uninstall old version
- Update replaces old version automatically
- Make sure you have stable internet connection

## 📝 Changelog

### Added
- Native InstallApk module for proper APK installation
- Automatic permission handling
- Settings page integration
- Download progress tracking
- FileProvider support

### Fixed
- Update installation on Android 7.0+
- Permission requests on Android 8.0+
- Download progress not showing
- Installation failing silently

### Improved
- User experience during updates
- Error messages and feedback
- Permission dialogs
- Update reliability

## 🐛 Known Issues

None at this time.

## 📱 Support

For issues or questions:
- GitHub Issues: https://github.com/codeewithaddy/Money-Collection/issues
- Email: your-email@example.com

---

**Full Changelog:** https://github.com/codeewithaddy/Money-Collection/compare/v4.0.0...v4.1.0
```

#### 4.4: Upload the APK

1. Scroll down to "Attach binaries"
2. Click on the box or drag and drop
3. Select: `~/Desktop/MoneyCollection-v4.1.0.apk`
4. Wait for upload to complete (may take 30-60 seconds)
5. You should see: `MoneyCollection-v4.1.0.apk` in the list

#### 4.5: Review and Publish

1. **Pre-release:** Leave unchecked (this is a stable release)
2. **Set as the latest release:** ✅ Check this
3. Click **"Publish release"**

---

### **STEP 5: Verify the Release**

After publishing, verify:

1. **Check Release Page:**
   ```
   https://github.com/codeewithaddy/Money-Collection/releases/tag/v4.1.0
   ```
   - [ ] Release is visible
   - [ ] APK is downloadable
   - [ ] Description looks correct

2. **Check API Endpoint:**
   ```bash
   curl https://api.github.com/repos/codeewithaddy/Money-Collection/releases/latest
   ```
   - Should return v4.1.0 information
   - Should include APK download URL

3. **Test Update System:**
   - Install v4.0.0 on device (if you have it)
   - Open app
   - Update popup should appear showing v4.1.0
   - Test the complete update flow

---

## 🎯 Post-Release Actions

### **Announce the Release:**

1. **Update README.md** (if needed):
   ```markdown
   ## Download
   
   [Download Latest Version (v4.1.0)](https://github.com/codeewithaddy/Money-Collection/releases/latest)
   ```

2. **Share with Users:**
   - Social media
   - Email
   - WhatsApp groups
   - etc.

### **Monitor for Issues:**

Check for:
- Download errors
- Installation problems
- Update failures
- User feedback

### **Prepare for Next Release:**

When you're ready for v4.2.0:
1. Update version numbers (420, "4.2.0")
2. Follow this guide again
3. Create new release

---

## 📁 File Checklist

Before release, these files should have correct versions:

| File | Location | Version Field | Value |
|------|----------|---------------|-------|
| build.gradle | `android/app/build.gradle` | `versionCode` | `410` |
| build.gradle | `android/app/build.gradle` | `versionName` | `"4.1.0"` |
| updateConfig.js | `src/config/updateConfig.js` | `CURRENT_VERSION` | `'4.1.0'` |
| package.json | `package.json` | `version` | `"4.1.0"` |

All are **✅ UPDATED** for this release.

---

## 🔄 Version Number Guide

### **For Future Releases:**

| Version | Version Code | When to Use |
|---------|--------------|-------------|
| 4.1.0 | 410 | **← Current** |
| 4.1.1 | 411 | Bug fixes only |
| 4.2.0 | 420 | New features |
| 4.3.0 | 430 | New features |
| 5.0.0 | 500 | Major changes |

**Version Code Formula:**
- Major.Minor.Patch
- 4.1.0 = (4 × 100) + (1 × 10) + 0 = **410**
- 4.2.3 = (4 × 100) + (2 × 10) + 3 = **423**

**Always increase version code!** Never use the same code twice.

---

## 🐛 Troubleshooting

### **Problem: Build Failed**
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleRelease --info
```

### **Problem: APK Upload Failed**
- Check file size (should be < 100 MB)
- Try uploading again
- Check internet connection

### **Problem: Update Not Showing**
- Wait 24 hours (update check interval)
- Or uninstall and reinstall to force check
- Check API URL is correct

### **Problem: Installation Failing**
- Check "Install unknown apps" permission
- Check APK is not corrupted
- Try clean install

---

## 📞 Need Help?

If you encounter issues:

1. **Check Logs:**
   ```bash
   cd android
   ./gradlew assembleRelease --info
   ```

2. **Check APK:**
   ```bash
   aapt dump badging ~/Desktop/MoneyCollection-v4.1.0.apk
   ```

3. **Test on Device:**
   ```bash
   adb install ~/Desktop/MoneyCollection-v4.1.0.apk
   adb logcat | grep MoneyCollection
   ```

---

## ✅ Release Checklist Summary

Quick checklist for creating a release:

- [ ] Update versions in 3 files (build.gradle, updateConfig.js, package.json)
- [ ] Build APK: `./build_and_test.sh`
- [ ] Test APK on device
- [ ] Commit and push code to GitHub
- [ ] Create GitHub release (tag: v4.1.0)
- [ ] Upload APK to release
- [ ] Write release notes
- [ ] Publish release
- [ ] Verify release is live
- [ ] Test update system
- [ ] Announce to users

---

## 🎉 You're Done!

After following these steps, your v4.1.0 release will be live on GitHub!

Users with v4.0.0 will automatically see the update notification when they open the app.

**Next Release:** Follow this guide again with v4.2.0 (version code 420)

---

**Good luck! 🚀**
