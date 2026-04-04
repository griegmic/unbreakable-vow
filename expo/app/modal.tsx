import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { palette } from '@/constants/unbreakable';

export default function ModalScreen() {
  console.log('[ModalScreen] rendering');
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Info</Text>
          <Text style={styles.description}>
            Unbreakable Vow — commit to your goals with real stakes.
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 24,
    padding: 28,
    margin: 20,
    alignItems: 'center',
    minWidth: 300,
    borderWidth: 1,
    borderColor: palette.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
    color: palette.text,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    color: palette.textSecondary,
    lineHeight: 22,
    fontSize: 15,
  },
  closeButton: {
    backgroundColor: palette.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 100,
    borderWidth: 1,
    borderColor: palette.border,
  },
  closeButtonText: {
    color: palette.text,
    fontWeight: '600' as const,
    textAlign: 'center',
    fontSize: 15,
  },
});
