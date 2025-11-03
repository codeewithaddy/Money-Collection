import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from "react-native";
import { firestore } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function AdminManageCounters({ navigation }) {
  const [counterName, setCounterName] = useState("");
  const [counters, setCounters] = useState([]);
  const [search, setSearch] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [newCounterName, setNewCounterName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("counters")
      .onSnapshot(
        (snapshot) => {
          const data = snapshot?.docs?.map((d) => ({ id: d.id, ...d.data() })) || [];
          // Filter out inactive counters from display
          const activeCounters = data.filter(c => c.isActive !== false);
          setCounters(activeCounters);
        },
        () => {
          setCounters([]);
        }
      );
    return unsubscribe;
  }, []);
 
  const addCounter = async () => {
    if (!counterName.trim()) {
      Alert.alert("Error", "Please enter a counter name.");
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert(
        "No Internet",
        "Please connect to the internet to add counters."
      );
      return;
    }
    
    try {
      // Check against ALL counters (including inactive) to prevent duplicates
      const allCountersSnapshot = await firestore().collection("counters").get();
      const allCounters = allCountersSnapshot.docs.map(d => d.data());
      
      const existingCounter = allCounters.find(
        c => c.name.toLowerCase() === counterName.trim().toLowerCase()
      );
      
      if (existingCounter) {
        Alert.alert(
          "Duplicate Name", 
          `Counter "${counterName.trim()}" already exists${existingCounter.isActive === false ? ' (inactive)' : ''}. Please use a different name to avoid confusion.`,
          [{ text: "OK" }]
        );
        return;
      }
      
      await firestore().collection("counters").add({
        name: counterName.trim(),
        createdBy: "Anil",
        createdAt: new Date(),
        isActive: true,
      });
      setCounterName("");
      Alert.alert("Success", `Counter "${counterName.trim()}" added successfully!`);
    } catch (error) {
      Alert.alert("Error", "Failed to add counter. Please try again.");
      console.error("Add counter error:", error);
    }
  };

  const deleteCounter = async (id) => {
    const counter = counters.find(c => c.id === id);
    
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert(
        "No Internet",
        "Please connect to the internet to deactivate counters."
      );
      return;
    }
    
    Alert.alert(
      "Deactivate Counter",
      `Deactivate "${counter?.name}"? Previous entries will be preserved, but no new collections can be added.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              // Mark as inactive instead of deleting
              await firestore().collection("counters").doc(id).update({
                isActive: false,
                deactivatedAt: new Date(),
              });
              Alert.alert("Success", "Counter deactivated! Previous entries preserved.");
            } catch (error) {
              Alert.alert("Error", "Failed to deactivate counter. Please try again.");
              console.error("Deactivate error:", error);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (counter) => {
    setEditingCounter(counter);
    setNewCounterName(counter.name);
    setEditModalVisible(true);
  };

  const updateCounterName = async () => {
    if (!newCounterName.trim()) {
      Alert.alert("Error", "Please enter a counter name.");
      return;
    }

    // If name hasn't changed, just close modal
    if (newCounterName.trim() === editingCounter.name) {
      setEditModalVisible(false);
      return;
    }

    try {
      // Check against ALL counters (including inactive) to prevent duplicates
      const allCountersSnapshot = await firestore().collection("counters").get();
      const allCounters = allCountersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const existingCounter = allCounters.find(
        c => c.name.toLowerCase() === newCounterName.trim().toLowerCase() && c.id !== editingCounter.id
      );

      if (existingCounter) {
        Alert.alert(
          "Duplicate Name",
          `Counter "${newCounterName.trim()}" already exists${existingCounter.isActive === false ? ' (inactive)' : ''}. Please use a different name.`,
          [{ text: "OK" }]
        );
        return;
      }
    } catch (error) {
      Alert.alert("Error", "Failed to check for duplicates. Please try again.");
      return;
    }

    Alert.alert(
      "Update Counter Name",
      `Rename "${editingCounter.name}" to "${newCounterName.trim()}"? This will update all previous collections in Firestore and local storage.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            // Check network connectivity first
            const netInfo = await NetInfo.fetch();
            if (!netInfo.isConnected) {
              Alert.alert(
                "No Internet",
                "Please connect to the internet to rename counters and sync all data."
              );
              return;
            }

            setIsUpdating(true);
            try {
              const oldName = editingCounter.name;
              const updatedName = newCounterName.trim();

              // Update counter name in counters collection
              await firestore().collection("counters").doc(editingCounter.id).update({
                name: updatedName,
                updatedAt: new Date(),
              });

              // Update all collections in Firestore with old counter name
              const collectionsSnapshot = await firestore()
                .collection("collections")
                .where("counterName", "==", oldName)
                .get();

              // Handle batch limit (Firestore batch limit is 500)
              const docs = collectionsSnapshot.docs;
              const batchSize = 500;
              
              for (let i = 0; i < docs.length; i += batchSize) {
                const batch = firestore().batch();
                const batchDocs = docs.slice(i, i + batchSize);
                
                batchDocs.forEach((doc) => {
                  batch.update(doc.ref, { counterName: updatedName });
                });
                
                await batch.commit();
              }

              // Update local collections in AsyncStorage
              const stored = await AsyncStorage.getItem("@local_collections");
              if (stored) {
                const localCollections = JSON.parse(stored);
                const updatedLocal = localCollections.map(c => 
                  c.counterName === oldName ? { ...c, counterName: updatedName } : c
                );
                await AsyncStorage.setItem("@local_collections", JSON.stringify(updatedLocal));
              }

              setIsUpdating(false);
              setEditModalVisible(false);
              
              const updateCount = docs.length;
              Alert.alert(
                "Success", 
                `Counter renamed to "${updatedName}"!\n${updateCount} collection(s) updated in Firestore.`
              );
            } catch (error) {
              setIsUpdating(false);
              Alert.alert("Error", "Failed to update counter. Please try again.");
              console.error("Update error:", error);
            }
          },
        },
      ]
    );
  };

  const filteredCounters = counters.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin - Manage Counters</Text>

      {/* Add Counter Section */}
      <View style={styles.row}>
        <TextInput
          value={counterName}
          onChangeText={setCounterName}
          placeholder="Enter new counter name"
          style={styles.input}
        />
        <TouchableOpacity style={styles.btn} onPress={addCounter}>
          <Text style={styles.btnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search counters..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredCounters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listText}>{item.name}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                onPress={() => openEditModal(item)}
                style={styles.editBtn}
              >
                <Icon name="edit" size={18} color="#007AFF" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCounter(item.id)}>
                <Text style={{ color: "red", marginLeft: 12 }}>Deactivate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Counter Name</Text>
            {editingCounter && (
              <ScrollView>
                <Text style={styles.label}>Current Name: {editingCounter.name}</Text>
                
                <Text style={styles.label}>New Name:</Text>
                <TextInput
                  value={newCounterName}
                  onChangeText={setNewCounterName}
                  style={styles.modalInput}
                  placeholder="Enter new counter name"
                />

                {isUpdating && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2ecc71" />
                    <Text style={styles.loadingText}>Updating everywhere...</Text>
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setEditModalVisible(false)}
                    disabled={isUpdating}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.updateBtn}
                    onPress={updateCounterName}
                    disabled={isUpdating}
                  >
                    <Text style={styles.updateBtnText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("AddCollection")}
        >
          <Text>Add Collection</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("ViewCollections")}
        >
          <Text>View Collections</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    flex: 1,
    marginRight: 6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f9f9f9",
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  btn: {
    backgroundColor: "#27ae60",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnText: { color: "#fff" },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  listText: { fontSize: 16, flex: 1 },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    color: "#007AFF",
    marginLeft: 4,
    fontSize: 14,
  },
  bottomRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBox: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  updateBtn: {
    flex: 1,
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  updateBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
