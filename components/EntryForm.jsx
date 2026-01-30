import React, { useState, useEffect } from 'react';
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
    FlatList,
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

    const [title, setTitle] = useState(editingEntry?.title || '');
    const [body, setBody] = useState(editingEntry?.body || '');
    const [mood, setMood] = useState(editingEntry?.mood || 'neutral');
    const [date, setDate] = useState(new Date(editingEntry?.date || Date.now()));

    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [isMoodModalVisible, setIsMoodModalVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', e => {
            if (title.trim() || body.trim()) {
                handleSave(false);
            }
        });
        return unsubscribe;
    }, [navigation, title, body, mood, date]);

    const handleSave = (shouldNavigate = true) => {
        onSave({
            id: editingEntry ? editingEntry.id : Date.now().toString(),
            title,
            body,
            mood,
            date: date.toISOString(),
        });
        if (shouldNavigate) navigation.goBack();
    };

    const confirmDelete = () => {
        Alert.alert('Delete Entry', 'Are you sure you want to delete this?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    onDelete(editingEntry.id);
                    navigation.setParams({ editingEntry: null });
                    navigation.goBack();
                },
            },
        ]);
    };

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        if (Platform.OS === 'android') {
            if (pickerMode === 'date') {
                setDate(currentDate);
                setPickerMode('time');
            } else {
                setDate(currentDate);
                setShowPicker(false);
                setPickerMode('date');
            }
        } else {
            setDate(currentDate);
            setShowPicker(false);
        }
    };

    const currentMoodLabel = moods.find(m => m.value === mood)?.label || '🙂';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => setShowPicker(true)}
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
                                color={theme.colors.accent}
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
                    value={title}
                    onChangeText={setTitle}
                    multiline={false}
                />

                <TextInput
                    style={styles.bodyInput}
                    placeholder="Diary entry"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    scrollEnabled={false}
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
                                        onPress={() => {
                                            setMood(m.value);
                                            setIsMoodModalVisible(false);
                                        }}
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
                        is24Hour={true}
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
