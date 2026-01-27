import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export default function App() {
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('neutral');
  const [entries, setEntries] = useState([]);

  const moods = [
    { label: '😢', value: 'sad' },
    { label: '😐', value: 'neutral' },
    { label: '😊', value: 'happy' },
    { label: '🤩', value: 'excited' },
  ];

  const addEntry = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    const newEntry = {
      id: Date.now().toString(),
      title,
      mood,
      date: new Date().toLocaleString(),
    };
    setEntries([newEntry, ...entries]);
    setTitle('');
    setMood('neutral');
  };

  const exportData = async (format) => {
    if (entries.length === 0) {
      Alert.alert("Empty", "No entries to export!");
      return;
    }

    const content = format === 'json' 
      ? JSON.stringify(entries, null, 2) 
      : entries.map(e => `[${e.date}] ${e.mood.toUpperCase()}: ${e.title}`).join('\n');

    const path = `${RNFS.DocumentDirectoryPath}/diary_export.${format}`;

    try {
      await RNFS.writeFile(path, content, 'utf8');
      await Share.open({
        url: `file://${path}`,
        type: format === 'json' ? 'application/json' : 'text/plain',
      });
    } catch (error) {
      console.log('Export error:', error);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.entryItem}>
      <Text style={styles.entryDate}>{item.date}</Text>
      <Text style={styles.entryTitle}>
        {moods.find(m => m.value === item.mood)?.label} {item.title}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Simple Diary</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          value={title}
          onChangeText={setTitle}
        />
        
        <View style={styles.moodPicker}>
          {moods.map((m) => (
            <TouchableOpacity 
              key={m.value} 
              onPress={() => setMood(m.value)}
              style={[styles.moodButton, mood === m.value && styles.selectedMood]}
            >
              <Text style={styles.moodEmoji}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addEntry}>
          <Text style={styles.buttonText}>Save Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.exportRow}>
        <TouchableOpacity onPress={() => exportData('txt')} style={styles.exportBtn}>
          <Text>Export TXT</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => exportData('json')} style={styles.exportBtn}>
          <Text>Export JSON</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
  inputContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  input: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15, padding: 8, color: '#000' },
  moodPicker: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
  moodButton: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  selectedMood: { borderColor: '#007AFF', backgroundColor: '#e1f0ff' },
  moodEmoji: { fontSize: 24 },
  addButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  exportRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15 },
  exportBtn: { marginHorizontal: 10, padding: 8, backgroundColor: '#ddd', borderRadius: 5 },
  entryItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginTop: 10 },
  entryDate: { fontSize: 12, color: '#666' },
  entryTitle: { fontSize: 18, marginTop: 5, color: '#000' }
});