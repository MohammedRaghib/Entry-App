import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Animated, Easing } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { pick, types, isCancel } from '@react-native-documents/picker';
import { theme } from '../constants/Theme';
import { getAllEntriesForExport, importEntries } from '../db';
import { setSystemShareActiveFlag } from './LockScreen';

export default function DataManagementModal({ visible, onClose, onRefresh }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 220,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 220,
                    easing: Easing.out(Easing.back(1.2)),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 180,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleImport = async () => {
        try {
            setSystemShareActiveFlag(true);
            const [res] = await pick({
                type: [types.json],
            });
            const fileContent = await RNFS.readFile(res.uri, 'utf8');
            const importedData = JSON.parse(fileContent);

            if (Array.isArray(importedData)) {
                importEntries(importedData);
                Alert.alert('Success', 'Journal entries imported successfully.');
                handleClose();
                onRefresh();
            } else {
                throw new Error('Invalid format');
            }
        } catch (err) {
            setSystemShareActiveFlag(false);
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
                .map(e => {
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
                })
                .join('\n\n');
        }

        const path = `${RNFS.TemporaryDirectoryPath}/${fileName}${extension}`;

        try {
            await RNFS.writeFile(path, content, 'utf8');
            setSystemShareActiveFlag(true);
            await Share.open({
                title: 'Export Journal',
                url: `file://${path}`,
                type: type === 'json' ? 'application/json' : 'text/plain',
                saveToFiles: true,
            });
            handleClose();
        } catch (error) {
            setSystemShareActiveFlag(false);
            if (error.message !== 'User did not share') {
                Alert.alert('Error', 'Could not export file.');
            }
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
        >
            <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={handleClose}
                />

                <Animated.View
                    style={[
                        styles.modalContent,
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                >
                    <Text style={styles.modalTitle}>Manage Data</Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Export Options</Text>
                        <TouchableOpacity style={styles.modalBtn} onPress={() => handleExport('json')}>
                            <Text style={styles.modalBtnText}>Backup Data (JSON)</Text>
                            <Text style={styles.btnSubText}>Complete transferrable archive file</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modalBtn, styles.secondaryButtonVariant]} onPress={() => handleExport('txt')}>
                            <Text style={styles.modalBtnTextSecondary}>Export Plain Text (TXT)</Text>
                            <Text style={styles.btnSubTextSecondary}>Human readable file format</Text>
                        </TouchableOpacity>
                        <Text style={styles.warningText}>⚠️ Plain text exports cannot be imported back.</Text>
                    </View>

                    <View style={styles.modalSectionSpacing}>
                        <Text style={styles.sectionTitle}>Import Options</Text>
                        <TouchableOpacity style={styles.modalImportBtn} onPress={handleImport}>
                            <Text style={styles.modalImportBtnText}>Restore Backup File</Text>
                            <Text style={styles.btnSubTextImport}>Select a previously exported .json archive</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
                        <Text style={styles.cancelBtnText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 24,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    section: {
        width: '100%',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    modalBtn: {
        backgroundColor: theme.colors.accent,
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 10,
        alignItems: 'flex-start',
    },
    secondaryButtonVariant: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalBtnText: {
        color: theme.colors.background,
        fontWeight: '600',
        fontSize: 15,
    },
    modalBtnTextSecondary: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
        fontSize: 15,
    },
    btnSubText: {
        color: theme.colors.background,
        fontSize: 11,
        opacity: 0.8,
        marginTop: 2,
    },
    btnSubTextSecondary: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        opacity: 0.8,
        marginTop: 2,
    },
    warningText: {
        fontSize: 11,
        color: theme.colors.error,
        marginTop: 4,
        paddingHorizontal: 4,
        lineHeight: 14,
    },
    modalSectionSpacing: {
        width: '100%',
        marginTop: 24,
    },
    modalImportBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.accent,
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'flex-start',
    },
    modalImportBtnText: {
        color: theme.colors.accent,
        fontWeight: '600',
        fontSize: 15,
    },
    btnSubTextImport: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
        opacity: 0.9,
    },
    modalCancelBtn: {
        width: '100%',
        paddingVertical: 14,
        marginTop: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontSize: 15,
    },
});
