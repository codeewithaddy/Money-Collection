import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, ScrollView } from "react-native";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Calendar } from 'react-native-calendars';
import { syncSellerEntriesBidirectional } from '../utils/sellerSync';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function AddSellerEntryScreen({ navigation }) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [sellerSearch, setSellerSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [type, setType] = useState("purchase"); // purchase | payment
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [sellerModalVisible, setSellerModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@current_user");
        const user = raw ? JSON.parse(raw) : null;
        const doc = await firestore().collection("config").doc("superAdmin").get();
        const username = doc?.data()?.username || "anil";
        const current = user?.username || user?.id;
        setAllowed(!!current && current === username);
      } catch (e) {
        setAllowed(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const unsub = firestore()
      .collection("sellers")
      .onSnapshot(
        (snap) => {
          const list = (snap?.docs || [])
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => s.isActive !== false);
          setSellers(list);
          setFilteredSellers(list);
        },
        (err) => {
          console.log("sellers snapshot error:", err?.message);
          setSellers([]);
          setFilteredSellers([]);
        }
      );
    // default today
    setDate(getToday());
    try { syncSellerEntriesBidirectional(); } catch (_) {}
    return () => {
      try { unsub && unsub(); } catch (_) {}
    };
  }, [allowed]);

  const getToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSellerSearch = (txt) => {
    setSellerSearch(txt);
    if (!txt.trim()) setFilteredSellers(sellers);
    else setFilteredSellers(sellers.filter(s => (s.name || "").toLowerCase().includes(txt.toLowerCase())));
  };

  const saveEntry = async () => {
    if (!selectedSeller) {
      Alert.alert("Validation", "Please select a seller");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Validation", "Enter a valid amount > 0");
      return;
    }

    const entry = {
      sellerId: selectedSeller.id,
      sellerName: selectedSeller.name,
      type, // purchase or payment
      description: description.trim(),
      amount: Number(amount),
      date,
      timestamp: new Date().toISOString(),
      localId: Date.now().toString(),
    };

    try {
      const net = await NetInfo.fetch();
      let docRef = null;
      if (net?.isConnected) {
        try {
          const { localId, ...dataToSync } = entry;
          docRef = await firestore().collection("sellerEntries").add(dataToSync);
        } catch (e) {
          console.log("sellerEntries Firestore save failed:", e?.message);
        }
      }

      // Save locally
      let list = [];
      try {
        const raw = await AsyncStorage.getItem("@local_seller_entries");
        list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
      } catch (_) {
        list = [];
      }
      list.push({ ...entry, localId: docRef ? docRef.id : entry.localId });
      await AsyncStorage.setItem("@local_seller_entries", JSON.stringify(list));

      Alert.alert("Saved", `${type === 'purchase' ? 'Purchase' : 'Payment'} saved successfully`);
      try { await syncSellerEntriesBidirectional(); } catch (_) {}
      setSelectedSeller(null);
      setType("purchase");
      setDescription("");
      setAmount("");
      setDate(getToday());
    } catch (e) {
      Alert.alert("Error", "Failed to save entry");
    }
  };

  if (!checked) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: colors.muted }}>Loading...</Text>
    </View>
  );

  if (!allowed) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ fontSize: 16, color: colors.danger }}>Super Admin only</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: colors.white }}>Back</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
        <Icon name="arrow-back" size={24} color={colors.accent} />
      </TouchableOpacity>
      <Text style={styles.title}>Add Seller Entry</Text>

      <TouchableOpacity style={styles.dropdown} onPress={() => setSellerModalVisible(true)}>
        <Text style={{ fontSize: 16, color: colors.text }}>{selectedSeller ? selectedSeller.name : 'Select Seller'}</Text>
        <Icon name="arrow-drop-down" size={24} color={colors.muted} />
      </TouchableOpacity>

      <View style={styles.typeRow}>
        <TouchableOpacity style={[styles.typeBtn, type === 'purchase' && styles.typeActive]} onPress={() => setType('purchase')}>
          <Text style={[styles.typeText, type === 'purchase' && styles.typeTextActive]}>Purchase</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeBtn, type === 'payment' && styles.typeActive]} onPress={() => setType('payment')}>
          <Text style={[styles.typeText, type === 'payment' && styles.typeTextActive]}>Payment</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Description (optional)"
        placeholderTextColor={colors.muted}
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />

      <TextInput
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
        placeholderTextColor={colors.muted}
      />

      <TouchableOpacity style={styles.dateSelector} onPress={() => setDateModalVisible(true)}>
        <Icon name="calendar-today" size={20} color={colors.accent} />
        <Text style={styles.dateSelectorText}>{date}</Text>
        <Icon name="arrow-drop-down" size={24} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: typography.weightSemibold }}>Save</Text>
      </TouchableOpacity>

      {/* Seller Modal */}
      <Modal visible={sellerModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <TextInput
              placeholder="Search seller..."
              placeholderTextColor={colors.muted}
              value={sellerSearch}
              onChangeText={handleSellerSearch}
              style={styles.searchBox}
            />
            <FlatList
              data={filteredSellers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => { setSelectedSeller(item); setSellerModalVisible(false); }}>
                  <Text style={{ fontSize: 15, color: colors.text }}>{item.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{item.location || '-'}</Text>
                </TouchableOpacity>
              )}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            />
            <View style={{ height: 1, backgroundColor: colors.border, marginTop: 8 }} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSellerModalVisible(false)}>
              <Text style={{ color: colors.white }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Modal */}
      <Modal visible={dateModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.calendarModalBox}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <Calendar
              current={date}
              onDayPress={(day) => { setDate(day.dateString); setDateModalVisible(false); }}
              maxDate={getToday()}
              theme={{
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: colors.white,
                todayTextColor: colors.success,
                arrowColor: colors.accent,
                monthTextColor: colors.text,
                dayTextColor: colors.text,
                textSectionTitleColor: colors.muted,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.todayBtn, { flex: 1 }]} onPress={() => { setDate(getToday()); setDateModalVisible(false); }}>
                <Icon name="today" size={20} color={colors.white} />
                <Text style={{ color: colors.white, fontWeight: '600' }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDateModalVisible(false)}>
                <Text style={{ color: colors.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: typography.h1, fontWeight: typography.weightBold, marginBottom: 16, color: colors.accent },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  typeActive: { backgroundColor: '#F2F4F7' },
  typeText: { color: colors.text, fontWeight: typography.weightSemibold },
  typeTextActive: { color: colors.accent },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, borderRadius: 10, padding: 12, marginBottom: 12 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 12, gap: 8, borderWidth: 1, borderColor: colors.border },
  dateSelectorText: { flex: 1, fontSize: typography.subtitle, fontWeight: typography.weightSemibold, color: colors.accent },
  saveBtn: { backgroundColor: colors.accent, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBox: { backgroundColor: colors.surface, margin: 20, padding: 16, borderRadius: 16, maxHeight: '70%', borderWidth: 1, borderColor: colors.border },
  searchBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginBottom: 10, color: colors.text, backgroundColor: colors.bg },
  listItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { backgroundColor: colors.accent, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  calendarModalBox: { backgroundColor: colors.surface, margin: 20, borderRadius: 16, padding: 16, maxHeight: '80%', borderWidth: 1, borderColor: colors.border },
  todayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, padding: 12, borderRadius: 10, gap: 6 },
  backBtn: { marginTop: 12, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});
