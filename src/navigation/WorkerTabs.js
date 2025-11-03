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
          style={[styles.actionCard, { backgroundColor: '#e8f5e9' }]}
          onPress={() => navigation.navigate('AddCollection')}
        >
          <MaterialIcon name="add-circle" size={56} color="#2ecc71" />
          <Text style={styles.cardTitle}>Add Collection</Text>
          <Text style={styles.cardSub}>Record new payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e3f2fd' }]}
          onPress={() => navigation.navigate('ViewCollections')}
        >
          <MaterialIcon name="visibility" size={56} color="#2196f3" />
          <Text style={styles.cardTitle}>View My Collections</Text>
          <Text style={styles.cardSub}>Browse your records</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#ffebee' }]}
          onPress={handleLogout}
        >
          <MaterialIcon name="logout" size={56} color="#f44336" />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2ecc71',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  actionCard: {
    padding: 32,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  cardSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
});
