import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { theme } from '../constants/Theme';
import appConfig from '../app.json';

export default function HomeScreen({ navigation }) {
    const [entries, setEntries] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        loadEntries();
    }, []);

    useEffect(() => {
        const saveToStorage = async () => {
            try {
                await AsyncStorage.setItem('@diary_storage', JSON.stringify(entries));
            } catch (e) {
                console.error(e);
            }
        };
        saveToStorage();
    }, [entries]);

    const loadEntries = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('@diary_storage');
            if (jsonValue) setEntries(JSON.parse(jsonValue));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveEntry = entryData => {
        setEntries(prev => {
            const index = prev.findIndex(e => e.id === entryData.id);
            let newEntries;
            if (index > -1) {
                newEntries = [...prev];
                newEntries[index] = entryData;
            } else {
                newEntries = [entryData, ...prev];
            }
            return [...newEntries].sort(
                (a, b) => new Date(b.date) - new Date(a.date),
            );
        });
    };

    const deleteEntry = id => {
        setEntries(prevEntries => prevEntries.filter(e => e.id !== id));
    };

    const handleExport = async type => {
        setModalVisible(false);
        let content = '';
        let fileName = `journal_export_${Date.now()}`;
        let extension = type === 'json' ? '.json' : '.txt';

        if (type === 'json') {
            content = JSON.stringify(entries, null, 2);
        } else {
            content = entries
                .map(
                    e =>
                        `Date: ${new Date(e.date).toLocaleDateString()}\nTitle: ${e.title
                        }\nMood: ${e.mood}\n\n${e.body}\n\n---`,
                )
                .join('\n\n');
        }

        const path = `${RNFS.TemporaryDirectoryPath}/${fileName}${extension}`;

        try {
            await RNFS.writeFile(path, content, 'utf8');
            const shareOptions = {
                title: 'Export Journal',
                url: `file://${path}`,
                type: type === 'json' ? 'application/json' : 'text/plain',
                saveToFiles: true,
            };
            await Share.open(shareOptions);
        } catch (error) {
            if (error.message !== 'User did not share') {
                Alert.alert('Error', 'Could not export file.');
            }
        }
    };

    const renderItem = ({ item }) => {
        const moodsMap = { sad: '😭', neutral: '😐', happy: '🙂', excited: '😎' };
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
                    <Text style={styles.cardEmoji}>{moodsMap[item.mood]}</Text>
                    <View>
                        <Text style={styles.cardTitle}>{item.title || ''}</Text>
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
                <View>
                    <Text style={styles.headerTitle}>My Journal</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Text style={styles.exportBtnText}>Export Data</Text>
                    </TouchableOpacity>
                </View>
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

            <View style={styles.footer}>
                <Text style={styles.versionText}>Version {appConfig.version}</Text>
            </View>

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Format</Text>

                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={() => handleExport('txt')}
                        >
                            <Text style={styles.modalBtnText}>Text (.txt)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={() => handleExport('json')}
                        >
                            <Text style={styles.modalBtnText}>Data (.json)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: theme.colors.error }]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
    exportBtnText: {
        color: theme.colors.accent,
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5,
    },
    addBtn: {
        backgroundColor: theme.colors.accent,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    addBtnText: {
        color: theme.colors.background,
        fontWeight: 'bold',
    },
    list: {
        padding: 15,
        flexGrow: 1,
    },
    entryCard: {
        backgroundColor: theme.colors.surface,
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    cardDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    cardPreview: {
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    footer: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    versionText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        opacity: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 20,
    },
    modalBtn: {
        backgroundColor: theme.colors.accent,
        width: '100%',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    modalBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
