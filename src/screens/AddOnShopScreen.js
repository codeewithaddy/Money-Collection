// src/screens/AddOnShopScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Calendar } from 'react-native-calendars';

export default function AddOnShopScreen({ navigation }) {
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("offline");
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  // Get today's date in IST (UTC+5:30)
  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

  useEffect(() => {
    loadUser();
    setSelectedDate(getTodayIST());
  }, []);

  const loadUser = async () => {
    const raw = await AsyncStorage.getItem("@current_user");
    if (raw) {
      const userData = JSON.parse(raw);
      setUser(userData);
    }
  };

  const updatePendingCount = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_onshop");
      const list = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem("@pending_onshop_count", list.length.toString());
    } catch (error) {
      console.log("Error updating pending count:", error);
    }
  };

  const saveOnShopEntry = async () => {
    // Validation
    if (!customerName || customerName.trim() === "") {
      Alert.alert("Validation", "Please enter customer name");
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
    
    const onShopData = {
      customerName: customerName.trim(),
      amount: numAmount,
      mode,
      receivedBy: user?.displayName || "Unknown",
      date: selectedDate,
      timestamp: new Date().toISOString(),
      localId: Date.now().toString(),
    };

    try {
      // Check internet connectivity
      const netInfo = await NetInfo.fetch();
      
      let firestoreDoc = null;
      
      // Save to Firestore first if online
      if (netInfo.isConnected) {
        try {
          const { localId, ...dataToSync } = onShopData;
          firestoreDoc = await firestore().collection("onShopCollections").add(dataToSync);
          console.log("Saved to Firestore:", firestoreDoc.id);
        } catch (firestoreError) {
          console.log("Firestore save failed, will save locally:", firestoreError.message);
        }
      }
      
      // Save locally (always)
      const stored = await AsyncStorage.getItem("@local_onshop");
      const list = stored ? JSON.parse(stored) : [];
      
      // Use Firestore document ID as localId if saved online
      const localData = {
        ...onShopData,
        localId: firestoreDoc ? firestoreDoc.id : onShopData.localId
      };
      
      list.push(localData);
      await AsyncStorage.setItem("@local_onshop", JSON.stringify(list));
      
      await updatePendingCount();
      const dateMsg = selectedDate !== getTodayIST() 
        ? ` for ${selectedDate}` 
        : "";
      
      // Check if actually saved to Firestore (not just connected to internet)
      if (firestoreDoc) {
        alert(`OnShop entry saved${dateMsg} and synced to server!`);
      } else {
        alert(`OnShop entry saved${dateMsg} offline! Sync when online.`);
      }
      
      setCustomerName("");
      setAmount("");
      setMode("offline");
      setSelectedDate(getTodayIST());
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Icon name="store" size={32} color="#6DD5B4" />
        <Text style={styles.title}>OnShop Collection</Text>
        <Text style={styles.subtitle}>Record direct shop sales</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Date Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Icon name="calendar-today" size={20} color="#6DD5B4" />
            <Text style={styles.dateText}>{selectedDate}</Text>
          </TouchableOpacity>
        </View>

        {showCalendar && (
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#6DD5B4' }
            }}
            theme={{
              backgroundColor: '#2C2B3E',
              calendarBackground: '#2C2B3E',
              textSectionTitleColor: '#6DD5B4',
              selectedDayBackgroundColor: '#6DD5B4',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#6DD5B4',
              dayTextColor: '#ffffff',
              textDisabledColor: '#555',
              monthTextColor: '#6DD5B4',
              arrowColor: '#6DD5B4',
            }}
            style={styles.calendar}
          />
        )}

        {/* Customer Name Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Customer Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter customer name (e.g., Naveen, Gautam)"
            placeholderTextColor="#888"
            value={customerName}
            onChangeText={setCustomerName}
          />
        </View>

        {/* Amount Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Payment Mode */}
        <View style={styles.field}>
          <Text style={styles.label}>Payment Mode</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "offline" && styles.modeBtnActive]}
              onPress={() => setMode("offline")}
            >
              <Icon 
                name="payments" 
                size={20} 
                color={mode === "offline" ? "#fff" : "#6DD5B4"} 
              />
              <Text style={[styles.modeText, mode === "offline" && styles.modeTextActive]}>
                Cash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "online" && styles.modeBtnActive]}
              onPress={() => setMode("online")}
            >
              <Icon 
                name="account-balance" 
                size={20} 
                color={mode === "online" ? "#fff" : "#6DD5B4"} 
              />
              <Text style={[styles.modeText, mode === "online" && styles.modeTextActive]}>
                Online
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Received By */}
        <View style={styles.field}>
          <Text style={styles.label}>Received By</Text>
          <View style={styles.receivedByBox}>
            <Icon name="person" size={20} color="#6DD5B4" />
            <Text style={styles.receivedByText}>{user?.displayName || "Loading..."}</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveOnShopEntry}>
          <Icon name="check-circle" size={24} color="#fff" />
          <Text style={styles.saveBtnText}>Save Entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E2E",
    padding: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4A4560",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  form: {
    flex: 1,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#6DD5B4",
    marginBottom: 8,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2B3E",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4A4560",
  },
  dateText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
  calendar: {
    borderRadius: 10,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#2C2B3E",
    padding: 15,
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#4A4560",
  },
  modeContainer: {
    flexDirection: "row",
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#6DD5B4",
    backgroundColor: "#2C2B3E",
    gap: 8,
  },
  modeBtnActive: {
    backgroundColor: "#6DD5B4",
    borderColor: "#6DD5B4",
  },
  modeText: {
    color: "#6DD5B4",
    fontSize: 16,
    fontWeight: "600",
  },
  modeTextActive: {
    color: "#fff",
  },
  receivedByBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2B3E",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4A4560",
    gap: 10,
  },
  receivedByText: {
    color: "#fff",
    fontSize: 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6DD5B4",
    padding: 18,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 30,
    gap: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
