import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import ScrollArea from './ui/ScrollArea';
import Button from './ui/Button';
import { getTimestamp } from '../lib/chatStorage';

const colors = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

/**
 * Sidebar — slide-in drawer with chat history.
 * Ported from web SimpleSidebar.jsx
 */
export default function Sidebar({
  visible,
  currentChat,
  chats = [],
  onNewChat,
  onChatSelect,
  onDeleteChat,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats
    .filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const formatTimestamp = (isoString) => {
    return getTimestamp(isoString);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Drawer */}
      <View style={styles.drawer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>BU</Text>
            </View>
            <Text style={styles.brandName}>Bot Bu</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.sidebarMuted} />
          </TouchableOpacity>
        </View>

        {/* New Chat */}
        <View style={styles.newChatSection}>
          <Button
            title="New chat"
            icon={<Ionicons name="add" size={20} color="#fff" style={{ marginRight: 8 }} />}
            onPress={() => { onNewChat(); onClose(); }}
            style={styles.newChatButton}
            textStyle={{ fontSize: 15, fontWeight: '600' }}
          />
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.sidebarSubtext} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search chats..."
              placeholderTextColor={colors.sidebarSubtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Chat list */}
        <Text style={styles.sectionLabel}>Recent Chats</Text>
        <ScrollArea style={styles.chatList}>
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={[
                  styles.chatItem,
                  currentChat?.id === chat.id && styles.chatItemActive,
                ]}
                onPress={() => { onChatSelect(chat); onClose(); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={colors.sidebarSubtext}
                  style={{ marginTop: 2 }}
                />
                <View style={styles.chatItemText}>
                  <Text style={styles.chatTitle} numberOfLines={1}>{chat.title}</Text>
                  <Text style={styles.chatTime}>{formatTimestamp(chat.updatedAt)}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No chats found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          )}
        </ScrollArea>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 40,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.sidebarBg,
    zIndex: 50,
    paddingTop: 56,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.sidebarBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.primary,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecfdf5',
  },
  closeButton: {
    padding: 4,
  },

  // New Chat
  newChatSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  newChatButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 44,
  },

  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6,78,59,0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6,95,70,0.5)',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#ecfdf5',
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.sidebarSubtext,
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  // Chat list
  chatList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  chatItemActive: {
    backgroundColor: colors.sidebarActive,
  },
  chatItemText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.sidebarText,
  },
  chatTime: {
    fontSize: 11,
    color: colors.sidebarSubtext,
    marginTop: 2,
  },

  // Empty
  emptyList: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.sidebarSubtext,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.sidebarSubtext,
    marginTop: 4,
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sidebarBorder,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.sidebarSubtext,
  },
});
