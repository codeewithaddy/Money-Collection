import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export default function WorkerTabs({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collections</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Counter Collections</Text>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('AddCollection')}
        >
          <MaterialIcon name="add-circle" size={56} color="#6DD5B4" />
          <Text style={styles.cardTitle}>Add Collection</Text>
          <Text style={styles.cardSub}>Record counter payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('ViewCollections')}
        >
          <MaterialIcon name="visibility" size={56} color="#7DD3FC" />
          <Text style={styles.cardTitle}>View My Collections</Text>
          <Text style={styles.cardSub}>Browse your counter records</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>OnShop Collections</Text>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('AddOnShop')}
        >
          <MaterialIcon name="store" size={56} color="#FFB84D" />
          <Text style={styles.cardTitle}>Add OnShop Entry</Text>
          <Text style={styles.cardSub}>Record direct shop sale</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('ViewOnShop')}
        >
          <MaterialIcon name="receipt-long" size={56} color="#FFB84D" />
          <Text style={styles.cardTitle}>View My OnShop</Text>
          <Text style={styles.cardSub}>Browse your shop sales</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Settings</Text>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('Security')}
        >
          <MaterialIcon name="security" size={56} color="#A78BFA" />
          <Text style={styles.cardTitle}>Security</Text>
          <Text style={styles.cardSub}>PIN & Logout</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6DD5B4',
    marginBottom: 12,
    marginTop: 8,
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
