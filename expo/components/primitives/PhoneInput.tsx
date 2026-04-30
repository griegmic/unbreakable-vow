import React from 'react';
import { Pressable, View, Text, TextInput, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  countryCode?: string;
  onCountryPress?: () => void;
}

export function PhoneInput({
  value,
  onChangeText,
  countryCode = '+1',
  onCountryPress,
}: PhoneInputProps) {
  const flag = countryCode === '+1' ? '\u{1F1FA}\u{1F1F8}' : '\u{1F30D}';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          hapticSecondary();
          onCountryPress?.();
        }}
        style={styles.countrySection}
      >
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.code}>{countryCode}</Text>
      </Pressable>
      <View style={styles.separator} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholder="Phone number"
        placeholderTextColor={uvColors.textDim}
        keyboardType="phone-pad"
        keyboardAppearance="dark"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 76,
    borderRadius: 22,
    borderWidth: 1.3,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgInput,
    paddingHorizontal: 16,
  },
  countrySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  flag: {
    fontSize: 22,
  },
  code: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 16,
    fontWeight: '500',
    color: uvColors.text,
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: uvColors.border,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: uvFonts.sans,
    fontSize: 17,
    color: uvColors.text,
    height: '100%',
  },
});

export default PhoneInput;
