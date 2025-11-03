# 📦 Setup Instructions - Calendar & Auto-Cleanup

## ⚡ Quick Setup (3 Steps)

### **Step 1: Install Calendar Library**

Open terminal in your project folder and run:

```bash
cd "/home/adarsh/Desktop/money collection/MyApp"
npm install
```

This will install `react-native-calendars` from package.json.

---

### **Step 2: Restart Metro Bundler**

Stop current Metro (Ctrl+C), then:

```bash
npx react-native start --reset-cache
```

---

### **Step 3: Rebuild Android App**

In a new terminal:

```bash
npx react-native run-android
```

---

## ✅ That's It!

After rebuild, you'll have:

✅ **Calendar date picker** in Add Collection (admin)  
✅ **Calendar date filter** in View Collections  
✅ **Auto-cleanup** running automatically (deletes data older than 30 days)  

---

## 🎯 Test It

### **Test Calendar:**

1. **Admin** → Add Collection
2. Click date selector
3. See beautiful calendar!
4. Click any date
5. Add collection for that date

### **Test Auto-Cleanup:**

1. Login (admin or worker)
2. Check console logs:
   ```
   Running scheduled auto-cleanup...
   ```
3. If old data exists, you'll see:
   ```
   ✅ Auto-cleanup removed X old entries
   ```
4. If no old data:
   ```
   ✅ Auto-cleanup: No old data to remove
   ```

---

## 📅 Calendar Features

- 📆 Visual month view
- 🎯 Click any date to select
- ⏰ Today marked with green dot
- 🔵 Selected date highlighted blue
- ⬅️➡️ Navigate months with arrows
- ✅ Quick "Today" button
- 🚫 Future dates disabled
- 📏 Last 30 days range (Add Collection)

---

## 🗑️ Auto-Cleanup Features

- 🔄 Runs automatically once per day
- 📅 Keeps last 30 days of data
- ❌ Deletes older collections
- 💾 Works on local & Firestore
- ⚡ Runs after sync
- 📊 Runs on dashboard load
- 🔇 Silent if nothing to clean

---

## 🆘 Troubleshooting

### **Calendar not showing?**

1. Make sure you ran `npm install`
2. Restart Metro: `npx react-native start --reset-cache`
3. Rebuild: `npx react-native run-android`

### **Module not found error?**

```bash
cd "/home/adarsh/Desktop/money collection/MyApp"
rm -rf node_modules
npm install
npx react-native run-android
```

### **Auto-cleanup not running?**

Check console logs - it should show:
```
Running scheduled auto-cleanup...
```

If not running, try:
1. Clear app data
2. Reinstall app
3. Check Firestore rules allow deletion

---

## 📖 Full Documentation

- **Calendar & Cleanup:** `CALENDAR_AND_AUTO_CLEANUP_GUIDE.md`
- **Admin Backdated Entries:** `ADMIN_BACKDATED_ENTRIES_GUIDE.md`
- **View Collections:** `VIEW_COLLECTIONS_GUIDE.md`

---

**You're all set! Enjoy the new features!** 🎉
