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
  ScrollView,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Calendar } from 'react-native-calendars';

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
  const [selectedDate, setSelectedDate] = useState("");
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // Get today's date in IST (UTC+5:30)
  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

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
      // Set today as default date
      setSelectedDate(getTodayIST());
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
    // Validation
    if (!selectedCounter) {
      Alert.alert("Validation", "Please select a counter");
      return;
    }
    
    if (!amount || amount.trim() === "") {
      Alert.alert("Validation", "Please enter an amount");
      return;
    }
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Validation", "Please enter a valid amount greater than 0");
      return;
    }
    
    const collectionData = {
      workerName: user?.displayName || "Unknown",
      counterId: selectedCounter.id,
      counterName: selectedCounter.name,
      amount: numAmount,
      mode,
      date: selectedDate, // Use selected date instead of today
      timestamp: new Date().toISOString(),
      localId: Date.now().toString(), // Unique local ID
    };

    try {
      // Check internet connectivity
      const netInfo = await NetInfo.fetch();
      
      let firestoreDoc = null;
      
      // Save to Firestore first if online
      if (netInfo.isConnected) {
        try {
          const { localId, ...dataToSync } = collectionData;
          firestoreDoc = await firestore().collection("collections").add(dataToSync);
          console.log("Saved to Firestore:", firestoreDoc.id);
        } catch (firestoreError) {
          console.log("Firestore save failed, will save locally:", firestoreError.message);
        }
      }
      
      // Save locally (always)
      const stored = await AsyncStorage.getItem("@local_collections");
      const list = stored ? JSON.parse(stored) : [];
      
      // Use Firestore document ID as localId if saved online
      const localData = {
        ...collectionData,
        localId: firestoreDoc ? firestoreDoc.id : collectionData.localId
      };
      
      list.push(localData);
      await AsyncStorage.setItem("@local_collections", JSON.stringify(list));
      
      await updatePendingCount();
      const dateMsg = selectedDate !== getTodayIST() 
        ? ` for ${selectedDate}` 
        : "";
      
      // Check if actually saved to Firestore (not just connected to internet)
      if (firestoreDoc) {
        alert(`Collection saved${dateMsg} and synced to server!`);
      } else {
        alert(`Collection saved${dateMsg} offline! Sync when online.`);
      }
      
      setSelectedCounter(null);
      setAmount("");
      setMode("offline");
      // Reset to today after saving
      setSelectedDate(getTodayIST());
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

      {/* Date Selector - Admin Only */}
      {user?.role === "admin" && (
        <>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setDateModalVisible(true)}
          >
            <Icon name="calendar-today" size={20} color="#007AFF" />
            <Text style={styles.dateSelectorText}>
              {selectedDate === getTodayIST() 
                ? `Today - ${selectedDate}` 
                : selectedDate}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Date Selection Modal with Calendar */}
          <Modal visible={dateModalVisible} animationType="slide" transparent={true}>
            <View style={styles.modalContainer}>
              <View style={styles.calendarModalBox}>
                <Text style={styles.modalTitle}>Select Date</Text>
                
                <Calendar
                  current={selectedDate}
                  onDayPress={(day) => {
                    setSelectedDate(day.dateString);
                    setDateModalVisible(false);
                  }}
                  markedDates={{
                    [selectedDate]: {
                      selected: true,
                      selectedColor: '#007AFF',
                      selectedTextColor: '#fff'
                    },
                    [getTodayIST()]: {
                      marked: true,
                      dotColor: '#2ecc71'
                    }
                  }}
                  maxDate={getTodayIST()}
                  minDate={(() => {
                    const today = new Date();
                    today.setDate(today.getDate() - 30);
                    return today.toISOString().split('T')[0];
                  })()}
                  theme={{
                    selectedDayBackgroundColor: '#007AFF',
                    todayTextColor: '#2ecc71',
                    arrowColor: '#007AFF',
                    monthTextColor: '#000',
                    textMonthFontWeight: 'bold',
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                  }}
                />
                
                <View style={styles.calendarFooter}>
                  <TouchableOpacity
                    style={styles.todayBtn}
                    onPress={() => {
                      setSelectedDate(getTodayIST());
                      setDateModalVisible(false);
                    }}
                  >
                    <Icon name="today" size={20} color="#fff" />
                    <Text style={styles.todayBtnText}>Today</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setDateModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

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
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  dateOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
    gap: 12,
  },
  selectedDateOption: {
    backgroundColor: "#e3f2fd",
  },
  dateOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  selectedText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  calendarModalBox: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  calendarFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  todayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  todayBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
