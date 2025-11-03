# 📅 Calendar Picker & Auto-Cleanup Guide

## ✨ Two Major Features

### **1. Calendar-Style Date Picker** 📆
Beautiful visual calendar instead of date list

### **2. Automatic 1-Month Data Retention** 🗑️
Auto-deletes data older than 30 days to save storage

---

## 📅 Feature 1: Calendar Date Picker

### **What Changed:**

**Before:** List of dates (scrolling list)
```
📅 Today - 2025-11-04
📆 Sun, 2025-11-03
📆 Sat, 2025-11-02
... (scroll forever)
```

**After:** Visual calendar
```
┌────────────────────────────────┐
│      November 2025        < >  │
├────────────────────────────────┤
│ Sun Mon Tue Wed Thu Fri Sat    │
│                 1   2   3   4  │
│  5   6   7   8   9  10  11     │
│ 12  13  14  15  16  17  18     │
│ ...                            │
├────────────────────────────────┤
│ [Today]          [Close]       │
└────────────────────────────────┘
```

### **Features:**

✅ **Visual Calendar** - Month view with all dates  
✅ **Today Marked** - Green dot on today's date  
✅ **Selected Highlighted** - Blue circle on selected date  
✅ **Quick Today Button** - Jump to today instantly  
✅ **30-Day Range** - Can select last 30 days  
✅ **Cannot Select Future** - Max date is today  

### **Where It's Used:**

**1. Add Collection (Admin Only)**
- Select date for collection entry
- Default: Today
- Range: Last 30 days

**2. View Collections (Both)**
- Filter collections by date
- See specific day's data
- Range: Last 90 days

---

### **How to Use:**

#### **In Add Collection (Admin):**

1. Click date selector
2. See calendar popup
3. Click any date in last 30 days
4. Or click "Today" button
5. Calendar closes, date selected

#### **In View Collections:**

1. Click date filter button
2. See calendar popup
3. Click any date
4. Collections filter to that date
5. See "0 Collections" if empty

---

### **Calendar UI Elements:**

**Header:**
- Month & Year displayed
- Left arrow: Previous month
- Right arrow: Next month

**Calendar Grid:**
- Shows full month
- Grayed out: Disabled dates (future/too old)
- Green dot: Today
- Blue circle: Selected date

**Footer:**
- **Today** button (green) - Jump to today
- **Close** button (blue) - Close without selecting

---

## 🗑️ Feature 2: Automatic Data Cleanup

### **The Problem:**

**Without cleanup:**
- Data keeps growing forever
- Firebase storage fills up
- Performance gets slower
- Costs increase

### **The Solution:**

**Auto-Cleanup System:**
- Keeps only **last 30 days** of data
- Automatically deletes older entries
- Runs once per day
- Works on both local & Firestore

---

### **How It Works:**

#### **Cutoff Date Calculation:**

```
Today: November 4, 2025
Go back 30 days: October 5, 2025
↓
Cutoff Date: October 5, 2025
```

**Keeps:** Anything from Oct 5, 2025 onwards  
**Deletes:** Anything before Oct 5, 2025  

#### **Auto-Run Schedule:**

**Triggers:**
1. ✅ When dashboard loads (once per day)
2. ✅ After syncing data
3. ✅ Checks if already ran today

**Smart Scheduling:**
- Runs maximum **once per day**
- Tracks last run date
- Skips if already ran today

---

### **What Gets Cleaned:**

#### **Local Storage (AsyncStorage):**
- `@local_collections` - Removes old entries
- Keeps recent 30 days
- Instant cleanup

#### **Firestore (Cloud Database):**
- `collections` collection
- Deletes documents where `date < cutoffDate`
- Batch deletion (efficient)

---

### **Cleanup Process:**

```
App Starts
    ↓
Check: Did cleanup run today?
    ↓
NO → Run Cleanup
    ↓
1. Calculate cutoff date (30 days ago)
2. Clean local data (AsyncStorage)
3. Clean Firestore data (batch delete)
4. Log results
5. Mark cleanup as done for today
    ↓
YES → Skip (already ran today)
```

---

### **Example Scenarios:**

#### **Scenario 1: November 4, 2025**

**Cutoff Date:** October 5, 2025

**Keeps:**
- Oct 5, 2025: 10 collections ✅
- Oct 15, 2025: 25 collections ✅
- Nov 1, 2025: 30 collections ✅
- Nov 4, 2025: 15 collections ✅

**Deletes:**
- Oct 1, 2025: 20 collections ❌ (Deleted!)
- Oct 4, 2025: 15 collections ❌ (Deleted!)
- Sep 2025: All collections ❌ (Deleted!)

**Result:** 35 old entries deleted, 80 recent entries kept

---

#### **Scenario 2: Empty Old Data**

**Date:** November 4, 2025  
**Cutoff:** October 5, 2025  
**Check:** No entries before Oct 5  

**Result:** "No old data to remove" ✅

---

#### **Scenario 3: Multiple Syncs Same Day**

**Morning:**
- Login → Cleanup runs → Deletes 50 old entries

**Afternoon:**
- Sync data → Cleanup checks
- Already ran today → Skips
- No unnecessary work

**Tomorrow:**
- Login → New day → Cleanup runs again

---

### **Console Logs:**

**When Cleanup Runs:**
```
=== Starting Auto Data Cleanup ===
Starting local data cleanup...
Local cleanup: Removed 20 old collections, kept 60
Starting Firestore data cleanup...
Firestore cleanup: Removed 15 old collections (older than 2025-10-05)
=== Data Cleanup Complete ===
✅ Auto-cleanup removed 35 old entries
```

**When Cleanup Skips:**
```
Auto-cleanup already ran today, skipping...
```

---

## 📊 Technical Details

### **Calendar Library:**

**Package:** `react-native-calendars`  
**Version:** 1.1306.0  

**Features Used:**
- `Calendar` component
- `onDayPress` callback
- `markedDates` for highlighting
- `maxDate` / `minDate` for range
- `theme` for styling

### **Cleanup Utility:**

**File:** `/src/utils/dataCleanup.js`

**Functions:**
```javascript
getCutoffDate()          // Calculate 30 days ago
cleanupLocalData()       // Clean AsyncStorage
cleanupFirestoreData()   // Clean Firestore
cleanupAllData()         // Run both
shouldRunCleanup()       // Check if should run
autoCleanup()            // Main wrapper
```

### **Storage Keys:**

```javascript
@local_collections    // Collection data
@last_cleanup_date    // Track cleanup runs
```

### **Firestore Query:**

```javascript
firestore()
  .collection("collections")
  .where("date", "<", cutoffDate)
  .get()
// Returns all docs older than cutoff
```

---

## ⚙️ Installation Steps

### **1. Install Calendar Library:**

```bash
npm install react-native-calendars
```

Or:

```bash
cd /home/adarsh/Desktop/money\ collection/MyApp
npm install
```

### **2. Restart Metro:**

```bash
npx react-native start --reset-cache
```

### **3. Rebuild App:**

```bash
npx react-native run-android
```

---

## 🎨 UI Comparison

### **Calendar Picker:**

**Old List:**
- Long scrolling list
- Text-based dates
- Harder to navigate
- Not visual

**New Calendar:**
- Full month view
- Visual date picking
- Easy navigation
- Professional look

### **Empty States:**

**Old:**
```
No collections found
Add collections to see them here
```

**New:**
```
0 Collections
No collections on 2025-11-03
```

---

## ✅ Benefits Summary

### **Calendar Picker:**

1. **Better UX** - Visual, intuitive
2. **Faster Selection** - See whole month
3. **Professional** - Modern UI
4. **Easy Navigation** - Arrow buttons
5. **Clear Feedback** - Today marked, selected highlighted

### **Auto-Cleanup:**

1. **Storage Saved** - Only 30 days kept
2. **Performance** - Less data = faster
3. **Cost Effective** - Lower Firebase costs
4. **Automatic** - No manual work
5. **Safe** - Only deletes old data

---

## 🔧 Customization

### **Change Retention Period:**

In `/src/utils/dataCleanup.js`:

```javascript
// Change from 30 to 60 days:
const getCutoffDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  istTime.setDate(istTime.getDate() - 60); // Changed from 30
  
  return istTime.toISOString().split('T')[0];
};
```

### **Change Calendar Theme:**

In `AddCollectionScreen.js`:

```javascript
theme={{
  selectedDayBackgroundColor: '#FF0000', // Change color
  todayTextColor: '#00FF00',
  arrowColor: '#0000FF',
  // ... more options
}}
```

---

## ⚠️ Important Notes

### **Data Loss Prevention:**

✅ **30 days is plenty** for active data  
✅ **Sync regularly** to preserve data  
✅ **Export if needed** before cutoff  

### **What If I Need Older Data?**

**Options:**
1. Increase retention period (60/90 days)
2. Export to CSV before deletion
3. Keep separate backup
4. Disable auto-cleanup

### **Firestore Rules:**

Make sure Firestore allows deletion:

```javascript
// In Firebase Console → Firestore → Rules
match /collections/{document} {
  allow read, write, delete: if request.auth != null;
}
```

---

## 🆚 Before & After

| Aspect | Before | After |
|--------|--------|-------|
| **Date Picker** | List | Calendar |
| **Selection Speed** | Slow scrolling | Quick click |
| **Visual Feedback** | Text only | Highlighted dates |
| **Data Retention** | Forever | 30 days |
| **Storage Growth** | Infinite | Limited |
| **Cleanup** | Manual | Automatic |
| **Performance** | Degrades over time | Stays fast |
| **Firebase Cost** | Increases | Controlled |

---

## 🎯 Quick Start

### **Using Calendar:**

1. **Admin - Add Collection:**
   - Click date selector → Calendar appears
   - Click date or "Today" → Done!

2. **View Collections:**
   - Click date filter → Calendar appears
   - Click date → View that day's data

### **Auto-Cleanup:**

**No action needed!**
- Runs automatically when you login
- Runs after sync
- Once per day maximum
- Check console logs to see results

---

## 📱 Screenshots Reference

### **Calendar View:**

Based on your image:
- Month header with arrows
- Week day labels (Sun-Sat)
- Date grid
- Today button
- Clear button

### **Selected States:**

- **Today**: Green dot below date
- **Selected**: Blue circle background
- **Disabled**: Grayed out (future/old)

---

## 🎉 Summary

### **Calendar Picker:**
✅ Beautiful visual date selection  
✅ Easy month navigation  
✅ Quick "Today" button  
✅ Professional UI  

### **Auto-Cleanup:**
✅ Keeps only 30 days  
✅ Runs automatically  
✅ Saves storage  
✅ Improves performance  

---

**Your app now has modern date picking and intelligent data management!** 📅✨

**Remember to run `npm install` to add the calendar library!** 📦
