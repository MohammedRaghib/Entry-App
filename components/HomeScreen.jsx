import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Modal,
    ActivityIndicator,
} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DeviceInfo from 'react-native-device-info';
import * as DocumentPicker from '@react-native-documents/picker';
import { theme } from '../constants/Theme';
import {
    initDB,
    getEntriesPaginated,
    insertOrUpdateEntry,
    removeEntry,
    getAllEntriesForExport,
    importEntries,
} from '../db';

export default function HomeScreen({ navigation }) {
    const [entries, setEntries] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const PAGE_SIZE = 15;
    const appVersion = DeviceInfo.getVersion();

    const fetchEntries = useCallback(
        async (isInitial = false) => {
            if (loading || (!hasMore && !isInitial)) return;
            setLoading(true);
            const currentOffset = isInitial ? 0 : page * PAGE_SIZE;
            try {
                const data = await getEntriesPaginated(PAGE_SIZE, currentOffset);
                if (data.length < PAGE_SIZE) setHasMore(false);
                if (isInitial) {
                    setEntries(data);
                    setPage(1);
                } else {
                    setEntries(prev => [...prev, ...data]);
                    setPage(prev => prev + 1);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to load entries');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [loading, hasMore, page],
    );

    const onRefresh = () => {
        setRefreshing(true);
        setHasMore(true);
        fetchEntries(true);
    };

    const handleSaveEntry = entryData => {
        insertOrUpdateEntry(entryData);
        onRefresh();
    };

    const deleteEntry = id => {
        removeEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const handleImport = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.json],
            });
            const fileContent = await RNFS.readFile(res.uri, 'utf8');
            const importedData = JSON.parse(fileContent);

            if (Array.isArray(importedData)) {
                importEntries(importedData);
                Alert.alert('Success', 'Journal entries imported successfully.');
                setModalVisible(false);
                onRefresh();
            } else {
                throw new Error('Invalid format');
            }
        } catch (err) {
            if (!DocumentPicker.isCancel(err)) {
                Alert.alert('Import Error', 'Please select a valid JSON journal file.');
            }
        }
    };

    const handleExport = async type => {
        const allEntries = getAllEntriesForExport();
        let content = '';
        let fileName = `journal_export_${Date.now()}`;
        let extension = type === 'json' ? '.json' : '.txt';

        if (type === 'json') {
            content = JSON.stringify(allEntries, null, 2);
        } else {
            content = allEntries
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
            await Share.open({
                title: 'Export Journal',
                url: `file://${path}`,
                type: type === 'json' ? 'application/json' : 'text/plain',
                saveToFiles: true,
            });
            setModalVisible(false);
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

    useEffect(() => {
        initDB();
        fetchEntries(true);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Journal</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Text style={styles.exportBtnText}>Backup & Sync</Text>
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
                onEndReached={() => fetchEntries()}
                onEndReachedThreshold={0.5}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListFooterComponent={() =>
                    loading && !refreshing ? (
                        <ActivityIndicator style={{ margin: 20 }} />
                    ) : null
                }
            />

            <View style={styles.footer}>
                <Text style={styles.versionText}>Version {appVersion}</Text>
            </View>

            <Modal
                transparent
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Manage Data</Text>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Export</Text>
                            <TouchableOpacity
                                style={styles.modalBtn}
                                onPress={() => handleExport('json')}
                            >
                                <Text style={styles.modalBtnText}>
                                    Export as JSON (Full Backup)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtn}
                                onPress={() => handleExport('txt')}
                            >
                                <Text style={styles.modalBtnText}>
                                    Export as TXT (Readable)
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.warningText}>
                                * TXT files cannot be imported back.
                            </Text>
                        </View>

                        <View style={[styles.section, { marginTop: 20 }]}>
                            <Text style={styles.sectionTitle}>Import</Text>
                            <TouchableOpacity
                                style={[
                                    styles.modalBtn,
                                    {
                                        backgroundColor: theme.colors.surface,
                                        borderWidth: 1,
                                        borderColor: theme.colors.accent,
                                    },
                                ]}
                                onPress={handleImport}
                            >
                                <Text
                                    style={[styles.modalBtnText, { color: theme.colors.accent }]}
                                >
                                    Import JSON File
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.infoText}>
                                Only .json backup files are supported.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalBtn,
                                { backgroundColor: theme.colors.error, marginTop: 30 },
                            ]}
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
        width: '85%',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        width: '100%'
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    modalBtn: {
        backgroundColor: theme.colors.accent,
        width: '100%',
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        alignItems: 'center',
    },
    modalBtnText: {
        color: 'white',
        fontWeight: 'bold'
    },
    warningText: {
        fontSize: 11,
        color: theme.colors.error,
        fontStyle: 'italic'
    },
    infoText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
});
