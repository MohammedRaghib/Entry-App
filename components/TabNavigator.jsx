import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from './HomeScreen';
import { theme } from '../constants/Theme';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    height: 65,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarItemStyle: {
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                    textAlign: 'center',
                },
            }}
        >
            <Tab.Screen
                name="Journal"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'book' : 'book-outline'}
                            size={size || 22}
                            color={color}
                        />
                    )
                }}
            />
        </Tab.Navigator>
    );
}