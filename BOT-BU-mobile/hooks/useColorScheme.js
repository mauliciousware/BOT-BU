import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Returns the current color scheme ('light' or 'dark').
 * For now we default to 'light' to match the web app's behavior.
 */
export function useColorScheme() {
  const scheme = useRNColorScheme();
  // Force light mode to match the web app
  return 'light';
}
