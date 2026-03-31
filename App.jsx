import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './components/HomeScreen';
import EntryForm from './components/EntryForm';
import { theme } from './constants/Theme';
import { KEYCHAIN_SERVICE_NAME } from './constants/config';

const Stack = createStackNavigator();
const rnBiometrics = new ReactNativeBiometrics();

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE_NAME });
      if (credentials) {
        setHasPin(true);
        checkAndAuthenticate();
      } else {
        setIsSettingUp(true);
      }
    } catch (error) {
      setIsSettingUp(true);
    }
  };

  const checkAndAuthenticate = async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (available) {
        const result = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm biometrics to continue',
        });
        if (result.success) {
          setIsAuthorized(true);
        } else {
          setShowPinInput(true);
        }
      } else {
        setShowPinInput(true);
      }
    } catch (error) {
      setShowPinInput(true);
    }
  };

  const handlePinAction = async () => {
    if (isSettingUp) {
      if (pin.length < 4) {
        Alert.alert('Error', 'PIN must be at least 4 digits');
        return;
      }
      await Keychain.setGenericPassword('user', pin, { service: KEYCHAIN_SERVICE_NAME });
      setHasPin(true);
      setIsSettingUp(false);
      setIsAuthorized(true);
    } else {
      const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE_NAME });
      if (credentials && credentials.password === pin) {
        setIsAuthorized(true);
      } else {
        Alert.alert('Error', 'Incorrect PIN');
        setPin('');
      }
    }
  };

  if (!isAuthorized) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedText}>
          {isSettingUp ? 'Create App PIN' : 'Locked'}
        </Text>

        {(showPinInput || isSettingUp) ? (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="****"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />
            <TouchableOpacity style={styles.button} onPress={handlePinAction}>
              <Text style={styles.buttonText}>
                {isSettingUp ? 'Set PIN' : 'Unlock with PIN'}
              </Text>
            </TouchableOpacity>
            {!isSettingUp && (
              <TouchableOpacity onPress={checkAndAuthenticate} style={{ marginTop: 20 }}>
                <Text style={{ color: theme.colors.accent }}>Use Biometrics</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={checkAndAuthenticate}>
            <Text style={styles.buttonText}>Tap to Unlock</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Entry"
          component={EntryForm}
          options={{ title: 'Write' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  lockedText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.headerSize,
    marginBottom: theme.spacing.lg,
  },
  inputWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '60%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 20,
    color: '#000',
  },
  button: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    width: '60%',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.typography.bodySize,
    fontWeight: 'bold',
  },
});
