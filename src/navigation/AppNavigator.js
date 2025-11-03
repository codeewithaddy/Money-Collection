// src/navigation/AppNavigator.js
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import AdminDashboard from "../screens/AdminDashboard";
import WorkerDashboard from "../screens/WorkerDashboard";
import AdminManageCounters from "../screens/AdminManageCounters";
import AdminManageUsers from "../screens/AdminManageUsers";
import AddCollectionScreen from "../screens/AddCollectionScreen";
import ViewCollectionsScreen from "../screens/ViewCollectionsScreen";
import CounterReportScreen from "../screens/CounterReportScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Admin" component={AdminDashboard} />
        <Stack.Screen name="Worker" component={WorkerDashboard} />
        <Stack.Screen name="AddCollection" component={AddCollectionScreen} />
        <Stack.Screen name="ViewCollections" component={ViewCollectionsScreen} />
        <Stack.Screen name="CounterReport" component={CounterReportScreen} />
        <Stack.Screen name="AdminManageCounters" component={AdminManageCounters} />
        <Stack.Screen name="AdminManageUsers" component={AdminManageUsers} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
