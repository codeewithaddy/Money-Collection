import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import RNFS from 'react-native-fs';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

const { InstallApk } = NativeModules;

const UpdateModal = ({ visible, updateInfo, onDismiss, onUpdateComplete }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  if (!updateInfo) return null;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const checkInstallPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 26) {
          // Android 8.0+ needs REQUEST_INSTALL_PACKAGES permission
          const canInstall = await InstallApk.canInstallPackages();
          if (!canInstall) {
            return new Promise((resolve) => {
              Alert.alert(
                'Permission Required',
                'To install updates, you need to allow "Install unknown apps" for this app. Would you like to open settings?',
                [
                  { 
                    text: 'Cancel', 
                    style: 'cancel',
                    onPress: () => resolve(false)
                  },
                  {
                    text: 'Open Settings',
                    onPress: async () => {
                      try {
                        await InstallApk.openInstallSettings();
                        // Give user time to enable the permission
                        setTimeout(async () => {
                          const stillCanInstall = await InstallApk.canInstallPackages();
                          resolve(stillCanInstall);
                        }, 1000);
                      } catch (error) {
                        console.error('Failed to open settings:', error);
                        resolve(false);
                      }
                    },
                  },
                ]
              );
            });
          }
          return true;
        }
        return true;
      } catch (err) {
        console.error('Permission check error:', err);
        return false;
      }
    }
    return true;
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        console.log('📱 Checking storage permission for update download...');
        console.log('📱 Android API Level:', Platform.Version);
        
        // For Android 13+ (API 33+), use app-specific directory (no permission needed)
        if (Platform.Version >= 33) {
          console.log('✅ Android 13+: Using app-specific directory (no permission needed)');
          return true;
        }
        
        // For Android 12 and below, request WRITE_EXTERNAL_STORAGE
        console.log('📱 Android 12 or below: Requesting WRITE_EXTERNAL_STORAGE permission...');
        const storageStatus = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        console.log('💾 Storage permission status:', storageStatus);
        
        if (storageStatus === RESULTS.GRANTED) {
          console.log('✅ Storage permission already granted');
          return true;
        }
        
        // If DENIED (never asked) or BLOCKED (denied before) - try to request or show settings
        if (storageStatus === RESULTS.DENIED || storageStatus === RESULTS.BLOCKED) {
          // First, try to request permission (will show dialog if DENIED)
          console.log('📱 Requesting storage permission...');
          const result = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          console.log('💾 Storage permission request result:', result);
          
          if (result === RESULTS.GRANTED) {
            console.log('✅ Storage permission granted');
            return true;
          }
          
          // If still denied/blocked after request, show settings option
          if (result === RESULTS.DENIED || result === RESULTS.BLOCKED) {
            return new Promise((resolve) => {
              Alert.alert(
                'Storage Permission Required',
                'Storage permission is needed to download app updates. Please allow storage access to continue.',
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                  {
                    text: 'Open Settings',
                    onPress: async () => {
                      await openSettings();
                      // Check again after returning from settings
                      setTimeout(async () => {
                        const recheckStatus = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
                        resolve(recheckStatus === RESULTS.GRANTED);
                      }, 1000);
                    }
                  }
                ]
              );
            });
          }
        }
        
        console.log('❌ Storage permission not granted');
        return false;
      } catch (err) {
        console.error('❌ Storage permission error:', err);
        Alert.alert('Error', 'Failed to request permission. Please try again.');
        return false;
      }
    }
    return true;
  };

  const installAPK = async (filePath) => {
    try {
      if (Platform.OS === 'android') {
        console.log('Installing APK from:', filePath);
        
        // Check install permission before attempting installation
        const hasPermission = await checkInstallPermission();
        if (!hasPermission) {
          Alert.alert(
            'Permission Denied',
            'Installation permission is required to install the update. Please enable it in settings and try again.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Use native module to install APK
        await InstallApk.installApk(filePath);
        console.log('Installation intent launched');
      }
    } catch (error) {
      console.error('Install error:', error);
      Alert.alert(
        'Installation Error',
        `Failed to install the update: ${error.message}\n\nFile location: ${filePath}\n\nPlease try downloading again.`,
        [{ text: 'OK' }]
      );
    }
  };

  const downloadAndInstall = async () => {
    try {
      setDownloading(true);
      setDownloadProgress(0);

      // Request storage permission first
      const hasStoragePermission = await requestStoragePermission();
      if (!hasStoragePermission) {
        setDownloading(false);
        Alert.alert('Permission Required', 'Storage permission is needed to download the update. Please try again after granting permission.');
        return;
      }

      // Choose download directory based on Android version
      let downloadsDir;
      if (Platform.Version >= 33) {
        // Android 13+: Use app-specific external directory (no permission needed)
        // This directory is accessible via Files app and doesn't require WRITE_EXTERNAL_STORAGE
        downloadsDir = RNFS.ExternalDirectoryPath;
        console.log('📁 Using app-specific directory (Android 13+):', downloadsDir);
      } else {
        // Android 12 and below: Use public Downloads directory (permission required)
        downloadsDir = RNFS.DownloadDirectoryPath;
        console.log('📁 Using public Downloads directory (Android 12-):', downloadsDir);
      }
      
      // Check if directory exists
      const dirExists = await RNFS.exists(downloadsDir);
      console.log('📁 Directory exists:', dirExists);
      
      if (!dirExists) {
        console.log('⚠️ Directory does not exist! Creating...');
        try {
          await RNFS.mkdir(downloadsDir);
          console.log('✅ Directory created successfully');
          
          // Verify it was created
          const verifyExists = await RNFS.exists(downloadsDir);
          if (!verifyExists) {
            throw new Error('Failed to create download directory');
          }
        } catch (mkdirError) {
          console.error('❌ Failed to create directory:', mkdirError);
          throw new Error('Cannot access storage. Please try again.');
        }
      }

      const downloadDest = `${downloadsDir}/MoneyCollection_${updateInfo.version}.apk`;

      console.log('📥 Starting download...');
      console.log('🔗 Download URL:', updateInfo.downloadUrl);
      console.log('📁 Download destination:', downloadDest);

      // Test if we can write to the directory
      try {
        const testFile = `${downloadsDir}/.test_write`;
        await RNFS.writeFile(testFile, 'test', 'utf8');
        await RNFS.unlink(testFile);
        console.log('✅ Write test successful');
      } catch (writeTestError) {
        console.error('❌ Cannot write to Downloads directory:', writeTestError);
        throw new Error('Cannot write to Downloads folder. Please check storage permissions in app settings.');
      }

      // Download the APK with progress tracking
      const downloadResult = await RNFS.downloadFile({
        fromUrl: updateInfo.downloadUrl,
        toFile: downloadDest,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          setDownloadProgress(Math.round(progress));
          console.log(`Download progress: ${Math.round(progress)}%`);
        },
        progressInterval: 500,
      }).promise;

      console.log('Download completed with status:', downloadResult.statusCode);

      if (downloadResult.statusCode === 200) {
        // Verify file exists and check size
        const fileExists = await RNFS.exists(downloadDest);
        console.log('File exists:', fileExists);
        
        if (fileExists) {
          const stats = await RNFS.stat(downloadDest);
          console.log('📦 Downloaded file size:', stats.size, 'bytes');
          
          // Validate APK file size (should be at least 1MB for a valid APK)
          if (stats.size < 1024 * 1024) {
            throw new Error('Downloaded file is too small. The download may have failed.');
          }
          
          setDownloading(false);
          
          Alert.alert(
            'Download Complete! ✅',
            `Update downloaded successfully (${formatBytes(stats.size)})\n\nTap "Install" to update the app. The installer will replace the current version.`,
            [
              {
                text: 'Install',
                onPress: async () => {
                  console.log('👤 User tapped Install, starting installation...');
                  await installAPK(downloadDest);
                  if (onUpdateComplete) {
                    onUpdateComplete();
                  }
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          throw new Error('File not found after download');
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloading(false);
      
      let errorMessage = 'Failed to download the update. Please check your internet connection and try again.';
      
      if (error.message.includes('ENOENT')) {
        errorMessage = 'Download directory not accessible. Please check storage permissions and try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = `Download failed: ${error.message}`;
      }
      
      Alert.alert(
        'Download Failed',
        errorMessage,
        [
          { text: 'Try Again', onPress: downloadAndInstall },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleUpdate = () => {
    Alert.alert(
      'Download Update',
      `Do you want to download and install version ${updateInfo.version}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: downloadAndInstall },
      ]
    );
  };

  const handleDismiss = () => {
    if (updateInfo.required) {
      Alert.alert(
        'Update Required',
        'This update is required to continue using the app.',
        [{ text: 'OK' }]
      );
      return;
    }
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcon name="system-update" size={50} color="#6DD5B4" />
            <Text style={styles.title}>Update Available</Text>
            <Text style={styles.version}>Version {updateInfo.version}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {updateInfo.required && (
              <View style={styles.requiredBadge}>
                <MaterialIcon name="warning" size={16} color="#F87171" />
                <Text style={styles.requiredText}>Update Required</Text>
              </View>
            )}

            <Text style={styles.sizeText}>
              Size: {formatBytes(updateInfo.size)}
            </Text>

            {updateInfo.releaseNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>What's New:</Text>
                <Text style={styles.notesText} numberOfLines={10}>
                  {updateInfo.releaseNotes}
                </Text>
              </View>
            )}
          </View>

          {/* Download Progress */}
          {downloading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#6DD5B4" />
              <Text style={styles.progressText}>
                Downloading... {downloadProgress}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${downloadProgress}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Actions */}
          {!downloading && (
            <View style={styles.actions}>
              {!updateInfo.required && (
                <TouchableOpacity
                  style={[styles.button, styles.laterButton]}
                  onPress={handleDismiss}
                >
                  <Text style={styles.laterButtonText}>Later</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdate}
              >
                <MaterialIcon name="download" size={20} color="#fff" />
                <Text style={styles.updateButtonText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#2C2B3E',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  version: {
    fontSize: 16,
    color: '#6DD5B4',
    marginTop: 5,
  },
  content: {
    marginBottom: 20,
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A1F1F',
    padding: 8,
    borderRadius: 8,
    marginBottom: 15,
    gap: 5,
  },
  requiredText: {
    color: '#F87171',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sizeText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15,
  },
  notesContainer: {
    backgroundColor: '#1E1E2E',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6DD5B4',
  },
  notesTitle: {
    color: '#6DD5B4',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    color: '#6DD5B4',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1E1E2E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6DD5B4',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  laterButton: {
    backgroundColor: '#4A4560',
  },
  laterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#6DD5B4',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UpdateModal;
