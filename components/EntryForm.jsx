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

const moods = [
    { label: '😢', value: 'sad' },
    { label: '😐', value: 'neutral' },
    { label: '😊', value: 'happy' },
    { label: '🤩', value: 'excited' },
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

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <TextInput
                style={styles.titleInput}
                placeholder="Entry Title"
                placeholderTextColor={theme.colors.textSecondary}
                value={title}
                onChangeText={setTitle}
            />

            <TextInput
                style={styles.bodyInput}
                placeholder="Write your story..."
                placeholderTextColor={theme.colors.textSecondary}
                value={body}
                onChangeText={setBody}
                multiline
            />

            <View style={styles.moodContainer}>
                {moods.map(m => (
                    <TouchableOpacity
                        key={m.value}
                        onPress={() => setMood(m.value)}
                        style={[styles.moodTab, mood === m.value && styles.moodTabActive]}
                    >
                        <Text style={styles.moodIcon}>{m.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowPicker(true)}
            >
                <Text style={styles.dateLabel}>📅 {date.toLocaleString()}</Text>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={date}
                    mode={pickerMode}
                    is24Hour={true}
                    onChange={handleDateChange}
                />
            )}

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                    <Text style={styles.btnText}>
                        {editingEntry ? 'Update' : 'Save Entry'}
                    </Text>
                </TouchableOpacity>

                {editingEntry && (
                    <TouchableOpacity
                        style={styles.dangerBtn}
                        onPress={() => {
                            onDelete(editingEntry.id);
                            navigation.goBack();
                        }}
                    >
                        <Text style={styles.btnText}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
    },
    titleInput: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 10,
        marginBottom: 20,
    },
    bodyInput: {
        fontSize: theme.typography.bodySize,
        color: theme.colors.textPrimary,
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        padding: 15,
        height: 250,
        textAlignVertical: 'top',
        lineHeight: theme.typography.lineHeight,
    },
    moodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 20,
    },
    moodTab: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
    },
    moodTabActive: {
        borderWidth: 1,
        borderColor: theme.colors.accent
    },
    moodIcon: { fontSize: 24 },
    datePickerBtn: {
        backgroundColor: theme.colors.surface,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    dateLabel: {
        color: theme.colors.textSecondary,
        fontWeight: '600'
    },
    btnRow: {
        flexDirection: 'row',
        gap: 10
    },
    primaryBtn: {
        flex: 2,
        backgroundColor: theme.colors.accent,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    dangerBtn: {
        flex: 1,
        backgroundColor: theme.colors.error,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnText: {
        color: theme.colors.background,
        fontWeight: 'bold'
    },
});
