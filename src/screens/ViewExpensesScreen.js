// src/screens/ViewExpensesScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import GradientBackground from '../components/GradientBackground';

export default function ViewExpensesScreen({ navigation }) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [todayDate, setTodayDate] = useState('');
  const [expenses, setExpenses] = useState([]);

  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

  useEffect(() => {
    const t = getTodayIST();
    setTodayDate(t);
    setSelectedDate(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@current_user');
        const user = raw ? JSON.parse(raw) : null;
        const doc = await firestore().collection('config').doc('superAdmin').get();
        const username = doc?.data()?.username || 'anil';
        const current = user?.username || user?.id;
        setAllowed(!!current && current === username);
      } catch (e) {
        setAllowed(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const syncFromFirestore = async () => {
    try {
      const cutoffDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })();
      const snap = await firestore().collection('expenses').get();
      const remote = snap.docs.map((d) => ({ ...d.data(), localId: d.id }));
      const recent = remote.filter((e) => e.date >= cutoffDate);
      await AsyncStorage.setItem('@local_expenses', JSON.stringify(recent));
      setExpenses(recent);
    } catch (e) {
      // Fallback to local only
      const stored = await AsyncStorage.getItem('@local_expenses');
      const list = stored ? JSON.parse(stored) : [];
      setExpenses(list);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      await syncFromFirestore();
    })();
  }, [allowed]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => !selectedDate || e.date === selectedDate)
      .sort((a, b) => new Date(b.timestamp || `${b.date}T00:00:00Z`) - new Date(a.timestamp || `${a.date}T00:00:00Z`));
  }, [expenses, selectedDate]);

  const total = useMemo(() => filtered.reduce((s, e) => s + (e.amount || 0), 0), [filtered]);

  if (!checked) {
    return (
      <GradientBackground>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: colors.text }}>Loading...</Text>
        </View>
      </GradientBackground>
    );
  }

  if (!allowed) {
    return (
      <GradientBackground>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, color: colors.danger }}>Super Admin only</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: colors.white }}>Back</Text></TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Icon name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expenses</Text>
          <TouchableOpacity onPress={() => setDateModalVisible(true)} style={{ padding: 4 }}>
            <Icon name="event" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>Date: {selectedDate}</Text>
          <Text style={styles.infoText}>Total: ₹{Number(total || 0).toLocaleString()}</Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => item.localId || `${item.name}-${item.date}-${idx}`}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.name || item.title}</Text>
                <Text style={styles.itemSub}>By {item.addedBy || '-'} | {item.mode === 'offline' ? 'Cash' : 'Online'}</Text>
              </View>
              <Text style={styles.itemAmount}>₹{Number(item.amount || 0).toLocaleString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 20 }}>No expenses</Text>}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        />

        <Modal visible={dateModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <Calendar
                current={selectedDate}
                onDayPress={(d) => { setSelectedDate(d.dateString); setDateModalVisible(false); }}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: colors.accent, selectedTextColor: colors.white },
                  [todayDate]: { marked: true, dotColor: colors.success },
                }}
                maxDate={todayDate}
                minDate={(() => { const dt = new Date(); dt.setDate(dt.getDate() - 30); return dt.toISOString().split('T')[0]; })()}
                theme={{
                  selectedDayBackgroundColor: colors.accent,
                  selectedDayTextColor: colors.white,
                  todayTextColor: colors.success,
                  arrowColor: colors.accent,
                  monthTextColor: colors.text,
                }}
              />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDateModalVisible(false)}>
                <Text style={{ color: colors.white, fontWeight: typography.weightSemibold }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: typography.weightBold, color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  infoText: { fontSize: 14, color: colors.text, fontWeight: typography.weightSemibold },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, marginHorizontal: 16, marginBottom: 10, borderRadius: 12 },
  itemTitle: { fontSize: 15, fontWeight: typography.weightSemibold, color: colors.text },
  itemSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  itemAmount: { fontSize: 16, fontWeight: typography.weightBold, color: colors.accent },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox: { backgroundColor: colors.surface, margin: 20, padding: 20, borderRadius: 12, maxHeight: '80%', borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: typography.weightBold, marginBottom: 10, textAlign: 'center', color: colors.accent },
  closeBtn: { backgroundColor: colors.accent, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  backBtn: { marginTop: 12, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
