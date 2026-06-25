import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    Animated,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { theme } from '../constants/Theme';
import DataManagementModal from './DataManagementModal';
import {
    initDB,
    getEntriesPaginated,
    insertOrUpdateEntry,
    removeEntry,
} from '../db';

export default function HomeScreen({ navigation }) {
    const [entries, setEntries] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const searchAnim = useRef(new Animated.Value(0)).current;
    const searchInputRef = useRef(null);
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

    const groupEntriesByDay = (flatEntries) => {
        const groups = [];
        flatEntries.forEach(entry => {
            const dateObj = new Date(entry.date);
            const dayNum = dateObj.toLocaleDateString('en-US', { day: 'numeric' });
            const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const yearNum = dateObj.getFullYear();
            const groupKey = `${dayNum}-${monthStr}-${yearNum}`;

            const existingGroup = groups.find(g => g.groupKey === groupKey);
            if (existingGroup) {
                existingGroup.records.push(entry);
            } else {
                groups.push({
                    groupKey,
                    dayNum,
                    monthStr,
                    yearNum,
                    records: [entry]
                });
            }
        });
        return groups;
    };

    const toggleSearchMode = (activate) => {
        if (activate) {
            setIsSearching(true);
            Animated.timing(searchAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
            }).start(() => {
                searchInputRef.current?.focus();
            });
        } else {
            setSearchQuery('');
            Animated.timing(searchAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: false,
            }).start(() => {
                setIsSearching(false);
            });
        }
    };

    const renderItem = ({ item }) => {
        return (
            <View style={styles.entryRow}>
                <View style={styles.dateColumn}>
                    <Text style={styles.dateDayText}>{item.dayNum}</Text>
                    <Text style={styles.dateMonthText}>{item.monthStr}</Text>
                    <Text style={styles.dateYearText}>{item.yearNum}</Text>
                </View>

                <View style={styles.verticalDivider} />

                <View style={styles.contentColumn}>
                    {item.records.map((record, index) => {
                        const dateObj = new Date(record.date);
                        const formattedTime = dateObj.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                        });

                        return (
                            <View key={record.id}>
                                <TouchableOpacity
                                    onPress={() =>
                                        navigation.navigate('Entry', {
                                            editingEntry: record,
                                            onSave: handleSaveEntry,
                                            onDelete: deleteEntry,
                                        })
                                    }
                                    style={styles.clickableInnerRecord}
                                >
                                    <View style={styles.contentHeaderRow}>
                                        <Text style={styles.timeText}>{formattedTime}</Text>
                                    </View>

                                    {record.title ? <Text style={styles.entryTitleText}>{record.title}</Text> : null}

                                    <View style={styles.bodyContextRow}>
                                        <Text style={styles.moodEmojiInline}>{record.mood_emoji || '😐'}</Text>
                                        <Text numberOfLines={3} style={styles.bodyPreviewText}>
                                            {record.body}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {index < item.records.length - 1 && (
                                    <View style={styles.innerRecordSeparator} />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
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

    const normalHeaderY = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -60],
    });

    const searchBarY = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-60, 0],
    });

    const headerOpacity = searchAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0, 0],
    });

    const searchOpacity = searchAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

    const groupedData = groupEntriesByDay(entries);

    const animatedHeaderStyle = {
        transform: [{ translateY: normalHeaderY }],
        opacity: headerOpacity,
        position: isSearching ? 'absolute' : 'relative',
        left: isSearching ? 0 : undefined,
        right: isSearching ? 0 : undefined,
    };

    const animatedSearchStyle = {
        transform: [{ translateY: searchBarY }],
        opacity: searchOpacity,
        position: isSearching ? 'relative' : 'absolute',
        left: isSearching ? undefined : 0,
        right: isSearching ? undefined : 0,
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainerSpace}>
                <Animated.View style={[styles.header, animatedHeaderStyle]}>
                    <View style={styles.headerTitleRow}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.headerTitle}>Diary</Text>
                            <Text style={styles.versionText}>v{appVersion}</Text>
                        </View>
                        <View style={styles.actionHeaderRow}>
                            <TouchableOpacity style={styles.manageDataButton} onPress={() => setModalVisible(true)}>
                                <View style={styles.customSyncIcon}>
                                    <View style={styles.syncLine} />
                                    <View style={styles.syncLineShort} />
                                    <View style={styles.syncLine} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.searchIconButton} onPress={() => toggleSearchMode(true)}>
                                <Text style={styles.searchIconText}>🔍</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.animatedSearchHeader, animatedSearchStyle]}>
                    <TouchableOpacity onPress={() => toggleSearchMode(false)} style={styles.backButtonFrame}>
                        <Text style={styles.backArrowIndicator}>←</Text>
                    </TouchableOpacity>
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchHeaderInput}
                        placeholder="Search"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                    />
                </Animated.View>
            </View>

            <FlatList
                data={groupedData}
                keyExtractor={item => item.groupKey}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                onEndReached={() => fetchEntries()}
                onEndReachedThreshold={0.5}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
                ListFooterComponent={() =>
                    loading && !refreshing ? (
                        <ActivityIndicator style={styles.loaderStyle} color={theme.colors.accent} />
                    ) : null
                }
            />

            <TouchableOpacity
                style={styles.floatingAddBtn}
                onPress={() => navigation.navigate('Entry', { onSave: handleSaveEntry })}
            >
                <Text style={styles.floatingAddBtnText}>+</Text>
            </TouchableOpacity>

            <DataManagementModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onRefresh={onRefresh}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerContainerSpace: {
        overflow: 'hidden',
        height: 75,
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        height: 75,
        justifyContent: 'center',
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleContainer: {
        flexDirection: 'column',
    },
    headerTitle: {
        fontSize: theme.typography.headerSize + 4,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        letterSpacing: -0.5,
    },
    versionText: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        opacity: 0.6,
        marginTop: -2,
    },
    actionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    manageDataButton: {
        padding: theme.spacing.sm,
        marginRight: theme.spacing.sm,
    },
    customSyncIcon: {
        width: 20,
        height: 15,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        opacity: 0.85,
    },
    syncLine: {
        width: '100%',
        height: 2,
        backgroundColor: theme.colors.textPrimary,
        borderRadius: 1,
    },
    syncLineShort: {
        width: '60%',
    },
    searchIconButton: {
        padding: theme.spacing.sm,
    },
    searchIconText: {
        fontSize: 20,
        color: theme.colors.textPrimary,
    },
    animatedSearchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        height: 75,
    },
    backButtonFrame: {
        paddingRight: theme.spacing.md,
        height: '100%',
        justifyContent: 'center',
    },
    backArrowIndicator: {
        fontSize: 24,
        color: theme.colors.textSecondary,
    },
    searchHeaderInput: {
        flex: 1,
        height: 44,
        fontSize: 18,
        color: theme.colors.textPrimary,
        paddingVertical: 0,
    },
    list: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        paddingBottom: 100,
    },
    rowSeparator: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
    entryRow: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.xs,
    },
    dateColumn: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: theme.spacing.xs,
    },
    dateDayText: {
        fontSize: 32,
        fontWeight: '300',
        color: theme.colors.textPrimary,
        lineHeight: 36,
    },
    dateMonthText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textTransform: 'capitalize',
        marginTop: 2,
    },
    dateYearText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        opacity: 0.5,
        marginTop: 2,
    },
    verticalDivider: {
        width: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.md,
    },
    contentColumn: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    clickableInnerRecord: {
        paddingVertical: 4,
    },
    innerRecordSeparator: {
        height: 1,
        backgroundColor: theme.colors.border,
        opacity: 0.4,
        marginVertical: 12,
        borderStyle: 'dashed',
    },
    contentHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        opacity: 0.7,
    },
    entryTitleText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 6,
    },
    bodyContextRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    moodEmojiInline: {
        fontSize: 18,
        marginRight: 8,
        marginTop: 2,
    },
    bodyPreviewText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    loaderStyle: {
        margin: theme.spacing.lg,
    },
    floatingAddBtn: {
        position: 'absolute',
        bottom: 30,
        right: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    floatingAddBtnText: {
        color: theme.colors.textPrimary,
        fontSize: 28,
        fontWeight: '300',
        marginTop: -2,
    },
});
