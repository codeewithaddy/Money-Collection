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
  Image,
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
          // User not found in Firestore
          Alert.alert("Invalid credentials", "Username or password is incorrect");
          return;
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

      // Set initial background time for PIN system
      await AsyncStorage.setItem('@app_background_time', Date.now().toString());

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
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image 
              source={require('../../assets/login-icon.jpeg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.companyName}>
            <Text style={styles.companyNameV}>V</Text>andana{' '}
            <Text style={styles.companyNameA}>A</Text>gencies
          </Text>
          <Text style={styles.subtitle}>Login to your account</Text>
        </View>

        {/* Input Fields */}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Icon name="person-outline" size={20} color="#6DD5B4" style={styles.inputIcon} />
            <TextInput
              placeholder="Username"
              placeholderTextColor="#8A8A9E"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
          
          <View style={styles.inputWrapper}>
            <Icon name="lock-closed-outline" size={20} color="#6DD5B4" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#8A8A9E"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#B0B0C8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity style={styles.signInButton} onPress={handleLogin}>
          <Text style={styles.signInText}>Sign in</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>Money Collection App v3.0</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4A4560",
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6DD5B4",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  companyName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 1.5,
  },
  companyNameV: {
    fontSize: 28,
    fontWeight: "900",
    color: "#6DD5B4",
  },
  companyNameA: {
    fontSize: 28,
    fontWeight: "900",
    color: "#6DD5B4",
  },
  subtitle: {
    fontSize: 14,
    color: "#B0B0C8",
    marginTop: 4,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3E3D52",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#525174",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: "#FFFFFF",
  },
  eyeIcon: {
    padding: 8,
  },
  signInButton: {
    backgroundColor: "#6DD5B4",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#6DD5B4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  signInText: {
    color: "#2A2A3E",
    fontSize: 16,
    fontWeight: "bold",
  },
  footerText: {
    textAlign: "center",
    color: "#8A8A9E",
    fontSize: 12,
    marginTop: 20,
  },
});
