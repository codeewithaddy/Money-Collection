import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const PINScreen = ({ navigation, route }) => {
  const [pin, setPin] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    loadUser();
    checkUserExists();
    
    // Disable back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  const checkUserExists = async () => {
    try {
      const userData = await AsyncStorage.getItem('@current_user');
      if (!userData) {
        // No user data, redirect to login
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Check user error:', error);
      navigation.replace('Login');
    }
  };

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('@current_user');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Load user error:', error);
    }
  };

  const handlePINSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
      return;
    }

    if (!currentUser) {
      navigation.replace('Login');
      return;
    }

    try {
      const pinKey = `@pin_${currentUser.username}`;
      const storedPIN = await AsyncStorage.getItem(pinKey);

      if (pin === storedPIN) {
        // Correct PIN - update timestamp and proceed
        await AsyncStorage.setItem('@app_background_time', Date.now().toString());
        
        // Navigate based on role
        if (route.params?.returnTo) {
          navigation.replace(route.params.returnTo);
        } else {
          navigation.replace(currentUser.role === 'admin' ? 'Admin' : 'Worker');
        }
      } else {
        // Wrong PIN
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');

        if (newAttempts >= 3) {
          Alert.alert(
            'Too Many Attempts',
            'You have entered the wrong PIN 3 times. Please login with your username and password.',
            [
              {
                text: 'OK',
                onPress: handleForgotPIN,
              },
            ]
          );
        } else {
          Alert.alert(
            'Wrong PIN',
            `Incorrect PIN. ${3 - newAttempts} attempt(s) remaining.`
          );
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
    }
  };

  const handleForgotPIN = async () => {
    try {
      // Logout user
      await AsyncStorage.removeItem('@current_user');
      await AsyncStorage.removeItem('@app_background_time');
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handlePINPress = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when 4 digits entered (increased delay for better UX)
      if (newPin.length === 4) {
        setTimeout(() => {
          handlePINSubmitWithValue(newPin);
        }, 300);
      }
    }
  };

  const handlePINSubmitWithValue = async (pinValue) => {
    if (!currentUser) {
      navigation.replace('Login');
      return;
    }

    try {
      const pinKey = `@pin_${currentUser.username}`;
      const storedPIN = await AsyncStorage.getItem(pinKey);

      if (pinValue === storedPIN) {
        await AsyncStorage.setItem('@app_background_time', Date.now().toString());
        
        if (route.params?.returnTo) {
          navigation.replace(route.params.returnTo);
        } else {
          navigation.replace(currentUser.role === 'admin' ? 'Admin' : 'Worker');
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');

        if (newAttempts >= 3) {
          Alert.alert(
            'Too Many Attempts',
            'You have entered the wrong PIN 3 times. Please login with your username and password.',
            [
              {
                text: 'OK',
                onPress: handleForgotPIN,
              },
            ]
          );
        } else {
          Alert.alert(
            'Wrong PIN',
            `Incorrect PIN. ${3 - newAttempts} attempt(s) remaining.`
          );
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcon name="lock" size={60} color="#6DD5B4" />
        <Text style={styles.title}>Enter PIN</Text>
        <Text style={styles.subtitle}>
          {currentUser?.displayName}
        </Text>
      </View>

      {/* PIN Display */}
      <View style={styles.pinDisplay}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>

      {/* Number Pad */}
      <View style={styles.numPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.numButton}
            onPress={() => handlePINPress(num.toString())}
          >
            <Text style={styles.numText}>{num}</Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={styles.numButton}
          onPress={handleForgotPIN}
        >
          <Text style={styles.forgotText}>Forgot?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.numButton}
          onPress={() => handlePINPress('0')}
        >
          <Text style={styles.numText}>0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.numButton}
          onPress={handleDelete}
        >
          <MaterialIcon name="backspace" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleForgotPIN}
      >
        <Text style={styles.loginText}>Login with Username & Password</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 60,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#6DD5B4',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#6DD5B4',
  },
  numPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  numButton: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.66%',
    backgroundColor: '#2C2B3E',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB84D',
  },
  loginButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#6DD5B4',
    textDecorationLine: 'underline',
  },
});

export default PINScreen;
