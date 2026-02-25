import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Colors from '../../constants/Colors';

const colors = Colors.light;

/**
 * Reusable Button component matching the web app's Button from shadcn/ui.
 *
 * Props:
 *  - title (string) - button label
 *  - onPress (fn)
 *  - variant: 'default' | 'ghost' | 'destructive' | 'outline'
 *  - size: 'default' | 'sm' | 'icon'
 *  - disabled (bool)
 *  - loading (bool)
 *  - icon (ReactNode) - left icon
 *  - style - extra container styles
 *  - textStyle - extra text styles
 *  - children - rendered inside (overrides title)
 */
export default function Button({
  title,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  children,
}) {
  const containerStyles = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'default' ? '#fff' : colors.primary} />
      ) : (
        <>
          {icon}
          {children ? children : title ? <Text style={labelStyles}>{title}</Text> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  // Variants
  variant_default: {
    backgroundColor: colors.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_destructive: {
    backgroundColor: colors.error,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Sizes
  size_default: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 44,
  },
  size_sm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 32,
  },
  size_icon: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  // Text
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_default: {
    color: '#ffffff',
  },
  text_ghost: {
    color: colors.text,
  },
  text_destructive: {
    color: '#ffffff',
  },
  text_outline: {
    color: colors.text,
  },
  textSize_default: {
    fontSize: 15,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_icon: {
    fontSize: 15,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.7,
  },
});
