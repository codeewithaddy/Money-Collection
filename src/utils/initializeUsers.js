// One-time script to initialize users in Firestore
// Run this once to migrate from hardcoded users to Firestore

import firestore from "@react-native-firebase/firestore";

// Only Super Admin - All other users will be created by admin through the app
const SUPER_ADMIN_DATA = {
  username: "anil",
  password: "anil123",
  role: "admin",
  displayName: "Anil",
};

export const initializeUsersInFirestore = async () => {
  try {
    console.log("Initializing super admin...");
    
    // Create super admin config if it doesn't exist
    const superAdminConfigRef = firestore().collection("config").doc("superAdmin");
    const superAdminConfigDoc = await superAdminConfigRef.get();
    
    if (!superAdminConfigDoc.exists) {
      await superAdminConfigRef.set({
        username: SUPER_ADMIN_DATA.username,
        password: SUPER_ADMIN_DATA.password,
        displayName: SUPER_ADMIN_DATA.displayName,
        role: SUPER_ADMIN_DATA.role,
        isProtected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastChangedBy: "system",
      });
      console.log("Super admin config created in Firestore!");
      return { success: true, message: "Super admin initialized successfully! You can now add workers through the app." };
    } else {
      console.log("Super admin config already exists");
      return { success: true, message: "Super admin already exists. You can add workers through the app." };
    }
  } catch (error) {
    console.error("Error initializing super admin:", error);
    return { success: false, message: error.message };
  }
};
