import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/Ionicons';

const SecurityScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasPIN, setHasPIN] = useState(false);
  const [showPINSetup, setShowPINSetup] = useState(false);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [currentPIN, setCurrentPIN] = useState('');
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');

  useEffect(() => {
    loadUserAndPIN();
  }, []);

  const loadUserAndPIN = async () => {
    try {
      const userData = await AsyncStorage.getItem('@current_user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        
        // Check if PIN exists for this user
        const pinKey = `@pin_${user.username}`;
        const storedPIN = await AsyncStorage.getItem(pinKey);
        setHasPIN(!!storedPIN);
      }
    } catch (error) {
      console.error('Load user error:', error);
    }
  };

  const handleSetPIN = async () => {
    if (newPIN.length !== 4 || !/^\d{4}$/.test(newPIN)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits.');
      return;
    }

    if (newPIN !== confirmPIN) {
      Alert.alert('PIN Mismatch', 'PIN and confirm PIN do not match.');
      return;
    }

    try {
      const pinKey = `@pin_${currentUser.username}`;
      await AsyncStorage.setItem(pinKey, newPIN);
      
      Alert.alert('Success', 'PIN has been set successfully!');
      setHasPIN(true);
      setShowPINSetup(false);
      setNewPIN('');
      setConfirmPIN('');
    } catch (error) {
      console.error('Set PIN error:', error);
      Alert.alert('Error', 'Failed to set PIN. Please try again.');
    }
  };

  const handleChangePIN = async () => {
    if (currentPIN.length !== 4 || !/^\d{4}$/.test(currentPIN)) {
      Alert.alert('Invalid PIN', 'Current PIN must be 4 digits.');
      return;
    }

    if (newPIN.length !== 4 || !/^\d{4}$/.test(newPIN)) {
      Alert.alert('Invalid PIN', 'New PIN must be exactly 4 digits.');
      return;
    }

    if (newPIN !== confirmPIN) {
      Alert.alert('PIN Mismatch', 'New PIN and confirm PIN do not match.');
      return;
    }

    if (newPIN === currentPIN) {
      Alert.alert('Same PIN', 'New PIN cannot be the same as current PIN.');
      return;
    }

    try {
      const pinKey = `@pin_${currentUser.username}`;
      const storedPIN = await AsyncStorage.getItem(pinKey);

      if (storedPIN !== currentPIN) {
        Alert.alert('Wrong PIN', 'Current PIN is incorrect.');
        return;
      }

      await AsyncStorage.setItem(pinKey, newPIN);
      
      Alert.alert('Success', 'PIN has been changed successfully!');
      setShowChangePIN(false);
      setCurrentPIN('');
      setNewPIN('');
      setConfirmPIN('');
    } catch (error) {
      console.error('Change PIN error:', error);
      Alert.alert('Error', 'Failed to change PIN. Please try again.');
    }
  };

  const handleRemovePIN = () => {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove your security PIN?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const pinKey = `@pin_${currentUser.username}`;
              await AsyncStorage.removeItem(pinKey);
              
              Alert.alert('Success', 'PIN has been removed.');
              setHasPIN(false);
            } catch (error) {
              console.error('Remove PIN error:', error);
              Alert.alert('Error', 'Failed to remove PIN.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear current user and app state
              await AsyncStorage.removeItem('@current_user');
              await AsyncStorage.removeItem('@app_background_time');
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Security</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <MaterialIcon name="account-circle" size={60} color="#6DD5B4" />
          <Text style={styles.userName}>{currentUser?.displayName}</Text>
          <Text style={styles.userRole}>{currentUser?.role?.toUpperCase()}</Text>
        </View>

        {/* PIN Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PIN Security</Text>
          
          {!hasPIN && !showPINSetup && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowPINSetup(true)}
            >
              <MaterialIcon name="lock" size={24} color="#6DD5B4" />
              <Text style={styles.menuText}>Set PIN</Text>
              <MaterialIcon name="chevron-right" size={24} color="#888" />
            </TouchableOpacity>
          )}

          {hasPIN && !showChangePIN && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowChangePIN(true)}
              >
                <MaterialIcon name="edit" size={24} color="#FFB84D" />
                <Text style={styles.menuText}>Change PIN</Text>
                <MaterialIcon name="chevron-right" size={24} color="#888" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleRemovePIN}
              >
                <MaterialIcon name="lock-open" size={24} color="#F87171" />
                <Text style={styles.menuText}>Remove PIN</Text>
                <MaterialIcon name="chevron-right" size={24} color="#888" />
              </TouchableOpacity>
            </>
          )}

          {/* Set PIN Form */}
          {showPINSetup && (
            <View style={styles.pinForm}>
              <Text style={styles.formTitle}>Set Your 4-Digit PIN</Text>
              
              <TextInput
                style={styles.pinInput}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor="#888"
                value={newPIN}
                onChangeText={setNewPIN}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />

              <TextInput
                style={styles.pinInput}
                placeholder="Confirm PIN"
                placeholderTextColor="#888"
                value={confirmPIN}
                onChangeText={setConfirmPIN}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formBtn, styles.cancelBtn]}
                  onPress={() => {
                    setShowPINSetup(false);
                    setNewPIN('');
                    setConfirmPIN('');
                  }}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formBtn, styles.saveBtn]}
                  onPress={handleSetPIN}
                >
                  <Text style={styles.btnText}>Set PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Change PIN Form */}
          {showChangePIN && (
            <View style={styles.pinForm}>
              <Text style={styles.formTitle}>Change Your PIN</Text>
              
              <TextInput
                style={styles.pinInput}
                placeholder="Current PIN"
                placeholderTextColor="#888"
                value={currentPIN}
                onChangeText={setCurrentPIN}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />

              <TextInput
                style={styles.pinInput}
                placeholder="New 4-digit PIN"
                placeholderTextColor="#888"
                value={newPIN}
                onChangeText={setNewPIN}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />

              <TextInput
                style={styles.pinInput}
                placeholder="Confirm New PIN"
                placeholderTextColor="#888"
                value={confirmPIN}
                onChangeText={setConfirmPIN}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formBtn, styles.cancelBtn]}
                  onPress={() => {
                    setShowChangePIN(false);
                    setCurrentPIN('');
                    setNewPIN('');
                    setConfirmPIN('');
                  }}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formBtn, styles.saveBtn]}
                  onPress={handleChangePIN}
                >
                  <Text style={styles.btnText}>Change PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.infoBox}>
            <MaterialIcon name="info" size={20} color="#6DD5B4" />
            <Text style={styles.infoText}>
              {hasPIN
                ? 'PIN is enabled. You will be asked for PIN when opening the app after 1 minute of inactivity.'
                : 'Set a 4-digit PIN for extra security. The app will ask for PIN after 1 minute of inactivity.'}
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <MaterialIcon name="logout" size={24} color="#F87171" />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            <MaterialIcon name="chevron-right" size={24} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Forgot your PIN? Login again with username and password to reset it.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2B3E',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    backgroundColor: '#2C2B3E',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  userRole: {
    fontSize: 14,
    color: '#6DD5B4',
    marginTop: 5,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6DD5B4',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2B3E',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 15,
  },
  logoutText: {
    color: '#F87171',
  },
  pinForm: {
    backgroundColor: '#2C2B3E',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  pinInput: {
    backgroundColor: '#1E1E2E',
    borderWidth: 1,
    borderColor: '#4A4560',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 10,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  formBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#4A4560',
  },
  saveBtn: {
    backgroundColor: '#6DD5B4',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#2C2B3E',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6DD5B4',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#888',
    marginLeft: 10,
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SecurityScreen;
