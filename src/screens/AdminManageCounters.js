import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { firestore } from "../firebaseConfig";

export default function AdminManageCounters({ navigation }) {
  const [counterName, setCounterName] = useState("");
  const [counters, setCounters] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("counters")
      .onSnapshot((snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCounters(data);
      });
    return unsubscribe;
  }, []);

  const addCounter = async () => {
    if (!counterName.trim()) return;
    await firestore().collection("counters").add({
      name: counterName.trim(),
      createdBy: "Anil",
      createdAt: new Date(),
    });
    setCounterName("");
  };

  const deleteCounter = async (id) => {
    await firestore().collection("counters").doc(id).delete();
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
      <TextInput
        placeholder="Search counters..."
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />

      {/* List */}
      <FlatList
        data={filteredCounters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listText}>{item.name}</Text>
            <TouchableOpacity onPress={() => deleteCounter(item.id)}>
              <Text style={{ color: "red" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  listText: { fontSize: 16 },
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
});
