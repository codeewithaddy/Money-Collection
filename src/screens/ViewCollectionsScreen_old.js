import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Modal, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firestore } from "../firebaseConfig";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";

const ViewCollectionsScreen = ({ navigation, route }) => {
  const { userName } = route.params || {};
  const [sections, setSections] = useState([]);
  const [totals, setTotals] = useState({ cash: 0, online: 0, grand: 0 });
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [expandedCounters, setExpandedCounters] = useState({});

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("@current_user");
      if (raw) setUser(JSON.parse(raw));
    })();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection("collections")
      .onSnapshot((snapshot) => {
        const allCollections = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Filter based on role: admin sees all, worker sees only their own
        let filtered =
          user.role === "admin" || userName === "admin"
            ? allCollections
            : allCollections.filter((c) => c.workerName === userName || c.workerName === user.displayName);

        // Filter by selected date if any
        if (selectedDate) {
          filtered = filtered.filter((c) => c.date === selectedDate);
        }

        // Get unique dates for filter
        const dates = [...new Set(allCollections.map((c) => c.date))].sort((a, b) => new Date(b) - new Date(a));
        setAvailableDates(dates);

        // Group by date, then by counter
        const grouped = {};
        filtered.forEach((item) => {
          if (!grouped[item.date]) grouped[item.date] = {};
          if (!grouped[item.date][item.counterName]) {
            grouped[item.date][item.counterName] = {
              counterName: item.counterName,
              counterId: item.counterId,
              collections: [],
              totalAmount: 0,
            };
          }
          grouped[item.date][item.counterName].collections.push(item);
          grouped[item.date][item.counterName].totalAmount += item.amount;
        });

        // Convert to sections format
        const sectionsData = Object.keys(grouped)
          .sort((a, b) => new Date(b) - new Date(a))
          .map((date) => ({
            title: date,
            data: Object.values(grouped[date]),
          }));

        setSections(sectionsData);

        // Calculate totals
        let cash = 0,
          online = 0;
        filtered.forEach((c) => {
          if (c.mode === "offline") cash += c.amount;
          else online += c.amount;
        });
        setTotals({ cash, online, grand: cash + online });
      });

    return unsubscribe;
  }, [user, userName, selectedDate]);

  const toggleCounter = (key) => {
    setExpandedCounters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderItem = ({ item, section }) => {
    const key = `${section.title}-${item.counterName}`;
    const isExpanded = expandedCounters[key];

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => toggleCounter(key)} style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.counterName}>{item.counterName}</Text>
            <Text style={styles.collectionsCount}>
              {item.collections.length} collection(s)
            </Text>
          </View>
          <Text style={styles.amount}>₹{item.totalAmount}</Text>
          <MaterialIcon
            name={isExpanded ? "expand-less" : "expand-more"}
            size={24}
            color="#666"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.breakdown}>
            {item.collections.map((col, idx) => (
              <View key={col.id || idx} style={styles.breakdownItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{col.workerName}</Text>
                  <Text style={styles.modeText}>
                    {col.mode === "offline" ? "Cash" : "Online"}
                  </Text>
                </View>
                <Text style={styles.breakdownAmount}>₹{col.amount}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }) => {
    const dateTotal = section.data.reduce((sum, item) => sum + item.totalAmount, 0);
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionTotal}>₹{dateTotal}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {user?.role === "admin" ? "All Collections" : "My Collections"}
        </Text>
        {user?.role === "admin" && (
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setDateModalVisible(true)}
          >
            <MaterialIcon name="filter-list" size={20} color="#007AFF" />
            <Text style={styles.filterText}>
              {selectedDate || "All Dates"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Filter Modal */}
      <Modal visible={dateModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <FlatList
              data={[{ date: null, label: "All Dates" }, ...availableDates.map((d) => ({ date: d, label: d }))]}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dateItem,
                    selectedDate === item.date && styles.selectedDateItem,
                  ]}
                  onPress={() => {
                    setSelectedDate(item.date);
                    setDateModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateItemText,
                      selectedDate === item.date && styles.selectedDateText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedDate === item.date && (
                    <MaterialIcon name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setDateModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: "#fff" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {sections.length === 0 ? (
        <Text style={styles.noData}>No collections found.</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.counterId}-${item.counterName}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
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
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginHorizontal: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  counterName: { fontWeight: "bold", fontSize: 16, flex: 1 },
  amount: { fontWeight: "bold", fontSize: 18, color: "#2ecc71" },
  detail: { fontSize: 14, color: "#666", marginBottom: 3 },
  sectionHeader: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontWeight: "bold", fontSize: 16 },
  sectionTotal: { fontWeight: "bold", fontSize: 16, color: "#2ecc71" },
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  collectionsCount: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  breakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    marginBottom: 6,
  },
  workerName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  modeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  breakdownAmount: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#2ecc71",
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  dateItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedDateItem: {
    backgroundColor: "#e3f2fd",
  },
  dateItemText: {
    fontSize: 16,
    color: "#333",
  },
  selectedDateText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  closeBtn: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
});

export default ViewCollectionsScreen;
