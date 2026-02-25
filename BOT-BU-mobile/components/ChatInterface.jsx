import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ChatArea from './ChatArea';
import EmptyState from './EmptyState';
import Sidebar from './Sidebar';
import Colors from '../constants/Colors';
import { useChat } from '../hooks/useChat';

const colors = Colors.light;

/**
 * ChatInterface — the main screen orchestrator.
 * Mirrors ChatGPTInterface.jsx from the web app.
 */
export default function ChatInterface() {
  const {
    currentChat,
    chats,
    messages,
    isLoading,
    inputValue,
    setInputValue,
    streamingMessage,
    isReady,
    startNewChat,
    selectChat,
    handleDeleteChat,
    sendMessage,
  } = useChat();

  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleSendMessage = (content) => {
    sendMessage(content);
  };

  const handleNewChat = () => {
    startNewChat();
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <View style={styles.container}>
      {/* Sidebar drawer */}
      <Sidebar
        visible={sidebarVisible}
        currentChat={currentChat}
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={selectChat}
        onDeleteChat={handleDeleteChat}
        onClose={() => setSidebarVisible(false)}
      />

      {hasMessages ? (
        // Chat mode
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ChatArea
            currentChat={currentChat}
            messages={messages}
            isLoading={isLoading}
            streamingMessage={streamingMessage}
            onToggleSidebar={() => setSidebarVisible(true)}
            onDeleteChat={handleDeleteChat}
          />

          {/* Fixed input at bottom */}
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Ask anything..."
                placeholderTextColor={colors.inputPlaceholder}
                multiline
                maxLength={2000}
                editable={!isLoading}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  const trimmed = inputValue.trim();
                  if (!trimmed || isLoading) return;
                  handleSendMessage(trimmed);
                  setInputValue('');
                }}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputValue.trim() || isLoading) && styles.sendButtonDisabled,
                ]}
                onPress={() => {
                  const trimmed = inputValue.trim();
                  if (!trimmed || isLoading) return;
                  handleSendMessage(trimmed);
                  setInputValue('');
                }}
                disabled={!inputValue.trim() || isLoading}
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        // Empty state
        <EmptyState
          onSendMessage={handleSendMessage}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isLoading={isLoading}
          onToggleSidebar={() => setSidebarVisible(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  chatContainer: {
    flex: 1,
  },
  inputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.inputText,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    lineHeight: 22,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
