import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    TextInput,
} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DeviceInfo from 'react-native-device-info';
import { pick, types, isCancel } from '@react-native-documents/picker';
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
    const [searchQuery, setSearchQuery] = useState('');

    const PAGE_SIZE = 15;
    const appVersion = DeviceInfo.getVersion();
    const typingTimeoutRef = useRef(null);

    const fetchEntries = useCallback(
        async (isInitial = false, currentSearch = searchQuery) => {
            if (loading || (!hasMore && !isInitial)) return;
            setLoading(true);

            const currentOffset = isInitial ? 0 : page * PAGE_SIZE;
            try {
                const data = await getEntriesPaginated(PAGE_SIZE, currentOffset, currentSearch);

                if (isInitial) {
                    setEntries(data);
                    setPage(1);
                    setHasMore(data.length === PAGE_SIZE);
                } else {
                    setEntries(prev => {
                        const existingIds = new Set(prev.map(e => e.id));
                        const newEntries = data.filter(e => !existingIds.has(e.id));
                        return [...prev, ...newEntries];
                    });
                    setPage(prev => prev + 1);
                    if (data.length < PAGE_SIZE) setHasMore(false);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to load entries');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [loading, hasMore, page, searchQuery],
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
            const [res] = await pick({
                type: [types.json],
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
            if (!isCancel(err)) {
                Alert.alert('Import Error', 'Please select a valid JSON journal file.');
            }
        }
    };

    const handleExport = async type => {
        const allEntries = getAllEntriesForExport();
        let content = '';

        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        let fileName = `Export as of ${day}-${month}-${year}`;
        
        let extension = type === 'json' ? '.json' : '.txt';

        if (type === 'json') {
            content = JSON.stringify(allEntries, null, 2);
        } else {
            content = allEntries
                .map(
                    e => {
                        const dateObj = new Date(e.date);
                        const dateString = dateObj.toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                        });
                        const timeString = dateObj.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                        });
                        return `Date: ${dateString}, ${timeString}\nTitle: ${e.title}\nMood: ${e.mood}\n\n${e.body}\n\n---`;
                    }
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
        const dateObj = new Date(item.date);

        const absoluteDay = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
        });

        const formattedTime = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });

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
                    <Text style={styles.cardEmoji}>{moodsMap[item.mood] || '😐'}</Text>
                    <View style={styles.cardHeaderMeta}>
                        <Text style={styles.cardTopDate}>{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {formattedTime}</Text>
                        {item.title && <Text style={styles.cardTitle}>{item.title}</Text>}
                    </View>
                </View>
                <Text numberOfLines={3} style={styles.cardPreview}>
                    {item.body}
                </Text>
            </TouchableOpacity>
        );
    };

    useEffect(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setHasMore(true);
            fetchEntries(true, searchQuery);
        }, 400);

        return () => clearTimeout(typingTimeoutRef.current);
    }, [searchQuery]);

    useEffect(() => {
        const setup = async () => {
            await initDB();
            fetchEntries(true);
        };
        setup();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <View style={styles.headerTitleRow}>
                        <Text style={styles.headerTitle}>Hello!</Text>
                        <TouchableOpacity style={styles.syncIconButton} onPress={() => setModalVisible(true)}>
                            <View style={styles.customSyncIcon}>
                                <View style={styles.syncLine} />
                                <View style={[styles.syncLine, styles.syncLineShort]} />
                                <View style={styles.syncLine} />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.versionText}>Version {appVersion}</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search entries..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                    />
                </View>
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
                        <ActivityIndicator style={{ margin: theme.spacing.lg }} color={theme.colors.accent} />
                    ) : null
                }
            />

            <TouchableOpacity
                style={styles.floatingAddBtn}
                onPress={() => navigation.navigate('Entry', { onSave: handleSaveEntry })}
            >
                <Text style={styles.floatingAddBtnText}>+</Text>
            </TouchableOpacity>

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

                        <View style={[styles.section, { marginTop: theme.spacing.lg }]}>
                            <Text style={styles.sectionTitle}>Import</Text>
                            <TouchableOpacity
                                style={[
                                    styles.modalBtn,
                                    {
                                        backgroundColor: theme.colors.background,
                                        borderWidth: 1,
                                        borderColor: theme.colors.accent,
                                    },
                                ]}
                                onPress={handleImport}
                            >
                                <Text style={[styles.modalBtnText, { color: theme.colors.accent }]}>
                                    Import JSON File
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.infoText}>
                                Only .json backup files are supported.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: theme.colors.error, marginTop: theme.spacing.xl }]}
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
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: theme.typography.headerSize + 8,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        letterSpacing: -0.5,
    },
    syncIconButton: {
        padding: theme.spacing.xs,
    },
    customSyncIcon: {
        width: 22,
        height: 18,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        opacity: 0.85,
    },
    syncLine: {
        width: '100%',
        height: 2,
        backgroundColor: theme.colors.textPrimary,
        borderRadius: 1,
    },
    syncLineShort: {
        width: '65%',
    },
    headerSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        marginTop: theme.spacing.sm,
        fontWeight: '400',
    },
    versionText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        opacity: 0.5,
    },
    searchContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        height: 54,
        borderRadius: 18,
        paddingHorizontal: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 10,
        opacity: 0.6,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: theme.typography.bodySize,
        color: theme.colors.textPrimary,
    },
    list: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        paddingBottom: 100,
    },
    entryCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: 24,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    cardEmoji: {
        fontSize: 34,
        marginRight: theme.spacing.md,
    },
    cardHeaderMeta: {
        flex: 1,
        justifyContent: 'center',
    },
    cardTopDate: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    cardPreview: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeight,
    },
    floatingAddBtn: {
        position: 'absolute',
        bottom: 30,
        right: theme.spacing.lg,
        backgroundColor: theme.colors.accent,
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingAddBtnText: {
        color: theme.colors.background,
        fontSize: 32,
        fontWeight: '300',
        marginTop: -2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: theme.colors.surface,
        borderRadius: 28,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    section: {
        width: '100%',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modalBtn: {
        backgroundColor: theme.colors.accent,
        width: '100%',
        padding: theme.spacing.md,
        borderRadius: 14,
        marginBottom: theme.spacing.sm,
        alignItems: 'center',
    },
    modalBtnText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 15,
    },
    warningText: {
        fontSize: 11,
        color: theme.colors.error,
        fontStyle: 'italic',
        marginTop: 4,
    },
    infoText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
    },
});