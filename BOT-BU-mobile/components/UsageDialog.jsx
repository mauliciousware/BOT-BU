import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Dialog from './ui/Dialog';
import ProgressBar from './ui/ProgressBar';
import Colors from '../constants/Colors';
import { useUsageStats } from '../hooks/useUsageStats';

const colors = Colors.light;

/**
 * UsageDialog — shows global API usage stats.
 * Ported from web UsageDialog.jsx
 */
export default function UsageDialog({ visible, onClose }) {
  const { usage, loading, error } = useUsageStats(visible);

  const getStatusBadge = (status) => {
    if (status === 'critical') {
      return (
        <View style={[styles.badge, { backgroundColor: '#fef2f2' }]}>
          <Ionicons name="warning" size={12} color="#dc2626" />
          <Text style={[styles.badgeText, { color: '#dc2626' }]}>Critical</Text>
        </View>
      );
    }
    if (status === 'warning') {
      return (
        <View style={[styles.badge, { backgroundColor: '#fefce8' }]}>
          <Ionicons name="warning" size={12} color="#ca8a04" />
          <Text style={[styles.badgeText, { color: '#ca8a04' }]}>Warning</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: '#f0fdf4' }]}>
        <Ionicons name="pulse" size={12} color="#16a34a" />
        <Text style={[styles.badgeText, { color: '#16a34a' }]}>Healthy</Text>
      </View>
    );
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Bot Bu Global Usage"
      description="Real-time API usage statistics for all users"
      titleIcon={<Ionicons name="people" size={20} color={colors.primary} />}
    >
      {loading && !usage ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : usage ? (
        <View style={{ gap: 20 }}>
          {/* Status */}
          <View style={styles.row}>
            <Text style={styles.label}>System Status</Text>
            {getStatusBadge(usage.status)}
          </View>

          {/* Total Requests card */}
          <View style={styles.statCard}>
            <View>
              <Text style={styles.statLabel}>Total Requests</Text>
              <Text style={styles.statValue}>{usage.totalRequests?.toLocaleString() || 0}</Text>
              <Text style={styles.statSub}>
                Since {usage.firstRequestDate ? new Date(usage.firstRequestDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <Ionicons name="pulse" size={36} color={colors.primary} style={{ opacity: 0.5 }} />
          </View>

          {/* Daily Usage */}
          <View style={{ gap: 8 }}>
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar" size={16} color={colors.primary} />
                <Text style={styles.label}>Requests Today</Text>
              </View>
              <Text style={styles.bold}>
                {usage.requestsToday?.toLocaleString()} / {usage.dailyLimit?.toLocaleString()}
              </Text>
            </View>
            <ProgressBar value={usage.dailyPercentage} />
            <View style={styles.row}>
              <Text style={styles.smallText}>{usage.dailyPercentage?.toFixed(1)}% used</Text>
              <Text style={styles.smallText}>{usage.dailyRemaining?.toLocaleString()} remaining</Text>
            </View>
          </View>

          {/* Minute Usage */}
          <View style={{ gap: 8 }}>
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time" size={16} color={colors.primary} />
                <Text style={styles.label}>Requests This Minute</Text>
              </View>
              <Text style={styles.bold}>
                {usage.requestsThisMinute?.toLocaleString()} / {usage.minuteLimit?.toLocaleString()}
              </Text>
            </View>
            <ProgressBar value={usage.minutePercentage} />
            <View style={styles.row}>
              <Text style={styles.smallText}>{usage.minutePercentage?.toFixed(1)}% used</Text>
              <Text style={styles.smallText}>{usage.minuteRemaining?.toLocaleString()} remaining</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="trending-up" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Shared Across All Users</Text>
              <Text style={styles.infoText}>
                These limits are global for the entire Bot Bu application. All users share the same API quota.
              </Text>
            </View>
          </View>

          <Text style={styles.refreshText}>Auto-refreshing every 5 seconds...</Text>
        </View>
      ) : null}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  smallText: {
    fontSize: 11,
    color: colors.textTertiary,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Stat card
  statCard: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.primary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
  },

  refreshText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textTertiary,
  },
});
