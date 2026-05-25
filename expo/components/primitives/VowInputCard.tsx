import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvRadius } from '@/lib/uv-tokens';

interface VowInputCardProps {
  kicker?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
}

export function VowInputCard({
  kicker = 'I VOW TO',
  placeholder = 'do something meaningful...',
  value,
  onChangeText,
  onFocus,
}: VowInputCardProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.card,
        focused && styles.cardFocused,
      ]}
    >
      <Text style={styles.kicker}>{kicker}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(185,174,154,0.72)"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        multiline
        textAlignVertical="top"
        cursorColor={uvColors.goldBright}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 128,
    borderWidth: 1.3,
    borderColor: 'rgba(244,234,216,0.28)',
    borderRadius: uvRadius['2xl'],
    paddingTop: 19,
    paddingBottom: 21,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(24,21,18,0.82)',
  },
  cardFocused: {
    borderColor: uvColors.gold,
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 11 * 0.3,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
  },
  input: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 30,
    lineHeight: 30 * 1.12,
    color: uvColors.text,
    marginTop: 24,
    padding: 0,
  },
});

export default VowInputCard;
