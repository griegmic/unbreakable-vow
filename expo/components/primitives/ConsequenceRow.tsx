import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { uvColors } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface ConsequenceRowProps {
  amount: number;
  destination: string;
  onChange?: () => void;
}

export function ConsequenceRow({ amount, destination, onChange }: ConsequenceRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        If you break it,{' '}
        <Text style={styles.bold}>${amount}</Text>
        {' '}goes to{' '}
        <Text style={styles.bold}>{destination.toUpperCase()}</Text>
      </Text>
      {onChange && (
        <Pressable
          onPress={() => {
            hapticSecondary();
            onChange();
          }}
          hitSlop={8}
        >
          <Text style={styles.changeLink}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(214, 77, 44, 0.28)',
    backgroundColor: 'rgba(56, 25, 18, 0.28)',
    borderRadius: 12,
    gap: 12,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: uvColors.text,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: uvColors.goldBright,
  },
});

export default ConsequenceRow;
