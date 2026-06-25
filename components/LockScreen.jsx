import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, AppState } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';
import { theme } from '../constants/Theme';
import { KEYCHAIN_SERVICE_NAME } from '../constants/config';

const rnBiometrics = new ReactNativeBiometrics();

export default function LockScreen({ onAuthSuccess }) {
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [pin, setPin] = useState('');
    const appStateRef = useRef(AppState.currentState);

    useEffect(() => {
        checkPinStatus();

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                checkPinStatus();
            }
            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkPinStatus = async () => {
        try {
            const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE_NAME });
            if (credentials) {
                setIsSettingUp(false);
                checkAndAuthenticate();
            } else {
                setIsSettingUp(true);
            }
        } catch (error) {
            setIsSettingUp(true);
        }
    };

    const checkAndAuthenticate = async () => {
        try {
            const { available } = await rnBiometrics.isSensorAvailable();
            if (available) {
                const result = await rnBiometrics.simplePrompt({
                    promptMessage: 'Confirm biometrics to continue',
                });
                if (result.success) {
                    onAuthSuccess();
                }
            }
        } catch (error) {
        }
    };

    const handleKeyPress = (val) => {
        if (pin.length >= 4) return;
        const newPin = pin + val;
        setPin(newPin);

        if (newPin.length === 4) {
            executeAuthAction(newPin);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const executeAuthAction = async (completedPin) => {
        if (isSettingUp) {
            await Keychain.setGenericPassword('user', completedPin, { service: KEYCHAIN_SERVICE_NAME });
            setIsSettingUp(false);
            onAuthSuccess();
        } else {
            const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE_NAME });
            if (credentials && credentials.password === completedPin) {
                onAuthSuccess();
            } else {
                Alert.alert('Error', 'Incorrect PIN');
                setPin('');
            }
        }
    };

    const renderDot = (index) => {
        const isActive = pin.length > index;
        return (
            <View
                key={index}
                style={[
                    styles.pinDot,
                    isActive && styles.pinDotActive
                ]}
            />
        );
    };

    return (
        <View style={styles.lockedContainer}>
            <Text style={styles.lockedText}>
                {isSettingUp ? 'Create App PIN' : 'Enter PIN'}
            </Text>

            <View style={styles.dotsWrapper}>
                {[0, 1, 2, 3].map(index => renderDot(index))}
            </View>

            <TouchableOpacity style={styles.forgotFrame}>
                <Text style={styles.forgotText}>Forgot? Tap here!</Text>
            </TouchableOpacity>

            {!isSettingUp && (
                <TouchableOpacity onPress={checkAndAuthenticate} style={styles.biometricCenterButton}>
                    <View style={styles.biometricOuterRing}>
                        <Text style={styles.biometricIconText}>🧬</Text>
                    </View>
                </TouchableOpacity>
            )}

            <View style={styles.keyboardContainer}>
                <View style={styles.keyboardRow}>
                    {['1', '2', '3'].map(num => (
                        <TouchableOpacity key={num} style={styles.keyButton} onPress={() => handleKeyPress(num)}>
                            <Text style={styles.keyText}>{num}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.keyboardRow}>
                    {['4', '5', '6'].map(num => (
                        <TouchableOpacity key={num} style={styles.keyButton} onPress={() => handleKeyPress(num)}>
                            <Text style={styles.keyText}>{num}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.keyboardRow}>
                    {['7', '8', '9'].map(num => (
                        <TouchableOpacity key={num} style={styles.keyButton} onPress={() => handleKeyPress(num)}>
                            <Text style={styles.keyText}>{num}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.keyboardRow}>
                    <TouchableOpacity style={styles.keyButton} disabled>
                        <Text style={styles.keyText}></Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keyButton} onPress={() => handleKeyPress('0')}>
                        <Text style={styles.keyText}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keyButton} onPress={handleBackspace}>
                        <Text style={styles.keyText}>⌫</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    lockedContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 60,
    },
    lockedText: {
        color: theme.colors.textPrimary,
        fontSize: 22,
        fontWeight: '400',
        marginTop: 40,
    },
    dotsWrapper: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    pinDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: theme.colors.accent,
        marginHorizontal: 12,
        backgroundColor: 'transparent',
    },
    pinDotActive: {
        backgroundColor: theme.colors.accent,
    },
    forgotFrame: {
        padding: 10,
    },
    forgotText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        opacity: 0.8,
    },
    biometricCenterButton: {
        marginVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    biometricOuterRing: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    biometricIconText: {
        fontSize: 30,
    },
    keyboardContainer: {
        width: '100%',
        paddingHorizontal: 40,
        marginBottom: 20,
    },
    keyboardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 12,
    },
    keyButton: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyText: {
        color: theme.colors.textPrimary,
        fontSize: 26,
        fontWeight: '400',
    },
});
