// src/navigation/AppNavigator.js
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import AdminTabs from "./AdminTabs";
import WorkerTabs from "./WorkerTabs";
import AdminManageCounters from "../screens/AdminManageCounters";
import AdminManageUsers from "../screens/AdminManageUsers";
import AddCollectionScreen from "../screens/AddCollectionScreen";
import ViewCollectionsScreen from "../screens/ViewCollectionsScreen";
import CounterReportScreen from "../screens/CounterReportScreen";
import WorkerReportScreen from "../screens/WorkerReportScreen";
import PDFExportScreen from "../screens/PDFExportScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Admin" component={AdminTabs} />
        <Stack.Screen name="Worker" component={WorkerTabs} />
        <Stack.Screen name="AddCollection" component={AddCollectionScreen} />
        <Stack.Screen name="ViewCollections" component={ViewCollectionsScreen} />
        <Stack.Screen name="CounterReport" component={CounterReportScreen} />
        <Stack.Screen name="WorkerReport" component={WorkerReportScreen} />
        <Stack.Screen name="PDFExport" component={PDFExportScreen} />
        <Stack.Screen name="AdminManageCounters" component={AdminManageCounters} />
        <Stack.Screen name="AdminManageUsers" component={AdminManageUsers} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
