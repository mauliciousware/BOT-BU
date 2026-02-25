import { Stack } from 'expo-router';

/**
 * Chat route group layout.
 * Individual chat screens can be accessed via /chat/[id]
 */
export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
