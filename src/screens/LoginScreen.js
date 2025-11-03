// src/screens/LoginScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firestore from "@react-native-firebase/firestore";
import USERS from "../constants/users";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // If a user was previously logged in, auto-redirect (optional)
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("@current_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.role === "admin") navigation.replace("Admin");
          else navigation.replace("Worker");
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [navigation]);

  const handleLogin = async () => {
    const key = username.trim().toLowerCase();
    if (!key || !password) {
      Alert.alert("Validation", "Enter username and password");
      return;
    }

    try {
      // FIRST: Check if this is the super admin by checking config
      const superAdminConfigDoc = await firestore().collection("config").doc("superAdmin").get();
      let userData = null;
      let isFallback = false;
      let isSuperAdmin = false;
      
      if (superAdminConfigDoc.exists) {
        const superAdminConfig = superAdminConfigDoc.data();
        // Check if superAdminConfig has data and login matches
        if (superAdminConfig && superAdminConfig.username && superAdminConfig.password) {
          if (key === superAdminConfig.username && password === superAdminConfig.password) {
            userData = {
              password: superAdminConfig.password,
              role: superAdminConfig.role || "admin",
              displayName: superAdminConfig.displayName,
            };
            isSuperAdmin = true;
            console.log("Super admin login from Firestore config");
          }
        }
      }
      
      // If not super admin, check regular users collection
      if (!isSuperAdmin) {
        const userDoc = await firestore().collection("users").doc(key).get();
        
        if (userDoc.exists) {
          userData = userDoc.data();
          
          // Check if userData exists
          if (!userData) {
            Alert.alert("Error", "User data not found. Please contact admin.");
            return;
          }
          
          // Check if user is active
          if (userData.isActive === false) {
            Alert.alert("Account Disabled", "Your account has been deactivated. Contact admin.");
            return;
          }
        } else {
          // Fallback to hardcoded users if not found in Firestore
          const hardcodedUser = USERS[key];
          if (hardcodedUser) {
            userData = hardcodedUser;
            isFallback = true;
            console.log("Using fallback hardcoded user:", key);
          } else {
            Alert.alert("Invalid credentials", "Username or password is incorrect");
            return;
          }
        }
      }
      
      // Verify userData exists
      if (!userData) {
        Alert.alert("Invalid credentials", "Username or password is incorrect");
        return;
      }

      // Verify password (skip for super admin as already verified above)
      if (!isSuperAdmin && userData.password !== password) {
        Alert.alert("Invalid credentials", "Username or password is incorrect");
        return;
      }

      // Persist current user
      await AsyncStorage.setItem(
        "@current_user",
        JSON.stringify({ 
          username: key, 
          role: userData.role, 
          displayName: userData.displayName 
        })
      );

      // Navigate based on role
      if (userData.role === "admin") {
        navigation.replace("Admin");
        // Show hint to initialize users if using fallback
        if (isFallback) {
          setTimeout(() => {
            Alert.alert(
              "Initialize Users",
              "You're using hardcoded credentials. Go to 'Manage Users' to initialize users in Firestore for better management."
            );
          }, 1000);
        }
      } else {
        navigation.replace("Worker");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to login. Please check your internet connection.");
      console.error("Login error:", error);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Money Collection</Text>
        <Text style={styles.sub}>Login to continue</Text>

        <TextInput
          placeholder="Name"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={styles.input}
        />
        
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Icon
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Enter your credentials to continue</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f7ff" },
  card: { width: "90%", padding: 20, backgroundColor: "#fff", borderRadius: 12, elevation: 4 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  sub: { fontSize: 13, color: "#555", marginBottom: 16, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  eyeIcon: {
    padding: 4,
  },
  button: { backgroundColor: "#2f6ce6", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 6 },
  buttonText: { color: "#fff", fontWeight: "700" },
  hint: { marginTop: 12, color: "#777", textAlign: "center" },
});
