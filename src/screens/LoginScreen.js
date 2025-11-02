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
import AsyncStorage from "@react-native-async-storage/async-storage";
import USERS from "../constants/users";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
    const user = USERS[key];
    if (!user || user.password !== password) {
      Alert.alert("Invalid credentials", "Username or password is incorrect");
      return;
    }

    // Persist current user
    await AsyncStorage.setItem(
      "@current_user",
      JSON.stringify({ username: key, role: user.role, displayName: user.displayName })
    );

    // Navigate based on role
    if (user.role === "admin") navigation.replace("Admin");
    else navigation.replace("Worker");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Money Collection App</Text>
        <Text style={styles.sub}>Login to continue</Text>

        <TextInput
          placeholder="Username (e.g. anil)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Users: anil / hemraj / raja</Text>
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
  },
  button: { backgroundColor: "#2f6ce6", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 6 },
  buttonText: { color: "#fff", fontWeight: "700" },
  hint: { marginTop: 12, color: "#777", textAlign: "center" },
});
