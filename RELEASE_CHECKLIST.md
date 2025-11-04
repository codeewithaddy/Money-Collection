# 📋 Quick Release Checklist

Use this every time you want to release an update!

---

## ✅ Pre-Release

- [ ] All code changes tested
- [ ] No console errors
- [ ] App runs smoothly

---

## 🔢 Version Update

### **1. Update `src/config/updateConfig.js`**
```javascript
CURRENT_VERSION: '4.0.X',  // ← Change X
```

### **2. Update `android/app/build.gradle`**
```gradle
versionCode 40X        // ← Increment
versionName "4.0.X"   // ← Match above
```

---

## 🏗️ Build APK

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

**APK Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📤 Upload to GitHub

1. Go to: https://github.com/YOUR_USERNAME/Money-Collection/releases/new

2. **Fill in:**
   - Tag: `v4.0.X`
   - Title: `Version 4.0.X`
   - Description: Release notes
   - Attach: `app-release.apk`

3. Click **"Publish release"**

---

## ✅ Verify

- [ ] GitHub release shows APK (green ✓)
- [ ] Tag matches version (v4.0.X)
- [ ] Release is public (not draft)

---

## 🎉 Done!

Users will see update within 24 hours!

**Next update:** Repeat these steps with version 4.0.X+1

---

## 📝 Example Release Notes

```markdown
## What's New in 4.0.X

✨ NEW:
- Feature A
- Feature B

🐛 FIXED:
- Bug X
- Bug Y

🔒 SECURITY:
- Improvement Z
```

---

**Time Required:** 5-10 minutes per release 🚀
