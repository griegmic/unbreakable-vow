import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface MessagePreviewCardProps {
  kicker?: string;
  messageText: string;
  url?: string;
  children?: React.ReactNode;
}

export function MessagePreviewCard({ kicker, messageText, url, children }: MessagePreviewCardProps) {
  return (
    <View style={styles.card}>
      {kicker && <Text style={styles.kicker}>{kicker}</Text>}
      <Text style={styles.message}>{messageText}</Text>
      {children}
      {url && (
        <View style={styles.urlRow}>
          <Text style={styles.url} numberOfLines={1}>
            {url}
          </Text>
        </View>
      )}
    </View>
  );
}

export default MessagePreviewCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: uvColors.border,
    borderRadius: 22,
    backgroundColor: 'rgba(24, 21, 18, 0.82)',
    padding: 16,
    gap: 10,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    color: uvColors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    fontFamily: uvFonts.sans,
    fontSize: 16,
    color: uvColors.text,
    lineHeight: 22,
  },
  urlRow: {
    borderTopWidth: 1,
    borderTopColor: uvColors.border,
    paddingTop: 10,
    marginTop: 2,
  },
  url: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textDim,
  },
});
