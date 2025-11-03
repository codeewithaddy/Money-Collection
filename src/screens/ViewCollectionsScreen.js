import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Modal,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { firestore } from "../firebaseConfig";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { autoCleanup } from "../utils/dataCleanup";
import { Calendar } from 'react-native-calendars';

const ViewCollectionsScreen = ({ navigation }) => {
  const [sections, setSections] = useState([]);
  const [totals, setTotals] = useState({ cash: 0, online: 0, grand: 0 });
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [expandedCounters, setExpandedCounters] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMode, setEditMode] = useState("offline");
  const [localCollections, setLocalCollections] = useState([]);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [todayDate, setTodayDate] = useState("");

  // Get today's date in IST (UTC+5:30)
  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  useEffect(() => {
    const updateTodayDate = () => {
      setTodayDate(getTodayIST());
    };
    updateTodayDate();

    // Update date at midnight IST
    const checkMidnight = setInterval(() => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();
      if (hours === 0 && minutes === 0) {
        updateTodayDate();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkMidnight);
  }, []);

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem("@current_user");
      if (!raw) return;
      const userData = JSON.parse(raw);
      setUser(userData);

      // Load local collections
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];

      // Calculate cutoff date (30 days ago)
      const cutoffDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })();

      // Filter out data older than 30 days (ENFORCED)
      let filtered = allCollections.filter((c) => c.date >= cutoffDate);

      // Filter by user role
      if (userData.role !== "admin") {
        filtered = filtered.filter((c) => c.workerName === userData.displayName);
      }
      
      // Filter by selected date
      if (selectedDate) {
        filtered = filtered.filter((c) => c.date === selectedDate);
      }

      setLocalCollections(filtered);

      // Get unique dates for filter (only last 30 days)
      const dates = [...new Set(filtered.map((c) => c.date))].sort(
        (a, b) => new Date(b) - new Date(a)
      );
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
    } catch (error) {
      console.error("Load error:", error);
    }
  };

  useEffect(() => {
    loadData();
    // Load last synced time
    (async () => {
      const syncTime = await AsyncStorage.getItem("@last_synced");
      if (syncTime) setLastSynced(syncTime);
    })();
  }, [selectedDate]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadData);
    return unsubscribe;
  }, [navigation, selectedDate]);

  const toggleCounter = (key) => {
    setExpandedCounters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openEditModal = (item) => {
    // Check if worker can edit this entry
    if (user?.role !== "admin" && item.date !== todayDate) {
      Alert.alert(
        "Read-Only",
        "You can only edit today's entries. This entry is from " + item.date + ".\n\nOnly admin can edit past entries."
      );
      return;
    }
    
    setEditItem(item);
    setEditAmount(String(item.amount));
    setEditMode(item.mode);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editAmount || isNaN(editAmount)) {
      return Alert.alert("Error", "Please enter a valid amount");
    }

    const updatedCollections = localCollections.map((c) =>
      c.localId === editItem.localId
        ? { ...c, amount: Number(editAmount), mode: editMode }
        : c
    );

    await AsyncStorage.setItem(
      "@local_collections",
      JSON.stringify(updatedCollections)
    );
    setPendingChanges(true);
    setEditModalVisible(false);
    loadData();
    Alert.alert("Success", "Updated! Click Sync to save changes.");
  };

  const deleteItem = async (item) => {
    // Check if worker can delete this entry
    if (user?.role !== "admin" && item.date !== todayDate) {
      Alert.alert(
        "Read-Only",
        "You can only delete today's entries. This entry is from " + item.date + ".\n\nOnly admin can delete past entries."
      );
      return;
    }

    Alert.alert(
      "Delete Collection",
      `Delete ${item.counterName} - ₹${item.amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedCollections = localCollections.filter(
              (c) => c.localId !== item.localId
            );
            await AsyncStorage.setItem(
              "@local_collections",
              JSON.stringify(updatedCollections)
            );
            setPendingChanges(true);
            loadData();
            Alert.alert("Deleted", "Click Sync to save changes.");
          },
        },
      ]
    );
  };

  const syncToFirebase = async () => {
    try {
      // Check internet connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert(
          "No Internet",
          "Please check your internet connection and try again."
        );
        return;
      }

      Alert.alert(
        "Sync Data",
        "This will sync all local data to the server. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sync",
            onPress: async () => {
              try {
                // Delete all existing collections for this user from Firestore
                const snapshot = await firestore().collection("collections").get();
                const batch = firestore().batch();

                // If admin, delete all. If worker, delete only theirs
                snapshot.docs.forEach((doc) => {
                  const data = doc.data();
                  if (
                    user.role === "admin" ||
                    data.workerName === user.displayName
                  ) {
                    batch.delete(doc.ref);
                  }
                });

                await batch.commit();

                // Add all local collections to Firestore
                const stored = await AsyncStorage.getItem("@local_collections");
                const allLocal = stored ? JSON.parse(stored) : [];

                for (const item of allLocal) {
                  const { localId, ...dataToSync } = item;
                  await firestore().collection("collections").add(dataToSync);
                }

                // Update last synced timestamp
                const syncTime = new Date().toISOString();
                await AsyncStorage.setItem("@last_synced", syncTime);
                setLastSynced(syncTime);

                setPendingChanges(false);
                
                // Run auto-cleanup after sync (deletes data older than 1 month)
                console.log("Running post-sync cleanup...");
                await autoCleanup();
                
                Alert.alert("Success", "All data synced to server!");
              } catch (error) {
                Alert.alert(
                  "Sync Failed",
                  "Unable to sync. Please check your internet connection and try again."
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Sync Error", error.message);
    }
  };

  const renderItem = ({ item, section }) => {
    const key = `${section.title}-${item.counterName}`;
    const isExpanded = expandedCounters[key];

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => toggleCounter(key)}
          style={styles.cardHeader}
        >
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
              <View key={col.localId || idx} style={styles.breakdownItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{col.workerName}</Text>
                  <Text style={styles.modeText}>
                    {col.mode === "offline" ? "Cash" : "Online"}
                  </Text>
                </View>
                <Text style={styles.breakdownAmount}>₹{col.amount}</Text>
                
                {/* Show lock icon for read-only entries (worker viewing past dates) */}
                {user?.role !== "admin" && col.date !== todayDate ? (
                  <View style={styles.readOnlyBadge}>
                    <MaterialIcon name="lock" size={16} color="#999" />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => openEditModal(col)}
                      style={styles.iconBtn}
                    >
                      <MaterialIcon name="edit" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteItem(col)}
                      style={styles.iconBtn}
                    >
                      <MaterialIcon name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </>
                )}
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
      <View style={styles.topBar}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <Text style={styles.title}>
          {user?.role === "admin" ? "All Collections" : "My Collections"}
        </Text>
      </View>

      {/* Last Synced Info */}
      {lastSynced && (
        <View style={styles.syncInfo}>
          <MaterialIcon name="cloud-done" size={14} color="#2ecc71" />
          <Text style={styles.syncInfoText}>
            Last synced: {new Date(lastSynced).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: 'short'
            })}
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        {/* Date Filter - Available for both admin and workers */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setDateModalVisible(true)}
        >
          <MaterialIcon name="calendar-today" size={18} color="#007AFF" />
          <Text style={styles.filterText}>
            {selectedDate || (user?.role === "admin" ? "All Dates" : "Today")}
          </Text>
          {user?.role !== "admin" && selectedDate && selectedDate !== todayDate && (
            <MaterialIcon name="lock" size={14} color="#ff9800" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.syncBtn} onPress={syncToFirebase}>
          <MaterialIcon name="sync" size={20} color="#fff" />
          <Text style={styles.syncBtnText}>Sync</Text>
          {pendingChanges && <View style={styles.pendingDot} />}
        </TouchableOpacity>
      </View>

      {/* Info for workers viewing past dates */}
      {user?.role !== "admin" && selectedDate && selectedDate !== todayDate && (
        <View style={styles.readOnlyBanner}>
          <MaterialIcon name="info" size={18} color="#ff9800" />
          <Text style={styles.readOnlyText}>
            Viewing past date ({selectedDate}). You can view but cannot edit these entries.
          </Text>
        </View>
      )}

      {/* Date Filter Modal with Calendar */}
      <Modal visible={dateModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.calendarModalBox}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            <Calendar
              current={selectedDate || todayDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setDateModalVisible(false);
              }}
              markedDates={{
                ...(selectedDate ? {
                  [selectedDate]: {
                    selected: true,
                    selectedColor: '#007AFF',
                    selectedTextColor: '#fff'
                  }
                } : {}),
                [todayDate]: {
                  marked: true,
                  dotColor: '#2ecc71'
                }
              }}
              maxDate={todayDate}
              minDate={(() => {
                const today = new Date();
                today.setDate(today.getDate() - 30); // Only last 30 days
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
                style={styles.allDatesBtn}
                onPress={() => {
                  setSelectedDate(null);
                  setDateModalVisible(false);
                }}
              >
                <MaterialIcon name="event" size={20} color="#fff" />
                <Text style={styles.allDatesBtnText}>All Dates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() => {
                  setSelectedDate(todayDate);
                  setDateModalVisible(false);
                }}
              >
                <MaterialIcon name="today" size={20} color="#fff" />
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

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Collection</Text>
            {editItem && (
              <ScrollView>
                <Text style={styles.label}>Counter: {editItem.counterName}</Text>
                <Text style={styles.label}>Worker: {editItem.workerName}</Text>
                
                <Text style={styles.label}>Amount:</Text>
                <TextInput
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="Enter amount"
                />

                <Text style={styles.label}>Mode:</Text>
                <View style={styles.modeBox}>
                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      editMode === "offline" && styles.activeMode,
                    ]}
                    onPress={() => setEditMode("offline")}
                  >
                    <Text>Cash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      editMode === "online" && styles.activeMode,
                    ]}
                    onPress={() => setEditMode("online")}
                  >
                    <Text>Online</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveEditBtn}
                    onPress={saveEdit}
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {sections.length === 0 ? (
        <View style={styles.noDataContainer}>
          <MaterialIcon name="event-busy" size={64} color="#ccc" />
          {selectedDate ? (
            <>
              <Text style={styles.noData}>0 Collections</Text>
              <Text style={styles.noDataHint}>No collections on {selectedDate}</Text>
            </>
          ) : (
            <>
              <Text style={styles.noData}>0 Collections</Text>
              <Text style={styles.noDataHint}>
                {user?.role === "admin" ? "No collections found" : "You haven't added any collections yet"}
              </Text>
            </>
          )}
        </View>
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
        <Text style={styles.summaryTitle}>
          {selectedDate ? `Summary - ${selectedDate}` : "Summary"}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cash:</Text>
          <Text style={styles.summaryValue}>₹{totals.cash.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Online:</Text>
          <Text style={styles.summaryValue}>₹{totals.online.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>₹{totals.grand.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, backgroundColor: "#f7f7f7" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: "bold", flex: 1, marginLeft: 10 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 15,
    gap: 8,
  },
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
  },
  counterName: { fontWeight: "bold", fontSize: 16 },
  amount: { fontWeight: "bold", fontSize: 18, color: "#2ecc71", marginRight: 8 },
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
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  noData: { 
    textAlign: "center", 
    marginTop: 16, 
    color: "#777",
    fontSize: 18,
    fontWeight: "600",
  },
  noDataHint: {
    textAlign: "center",
    marginTop: 8,
    color: "#999",
    fontSize: 14,
  },
  summary: {
    marginTop: 10,
    backgroundColor: "#d4f4d7",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 12,
    color: "#2c5f2d",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#2c5f2d",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c5f2d",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#2ecc71",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c5f2d",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c5f2d",
  },
  backBtn: {
    padding: 4,
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  syncInfoText: {
    fontSize: 12,
    color: "#666",
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 13,
    color: "#856404",
    fontWeight: "500",
  },
  readOnlyBadge: {
    padding: 8,
    marginLeft: 4,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2ecc71",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    position: "relative",
  },
  syncBtnText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  pendingDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff6b6b",
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
    alignItems: "center",
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
    marginRight: 8,
  },
  iconBtn: {
    padding: 4,
    marginLeft: 4,
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
  calendarModalBox: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 16,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  calendarScroll: {
    maxHeight: 450,
    paddingHorizontal: 15,
  },
  calendarDateItem: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedCalendarDate: {
    backgroundColor: "#e3f2fd",
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateIconBox: {
    width: 50,
    height: 50,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateDay: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  dateMonth: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  dateInfo: {
    flex: 1,
  },
  calendarDateText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  dateYear: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
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
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtn: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  modeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
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
  buttonRow: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  calendarFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  allDatesBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9c27b0",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  allDatesBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
    fontSize: 14,
  },
});

export default ViewCollectionsScreen;
