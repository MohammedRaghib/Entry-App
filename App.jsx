import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './components/HomeScreen';
import EntryForm from './components/EntryForm';
import { theme } from './constants/Theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background, elevation: 0, shadowOpacity: 0 },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Entry" component={EntryForm} options={{ title: 'Write' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}