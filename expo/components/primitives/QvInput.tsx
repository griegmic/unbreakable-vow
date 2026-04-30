import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '../../lib/uv-tokens';

interface QvInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function QvInput({ value, onChangeText, placeholder }: QvInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={uvColors.textDim}
      style={[
        styles.input,
        !value && placeholder ? styles.placeholderStyle : undefined,
      ]}
      multiline
      textAlignVertical="top"
    />
  );
}

export default QvInput;

const styles = StyleSheet.create({
  input: {
    minHeight: 82,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 29,
    fontWeight: '700',
    color: uvColors.text,
    padding: 0,
  },
  placeholderStyle: {
    fontFamily: uvFonts.serifItalic,
    fontStyle: 'italic',
    fontWeight: '400',
  },
});
