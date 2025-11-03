import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import AddCollectionScreen from '../screens/AddCollectionScreen';
import ViewCollectionsScreen from '../screens/ViewCollectionsScreen';
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

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e8f5e9' }]}
          onPress={() => navigation.navigate('AddCollection')}
        >
          <MaterialIcon name="add-circle" size={48} color="#2ecc71" />
          <Text style={styles.cardTitle}>Add Collection</Text>
          <Text style={styles.cardSub}>Record new payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e3f2fd' }]}
          onPress={() => navigation.navigate('ViewCollections')}
        >
          <MaterialIcon name="visibility" size={48} color="#2196f3" />
          <Text style={styles.cardTitle}>View Collections</Text>
          <Text style={styles.cardSub}>Browse all records</Text>
        </TouchableOpacity>
      </View>
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

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fff3e0' }]}
          onPress={() => navigation.navigate('CounterReport')}
        >
          <MaterialIcon name="people" size={48} color="#ff9800" />
          <Text style={styles.cardTitle}>Counter Reports</Text>
          <Text style={styles.cardSub}>View by counter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#f3e5f5' }]}
          onPress={() => navigation.navigate('WorkerReport')}
        >
          <MaterialIcon name="person" size={48} color="#9c27b0" />
          <Text style={styles.cardTitle}>Worker Reports</Text>
          <Text style={styles.cardSub}>View by worker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fce4ec' }]}
          onPress={() => navigation.navigate('PDFExport')}
        >
          <MaterialIcon name="picture-as-pdf" size={48} color="#e91e63" />
          <Text style={styles.cardTitle}>PDF Export</Text>
          <Text style={styles.cardSub}>Generate reports</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Tab 3: Settings
function SettingsTab({ navigation }) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('@current_user');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e0f2f1' }]}
          onPress={() => navigation.navigate('AdminManageCounters')}
        >
          <MaterialIcon name="store" size={48} color="#009688" />
          <Text style={styles.cardTitle}>Manage Counters</Text>
          <Text style={styles.cardSub}>Add/Edit counters</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e8eaf6' }]}
          onPress={() => navigation.navigate('AdminManageUsers')}
        >
          <MaterialIcon name="supervisor-account" size={48} color="#3f51b5" />
          <Text style={styles.cardTitle}>Manage Users</Text>
          <Text style={styles.cardSub}>Add/Edit workers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#ffebee' }]}
          onPress={handleLogout}
        >
          <MaterialIcon name="logout" size={48} color="#f44336" />
          <Text style={styles.cardTitle}>Logout</Text>
          <Text style={styles.cardSub}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2f6ce6',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2f6ce6',
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
  actionCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  cardSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
