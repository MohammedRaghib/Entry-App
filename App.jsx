import React, { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './components/HomeScreen';
import EntryForm from './components/EntryForm';
import LockScreen from './components/LockScreen';
import { theme } from './constants/Theme';

const Stack = createStackNavigator();

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        setIsAuthorized(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
          headerShown: false,
        }}
      >
        {!isAuthorized ? (
          <Stack.Screen name="Lock">
            {props => <LockScreen {...props} onAuthSuccess={() => setIsAuthorized(true)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Entry" component={EntryForm} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}