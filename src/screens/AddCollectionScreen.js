import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/Ionicons"; // For back button

const AddCollectionScreen = ({ navigation, route }) => {
  const { userRole, userName } = route.params || {};

  const [selectedCounter, setSelectedCounter] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("offline"); // default
  const [isConnected, setIsConnected] = useState(true);

  // Mocked counters (in next phase → fetched from Firestore)
  const counters = [
    { id: "c1", name: "Shiv Cosmetics" },
    { id: "c2", name: "Raja Electronics" },
    { id: "c3", name: "Anil Kirana" },
  ];

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!selectedCounter || !amount) {
      Alert.alert("Error", "Please select counter and enter amount.");
      return;
    }

    const collection = {
      id: Date.now().toString(),
      counterId: selectedCounter,
      counterName: counters.find(c => c.id === selectedCounter)?.name || "",
      amount: parseFloat(amount),
      mode,
      date: new Date().toISOString().split("T")[0],
      workerName: userName || "Unknown",
    };

    try {
      // Save locally
      const existing = JSON.parse(await AsyncStorage.getItem("collections")) || [];
      existing.push(collection);
      await AsyncStorage.setItem("collections", JSON.stringify(existing));

      Alert.alert(
        "Success",
        isConnected
          ? "Collection saved and ready to sync online!"
          : "Offline mode: Collection saved locally."
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to save collection.");
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <Text style={styles.title}>Add Collection</Text>

      <Text style={styles.label}>Select Counter:</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={selectedCounter}
          onValueChange={(itemValue) => setSelectedCounter(itemValue)}
        >
          <Picker.Item label="-- Select Counter --" value="" />
          {counters.map((counter) => (
            <Picker.Item key={counter.id} label={counter.name} value={counter.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Enter Amount:</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter amount collected"
      />

      <Text style={styles.label}>Mode:</Text>
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "offline" && styles.activeMode]}
          onPress={() => setMode("offline")}
        >
          <Text>Offline (Cash)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "online" && styles.activeMode]}
          onPress={() => setMode("online")}
        >
          <Text>Online (UPI/Card)</Text>
        </TouchableOpacity>
      </View>

      <Button title="Save Collection" onPress={handleSave} />
      <Text style={styles.statusText}>
        {isConnected ? "✅ Online" : "⚠️ Offline — data will sync later"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f7f7f7",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginVertical: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white",
    marginBottom: 15,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "white",
    marginBottom: 15,
  },
  modeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modeBtn: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#aaa",
    width: "48%",
    alignItems: "center",
  },
  activeMode: {
    backgroundColor: "#b5f5c5",
  },
  backBtn: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
  statusText: {
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
});

export default AddCollectionScreen;
