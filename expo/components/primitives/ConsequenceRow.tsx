import React from 'react';
import { View, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface ConsequenceRowProps {
  amount: number;
  destination: string;
  onChange?: () => void;
}

export function ConsequenceRow({ amount, destination, onChange }: ConsequenceRowProps) {
  return (
    <View style={viewStyles.container}>
      <Text style={textStyles.text}>
        If you break it,{' '}
        <Text style={textStyles.bold}>${amount}</Text>
        {' '}goes to{' '}
        <Text style={textStyles.bold}>{destination}.</Text>
      </Text>
      {onChange && (
        <Pressable
          onPress={() => {
            hapticSecondary();
            onChange();
          }}
          hitSlop={8}
        >
          <Text style={textStyles.changeLink}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

const viewStyles: Record<string, ViewStyle> = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 77, 44, 0.28)',
    backgroundColor: 'rgba(56, 25, 18, 0.28)',
    borderRadius: 16,
    gap: 10,
  },
};

const textStyles: Record<string, TextStyle> = {
  text: {
    flex: 1,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.35,
    color: uvColors.text,
  },
  bold: {
    fontWeight: '800',
  },
  changeLink: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    fontWeight: '800',
    color: uvColors.goldBright,
  },
};

export default ConsequenceRow;
