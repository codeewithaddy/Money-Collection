// src/screens/AdminDashboard.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AdminDashboard({ navigation }) {
  const logout = async () => {
    await AsyncStorage.removeItem("@current_user");
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard (Anil)</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Actions</Text>
        <TouchableOpacity style={styles.actionBtn}>
          <Text>Add / Edit Counters (To implement)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text>View Daily Summary (To implement)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text>Export PDF (To implement)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logout} onPress={() => logout()}>
        <Text style={{ color: "#fff" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 18 },
  section: { marginBottom: 24 },
  sectionTitle: { fontWeight: "700", marginBottom: 10 },
  actionBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", marginBottom: 10 },
  logout: { backgroundColor: "#c0392b", padding: 12, borderRadius: 8, alignItems: "center" },
});
