// src/screens/AddCollectionScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function AddCollectionScreen({ navigation }) {
  const [counters, setCounters] = useState([]);
  const [filteredCounters, setFilteredCounters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("offline");
  const [modalVisible, setModalVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = async () => {
    try {
      const raw = await AsyncStorage.getItem("@current_user");
      if (!raw) return;
      
      const userData = JSON.parse(raw);
      const pending = await AsyncStorage.getItem("@local_collections");
      
      if (pending) {
        const list = JSON.parse(pending);
        const userPending = list.filter(c => c.workerName === userData.displayName);
        setPendingCount(userPending.length);
      } else {
        setPendingCount(0);
      }
    } catch (error) {
      console.error("Error updating pending count:", error);
    }
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("@current_user");
      if (raw) setUser(JSON.parse(raw));
      await updatePendingCount();
    })();
    
    const unsubscribe = firestore()
      .collection("counters")
      .onSnapshot((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Filter out inactive counters
        const activeCounters = list.filter(c => c.isActive !== false);
        setCounters(activeCounters);
        setFilteredCounters(activeCounters);
      });
    
    return unsubscribe;
  }, []);

  // Update pending count when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", updatePendingCount);
    return unsubscribe;
  }, [navigation]);


  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === "") setFilteredCounters(counters);
    else {
      const filtered = counters.filter((c) =>
        c.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCounters(filtered);
    }
  };


  const saveCollection = async () => {
    if (!selectedCounter || !amount) return alert("Please select counter and amount");
    
    const today = new Date().toISOString().split("T")[0];
    const collectionData = {
      workerName: user?.displayName || "Unknown",
      counterId: selectedCounter.id,
      counterName: selectedCounter.name,
      amount: Number(amount),
      mode,
      date: today,
      timestamp: new Date().toISOString(),
      localId: Date.now().toString(), // Unique local ID
    };

    try {
      // Always save locally first
      const stored = await AsyncStorage.getItem("@local_collections");
      const list = stored ? JSON.parse(stored) : [];
      list.push(collectionData);
      await AsyncStorage.setItem("@local_collections", JSON.stringify(list));
      
      await updatePendingCount();
      alert("Collection saved! Go to View Collections to sync.");
      
      setSelectedCounter(null);
      setAmount("");
      setMode("offline");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Add Collection</Text>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ fontSize: 16 }}>
          {selectedCounter ? selectedCounter.name : "Select Counter"}
        </Text>
        <Icon name="arrow-drop-down" size={28} color="#333" />
      </TouchableOpacity>

      {/* MODAL DROPDOWN */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <TextInput
              placeholder="Search counter..."
              value={searchQuery}
              onChangeText={handleSearch}
              style={styles.searchBox}
            />
            <FlatList
              data={filteredCounters}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.counterItem}
                  onPress={() => {
                    setSelectedCounter(item);
                    setModalVisible(false);
                  }}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: "#fff" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TextInput
        placeholder="Enter Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
      />

      <View style={styles.modeBox}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "offline" && styles.activeMode]}
          onPress={() => setMode("offline")}
        >
          <Text>Offline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "online" && styles.activeMode]}
          onPress={() => setMode("online")}
        >
          <Text>Online</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveCollection}>
        <Text style={{ color: "#fff", fontSize: 16 }}>Save Collection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 15, flexWrap: "wrap" },
  title: { fontSize: 22, fontWeight: "700", marginRight: 10 },
  pendingBadge: {
    backgroundColor: "#ffa726",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalBox: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 15,
    borderRadius: 12,
    maxHeight: "70%",
  },
  searchBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  counterItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeBtn: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  modeBox: { flexDirection: "row", justifyContent: "space-between", marginVertical: 10 },
  modeBtn: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeMode: { backgroundColor: "#d1f0d1" },
  saveBtn: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  backBtn: { marginBottom: 10 },
});
