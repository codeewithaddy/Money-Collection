// src/navigation/AppNavigator.js
import * as React from "react";
import { AppState } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "../screens/LoginScreen";
import PINScreen from "../screens/PINScreen";
import SecurityScreen from "../screens/SecurityScreen";
import AdminTabs from "./AdminTabs";
import WorkerTabs from "./WorkerTabs";
import AdminManageCounters from "../screens/AdminManageCounters";
import AdminManageUsers from "../screens/AdminManageUsers";
import AddCollectionScreen from "../screens/AddCollectionScreen";
import ViewCollectionsScreen from "../screens/ViewCollectionsScreen";
import AddOnShopScreen from "../screens/AddOnShopScreen";
import ViewOnShopScreen from "../screens/ViewOnShopScreen";
import CounterReportScreen from "../screens/CounterReportScreen";
import WorkerReportScreen from "../screens/WorkerReportScreen";
import PDFExportScreen from "../screens/PDFExportScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = React.useState(null);
  const navigationRef = useNavigationContainerRef();
  const appState = React.useRef(AppState.currentState);

  const checkIfPINNeeded = async () => {
    try {
      const userData = await AsyncStorage.getItem('@current_user');
      if (!userData) return false;

      const user = JSON.parse(userData);
      const pinKey = `@pin_${user.username}`;
      const hasPIN = await AsyncStorage.getItem(pinKey);
      
      if (!hasPIN) return false;

      const backgroundTime = await AsyncStorage.getItem('@app_background_time');
      if (!backgroundTime) return true; // No timestamp = need PIN

      const timeDiff = Math.abs(Date.now() - parseInt(backgroundTime));
      const oneMinute = 60 * 1000;

      // Need PIN if > 1 min OR if clock changed (time went backwards)
      if (timeDiff > oneMinute || Date.now() < parseInt(backgroundTime)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Check PIN error:', error);
      return false;
    }
  };

  const checkInitialRoute = async () => {
    try {
      const userData = await AsyncStorage.getItem('@current_user');
      
      if (!userData) {
        setInitialRoute('Login');
        return;
      }

      const user = JSON.parse(userData);
      const needPIN = await checkIfPINNeeded();
      
      if (needPIN) {
        setInitialRoute('PIN');
      } else {
        setInitialRoute(user.role === 'admin' ? 'Admin' : 'Worker');
      }
    } catch (error) {
      console.error('Check initial route error:', error);
      setInitialRoute('Login');
    }
  };

  // Check on app start
  React.useEffect(() => {
    checkInitialRoute();
  }, []);

  // Check when app comes to foreground
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const wasInBackground = appState.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasInBackground && isNowActive) {
        // App came to foreground - check if PIN needed
        const needPIN = await checkIfPINNeeded();
        
        if (needPIN && navigationRef.current) {
          // Only navigate if not already on PIN or Login screen
          const currentRoute = navigationRef.current.getCurrentRoute();
          if (currentRoute && currentRoute.name !== 'PIN' && currentRoute.name !== 'Login') {
            navigationRef.current.navigate('PIN');
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  if (!initialRoute) {
    // Show loading screen
    const { View, Text, ActivityIndicator, StyleSheet } = require('react-native');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6DD5B4" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PIN" component={PINScreen} />
        <Stack.Screen name="Security" component={SecurityScreen} />
        <Stack.Screen name="Admin" component={AdminTabs} />
        <Stack.Screen name="Worker" component={WorkerTabs} />
        <Stack.Screen name="AddCollection" component={AddCollectionScreen} />
        <Stack.Screen name="ViewCollections" component={ViewCollectionsScreen} />
        <Stack.Screen name="AddOnShop" component={AddOnShopScreen} />
        <Stack.Screen name="ViewOnShop" component={ViewOnShopScreen} />
        <Stack.Screen name="CounterReport" component={CounterReportScreen} />
        <Stack.Screen name="WorkerReport" component={WorkerReportScreen} />
        <Stack.Screen name="PDFExport" component={PDFExportScreen} />
        <Stack.Screen name="AdminManageCounters" component={AdminManageCounters} />
        <Stack.Screen name="AdminManageUsers" component={AdminManageUsers} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
  },
  loadingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
};
