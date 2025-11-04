import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WorkerTabs({ navigation }) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('@current_user');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collections</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('AddCollection')}
        >
          <MaterialIcon name="add-circle" size={56} color="#6DD5B4" />
          <Text style={styles.cardTitle}>Add Collection</Text>
          <Text style={styles.cardSub}>Record new payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('ViewCollections')}
        >
          <MaterialIcon name="visibility" size={56} color="#7DD3FC" />
          <Text style={styles.cardTitle}>View My Collections</Text>
          <Text style={styles.cardSub}>Browse your records</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={handleLogout}
        >
          <MaterialIcon name="logout" size={56} color="#F87171" />
          <Text style={styles.cardTitle}>Logout</Text>
          <Text style={styles.cardSub}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A4560',
  },
  header: {
    backgroundColor: '#3E3D52',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#525174',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  actionCard: {
    padding: 32,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#525174',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 14,
    color: '#B0B0C8',
    marginTop: 6,
  },
});
