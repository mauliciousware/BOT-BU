import { SafeAreaView, StyleSheet } from 'react-native';
import ChatInterface from '../components/ChatInterface';

/**
 * Home screen — renders the main chat interface.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ChatInterface />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
