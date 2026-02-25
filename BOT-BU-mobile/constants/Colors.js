// Color palette matching the web app's emerald theme
const tintColorLight = '#059669'; // emerald-600
const tintColorDark = '#10b981'; // emerald-500

export default {
  light: {
    text: '#111827',           // gray-900
    textSecondary: '#4b5563',  // gray-600
    textTertiary: '#9ca3af',   // gray-400
    background: '#ffffff',
    surface: '#f9fafb',        // gray-50
    border: '#e5e7eb',         // gray-200
    tint: tintColorLight,
    icon: '#6b7280',           // gray-500
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,

    // Emerald theme colors
    primary: '#059669',        // emerald-600
    primaryDark: '#047857',    // emerald-700
    primaryLight: '#d1fae5',   // emerald-100
    primaryBg: '#ecfdf5',      // emerald-50

    // Sidebar
    sidebarBg: '#022c22',      // emerald-950
    sidebarText: '#d1fae5',    // emerald-100
    sidebarBorder: '#065f46',  // emerald-800
    sidebarActive: '#047857',  // emerald-700
    sidebarHover: '#064e3b80', // emerald-800/50
    sidebarMuted: '#6ee7b7',   // emerald-300
    sidebarSubtext: '#10b981', // emerald-500

    // Chat bubbles
    userBubble: '#059669',     // emerald-600
    userBubbleText: '#ffffff',
    botBubble: '#f9fafb',      // gray-50
    botBubbleText: '#111827',  // gray-900

    // Input
    inputBg: '#f9fafb',
    inputBorder: '#d1d5db',    // gray-300
    inputText: '#111827',
    inputPlaceholder: '#6b7280',

    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  dark: {
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textTertiary: '#6b7280',
    background: '#111827',
    surface: '#1f2937',
    border: '#374151',
    tint: tintColorDark,
    icon: '#9ca3af',
    tabIconDefault: '#6b7280',
    tabIconSelected: tintColorDark,

    primary: '#10b981',
    primaryDark: '#059669',
    primaryLight: '#064e3b',
    primaryBg: '#022c22',

    sidebarBg: '#022c22',
    sidebarText: '#d1fae5',
    sidebarBorder: '#065f46',
    sidebarActive: '#047857',
    sidebarHover: '#064e3b80',
    sidebarMuted: '#6ee7b7',
    sidebarSubtext: '#10b981',

    userBubble: '#059669',
    userBubbleText: '#ffffff',
    botBubble: '#1f2937',
    botBubbleText: '#f9fafb',

    inputBg: '#1f2937',
    inputBorder: '#374151',
    inputText: '#f9fafb',
    inputPlaceholder: '#6b7280',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};
