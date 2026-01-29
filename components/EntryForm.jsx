import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Platform,
    ScrollView,
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

    const handleSave = () => {
        onSave({
            id: editingEntry ? editingEntry.id : Date.now().toString(),
            title,
            body,
            mood,
            date: date.toISOString(),
        });
        navigation.goBack();
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

    const currentMoodLabel = moods.find(m => m.value === mood)?.label || '😊';

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
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
                        <TouchableOpacity
                            onPress={() => {
                                onDelete(editingEntry.id);
                                navigation.goBack();
                            }}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={24}
                                color={theme.colors.error}
                            />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleSave}>
                        <Ionicons
                            name="checkmark-sharp"
                            size={28}
                            color={theme.colors.accent}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.moodBadge}>
                <View style={styles.moodSquare}>
                    <Text style={styles.moodEmoji}>{currentMoodLabel}</Text>
                    <View style={styles.plusOverlay}>
                        <Ionicons name="add" size={12} color={theme.colors.textSecondary} />
                    </View>
                </View>
            </TouchableOpacity>

            <TextInput
                style={styles.titleInput}
                placeholder="Title"
                placeholderTextColor={theme.colors.textSecondary}
                value={title}
                onChangeText={setTitle}
            />

            <TextInput
                style={styles.bodyInput}
                placeholder="Diary entry"
                placeholderTextColor={theme.colors.textSecondary}
                value={body}
                onChangeText={setBody}
                multiline
            />

            {showPicker && (
                <DateTimePicker
                    value={date}
                    mode={pickerMode}
                    is24Hour={true}
                    onChange={handleDateChange}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
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
        minHeight: 300,
        lineHeight: 28,
    },
});
