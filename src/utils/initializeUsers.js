// ⚠️ SECURITY: NO HARDCODED CREDENTIALS
// Super admin credentials are managed in Firebase ONLY
// To set up super admin, go to Firebase Console and manually create:
// Collection: "config" → Document: "superAdmin"

import firestore from "@react-native-firebase/firestore";

export const checkSuperAdminExists = async () => {
  try {
    const superAdminConfigRef = firestore().collection("config").doc("superAdmin");
    const superAdminConfigDoc = await superAdminConfigRef.get();
    
    if (!superAdminConfigDoc.exists) {
      console.warn("⚠️ Super admin not found in Firebase!");
      console.warn("Please create it manually in Firebase Console:");
      console.warn("Collection: config → Document: superAdmin");
      return { 
        exists: false, 
        message: "Super admin not configured. Please set up in Firebase Console." 
      };
    }
    
    console.log("✅ Super admin exists in Firebase");
    return { 
      exists: true, 
      message: "Super admin configured successfully" 
    };
  } catch (error) {
    console.error("Error checking super admin:", error);
    return { 
      exists: false, 
      message: error.message 
    };
  }
};
