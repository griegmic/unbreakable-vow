import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface LegalLink {
  label: string;
  onPress: () => void;
}

interface LegalLineProps {
  text: string;
  links?: LegalLink[];
}

export function LegalLine({ text, links }: LegalLineProps) {
  if (!links || links.length === 0) {
    return <Text style={styles.text}>{text}</Text>;
  }

  // Split text by link labels and interleave
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  for (const link of links) {
    const idx = remaining.indexOf(link.label);
    if (idx !== -1) {
      if (idx > 0) {
        parts.push(
          <Text key={`t-${keyIdx}`} style={styles.text}>
            {remaining.slice(0, idx)}
          </Text>
        );
      }
      parts.push(
        <Pressable key={`l-${keyIdx}`} onPress={link.onPress}>
          <Text style={styles.link}>{link.label}</Text>
        </Pressable>
      );
      remaining = remaining.slice(idx + link.label.length);
    }
    keyIdx++;
  }

  if (remaining) {
    parts.push(
      <Text key="tail" style={styles.text}>
        {remaining}
      </Text>
    );
  }

  return (
    <Text style={styles.wrapper}>
      {parts.length > 0 ? parts : <Text style={styles.text}>{text}</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    textAlign: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  text: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    color: uvColors.textDim,
    textAlign: 'center',
  },
  link: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    color: uvColors.textMuted,
    textDecorationLine: 'underline',
  },
});

export default LegalLine;
