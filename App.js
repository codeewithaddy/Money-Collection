// App.js
import React, { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppNavigator from "./src/navigation/AppNavigator";
import UpdateModal from "./src/components/UpdateModal";
import UpdateChecker from "./src/services/UpdateChecker";
import 'react-native-gesture-handler';

export default function App() {
  const appState = useRef(AppState.currentState);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Check for updates on app start
    checkForUpdates();

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      // Check if it's time to check for updates
      const shouldCheck = await UpdateChecker.shouldCheckForUpdate();
      if (!shouldCheck) {
        console.log('Update check skipped (checked recently)');
        return;
      }

      // Check for update
      const update = await UpdateChecker.checkForUpdate();
      
      if (update) {
        // Check if user already dismissed this version
        const isDismissed = await UpdateChecker.isDismissed(update.version);
        
        if (!isDismissed || update.required) {
          setUpdateInfo(update);
          setShowUpdateModal(true);
        }
      }
    } catch (error) {
      console.error('Update check error:', error);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    // App going to background
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      // Store the time when app went to background
      await AsyncStorage.setItem('@app_background_time', Date.now().toString());
    }

    // App coming to foreground - just log, don't modify timestamp
    // PIN check will be handled by AppNavigator
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      console.log('App came to foreground');
    }

    appState.current = nextAppState;
  };

  const handleDismissUpdate = async () => {
    if (updateInfo && !updateInfo.required) {
      await UpdateChecker.dismissUpdate(updateInfo.version);
    }
    setShowUpdateModal(false);
  };

  const handleUpdateComplete = () => {
    setShowUpdateModal(false);
    // App will restart after APK installation
  };

  return (
    <>
      <AppNavigator />
      <UpdateModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onDismiss={handleDismissUpdate}
        onUpdateComplete={handleUpdateComplete}
      />
    </>
  );
}
