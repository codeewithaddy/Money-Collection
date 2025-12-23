// src/screens/AddExpenseScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import colors from '../theme/colors';
import typography from '../theme/typography';
import GradientBackground from '../components/GradientBackground';

export default function AddExpenseScreen({ navigation }) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('offline');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [user, setUser] = useState(null);

  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@current_user');
        const u = raw ? JSON.parse(raw) : null;
        setUser(u);
        const doc = await firestore().collection('config').doc('superAdmin').get();
        const username = doc?.data()?.username || 'anil';
        const current = u?.username || u?.id;
        setAllowed(!!current && current === username);
      } catch (e) {
        setAllowed(false);
      } finally {
        setChecked(true);
      }
    })();
    setSelectedDate(getTodayIST());
  }, []);

  const saveExpense = async () => {
    if (!allowed) {
      Alert.alert('Permission', 'Only Super Admin can add expenses.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter expense name');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount > 0');
      return;
    }

    const data = {
      name: name.trim(),
      amount: Number(amount),
      mode,
      date: selectedDate,
      timestamp: new Date().toISOString(),
      addedBy: user?.displayName || 'Unknown',
      localId: Date.now().toString(),
    };

    try {
      const net = await NetInfo.fetch();
      let ref = null;
      if (net?.isConnected) {
        try {
          const { localId, ...payload } = data;
          ref = await firestore().collection('expenses').add(payload);
        } catch (_) {}
      }

      const stored = await AsyncStorage.getItem('@local_expenses');
      const list = stored ? JSON.parse(stored) : [];
      list.push({ ...data, localId: ref ? ref.id : data.localId });
      await AsyncStorage.setItem('@local_expenses', JSON.stringify(list));

      Alert.alert('Saved', `Expense added for ${selectedDate}`);
      setName('');
      setAmount('');
      setMode('offline');
      setSelectedDate(getTodayIST());
    } catch (e) {
      Alert.alert('Error', 'Failed to save expense');
    }
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Icon name="money-off" size={32} color={colors.accent} />
          <Text style={styles.title}>Add Expense</Text>
          <Text style={styles.subtitle}>Record your day's expenditure</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowCalendar(!showCalendar)}>
            <Icon name="calendar-today" size={20} color={colors.accent} />
            <Text style={styles.dateText}>{selectedDate}</Text>
          </TouchableOpacity>
        </View>

        {showCalendar && (
          <Calendar
            onDayPress={(d) => { setSelectedDate(d.dateString); setShowCalendar(false); }}
            markedDates={{ [selectedDate]: { selected: true, selectedColor: colors.accent, selectedTextColor: colors.white } }}
            theme={{
              selectedDayBackgroundColor: colors.accent,
              selectedDayTextColor: colors.white,
              todayTextColor: colors.success,
              arrowColor: colors.accent,
              monthTextColor: colors.text,
            }}
            style={styles.calendar}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Expense Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Diesel, Tea"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Payment Mode</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity style={[styles.modeBtn, mode === 'offline' && styles.modeBtnActive]} onPress={() => setMode('offline')}>
              <Icon name="payments" size={18} color={mode === 'offline' ? colors.white : colors.accent} />
              <Text style={[styles.modeText, mode === 'offline' && styles.modeTextActive]}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, mode === 'online' && styles.modeBtnActive]} onPress={() => setMode('online')}>
              <Icon name="account-balance" size={18} color={mode === 'online' ? colors.white : colors.accent} />
              <Text style={[styles.modeText, mode === 'online' && styles.modeTextActive]}>Online</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveExpense}>
          <Icon name="check-circle" size={22} color={colors.white} />
          <Text style={styles.saveText}>Save Expense</Text>
        </TouchableOpacity>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: typography.h2, fontWeight: typography.weightBold, color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: colors.accent, fontWeight: typography.weightSemibold, marginBottom: 8 },
  input: { backgroundColor: colors.surface, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 16 },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  dateText: { marginLeft: 10, fontSize: 16, color: colors.text },
  calendar: { borderRadius: 10, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.surface },
  modeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modeText: { color: colors.accent, fontWeight: typography.weightSemibold },
  modeTextActive: { color: colors.white },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, padding: 16, borderRadius: 12, gap: 8, marginTop: 10 },
  saveText: { color: colors.white, fontSize: 16, fontWeight: typography.weightBold },
  backBtn: { marginTop: 12, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
