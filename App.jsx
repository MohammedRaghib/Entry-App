import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './components/HomeScreen';
import EntryForm from './components/EntryForm';
import { theme } from './constants/Theme';

const Stack = createStackNavigator();
const rnBiometrics = new ReactNativeBiometrics();

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAndAuthenticate();
  }, []);

  const checkAndAuthenticate = async () => {
    try {
      const { available, biometryType } =
        await rnBiometrics.isSensorAvailable();

      if (available) {
        const result = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm fingerprint or face to continue',
        });

        if (result.success) {
          setIsAuthorized(true);
        } else {
          Alert.alert(
            'Auth Failed',
            'User cancelled or failed biometric check.',
          );
        }
      } else {
        Alert.alert(
          'Not Available',
          'Please enable biometrics in your device settings.',
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!isAuthorized) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedText}>Locked</Text>
        <TouchableOpacity style={styles.button} onPress={checkAndAuthenticate}>
          <Text style={styles.buttonText}>Tap to Unlock</Text>
        </TouchableOpacity>
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
  },
  lockedText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.headerSize,
    marginBottom: theme.spacing.lg,
  },
  button: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.typography.bodySize,
    fontWeight: 'bold',
  },
});
