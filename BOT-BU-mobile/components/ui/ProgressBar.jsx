import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';

const colors = Colors.light;

/**
 * Simple progress bar component.
 *
 * Props:
 *  - value (number 0-100) – percentage filled
 *  - color (string) – fill color override
 *  - height (number)
 *  - style – extra container styles
 */
export default function ProgressBar({ value = 0, color, height = 12, style }) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const fillColor =
    color ||
    (clampedValue >= 95 ? colors.error : clampedValue >= 80 ? colors.warning : colors.primary);

  return (
    <View style={[styles.track, { height }, style]}>
      <View style={[styles.fill, { width: `${clampedValue}%`, backgroundColor: fillColor, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
  },
});
