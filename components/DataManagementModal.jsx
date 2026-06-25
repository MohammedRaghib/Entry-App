import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Animated, Easing } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { zip, unzip } from 'react-native-zip-archive';
import { pick, types, isCancel } from '@react-native-documents/picker';
import { theme } from '../constants/Theme';
import { getAllEntriesForExport, getAllMoods, importEntries, importMoods } from '../db';

export default function DataManagementModal({ visible, onClose, onRefresh }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 220,
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
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleImport = async () => {
        const scratchPath = `${RNFS.TemporaryDirectoryPath}/import_scratch`;
        try {
            const [res] = await pick({ type: [types.zip] });

            if (await RNFS.exists(scratchPath)) {
                await RNFS.unlink(scratchPath);
            }
            await RNFS.mkdir(scratchPath);

            await unzip(res.uri, scratchPath);

            const manifestPath = `${scratchPath}/backup_manifest.json`;
            if (!(await RNFS.exists(manifestPath))) {
                throw new Error('Missing manifest');
            }

            const manifestContent = await RNFS.readFile(manifestPath, 'utf8');
            const archive = JSON.parse(manifestContent);

            if (!archive.entries || !archive.moods) {
                throw new Error('Malformed backup structure');
            }

            const localMoods = getAllMoods();
            const moodIdMap = {};

            for (const importedMood of archive.moods) {
                const existing = localMoods.find(m => m.name === importedMood.name || m.emoji === importedMood.emoji);
                if (existing) {
                    moodIdMap[importedMood.id] = existing.id;
                } else {
                    const newId = importMoods({ emoji: importedMood.emoji, name: importedMood.name });
                    moodIdMap[importedMood.id] = newId;
                }
            }

            const permanentAttachmentsDir = `${RNFS.DocumentDirectoryPath}/attachments`;
            if (!(await RNFS.exists(permanentAttachmentsDir))) {
                await RNFS.mkdir(permanentAttachmentsDir);
            }

            const scratchAttachmentsPath = `${scratchPath}/attachments`;
            if (await RNFS.exists(scratchAttachmentsPath)) {
                const files = await RNFS.readDir(scratchAttachmentsPath);
                for (const file of files) {
                    if (file.isFile()) {
                        const targetPath = `${permanentAttachmentsDir}/${file.name}`;
                        if (await RNFS.exists(targetPath)) {
                            await RNFS.unlink(targetPath);
                        }
                        await RNFS.copyFile(file.path, targetPath);
                    }
                }
            }

            const normalizedEntries = archive.entries.map(entry => ({
                ...entry,
                mood_id: moodIdMap[entry.mood_id] || entry.mood_id,
                attachments: JSON.stringify(entry.attachments || [])
            }));

            importEntries(normalizedEntries);

            Alert.alert('Success', 'Journal data and attachments restored successfully.');
            handleClose();
            onRefresh();
        } catch (err) {
            if (!isCancel(err)) {
                Alert.alert('Import Error', 'Invalid backup file package.');
            }
        } finally {
            if (await RNFS.exists(scratchPath)) {
                await RNFS.unlink(scratchPath).catch(() => { });
            }
        }
    };

    const handleExport = async () => {
        const stagingPath = `${RNFS.TemporaryDirectoryPath}/export_staging`;
        const zipPath = `${RNFS.TemporaryDirectoryPath}/Journal_Backup.zip`;

        try {
            if (await RNFS.exists(stagingPath)) await RNFS.unlink(stagingPath);
            if (await RNFS.exists(zipPath)) await RNFS.unlink(zipPath);

            await RNFS.mkdir(stagingPath);
            await RNFS.mkdir(`${stagingPath}/attachments`);

            const dbEntries = getAllEntriesForExport();
            const dbMoods = getAllMoods();

            const processedEntries = dbEntries.map(e => {
                let parsedAttachments = [];
                try {
                    parsedAttachments = typeof e.attachments === 'string' ? JSON.parse(e.attachments) : (e.attachments || []);
                } catch {
                    parsedAttachments = [];
                }
                return {
                    id: e.id,
                    title: e.title,
                    body: e.body,
                    mood_id: e.mood_id,
                    date: e.date,
                    attachments: parsedAttachments
                };
            });

            const manifest = {
                version: 1,
                exported_at: new Date().toISOString(),
                moods: dbMoods.map(m => ({ id: m.id, emoji: m.emoji, name: m.name })),
                entries: processedEntries
            };

            await RNFS.writeFile(`${stagingPath}/backup_manifest.json`, JSON.stringify(manifest, null, 2), 'utf8');

            const permanentAttachmentsDir = `${RNFS.DocumentDirectoryPath}/attachments`;
            for (const entry of processedEntries) {
                for (const fileName of entry.attachments) {
                    const sourcePath = `${permanentAttachmentsDir}/${fileName}`;
                    if (await RNFS.exists(sourcePath)) {
                        await RNFS.copyFile(sourcePath, `${stagingPath}/attachments/${fileName}`);
                    }
                }
            }

            await zip(stagingPath, zipPath);

            await Share.open({
                title: 'Export Journal Archive',
                url: `file://${zipPath}`,
                type: 'application/zip',
                saveToFiles: true,
            });

            handleClose();
        } catch (error) {
            console.error(error);
            if (error.message !== 'User did not share') {
                Alert.alert('Error', 'Could not compile the archive package.');
            }
        } finally {
            if (await RNFS.exists(stagingPath)) await RNFS.unlink(stagingPath).catch(() => { });
            if (await RNFS.exists(zipPath)) await RNFS.unlink(zipPath).catch(() => { });
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

                <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
                    <Text style={styles.modalTitle}>Manage Data</Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Export Options</Text>
                        <TouchableOpacity style={styles.modalBtn} onPress={handleExport}>
                            <Text style={styles.modalBtnText}>Backup Data & Media (ZIP)</Text>
                            <Text style={styles.btnSubText}>Complete transferable archive container</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSectionSpacing}>
                        <Text style={styles.sectionTitle}>Import Options</Text>
                        <TouchableOpacity style={styles.modalImportBtn} onPress={handleImport}>
                            <Text style={styles.modalImportBtnText}>Restore Backup Package</Text>
                            <Text style={styles.btnSubTextImport}>Select a previously exported .zip bundle</Text>
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
        alignItems: 'flex-start',
    },
    modalBtnText: {
        color: theme.colors.background,
        fontWeight: '600',
        fontSize: 15,
    },
    btnSubText: {
        color: theme.colors.background,
        fontSize: 11,
        opacity: 0.8,
        marginTop: 2,
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
