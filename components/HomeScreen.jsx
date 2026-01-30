import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/Theme';

export default function HomeScreen({ navigation }) {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        loadEntries();
    }, []);
    useEffect(() => {
        saveToStorage();
    }, [entries]);

    const loadEntries = async () => {
        const jsonValue = await AsyncStorage.getItem('@diary_storage');
        if (jsonValue) setEntries(JSON.parse(jsonValue));
    };

    const saveToStorage = async () => {
        await AsyncStorage.setItem('@diary_storage', JSON.stringify(entries));
    };

    const handleSaveEntry = entryData => {
        setEntries(prev => {
            let newEntries;
            const index = prev.findIndex(e => e.id === entryData.id);

            if (index > -1) {
                newEntries = [...prev];
                newEntries[index] = entryData;
            } else {
                newEntries = [entryData, ...prev];
            }

            return newEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        });
    };

    const deleteEntry = id => {
        setEntries(entries.filter(e => e.id !== id));
    };

    const renderItem = ({ item }) => {
        const moods = { sad: '😭', neutral: '😐', happy: '🙂', excited: '😎' };
        return (
            <TouchableOpacity
                style={styles.entryCard}
                onPress={() =>
                    navigation.navigate('Entry', {
                        editingEntry: item,
                        onSave: handleSaveEntry,
                        onDelete: deleteEntry,
                    })
                }
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardEmoji}>{moods[item.mood]}</Text>
                    <View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDate}>
                            {new Date(item.date).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <Text numberOfLines={2} style={styles.cardPreview}>
                    {item.body}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Journal</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() =>
                        navigation.navigate('Entry', { onSave: handleSaveEntry })
                    }
                >
                    <Text style={styles.addBtnText}>+ New Entry</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={entries}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    addBtn: {
        backgroundColor: theme.colors.accent,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    addBtnText: {
        color: theme.colors.background,
        fontWeight: 'bold'
    },
    list: {
        padding: 15
    },
    entryCard: {
        backgroundColor: theme.colors.surface,
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center', marginBottom: 10
    },
    cardEmoji: {
        fontSize: 24,
        marginRight: 12
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    cardDate: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    cardPreview: {
        color: theme.colors.textSecondary,
        lineHeight: 20
    },
});
