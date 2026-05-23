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

const moods = [
    { label: '😭', value: 'sad' },
    { label: '😐', value: 'neutral' },
    { label: '🙂', value: 'happy' },
    { label: '😎', value: 'excited' },
];

export default function EntryForm({ route, navigation }) {
    const { onSave, onDelete, editingEntry } = route.params;

    const titleRef = useRef(editingEntry?.title || '');
    const bodyRef = useRef(editingEntry?.body || '');

    const [mood, setMood] = useState(editingEntry?.mood || 'neutral');
    const [date, setDate] = useState(new Date(editingEntry?.date || Date.now()));
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [isMoodModalVisible, setIsMoodModalVisible] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const isDeleting = useRef(false);
    const scrollViewRef = useRef(null);

    const handleScrollViewLayout = useCallback(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []);

    const handleSave = useCallback((shouldNavigate = true) => {
        const entryId = editingEntry?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        onSave({
            id: entryId,
            title: titleRef.current,
            body: bodyRef.current,
            mood,
            date: date.toISOString(),
        });

        setIsDirty(false);
        if (shouldNavigate) navigation.goBack();
    }, [editingEntry, mood, date, onSave, navigation]);

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

    const handleMoodChange = useCallback((value) => {
        setMood(value);
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

    const currentMoodLabel = moods.find(m => m.value === mood)?.label || '🙂';

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
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => {
                            setPickerMode('date');
                            setShowPicker(true);
                        }}
                        style={styles.dateSelector}
                    >
                        <Text style={styles.dateText}>
                            {date.toLocaleDateString('en-GB', {
                                day: '2-digit',
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
                            name="chevron-down"
                            size={16}
                            color={theme.colors.textSecondary}
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
                        <TouchableOpacity onPress={() => handleSave(true)}>
                            <Ionicons
                                name="checkmark-sharp"
                                size={28}
                                color={isDirty ? theme.colors.accent : theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
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
                            <Text style={styles.modalTitle}>How are you feeling?</Text>
                            <View style={styles.moodGrid}>
                                {moods.map(m => (
                                    <TouchableOpacity
                                        key={m.value}
                                        style={[
                                            styles.moodOption,
                                            mood === m.value && styles.selectedMood,
                                        ]}
                                        onPress={() => handleMoodChange(m.value)}
                                    >
                                        <Text style={styles.moodOptionEmoji}>{m.label}</Text>
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
        paddingTop: theme.spacing.lg,
        paddingBottom: 40,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        color: theme.colors.textPrimary,
        fontSize: 16,
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