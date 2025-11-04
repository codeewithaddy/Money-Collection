// src/screens/ViewOnShopScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import firestore from "@react-native-firebase/firestore";
import Icon from "react-native-vector-icons/MaterialIcons";
import { autoCleanup } from "../utils/dataCleanup";

const ViewOnShopScreen = ({ navigation }) => {
  const [sections, setSections] = useState([]);
  const [totals, setTotals] = useState({ cash: 0, online: 0, grand: 0 });
  const [user, setUser] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMode, setEditMode] = useState("offline");
  const [localOnShop, setLocalOnShop] = useState([]);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [todayDate, setTodayDate] = useState("");

  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

  useEffect(() => {
    const updateTodayDate = () => {
      setTodayDate(getTodayIST());
    };
    updateTodayDate();

    const checkMidnight = setInterval(() => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();
      if (hours === 0 && minutes === 0) {
        updateTodayDate();
      }
    }, 60000);

    return () => clearInterval(checkMidnight);
  }, []);

  // Auto-sync from Firestore when screen loads
  const autoSyncFromFirestore = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        console.log("Auto-syncing OnShop from Firestore...");
        
        const firestoreSnapshot = await firestore()
          .collection("onShopCollections")
          .get();
        
        if (!firestoreSnapshot.empty) {
          const firestoreData = firestoreSnapshot.docs.map((doc) => ({
            ...doc.data(),
            localId: doc.id,
          }));
          
          console.log(`Auto-downloaded ${firestoreData.length} OnShop entries from Firestore`);
          
          const stored = await AsyncStorage.getItem("@local_onshop");
          const localData = stored ? JSON.parse(stored) : [];
          
          const combined = [...firestoreData];
          const timestamps = new Set(firestoreData.map(item => item.timestamp));
          
          localData.forEach(item => {
            if (!timestamps.has(item.timestamp)) {
              combined.push(item);
            }
          });
          
          await AsyncStorage.setItem(
            "@local_onshop",
            JSON.stringify(combined)
          );
          
          console.log(`Merged OnShop data: ${combined.length} total entries`);
        }
      }
    } catch (error) {
      console.log("Auto-sync OnShop error (non-critical):", error.message);
    }
  };

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem("@current_user");
      if (!raw) return;
      const userData = JSON.parse(raw);
      setUser(userData);

      await autoSyncFromFirestore();

      const stored = await AsyncStorage.getItem("@local_onshop");
      const allOnShop = stored ? JSON.parse(stored) : [];

      // Calculate cutoff date (30 days ago)
      const cutoffDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })();

      let filtered = allOnShop.filter((item) => item.date >= cutoffDate);

      // Filter by user role
      if (userData.role !== "admin") {
        filtered = filtered.filter((item) => item.receivedBy === userData.displayName);
      }

      setLocalOnShop(filtered);

      // Group by date
      const grouped = {};
      filtered.forEach((item) => {
        if (!grouped[item.date]) {
          grouped[item.date] = [];
        }
        grouped[item.date].push(item);
      });

      // Convert to sections format
      const sectionsData = Object.keys(grouped)
        .sort((a, b) => new Date(b) - new Date(a))
        .map((date) => ({
          title: date,
          data: grouped[date],
        }));

      setSections(sectionsData);

      // Calculate totals
      const cash = filtered.filter((c) => c.mode === "offline").reduce((sum, c) => sum + c.amount, 0);
      const online = filtered.filter((c) => c.mode === "online").reduce((sum, c) => sum + c.amount, 0);
      setTotals({ cash, online, grand: cash + online });

      // Check last synced
      const lastSync = await AsyncStorage.getItem("@last_synced_onshop");
      setLastSynced(lastSync);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadData);
    return unsubscribe;
  }, [navigation]);

  const toggleDate = (date) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
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
    setEditName(item.customerName);
    setEditAmount(String(item.amount));
    setEditMode(item.mode);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editName || editName.trim() === "") {
      return Alert.alert("Error", "Please enter customer name");
    }
    
    if (!editAmount || isNaN(editAmount)) {
      return Alert.alert("Error", "Please enter a valid amount");
    }

    try {
      const stored = await AsyncStorage.getItem("@local_onshop");
      const allLocal = stored ? JSON.parse(stored) : [];
      const updatedEntries = allLocal.map((item) =>
        item.localId === editItem.localId
          ? { ...item, customerName: editName.trim(), amount: Number(editAmount), mode: editMode }
          : item
      );

      await AsyncStorage.setItem(
        "@local_onshop",
        JSON.stringify(updatedEntries)
      );

      // Update Firestore if online
      try {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
          const docRef = firestore().collection("onShopCollections").doc(editItem.localId);
          const docSnap = await docRef.get();
          
          if (docSnap.exists) {
            await docRef.update({
              customerName: editName.trim(),
              amount: Number(editAmount),
              mode: editMode,
            });
            console.log("Updated OnShop in Firestore:", editItem.localId);
            setEditModalVisible(false);
            loadData();
            Alert.alert("Success", "Updated on server and device!");
          } else {
            console.log("Document not in Firestore yet, marking for sync");
            setPendingChanges(true);
            setEditModalVisible(false);
            loadData();
            Alert.alert("Updated locally", "Click Sync to upload to server.");
          }
        } else {
          setPendingChanges(true);
          setEditModalVisible(false);
          loadData();
          Alert.alert("Updated locally", "Will sync to server when online.");
        }
      } catch (firestoreError) {
        console.log("Could not update Firestore:", firestoreError.message);
        setPendingChanges(true);
        setEditModalVisible(false);
        loadData();
        Alert.alert("Updated locally", "Click Sync to save to server.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update entry.");
      console.error("Edit error:", error);
    }
  };

  const deleteItem = async (item) => {
    if (user?.role !== "admin" && item.date !== todayDate) {
      Alert.alert(
        "Read-Only",
        "You can only delete today's entries. This entry is from " + item.date + ".\n\nOnly admin can delete past entries."
      );
      return;
    }

    Alert.alert(
      "Delete Entry",
      `Delete ${item.customerName} - ₹${item.amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem("@local_onshop");
              const allLocal = stored ? JSON.parse(stored) : [];
              const updatedEntries = allLocal.filter(
                (entry) => entry.localId !== item.localId
              );
              await AsyncStorage.setItem(
                "@local_onshop",
                JSON.stringify(updatedEntries)
              );

              try {
                const netInfo = await NetInfo.fetch();
                if (netInfo.isConnected) {
                  const docRef = firestore().collection("onShopCollections").doc(item.localId);
                  const docSnap = await docRef.get();
                  
                  if (docSnap.exists) {
                    await docRef.delete();
                    console.log("Deleted from Firestore:", item.localId);
                    Alert.alert("Deleted", "Entry removed from server and device.");
                  } else {
                    console.log("Document not in Firestore, only local delete");
                    Alert.alert("Deleted", "Entry removed from device.");
                  }
                } else {
                  setPendingChanges(true);
                  Alert.alert("Deleted locally", "Will be removed from server when you sync.");
                }
              } catch (firestoreError) {
                console.log("Could not delete from Firestore:", firestoreError.message);
                setPendingChanges(true);
                Alert.alert("Deleted locally", "Click Sync to remove from server.");
              }

              loadData();
            } catch (error) {
              Alert.alert("Error", "Failed to delete entry.");
              console.error("Delete error:", error);
            }
          },
        },
      ]
    );
  };

  const syncToFirebase = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert(
          "No Internet",
          "Please check your internet connection and try again."
        );
        return;
      }

      Alert.alert(
        "Sync OnShop Data",
        "This will sync all OnShop data between device and server. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sync",
            onPress: async () => {
              try {
                console.log("=== Starting OnShop Bidirectional Sync ===");
                
                const stored = await AsyncStorage.getItem("@local_onshop");
                const allLocal = stored ? JSON.parse(stored) : [];
                console.log(`Local OnShop entries: ${allLocal.length}`);

                let uploadedCount = 0;
                for (const item of allLocal) {
                  const { localId, ...dataToSync } = item;
                  
                  const isFirestoreId = localId && localId.length === 20 && /^[a-zA-Z0-9]+$/.test(localId);
                  
                  if (!isFirestoreId) {
                    try {
                      const newDoc = await firestore().collection("onShopCollections").add(dataToSync);
                      console.log(`Uploaded offline OnShop item, new ID: ${newDoc.id}`);
                      
                      const index = allLocal.findIndex(i => i.localId === localId);
                      if (index !== -1) {
                        allLocal[index].localId = newDoc.id;
                      }
                      
                      uploadedCount++;
                    } catch (uploadError) {
                      console.log(`Failed to upload OnShop item ${localId}:`, uploadError.message);
                    }
                  } else {
                    try {
                      const docSnap = await firestore().collection("onShopCollections").doc(localId).get();
                      if (!docSnap.exists) {
                        await firestore().collection("onShopCollections").doc(localId).set(dataToSync);
                        uploadedCount++;
                        console.log(`Re-uploaded missing OnShop doc: ${localId}`);
                      }
                    } catch (checkError) {
                      console.log(`Could not verify OnShop doc ${localId}:`, checkError.message);
                    }
                  }
                }
                console.log(`Uploaded new OnShop entries: ${uploadedCount}`);

                const firestoreSnapshot = await firestore()
                  .collection("onShopCollections")
                  .get();
                
                const firestoreData = firestoreSnapshot.docs.map((doc) => ({
                  ...doc.data(),
                  localId: doc.id,
                }));
                console.log(`Downloaded from Firestore: ${firestoreData.length}`);

                await AsyncStorage.setItem(
                  "@local_onshop",
                  JSON.stringify(firestoreData)
                );
                console.log("Local storage updated with server data");

                const syncTime = new Date().toISOString();
                await AsyncStorage.setItem("@last_synced_onshop", syncTime);
                setLastSynced(syncTime);

                setPendingChanges(false);
                
                console.log("Running post-sync cleanup...");
                await autoCleanup();
                
                await loadData();
                
                console.log("=== OnShop Sync Complete ===");
                Alert.alert(
                  "Success", 
                  `Synced! Uploaded: ${uploadedCount}, Total in database: ${firestoreData.length}`
                );
              } catch (error) {
                console.error("Sync error:", error);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.receivedBy}>Received by: {item.receivedBy}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>₹{item.amount}</Text>
          <View style={[styles.modeBadge, item.mode === "online" && styles.modeBadgeOnline]}>
            <Text style={styles.modeText}>{item.mode === "online" ? "Online" : "Cash"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => openEditModal(item)}
        >
          <Icon name="edit" size={18} color="#6DD5B4" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => deleteItem(item)}
        >
          <Icon name="delete" size={18} color="#ff6b6b" />
          <Text style={[styles.actionText, {color: "#ff6b6b"}]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section }) => {
    const isExpanded = expandedDates[section.title];
    const dayTotal = section.data.reduce((sum, item) => sum + item.amount, 0);

    return (
      <TouchableOpacity
        onPress={() => toggleDate(section.title)}
        style={styles.sectionHeader}
      >
        <View style={{flex: 1}}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>{section.data.length} entries</Text>
        </View>
        <Text style={styles.sectionTotal}>₹{dayTotal}</Text>
        <Icon
          name={isExpanded ? "expand-less" : "expand-more"}
          size={24}
          color="#6DD5B4"
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{flex: 1, alignItems: "center"}}>
          <Icon name="store" size={32} color="#6DD5B4" />
          <Text style={styles.title}>OnShop Collections</Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={syncToFirebase}>
          <Icon name="sync" size={20} color="#fff" />
          <Text style={styles.syncBtnText}>Sync</Text>
          {pendingChanges && <View style={styles.pendingDot} />}
        </TouchableOpacity>
      </View>

      <View style={styles.totalsCard}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Cash</Text>
          <Text style={styles.totalValue}>₹{totals.cash}</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Online</Text>
          <Text style={styles.totalValue}>₹{totals.online}</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, {color: "#6DD5B4"}]}>₹{totals.grand}</Text>
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="store" size={64} color="#4A4560" />
          <Text style={styles.emptyText}>No OnShop entries yet</Text>
          <Text style={styles.emptySubtext}>Add your first shop sale</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.localId}
          renderItem={({ item, section }) => 
            expandedDates[section.title] ? renderItem({ item }) : null
          }
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Entry</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.field}>
                <Text style={styles.label}>Customer Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter customer name"
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editAmount}
                  onChangeText={setEditAmount}
                  placeholder="Enter amount"
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Payment Mode</Text>
                <View style={styles.modeContainer}>
                  <TouchableOpacity
                    style={[styles.modeBtn, editMode === "offline" && styles.modeBtnActive]}
                    onPress={() => setEditMode("offline")}
                  >
                    <Text style={[styles.modeText, editMode === "offline" && styles.modeTextActive]}>
                      Cash
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, editMode === "online" && styles.modeBtnActive]}
                    onPress={() => setEditMode("online")}
                  >
                    <Text style={[styles.modeText, editMode === "online" && styles.modeTextActive]}>
                      Online
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Icon name="check-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E2E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#2C2B3E",
    gap: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4A4560",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 5,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6DD5B4",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 5,
  },
  syncBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff6b6b",
  },
  totalsCard: {
    flexDirection: "row",
    backgroundColor: "#2C2B3E",
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  totalItem: {
    flex: 1,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 5,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  totalDivider: {
    width: 1,
    backgroundColor: "#4A4560",
  },
  listContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2B3E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  sectionCount: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  sectionTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6DD5B4",
    marginRight: 10,
  },
  card: {
    backgroundColor: "#2C2B3E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    marginLeft: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  receivedBy: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6DD5B4",
  },
  modeBadge: {
    backgroundColor: "#4A4560",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginTop: 5,
  },
  modeBadgeOnline: {
    backgroundColor: "#6DD5B4",
  },
  modeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#4A4560",
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 5,
    backgroundColor: "#1E1E2E",
    gap: 5,
  },
  actionText: {
    color: "#6DD5B4",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#fff",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#2C2B3E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#6DD5B4",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#1E1E2E",
    padding: 12,
    borderRadius: 8,
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#6DD5B4",
    alignItems: "center",
    backgroundColor: "#1E1E2E",
  },
  modeBtnActive: {
    backgroundColor: "#6DD5B4",
  },
  modeTextActive: {
    color: "#fff",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6DD5B4",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ViewOnShopScreen;
