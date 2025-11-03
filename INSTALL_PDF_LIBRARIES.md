# 📦 Install PDF Libraries - Quick Guide

## ⚠️ IMPORTANT: Run These Commands First!

Before the app will work with PDF export, you MUST install the required libraries.

---

## 🚀 Step-by-Step Installation

### **Step 1: Install NPM Packages**

Open terminal in your project folder:

```bash
cd "/home/adarsh/Desktop/money collection/MyApp"
npm install
```

This installs:
- ✅ `react-native-html-to-pdf` - PDF generation
- ✅ `react-native-pdf` - PDF viewer

---

### **Step 2: Rebuild Android App**

```bash
npx react-native run-android
```

**Important:** Full rebuild required for native modules!

---

### **Step 3: Test**

1. Open app
2. Login as admin
3. Click "PDF Export"
4. Select date
5. Click "Generate PDF"
6. Check if PDF generates successfully

---

## ✅ Verification

### **Check if installed:**

```bash
npm list react-native-html-to-pdf
npm list react-native-pdf
```

Should show:
```
├── react-native-html-to-pdf@0.12.0
├── react-native-pdf@6.7.5
```

---

## 🔧 If Build Fails

### **1. Clean Build:**

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### **2. Reset Cache:**

```bash
npx react-native start --reset-cache
```

In new terminal:
```bash
npx react-native run-android
```

### **3. Reinstall Modules:**

```bash
rm -rf node_modules
rm package-lock.json
npm install
npx react-native run-android
```

---

## 📱 Android Permissions

The app automatically requests storage permission when generating PDF.

**Manual Permission (if needed):**
```
Settings → Apps → MyApp → Permissions → Storage → Allow
```

---

## 🎯 Quick Test Checklist

- [ ] Run `npm install`
- [ ] Run `npx react-native run-android`
- [ ] App builds successfully
- [ ] Login as admin
- [ ] Open PDF Export
- [ ] Select today's date
- [ ] Click "Generate PDF"
- [ ] See success alert
- [ ] Click "View PDF"
- [ ] PDF displays in-app

---

## ⚡ Quick Commands Summary

**All-in-one installation:**

```bash
cd "/home/adarsh/Desktop/money collection/MyApp"
npm install
npx react-native run-android
```

**That's it!** PDF export will work after rebuild.

---

## 📄 Libraries Added to package.json

```json
{
  "dependencies": {
    "react-native-html-to-pdf": "^0.12.0",
    "react-native-pdf": "^6.7.5"
  }
}
```

---

## ✅ Success Indicators

**Installation successful if:**
- ✅ No build errors
- ✅ App launches normally
- ✅ PDF Export screen opens
- ✅ Generate PDF works
- ✅ View PDF works

**Installation failed if:**
- ❌ Build errors
- ❌ Module not found errors
- ❌ App crashes on PDF Export

---

**Run the commands above and PDF export will work!** 📄✨
