import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors } from '@/lib/uv-tokens';
import { hapticSheetPresent } from '@/lib/haptics';

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'date' | 'cause';
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BottomSheet({
  visible,
  onDismiss,
  children,
  variant = 'default',
}: BottomSheetProps) {
  useEffect(() => {
    if (visible) {
      hapticSheetPresent();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.wrapper}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.sheetOuter}>
          <LinearGradient
            colors={['#211b15', '#15110d']}
            style={styles.sheet}
          >
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
            <View style={styles.content}>{children}</View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,4,4,0.72)',
  },
  sheetOuter: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(244,234,216,.12)',
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 34,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(244,234,216,0.18)',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});

export default BottomSheet;
