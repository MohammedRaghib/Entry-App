import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Platform,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Modal,
    BackHandler,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../constants/Theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getAllMoods, getAttachmentsForEntry  } from '../db';

export default function EntryForm({ route, navigation }) {
    const { onSave, onDelete, editingEntry } = route.params;

    const titleRef = useRef(editingEntry?.title || '');
    const bodyRef = useRef(editingEntry?.body || '');

    const [moodsList, setMoodsList] = useState([]);
    const [moodId, setMoodId] = useState(editingEntry?.mood_id || 3);
    const [date, setDate] = useState(new Date(editingEntry?.date || Date.now()));
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [isMoodModalVisible, setIsMoodModalVisible] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const isDeleting = useRef(false);
    const scrollViewRef = useRef(null);

    useEffect(() => {
        try {
            const data = getAllMoods();
            setMoodsList(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load moods from database');
        }
    }, []);

    const handleScrollViewLayout = useCallback(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []);

    const handleSave = useCallback((shouldNavigate = true) => {
        onSave({
            id: editingEntry?.id || null,
            title: titleRef.current,
            body: bodyRef.current,
            mood_id: moodId,
            date: date.toISOString(),
        });

        setIsDirty(false);
        if (shouldNavigate) navigation.goBack();
    }, [editingEntry, moodId, date, onSave, navigation]);

    useEffect(() => {
        const handleBack = () => {
            if (isDirty) {
                handleSave(false);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (isDeleting.current) return;
            if (isDirty) {
                e.preventDefault();
                handleSave(false);
                navigation.dispatch(e.data.action);
            }
        });

        return () => {
            backHandler.remove();
            unsubscribe();
        };
    }, [isDirty, handleSave, navigation]);

    const handleMoodChange = useCallback((id) => {
        setMoodId(id);
        setIsDirty(true);
        setIsMoodModalVisible(false);
    }, []);

    const confirmDelete = useCallback(() => {
        Alert.alert('Delete Entry', 'Are you sure you want to delete this?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    isDeleting.current = true;
                    onDelete(editingEntry.id);
                    navigation.goBack();
                },
            },
        ]);
    }, [editingEntry, onDelete, navigation]);

    const handleDateChange = useCallback((event, selectedDate) => {
        const currentDate = selectedDate || date;
        if (Platform.OS === 'android') {
            if (pickerMode === 'date') {
                setDate(currentDate);
                setPickerMode('time');
            } else {
                setDate(currentDate);
                setShowPicker(false);
                setPickerMode('date');
                setIsDirty(true);
            }
        } else {
            setDate(currentDate);
            setShowPicker(false);
            setIsDirty(true);
        }
    }, [date, pickerMode]);

    const currentMoodLabel = moodsList.find(m => m.id === moodId)?.emoji || editingEntry?.mood_emoji || '😐';
    const [attachments, setAttachments] = useState([]);

    useEffect(() => {
        if (editingEntry?.id) {
            const data = getAttachmentsForEntry(editingEntry.id);
            setAttachments(data);
        }
    }, [editingEntry]);

    return (
        <KeyboardAvoidingView
            behavior="padding"
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 56}
        >
            <ScrollView
                ref={scrollViewRef}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.scrollContent}
                onLayout={handleScrollViewLayout}
                nestedScrollEnabled={true}
            >
                <View style={styles.topNavigationRow}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backNavigationBtn}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={28}
                            color={theme.colors.textPrimary}
                        />
                    </TouchableOpacity>

                    <View style={styles.actionIcons}>
                        {editingEntry && (
                            <TouchableOpacity onPress={confirmDelete}>
                                <Ionicons
                                    name="trash-outline"
                                    size={24}
                                    color={theme.colors.error}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.dateRowContainer}>
                    <TouchableOpacity
                        onPress={() => {
                            setPickerMode('date');
                            setShowPicker(true);
                        }}
                        style={styles.dateSelector}
                    >
                        <Text style={styles.dateText}>
                            {date.toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                            ,{' '}
                            {date.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                            })}
                        </Text>
                        <Ionicons
                            name="caret-down-sharp"
                            size={14}
                            color={theme.colors.textSecondary}
                            style={styles.dropdownCaret}
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.moodBadge}
                    onPress={() => setIsMoodModalVisible(true)}
                >
                    <View style={styles.moodSquare}>
                        <Text style={styles.moodEmoji}>{currentMoodLabel}</Text>
                        <View style={styles.plusOverlay}>
                            <Ionicons
                                name="add"
                                size={12}
                                color={theme.colors.textSecondary}
                            />
                        </View>
                    </View>
                </TouchableOpacity>

                <TextInput
                    style={styles.titleInput}
                    placeholder="Title"
                    placeholderTextColor={theme.colors.textSecondary}
                    defaultValue={titleRef.current}
                    onChangeText={(text) => {
                        titleRef.current = text;
                        if (!isDirty) setIsDirty(true);
                    }}
                />

                <TextInput
                    style={styles.bodyInput}
                    placeholder="Diary entry"
                    placeholderTextColor={theme.colors.textSecondary}
                    defaultValue={bodyRef.current}
                    onChangeText={(text) => {
                        bodyRef.current = text;
                        if (!isDirty) setIsDirty(true);
                    }}
                    multiline
                    textAlignVertical="top"
                />

                <Modal
                    transparent={true}
                    visible={isMoodModalVisible}
                    animationType="fade"
                    onRequestClose={() => setIsMoodModalVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setIsMoodModalVisible(false)}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.moodGrid}>
                                {moodsList.map(m => (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[
                                            styles.moodOption,
                                            moodId === m.id && styles.selectedMood,
                                        ]}
                                        onPress={() => handleMoodChange(m.id)}
                                    >
                                        <Text style={styles.moodOptionEmoji}>{m.emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {showPicker && (
                    <DateTimePicker
                        value={date}
                        mode={pickerMode}
                        is24Hour={false}
                        onChange={handleDateChange}
                    />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: 40,
    },
    topNavigationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        height: 48,
    },
    backNavigationBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
        marginLeft: -8,
    },
    dateRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        color: theme.colors.textPrimary,
        fontSize: 22,
        fontWeight: '400',
    },
    dropdownCaret: {
        marginLeft: 6,
        marginTop: 4,
        opacity: 0.7,
    },
    actionIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    moodBadge: {
        marginBottom: theme.spacing.xl,
        alignSelf: 'flex-start',
    },
    moodSquare: {
        width: 50,
        height: 50,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    moodEmoji: {
        fontSize: 24,
    },
    plusOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
    },
    titleInput: {
        fontSize: 28,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    bodyInput: {
        fontSize: 20,
        color: theme.colors.textSecondary,
        textAlignVertical: 'top',
        minHeight: 200,
        lineHeight: 28,
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
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 20,
    },
    moodGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    moodOption: {
        padding: 10,
        borderRadius: 12,
    },
    selectedMood: {
        backgroundColor: theme.colors.accent + '20',
        borderWidth: 1,
        borderColor: theme.colors.accent,
    },
    moodOptionEmoji: {
        fontSize: 32,
    },
});
