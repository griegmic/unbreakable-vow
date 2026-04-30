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
        { borderColor: focused ? uvColors.border : uvColors.borderSoft },
      ]}
    >
      <Text style={styles.kicker}>{kicker}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={uvColors.textDim}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.3,
    borderRadius: uvRadius['2xl'],
    padding: 20,
    backgroundColor: uvColors.bgCard,
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: uvColors.textDim,
  },
  input: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 22,
    color: uvColors.text,
    minHeight: 60,
    padding: 0,
  },
});

export default VowInputCard;
