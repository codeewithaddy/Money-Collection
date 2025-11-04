import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPDATE_CONFIG, isUpdateAvailable, isUpdateRequired } from '../config/updateConfig';

class UpdateChecker {
  constructor() {
    this.updateInfo = null;
    this.lastCheckTime = null;
  }

  // Check if it's time to check for updates
  async shouldCheckForUpdate() {
    try {
      const lastCheck = await AsyncStorage.getItem('@last_update_check');
      
      if (!lastCheck) return true;
      
      const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
      return timeSinceLastCheck > UPDATE_CONFIG.CHECK_INTERVAL;
    } catch (error) {
      console.error('Error checking update time:', error);
      return true;
    }
  }

  // Fetch latest release info from GitHub
  async checkForUpdate() {
    try {
      const response = await fetch(UPDATE_CONFIG.RELEASE_API_URL);
      
      if (!response.ok) {
        console.log('No updates available or API error');
        return null;
      }

      const releaseData = await response.json();
      
      // Extract version from tag_name (e.g., "v4.0.1" or "4.0.1")
      const latestVersion = releaseData.tag_name.replace(/^v/, '');
      
      // Find APK asset in release
      const apkAsset = releaseData.assets.find(
        asset => asset.name.endsWith('.apk')
      );

      if (!apkAsset) {
        console.log('No APK found in latest release');
        return null;
      }

      // Save last check time
      await AsyncStorage.setItem('@last_update_check', Date.now().toString());

      // Check if update is available
      const updateAvailable = isUpdateAvailable(
        UPDATE_CONFIG.CURRENT_VERSION,
        latestVersion
      );

      // Check if update is required
      const updateRequired = isUpdateRequired(
        UPDATE_CONFIG.CURRENT_VERSION,
        UPDATE_CONFIG.MIN_REQUIRED_VERSION
      );

      if (updateAvailable) {
        this.updateInfo = {
          version: latestVersion,
          downloadUrl: apkAsset.browser_download_url,
          releaseNotes: releaseData.body,
          publishedAt: releaseData.published_at,
          required: updateRequired || UPDATE_CONFIG.FORCE_UPDATE,
          size: apkAsset.size,
        };

        return this.updateInfo;
      }

      return null;
    } catch (error) {
      console.error('Error checking for update:', error);
      return null;
    }
  }

  // Get stored update info
  getUpdateInfo() {
    return this.updateInfo;
  }

  // Clear update info
  clearUpdateInfo() {
    this.updateInfo = null;
  }

  // Check if user dismissed this version
  async isDismissed(version) {
    try {
      const dismissed = await AsyncStorage.getItem('@dismissed_update_version');
      return dismissed === version;
    } catch (error) {
      return false;
    }
  }

  // Mark update as dismissed
  async dismissUpdate(version) {
    try {
      await AsyncStorage.setItem('@dismissed_update_version', version);
    } catch (error) {
      console.error('Error dismissing update:', error);
    }
  }

  // Clear dismissed update
  async clearDismissed() {
    try {
      await AsyncStorage.removeItem('@dismissed_update_version');
    } catch (error) {
      console.error('Error clearing dismissed:', error);
    }
  }
}

export default new UpdateChecker();
