// Auto-cleanup utility - Keeps only last 1 month of data
// Automatically deletes collections older than 30 days

import AsyncStorage from "@react-native-async-storage/async-storage";
import firestore from "@react-native-firebase/firestore";

// Get cutoff date (1 month ago from today in IST)
const getCutoffDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(now.getTime() + istOffset);
  
  // Go back 30 days
  istTime.setDate(istTime.getDate() - 30);
  
  return istTime.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Clean local AsyncStorage - Remove collections older than 30 days
export const cleanupLocalData = async () => {
  try {
    console.log("Starting local data cleanup...");
    const cutoffDate = getCutoffDate();
    
    // Get all local collections
    const stored = await AsyncStorage.getItem("@local_collections");
    if (!stored) {
      console.log("No local collections to clean");
      return { cleaned: 0, remaining: 0 };
    }
    
    const allCollections = JSON.parse(stored);
    const originalCount = allCollections.length;
    
    // Filter - keep only collections from last 30 days
    const recentCollections = allCollections.filter(
      (collection) => collection.date >= cutoffDate
    );
    
    const cleanedCount = originalCount - recentCollections.length;
    
    // Save back filtered collections
    await AsyncStorage.setItem(
      "@local_collections",
      JSON.stringify(recentCollections)
    );
    
    console.log(`Local cleanup: Removed ${cleanedCount} old collections, kept ${recentCollections.length}`);
    
    return {
      cleaned: cleanedCount,
      remaining: recentCollections.length,
      cutoffDate
    };
  } catch (error) {
    console.error("Error cleaning local data:", error);
    return { cleaned: 0, remaining: 0, error: error.message };
  }
};

// Clean Firestore - Remove collections older than 30 days
export const cleanupFirestoreData = async () => {
  try {
    console.log("Starting Firestore data cleanup...");
    const cutoffDate = getCutoffDate();
    
    // Query collections older than cutoff date
    const snapshot = await firestore()
      .collection("collections")
      .where("date", "<", cutoffDate)
      .get();
    
    if (snapshot.empty) {
      console.log("No old Firestore collections to clean");
      return { cleaned: 0 };
    }
    
    // Delete in batches (Firestore limit is 500 per batch)
    const batch = firestore().batch();
    let count = 0;
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    
    console.log(`Firestore cleanup: Removed ${count} old collections (older than ${cutoffDate})`);
    
    return {
      cleaned: count,
      cutoffDate
    };
  } catch (error) {
    console.error("Error cleaning Firestore data:", error);
    return { cleaned: 0, error: error.message };
  }
};

// Run both cleanups
export const cleanupAllData = async () => {
  try {
    console.log("=== Starting Auto Data Cleanup ===");
    
    const [localResult, firestoreResult] = await Promise.all([
      cleanupLocalData(),
      cleanupFirestoreData()
    ]);
    
    console.log("=== Data Cleanup Complete ===");
    console.log("Local:", localResult);
    console.log("Firestore:", firestoreResult);
    
    return {
      local: localResult,
      firestore: firestoreResult,
      totalCleaned: (localResult.cleaned || 0) + (firestoreResult.cleaned || 0)
    };
  } catch (error) {
    console.error("Error in cleanupAllData:", error);
    return {
      local: { cleaned: 0 },
      firestore: { cleaned: 0 },
      totalCleaned: 0,
      error: error.message
    };
  }
};

// Check if cleanup should run (run once per day)
export const shouldRunCleanup = async () => {
  try {
    const lastCleanup = await AsyncStorage.getItem("@last_cleanup_date");
    const today = new Date().toISOString().split('T')[0];
    
    if (lastCleanup !== today) {
      // Mark cleanup as done for today
      await AsyncStorage.setItem("@last_cleanup_date", today);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking cleanup status:", error);
    return false;
  }
};

// Auto-cleanup wrapper - runs cleanup if needed
export const autoCleanup = async () => {
  try {
    const shouldRun = await shouldRunCleanup();
    
    if (shouldRun) {
      console.log("Running scheduled auto-cleanup...");
      const result = await cleanupAllData();
      
      if (result.totalCleaned > 0) {
        console.log(`✅ Auto-cleanup removed ${result.totalCleaned} old entries`);
      } else {
        console.log("✅ Auto-cleanup: No old data to remove");
      }
      
      return result;
    } else {
      console.log("Auto-cleanup already ran today, skipping...");
      return { skipped: true };
    }
  } catch (error) {
    console.error("Error in autoCleanup:", error);
    return { error: error.message };
  }
};
