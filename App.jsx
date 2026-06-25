import React, { useState, useEffect, useRef } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './components/TabNavigator';
import EntryForm from './components/EntryForm';
import LockScreen from './components/LockScreen';
import { theme } from './constants/Theme';

const Stack = createStackNavigator();

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('AppState:', appState.current, '->', nextAppState);

      if (nextAppState === 'background') {
        backgroundTimestamp.current = Date.now();
      }

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const timeAway =
          Date.now() - (backgroundTimestamp.current || Date.now());

        if (timeAway > 10000) {
          setIsAuthorized(false);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.background,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: theme.colors.accent,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
          />
          <Stack.Screen
            name="Entry"
            component={EntryForm}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {!isAuthorized && (
        <View style={styles.lockOverlay}>
          <LockScreen
            onAuthSuccess={() => setIsAuthorized(true)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});