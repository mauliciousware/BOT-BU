import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Avatar from './ui/Avatar';

const colors = Colors.light;

/**
 * ChatArea — displays the message list, streaming indicator, and header.
 * Ported from web ChatArea.jsx
 */
export default function ChatArea({
  currentChat,
  messages,
  isLoading,
  streamingMessage,
  onToggleSidebar,
  onDeleteChat,
}) {
  const flatListRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Bounce animation for loading dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading && !streamingMessage) {
      const createBounce = (dot, delay) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, { toValue: -6, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          ])
        );
      const a1 = createBounce(dot1, 0);
      const a2 = createBounce(dot2, 100);
      const a3 = createBounce(dot3, 200);
      a1.start();
      a2.start();
      a3.start();
      return () => { a1.stop(); a2.stop(); a3.stop(); };
    }
  }, [isLoading, streamingMessage]);

  // Scroll to bottom on new messages / streaming
  useEffect(() => {
    if (flatListRef.current && (messages.length > 0 || streamingMessage)) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, streamingMessage]);

  const handleCopy = async (content, messageId) => {
    try {
      await Clipboard.setStringAsync(content);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = () => {
    if (currentChat) {
      onDeleteChat(currentChat.id);
    }
  };

  // Build data array for FlatList
  const listData = [...messages];
  if (streamingMessage) {
    listData.push({ id: '__streaming__', type: 'streaming', content: streamingMessage });
  } else if (isLoading) {
    listData.push({ id: '__loading__', type: 'loading' });
  }

  const renderMessage = ({ item }) => {
    if (item.type === 'loading') {
      return (
        <View style={styles.botRow}>
          <Avatar fallback="BU" size={32} style={styles.avatar} />
          <View style={styles.loadingBubble}>
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
          </View>
        </View>
      );
    }

    if (item.type === 'streaming') {
      return (
        <View style={styles.botRow}>
          <Avatar fallback="BU" size={32} style={styles.avatar} />
          <View style={styles.botBubble}>
            <Text style={styles.botText}>
              {item.content}
              <Text style={styles.cursor}>|</Text>
            </Text>
          </View>
        </View>
      );
    }

    if (item.type === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // Bot message
    return (
      <View style={styles.botRow}>
        <Avatar fallback="BU" size={32} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <View style={styles.botBubble}>
            <Text style={styles.botText}>{item.content}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => handleCopy(item.content, item.id)}
          >
            <Ionicons
              name={copiedMessageId === item.id ? 'checkmark' : 'copy-outline'}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.copyText}>
              {copiedMessageId === item.id ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onToggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Avatar fallback="BU" size={32} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentChat?.title || 'Binghamton University AI'}
            </Text>
            <Text style={styles.headerSubtitle}>Your intelligent campus assistant</Text>
          </View>
        </View>
        {currentChat && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  menuButton: {
    padding: 4,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  deleteButton: {
    padding: 8,
  },

  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
  },

  // User message
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: colors.userBubble,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    color: colors.userBubbleText,
    fontSize: 15,
    lineHeight: 22,
  },

  // Bot message
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  avatar: {
    marginTop: 2,
  },
  botBubble: {
    flex: 1,
    backgroundColor: colors.botBubble,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  botText: {
    color: colors.botBubbleText,
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Copy button
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  copyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Loading dots
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.botBubble,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
