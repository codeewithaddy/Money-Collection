import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";

const ViewCollectionsScreen = ({ navigation, route }) => {
  const { userName } = route.params || {};
  const [collections, setCollections] = useState([]);
  const [totals, setTotals] = useState({ cash: 0, online: 0, grand: 0 });

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const savedData = await AsyncStorage.getItem("collections");
        const parsed = savedData ? JSON.parse(savedData) : [];

        // Filter for this worker (admin sees all)
        const filtered =
          userName && userName.toLowerCase() !== "admin"
            ? parsed.filter((c) => c.workerName === userName)
            : parsed;

        setCollections(filtered);

        // Calculate totals
        let cash = 0,
          online = 0;
        filtered.forEach((c) => {
          if (c.mode === "offline") cash += c.amount;
          else online += c.amount;
        });
        setTotals({ cash, online, grand: cash + online });
      } catch (e) {
        console.error("Error reading collections", e);
      }
    };

    const unsubscribe = navigation.addListener("focus", fetchCollections);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.counterName}>{item.counterName}</Text>
      <Text>Amount: ₹{item.amount}</Text>
      <Text>Mode: {item.mode === "offline" ? "Cash" : "Online"}</Text>
      <Text>Date: {item.date}</Text>
      <Text>Worker: {item.workerName}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <Text style={styles.title}>My Collections</Text>

      {collections.length === 0 ? (
        <Text style={styles.noData}>No collections found.</Text>
      ) : (
        <FlatList
          data={collections}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text>Cash: ₹{totals.cash}</Text>
        <Text>Online: ₹{totals.online}</Text>
        <Text style={{ fontWeight: "bold" }}>Total: ₹{totals.grand}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f7f7f7" },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 10 },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  counterName: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  noData: { textAlign: "center", marginTop: 50, color: "#777" },
  summary: {
    marginTop: 10,
    backgroundColor: "#d4f4d7",
    padding: 15,
    borderRadius: 10,
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 5,
  },
  backBtn: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
});

export default ViewCollectionsScreen;
