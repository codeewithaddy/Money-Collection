import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import RNFS from 'react-native-fs';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

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

  const requestInstallPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 26) {
          // Android 8.0+ needs INSTALL_PACKAGES permission
          const canInstall = await RNFS.canInstallApk();
          if (!canInstall) {
            Alert.alert(
              'Permission Required',
              'Please allow installation from unknown sources to install the update.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    // This requires additional native module setup
                    Alert.alert('Manual Action', 'Please enable "Install unknown apps" in Settings for this app.');
                  },
                },
              ]
            );
            return false;
          }
        }

        // Request storage permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs storage access to download the update',
            buttonPositive: 'OK',
          }
        );
        
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const downloadAndInstall = async () => {
    try {
      setDownloading(true);

      // Request permissions
      const hasPermission = await requestInstallPermission();
      if (!hasPermission) {
        setDownloading(false);
        return;
      }

      const downloadDest = `${RNFS.DownloadDirectoryPath}/MoneyCollection_${updateInfo.version}.apk`;

      // Download the APK
      const downloadResult = await RNFS.downloadFile({
        fromUrl: updateInfo.downloadUrl,
        toFile: downloadDest,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          setDownloadProgress(Math.round(progress));
        },
        progressInterval: 500,
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Install the APK
        await RNFS.installApk(downloadDest);
        
        setDownloading(false);
        if (onUpdateComplete) {
          onUpdateComplete();
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloading(false);
      Alert.alert(
        'Download Failed',
        'Failed to download the update. Please try again or download manually from GitHub.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open GitHub',
            onPress: () => {
              Linking.openURL(`https://github.com/${updateInfo.githubRepo}/releases/latest`);
            },
          },
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
