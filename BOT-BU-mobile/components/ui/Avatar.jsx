import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';

const colors = Colors.light;

/**
 * Simple Avatar component.
 *
 * Props:
 *  - source (ImageSource) - image URI or require
 *  - fallback (string) - text to show when no image
 *  - size (number) - width/height in px (default: 32)
 *  - style - extra styles
 */
export default function Avatar({ source, fallback, size = 32, style }) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 4 }, style]}>
      {source ? (
        <Image source={source} style={[styles.image, { width: size, height: size }]} resizeMode="contain" />
      ) : (
        <Text style={[styles.fallback, { fontSize: size * 0.4 }]}>
          {fallback || 'BU'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'contain',
  },
  fallback: {
    fontWeight: '700',
    color: colors.primary,
  },
});
