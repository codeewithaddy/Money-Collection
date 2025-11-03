// src/screens/WorkerDashboard.js
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { autoCleanup } from "../utils/dataCleanup";

export default function WorkerDashboard({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("@current_user");
      if (raw) setUser(JSON.parse(raw));
      
      // Run auto-cleanup (once per day)
      await autoCleanup();
    })();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem("@current_user");
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Worker Dashboard</Text>
      <Text style={styles.welcome}>Hello, {user?.displayName || "Worker"}</Text>

      {/* Add Collection Button */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => navigation.navigate("AddCollection", { userName: user?.displayName })}
      >
        <Text>Add Collection</Text>
      </TouchableOpacity>

      {/* View Collections Button */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() =>
          navigation.navigate("ViewCollections", { userName: user?.displayName })
        }
      >
        <Text>View My Collections</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={{ color: "#fff" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  welcome: { fontSize: 16, marginBottom: 20 },
  actionBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  logout: {
    backgroundColor: "#c0392b",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
