import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from "react-native";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function AdminManageSellers({ navigation }) {
  const [search, setSearch] = useState("");
  const [sellers, setSellers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@current_user");
        const user = raw ? JSON.parse(raw) : null;
        const doc = await firestore().collection("config").doc("superAdmin").get();
        const username = doc?.data()?.username || "anil";
        const current = user?.username || user?.id;
        setAllowed(!!current && current === username);
      } catch (e) {
        setAllowed(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const unsubscribe = firestore()
      .collection("sellers")
      .onSnapshot(
        (snap) => {
          const list = snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) || [];
          const active = list.filter((s) => s.isActive !== false);
          setSellers(active);
        },
        () => setSellers([])
      );
    return unsubscribe;
  }, [allowed]);

  const openAdd = () => {
    setEditingSeller(null);
    setName("");
    setLocation("");
    setMobile("");
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditingSeller(item);
    setName(item.name || "");
    setLocation(item.location || "");
    setMobile(item.mobile || "");
    setModalVisible(true);
  };

  const saveSeller = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    setLoading(true);
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        Alert.alert("No Internet", "Connect to the internet to manage sellers.");
        setLoading(false);
        return;
      }

      if (editingSeller) {
        await firestore().collection("sellers").doc(editingSeller.id).update({
          name: name.trim(),
          location: location.trim(),
          mobile: mobile.trim(),
          updatedAt: new Date(),
        });
        Alert.alert("Success", "Seller updated");
      } else {
        let dupSnap = null;
        try {
          dupSnap = await firestore().collection("sellers")
            .where("name", "==", name.trim())
            .get();
        } catch (err) {
          try { console.log('duplicate check error:', err?.message || err); } catch (_) {}
        }
        if (dupSnap && !dupSnap.empty) {
          Alert.alert("Duplicate", "Seller with same name already exists");
          setLoading(false);
          return;
        }
        await firestore().collection("sellers").add({
          name: name.trim(),
          location: location.trim(),
          mobile: mobile.trim(),
          isActive: true,
          createdAt: new Date(),
        });
        Alert.alert("Success", "Seller added");
      }
      setModalVisible(false);
    } catch (e) {
      try { console.log('saveSeller error:', e?.code, e?.message || e); } catch (_) {}
      Alert.alert("Error", e?.message ? `Failed to save seller: ${e.message}` : "Failed to save seller");
    } finally {
      setLoading(false);
    }
  };

  const deactivate = async (id) => {
    const item = sellers.find((s) => s.id === id);
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert("No Internet", "Connect to the internet to deactivate sellers.");
      return;
    }
    Alert.alert(
      "Deactivate Seller",
      `Deactivate "${item?.name}"? Previous entries are preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore().collection("sellers").doc(id).update({
                isActive: false,
                deactivatedAt: new Date(),
              });
              Alert.alert("Success", "Seller deactivated");
            } catch (e) {
              try { console.log('deactivate seller error:', e?.message || e); } catch (_) {}
              Alert.alert("Error", "Failed to deactivate");
            }
          },
        },
      ]
    );
  };

  const filtered = sellers.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.toLowerCase().includes(search.toLowerCase()) ||
      s.mobile?.toLowerCase().includes(search.toLowerCase())
  );

  if (!checked) return (
    <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" color="#2ecc71" />
    </View>
  );

  if (!allowed) return (
    <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
      <Text style={{ fontSize: 16, color: "#e74c3c" }}>Super Admin only</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}> 
        <Text style={{ color: "#fff" }}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Sellers</Text>
        <TouchableOpacity onPress={openAdd} style={{ padding: 4 }}>
          <Icon name="person-add" size={24} color="#2ecc71" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search sellers..."
          placeholderTextColor="#000"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{item.name}</Text>
              <Text style={styles.sellerSub}>{item.location || "-"}</Text>
              {item.mobile ? (
                <Text style={styles.sellerSub}>📞 {item.mobile}</Text>
              ) : null}
            </View>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                <Icon name="edit" size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deactivate(item.id)} style={styles.iconBtn}>
                <Icon name="block" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="store" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No sellers found</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingSeller ? "Edit Seller" : "Add Seller"}</Text>
            <ScrollView>
              <Text style={styles.label}>Name *</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Seller name" placeholderTextColor="#999" style={styles.input} />
              <Text style={styles.label}>Location</Text>
              <TextInput value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor="#999" style={styles.input} />
              <Text style={styles.label}>Mobile</Text>
              <TextInput value={mobile} onChangeText={setMobile} placeholder="10-digit mobile" placeholderTextColor="#999" style={styles.input} keyboardType="phone-pad" />
              {loading && (
                <View style={{ alignItems: "center", marginVertical: 10 }}>
                  <ActivityIndicator color="#2ecc71" />
                </View>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn} disabled={loading}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveSeller} style={styles.saveBtn} disabled={loading}>
                  <Text style={styles.saveText}>{editingSeller ? "Update" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#333" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    margin: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0, color: "#000" },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 1,
  },
  sellerName: { fontSize: 16, fontWeight: "600", color: "#333" },
  sellerSub: { fontSize: 12, color: "#666", marginTop: 3 },
  row: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: 8 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 16, color: "#999" },
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBox: { backgroundColor: "#fff", margin: 20, padding: 20, borderRadius: 12, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 6, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 4, color: "#000" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: "#6c757d", padding: 14, borderRadius: 8, alignItems: "center" },
  cancelText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: "#2ecc71", padding: 14, borderRadius: 8, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  backBtn: { marginTop: 12, backgroundColor: "#007AFF", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
