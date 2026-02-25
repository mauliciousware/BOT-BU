import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet } from 'react-native';
import ChatInterface from '../../components/ChatInterface';

/**
 * Individual chat screen — accessed via deep link /chat/[id].
 * For now it renders the same ChatInterface; the id param
 * can be used later to pre-load a specific chat.
 */
export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ChatInterface initialChatId={id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
