import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import AddCollectionScreen from '../screens/AddCollectionScreen';
import ViewCollectionsScreen from '../screens/ViewCollectionsScreen';
import AddOnShopScreen from '../screens/AddOnShopScreen';
import ViewOnShopScreen from '../screens/ViewOnShopScreen';
import CounterReportScreen from '../screens/CounterReportScreen';
import WorkerReportScreen from '../screens/WorkerReportScreen';
import PDFExportScreen from '../screens/PDFExportScreen';
import AdminManageCounters from '../screens/AdminManageCounters';
import AdminManageUsers from '../screens/AdminManageUsers';

const Tab = createBottomTabNavigator();

// Tab 1: Today Work (Collections)
function CollectionsTab({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Work</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Counter Collections</Text>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('AddCollection')}
        >
          <MaterialIcon name="add-circle" size={48} color="#6DD5B4" />
          <Text style={styles.cardTitle}>Add Collection</Text>
          <Text style={styles.cardSub}>Record counter payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('ViewCollections')}
        >
          <MaterialIcon name="visibility" size={48} color="#6DD5B4" />
          <Text style={styles.cardTitle}>View Collections</Text>
          <Text style={styles.cardSub}>Browse counter records</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>OnShop Collections</Text>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('AddOnShop')}
        >
          <MaterialIcon name="store" size={48} color="#FFB84D" />
          <Text style={styles.cardTitle}>Add OnShop Entry</Text>
          <Text style={styles.cardSub}>Record direct shop sale</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('ViewOnShop')}
        >
          <MaterialIcon name="receipt-long" size={48} color="#FFB84D" />
          <Text style={styles.cardTitle}>View OnShop</Text>
          <Text style={styles.cardSub}>Browse shop sales</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Tab 2: Reports
function ReportsTab({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('CounterReport')}
        >
          <MaterialIcon name="people" size={48} color="#FFB84D" />
          <Text style={styles.cardTitle}>Counter Reports</Text>
          <Text style={styles.cardSub}>View by counter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('WorkerReport')}
        >
          <MaterialIcon name="person" size={48} color="#A78BFA" />
          <Text style={styles.cardTitle}>Worker Reports</Text>
          <Text style={styles.cardSub}>View by worker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('PDFExport')}
        >
          <MaterialIcon name="picture-as-pdf" size={48} color="#FB7185" />
          <Text style={styles.cardTitle}>PDF Export</Text>
          <Text style={styles.cardSub}>Generate reports</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Tab 3: Settings
function SettingsTab({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('AdminManageCounters')}
        >
          <MaterialIcon name="store" size={48} color="#60D4A9" />
          <Text style={styles.cardTitle}>Manage Counters</Text>
          <Text style={styles.cardSub}>Add/Edit counters</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('AdminManageUsers')}
        >
          <MaterialIcon name="supervisor-account" size={48} color="#7DD3FC" />
          <Text style={styles.cardTitle}>Manage Users</Text>
          <Text style={styles.cardSub}>Add/Edit workers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#3A3849' }]}
          onPress={() => navigation.navigate('Security')}
        >
          <MaterialIcon name="security" size={48} color="#FFB84D" />
          <Text style={styles.cardTitle}>Security</Text>
          <Text style={styles.cardSub}>PIN & Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6DD5B4',
        tabBarInactiveTintColor: '#8A8A9E',
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#525174',
          backgroundColor: '#3E3D52',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Collections"
        component={CollectionsTab}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcon name="work" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsTab}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcon name="assessment" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsTab}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6DD5B4',
    marginBottom: 12,
    marginTop: 8,
  },
  actionCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 13,
    color: '#B0B0C8',
    marginTop: 6,
  },
});
