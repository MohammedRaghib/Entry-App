import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    Platform,
    ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const moods = [
    { label: '😢', value: 'sad' },
    { label: '😐', value: 'neutral' },
    { label: '😊', value: 'happy' },
    { label: '🤩', value: 'excited' },
];

export default function EntryForm({ onSave, editingEntry, onCancelEdit, onDelete }) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [mood, setMood] = useState('neutral');
    const [date, setDate] = useState(new Date());

    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');

    useEffect(() => {
        if (editingEntry) {
            setTitle(editingEntry.title);
            setBody(editingEntry.body);
            setMood(editingEntry.mood);
            setDate(new Date(editingEntry.date));
        } else {
            resetForm();
        }
    }, [editingEntry]);

    const resetForm = () => {
        setTitle('');
        setBody('');
        setMood('neutral');
        setDate(new Date());
    };

    const handleDateChange = (event, selectedDate) => {
        if (event.type === 'dismissed') {
            setShowPicker(false);
            return;
        }

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

    const handleSave = () => {
        onSave({
            id: editingEntry ? editingEntry.id : Date.now().toString(),
            title,
            body,
            mood,
            date: date.toISOString(),
        });

        resetForm();
    };

    return (
        <ScrollView style={styles.formBox} keyboardShouldPersistTaps="handled">
            <TextInput
                style={styles.textInput}
                placeholder="Entry Title"
                value={title}
                onChangeText={setTitle}
            />

            <TextInput
                style={[styles.textInput, styles.areaInput]}
                placeholder="Write your story..."
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={5}
            />

            <View style={styles.moodContainer}>
                {moods.map((m) => (
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
                onPress={() => {
                    setPickerMode(Platform.OS === 'ios' ? 'datetime' : 'date');
                    setShowPicker(true);
                }}
            >
                <Text style={styles.dateLabel}>📅 {date.toLocaleString()}</Text>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={date}
                    mode={pickerMode}
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                />
            )}

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                    <Text style={styles.btnText}>{editingEntry ? 'Update' : 'Save Entry'}</Text>
                </TouchableOpacity>

                {editingEntry && (
                    <TouchableOpacity
                        style={styles.dangerBtn}
                        onPress={() => onDelete(editingEntry.id)}
                    >
                        <Text style={styles.btnText}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>

            {editingEntry && (
                <TouchableOpacity onPress={onCancelEdit} style={styles.cancelWrap}>
                    <Text style={styles.cancelTxt}>Cancel Edit</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    formBox: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 15,
        maxHeight: 480,
    },
    textInput: {
        borderBottomWidth: 1,
        borderColor: '#f1f2f6',
        paddingVertical: 10,
        fontSize: 16,
        color: '#2d3436',
        marginBottom: 15,
    },
    areaInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        height: 100,
        textAlignVertical: 'top',
    },
    moodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 15,
    },
    moodTab: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
    },
    moodTabActive: {
        backgroundColor: '#dfe6e9',
        borderWidth: 1,
        borderColor: '#0984e3',
    },
    moodIcon: {
        fontSize: 24,
    },
    datePickerBtn: {
        backgroundColor: '#f1f2f6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    dateLabel: {
        color: '#636e72',
        fontWeight: '600',
    },
    btnRow: {
        flexDirection: 'row',
        gap: 10,
    },
    primaryBtn: {
        flex: 2,
        backgroundColor: '#0984e3',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    dangerBtn: {
        flex: 1,
        backgroundColor: '#d63031',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelWrap: {
        marginTop: 12,
        alignItems: 'center',
    },
    cancelTxt: {
        color: '#0984e3',
    },
});