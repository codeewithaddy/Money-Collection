import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firestore from "@react-native-firebase/firestore";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Calendar } from 'react-native-calendars';
import { syncSellerEntriesBidirectional, queueSellerDelete } from "../utils/sellerSync";

export default function ViewSellerLedgerScreen({ navigation }) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  const [sellers, setSellers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [sellerModal, setSellerModal] = useState(false);
  const [monthModal, setMonthModal] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedSeller, setSelectedSeller] = useState(null); // {id, name}
  const [selectedMonth, setSelectedMonth] = useState("all"); // 'all' or 'YYYY-MM'

  const [editModal, setEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState('purchase');
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDateModal, setEditDateModal] = useState(false);

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
        },
        () => setSellers([])
      );
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@local_seller_entries");
        const list = raw ? JSON.parse(raw) : [];
        setEntries(Array.isArray(list) ? list : []);
      } catch (_) {
        setEntries([]);
      }
    })();
    try { syncSellerEntriesBidirectional(); } catch (_) {}
    return () => {
      try { unsub && unsub(); } catch (_) {}
    };
  }, [allowed]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (!e.date) return;
      set.add(e.date.slice(0, 7));
    });
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [entries]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => (selectedSeller ? e.sellerId === selectedSeller.id : true))
      .filter((e) => (selectedMonth === "all" ? true : e.date?.startsWith(selectedMonth)))
      .filter((e) =>
        search.trim() ? (e.description || "").toLowerCase().includes(search.toLowerCase()) : true
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, selectedSeller, selectedMonth, search]);

  const totals = useMemo(() => {
    const purchased = filtered.filter((e) => e.type === "purchase").reduce((s, e) => s + e.amount, 0);
    const paid = filtered.filter((e) => e.type === "payment").reduce((s, e) => s + e.amount, 0);
    return { purchased, paid, outstanding: purchased - paid };
  }, [filtered]);

  const openEdit = (item) => {
    setEditingItem(item);
    setEditType(item.type);
    setEditDesc(item.description || '');
    setEditAmount(String(item.amount || ''));
    setEditDate(item.date);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    const num = Number(editAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Validation', 'Enter a valid amount > 0');
      return;
    }

    const updated = {
      ...editingItem,
      type: editType,
      description: (editDesc || '').trim(),
      amount: num,
      date: editDate,
      timestamp: editingItem.timestamp || new Date().toISOString(),
    };

    try {
      // Update local list
      const raw = await AsyncStorage.getItem('@local_seller_entries');
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((e) => (e.localId || e.remoteId) === (editingItem.localId || editingItem.remoteId));
      let pendingUpdate = false;

      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updated };
      }

      // Try remote update if we have Firestore-like ID
      const id = editingItem.localId;
      const isFirestoreId = id && id.length === 20 && /^[a-zA-Z0-9]+$/.test(id);
      if (isFirestoreId) {
        try {
          const { localId, remoteId, ...toSync } = { ...list[idx] };
          await firestore().collection('sellerEntries').doc(id).set(toSync);
        } catch (e) {
          pendingUpdate = true;
        }
      } else {
        // offline local item - will be inserted on next sync
        pendingUpdate = true;
      }

      if (pendingUpdate && idx !== -1) {
        list[idx] = { ...list[idx], pendingUpdate: true };
      }

      await AsyncStorage.setItem('@local_seller_entries', JSON.stringify(list));
      setEntries(list);
      try { await syncSellerEntriesBidirectional(); } catch (_) {}
      setEditModal(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const confirmDelete = (item) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
      ]
    );
  };

  const handleDelete = async (item) => {
    try {
      // Remove locally
      const raw = await AsyncStorage.getItem('@local_seller_entries');
      const list = raw ? JSON.parse(raw) : [];
      const id = item.localId;
      const remaining = list.filter((e) => (e.localId || e.remoteId) !== (id || item.remoteId));
      await AsyncStorage.setItem('@local_seller_entries', JSON.stringify(remaining));
      setEntries(remaining);

      // Try remote delete, else queue
      const isFirestoreId = id && id.length === 20 && /^[a-zA-Z0-9]+$/.test(id);
      if (isFirestoreId) {
        try {
          await firestore().collection('sellerEntries').doc(id).delete();
        } catch (_) {
          try { await queueSellerDelete(id); } catch (_) {}
        }
      }

      try { await syncSellerEntriesBidirectional(); } catch (_) {}
    } catch (e) {
      Alert.alert('Error', 'Failed to delete entry');
    }
  };

  const ListHeader = (
    <View>
      {/* Seller selector */}
      <TouchableOpacity style={styles.selector} onPress={() => setSellerModal(true)}>
        <Icon name="store" size={22} color="#007AFF" />
        <Text style={styles.selectorText}>
          {selectedSeller ? selectedSeller.name : "All Sellers"}
        </Text>
        <Icon name="arrow-drop-down" size={24} color="#666" />
      </TouchableOpacity>

      {/* Month selector */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.monthBtn, selectedMonth === 'all' && styles.monthActive]} onPress={() => setSelectedMonth('all')}>
          <Text style={[styles.monthText, selectedMonth === 'all' && styles.monthTextActive]}>All Time</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.monthBtn} onPress={() => setMonthModal(true)}>
          <Text style={styles.monthText}>{selectedMonth === 'all' ? 'Choose Month' : selectedMonth}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search description..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
          <Icon name="inventory" size={24} color="#2ecc71" />
          <Text style={styles.statValue}>₹{totals.purchased.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Purchased</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
          <Icon name="payments" size={24} color="#2196f3" />
          <Text style={styles.statValue}>₹{totals.paid.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Paid</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
          <Icon name="account-balance" size={24} color="#ff9800" />
          <Text style={styles.statValue}>₹{totals.outstanding.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Outstanding</Text>
        </View>
      </View>
    </View>
  );

  if (!checked) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#e74c3c' }}>Super Admin only</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: '#fff' }}>Back</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Ledger</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SellerPDFExport')} style={{ padding: 4 }}>
          <Icon name="picture-as-pdf" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => item.localId || `${item.sellerId}-${item.date}-${idx}`}
        renderItem={({ item }) => (
          <View style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryDate}>{item.date}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.entryAmount, item.type === 'purchase' ? styles.amountPurchase : styles.amountPayment]}>₹{item.amount}</Text>
                <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 6, marginLeft: 8 }}>
                  <Icon name="edit" size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={{ padding: 6 }}>
                  <Icon name="delete" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.entrySeller}>{item.sellerName}</Text>
            {!!item.description && <Text style={styles.entryDesc}>{item.description}</Text>}
            <View style={[styles.typeBadge, item.type === 'purchase' ? styles.badgePurchase : styles.badgePayment]}>
              <Text style={styles.badgeText}>{item.type === 'purchase' ? 'Purchase' : 'Payment'}</Text>
            </View>
          </View>
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 20 }}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Icon name="inbox" size={64} color="#ccc" />
            <Text style={{ color: '#999', marginTop: 12 }}>No entries</Text>
          </View>
        }
      />

      {/* Seller Modal */}
      <Modal visible={sellerModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Seller</Text>
            <FlatList
              data={sellers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedSeller(item);
                    setSellerModal(false);
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{item.name}</Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>{item.location || '-'}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={{ height: 1, backgroundColor: '#eee', marginTop: 8 }} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSellerModal(false)}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Month Modal */}
      <Modal visible={monthModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <FlatList
              data={availableMonths}
              keyExtractor={(m) => m}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedMonth(item); setMonthModal(false); }}>
                  <Text style={{ fontSize: 15 }}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: '#999' }}>No months available</Text>}
            />
            <View style={{ height: 1, backgroundColor: '#eee', marginTop: 8 }} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setMonthModal(false)}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Entry</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, editType === 'purchase' && styles.typeActive]} onPress={() => setEditType('purchase')}>
                <Text style={[styles.typeText, editType === 'purchase' && styles.typeTextActive]}>Purchase</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, editType === 'payment' && styles.typeActive]} onPress={() => setEditType('payment')}>
                <Text style={[styles.typeText, editType === 'payment' && styles.typeTextActive]}>Payment</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Description (optional)"
              placeholderTextColor="#666"
              value={editDesc}
              onChangeText={setEditDesc}
              style={styles.input}
            />
            <TextInput
              placeholder="Amount"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
              style={styles.input}
            />
            <TouchableOpacity style={styles.dateSelector} onPress={() => setEditDateModal(true)}>
              <Icon name="calendar-today" size={20} color="#007AFF" />
              <Text style={styles.dateSelectorText}>{editDate || 'Select date'}</Text>
              <Icon name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editDateModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <Calendar
              current={editDate}
              onDayPress={(d) => { setEditDate(d.dateString); setEditDateModal(false); }}
              maxDate={new Date().toISOString().slice(0,10)}
            />
            <TouchableOpacity style={[styles.closeBtn, { marginTop: 12 }]} onPress={() => setEditDateModal(false)}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 12, elevation: 1 },
  selectorText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#333' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  monthBtn: { flex: 1, alignItems: 'center', backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10 },
  monthActive: { backgroundColor: '#e3f2fd' },
  monthText: { fontWeight: '600', color: '#333' },
  monthTextActive: { color: '#007AFF' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, padding: 0, color: '#000' },
  statCard: { flex: 1, padding: 14, borderRadius: 12, marginRight: 10, alignItems: 'center', elevation: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 6 },
  statLabel: { fontSize: 12, color: '#666' },
  entryCard: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginHorizontal: 12, marginBottom: 10, elevation: 1 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  entryDate: { fontSize: 13, color: '#666' },
  entryAmount: { fontSize: 16, fontWeight: 'bold' },
  amountPurchase: { color: '#2e7d32' },
  amountPayment: { color: '#1976d2' },
  entrySeller: { fontSize: 14, fontWeight: '600', color: '#333' },
  entryDesc: { fontSize: 12, color: '#666', marginTop: 4 },
  typeBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgePurchase: { backgroundColor: '#e8f5e9' },
  badgePayment: { backgroundColor: '#e3f2fd' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  backBtn: { marginTop: 12, backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeBtn: { flex: 1, alignItems: 'center', backgroundColor: '#f0f0f0', padding: 10, borderRadius: 10 },
  typeActive: { backgroundColor: '#e3f2fd' },
  typeText: { fontWeight: '600', color: '#333' },
  typeTextActive: { color: '#007AFF' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginTop: 8, color: '#000' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginTop: 8 },
  dateSelectorText: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#333' },
  saveBtn: { flex: 1, backgroundColor: '#2ecc71', padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#6c757d', padding: 12, borderRadius: 8, alignItems: 'center' },
});
