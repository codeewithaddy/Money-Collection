import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import colors from '../theme/colors';
import typography from '../theme/typography';

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

const tabsOrder = ['Collections', 'Reports', 'Purchases', 'Settings'];

// Tab 1: Today Work (Collections)
function CollectionsTab({ navigation }) {
  const routes = navigation.getState?.().routeNames || [];
  const currentIndex = Math.max(0, routes.indexOf('Collections'));
  const left = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      const next = Math.min(currentIndex + 1, routes.length - 1);
      if (routes[next] && routes[next] !== routes[currentIndex]) navigation.navigate(routes[next]);
    });
  const right = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      const prev = Math.max(currentIndex - 1, 0);
      if (routes[prev] && routes[prev] !== routes[currentIndex]) navigation.navigate(routes[prev]);
    });
  const gestures = Gesture.Simultaneous(left, right);
  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today's Work</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Counter Collections</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddCollection')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="add-circle" size={32} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Add Collection</Text>
            <Text style={styles.cardSub}>Record counter payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ViewCollections')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="visibility" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>View Collections</Text>
            <Text style={styles.cardSub}>Browse counter records</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>OnShop Collections</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddOnShop')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="store" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Add OnShop Entry</Text>
            <Text style={styles.cardSub}>Record direct shop sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ViewOnShop')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="receipt-long" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>View OnShop</Text>
            <Text style={styles.cardSub}>Browse shop sales</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

// Tab 2: Reports
function ReportsTab({ navigation }) {
  const routes = navigation.getState?.().routeNames || [];
  const currentIndex = Math.max(0, routes.indexOf('Reports'));
  const left = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      const next = Math.min(currentIndex + 1, routes.length - 1);
      if (routes[next] && routes[next] !== routes[currentIndex]) navigation.navigate(routes[next]);
    });
  const right = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      const prev = Math.max(currentIndex - 1, 0);
      if (routes[prev] && routes[prev] !== routes[currentIndex]) navigation.navigate(routes[prev]);
    });
  const gestures = Gesture.Simultaneous(left, right);
  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CounterReport')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="people" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Counter Reports</Text>
            <Text style={styles.cardSub}>View by counter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('WorkerReport')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="person" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Worker Reports</Text>
            <Text style={styles.cardSub}>View by worker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('PDFExport')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="picture-as-pdf" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>PDF Export</Text>
            <Text style={styles.cardSub}>Generate reports</Text>
          </TouchableOpacity>

          {/* Super Admin only: Expenses */}
          {/** We cannot read isSuperAdmin here directly; use a simple route to AddExpense/ViewExpenses via navigation.
               The actual screen access is guarded inside those screens. */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddExpense')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="money-off" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Add Expense</Text>
            <Text style={styles.cardSub}>Record daily expenditure</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ViewExpenses')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="receipt" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>View Expenses</Text>
            <Text style={styles.cardSub}>Super Admin only</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

// Tab 3: Settings
function SettingsTab({ navigation }) {
  const routes = navigation.getState?.().routeNames || [];
  const currentIndex = Math.max(0, routes.indexOf('Settings'));
  const left = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      const next = Math.min(currentIndex + 1, routes.length - 1);
      if (routes[next] && routes[next] !== routes[currentIndex]) navigation.navigate(routes[next]);
    });
  const right = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      const prev = Math.max(currentIndex - 1, 0);
      if (routes[prev] && routes[prev] !== routes[currentIndex]) navigation.navigate(routes[prev]);
    });
  const gestures = Gesture.Simultaneous(left, right);
  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AdminManageCounters')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="store" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Manage Counters</Text>
            <Text style={styles.cardSub}>Add/Edit counters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AdminManageUsers')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="supervisor-account" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Manage Users</Text>
            <Text style={styles.cardSub}>Add/Edit workers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Security')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="security" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Security</Text>
            <Text style={styles.cardSub}>PIN & Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

// Tab 3 (superadmin): Purchases
function PurchasesTab({ navigation }) {
  const routes = navigation.getState?.().routeNames || [];
  const currentIndex = Math.max(0, routes.indexOf('Purchases'));
  const left = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      const next = Math.min(currentIndex + 1, routes.length - 1);
      if (routes[next] && routes[next] !== routes[currentIndex]) navigation.navigate(routes[next]);
    });
  const right = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      const prev = Math.max(currentIndex - 1, 0);
      if (routes[prev] && routes[prev] !== routes[currentIndex]) navigation.navigate(routes[prev]);
    });
  const gestures = Gesture.Simultaneous(left, right);
  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Purchases</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddSellerEntry')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="shopping-cart" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Add Seller Entry</Text>
            <Text style={styles.cardSub}>Purchase or Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ViewSellerLedger')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="receipt-long" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>View Seller Ledger</Text>
            <Text style={styles.cardSub}>Track purchases & payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AdminManageSellers')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="store" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Manage Sellers</Text>
            <Text style={styles.cardSub}>Add/Edit sellers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SellerPDFExport')}
          >
            <View style={styles.iconCircle}><MaterialIcon name="picture-as-pdf" size={28} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>Seller PDF Export</Text>
            <Text style={styles.cardSub}>Seller-wise / Monthly</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

export default function AdminTabs() {
  const insets = useSafeAreaInsets();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@current_user');
        const user = stored ? JSON.parse(stored) : null;
        unsub = firestore().collection('config').doc('superAdmin').onSnapshot((doc) => {
          const username = doc?.data()?.username || 'anil';
          const current = user?.username || user?.id;
          setIsSuperAdmin(!!current && current === username);
        });
      } catch (e) {
        setIsSuperAdmin(false);
      }
    })();
    return () => unsub && unsub();
  }, []);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: typography.weightSemibold,
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
      {isSuperAdmin && (
        <Tab.Screen
          name="Purchases"
          component={PurchasesTab}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcon name="shopping-bag" size={size} color={color} />
            ),
          }}
        />
      )}
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
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.bg,
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: typography.display,
    fontWeight: typography.weightBold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.weightBold,
    color: colors.accent,
    marginBottom: 12,
    marginTop: 8,
  },
  actionCard: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: typography.weightBold,
    color: colors.text,
  },
  cardSub: {
    fontSize: typography.label,
    color: colors.muted,
    marginTop: 6,
  },
});
