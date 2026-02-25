import React from 'react';
import { ScrollView } from 'react-native';

/**
 * Simple ScrollArea wrapper — mirrors shadcn ScrollArea.
 * In React Native this is just a styled ScrollView.
 */
export default function ScrollArea({ children, style, contentContainerStyle, ...props }) {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
}
