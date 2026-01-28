import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import EntryForm from './components/EntryForm';

export default function App() {
  const [entries, setEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    saveToStorage();
  }, [entries]);

  const loadEntries = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('@diary_storage');
      if (jsonValue !== null) {
        setEntries(JSON.parse(jsonValue));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load data');
    }
  };

  const saveToStorage = async () => {
    try {
      const jsonValue = JSON.stringify(entries);
      await AsyncStorage.setItem('@diary_storage', jsonValue);
    } catch (e) {
      console.error('Save error', e);
    }
  };

  const handleSaveEntry = entryData => {
    const index = entries.findIndex(e => e.id === entryData.id);
    if (index > -1) {
      const updatedEntries = [...entries];
      updatedEntries[index] = entryData;
      setEntries(updatedEntries);
    } else {
      setEntries([entryData, ...entries]);
    }
    setEditingEntry(null);
  };

  const deleteEntry = id => {
    setEntries(entries.filter(e => e.id !== id));
    setEditingEntry(null);
  };

  const exportData = async format => {
    if (entries.length === 0) {
      Alert.alert('Empty', 'Nothing to export!');
      return;
    }

    const content =
      format === 'json'
        ? JSON.stringify(entries, null, 2)
        : entries
          .map(
            e =>
              `[${new Date(e.date).toLocaleString()}] ${e.title}\n${e.body}`,
          )
          .join('\n\n');

    const path = `${RNFS.DocumentDirectoryPath}/diary_backup.${format}`;

    try {
      await RNFS.writeFile(path, content, 'utf8');
      await Share.open({
        url: `file://${path}`,
        type: format === 'json' ? 'application/json' : 'text/plain',
      });
    } catch (e) {
      console.log(e);
    }
  };

  const renderItem = ({ item }) => {
    const moods = { sad: '😢', neutral: '😐', happy: '😊', excited: '🤩' };
    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => setEditingEntry(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{moods[item.mood]}</Text>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDate}>
              {new Date(item.date).toLocaleString()}
            </Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.cardPreview}>
          {item.body}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>My Persistent Diary</Text>

      <EntryForm
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        onCancelEdit={() => setEditingEntry(null)}
        onDelete={deleteEntry}
      />

      <View style={styles.exportSection}>
        <TouchableOpacity
          onPress={() => exportData('txt')}
          style={styles.miniBtn}
        >
          <Text>Export TXT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => exportData('json')}
          style={styles.miniBtn}
        >
          <Text>Export JSON</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 20,
    color: '#1a1a1a',
  },
  exportSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
    gap: 10,
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
  },
  listContent: {
    paddingBottom: 30,
  },
  entryCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2d3436',
  },
  cardDate: {
    fontSize: 12,
    color: '#b2bec3',
  },
  cardPreview: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 20,
  },
});
