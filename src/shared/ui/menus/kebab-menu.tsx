/**
 * Випадаюче контекстне меню (Kebab Menu).
 * Показує список опцій при натисканні на три крапки на екрані редактора або списку.
 */
import type { LucideIcon } from "lucide-react-native";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KebabMenuItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
}

interface KebabMenuProps {
  items: KebabMenuItem[];
  visible: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KebabMenu({ items, visible, onClose }: KebabMenuProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      opacityAnim.setValue(0);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(0);
    }
  }, [visible, opacityAnim]);

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Invisible full-screen backdrop */}
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />

      {/* Dropdown panel */}
      <Animated.View
        style={[
          styles.menuPanel,
          {
            opacity: opacityAnim,
            top: insets.top + 8,
          },
        ]}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={[styles.menuItem, !isLast && styles.menuItemDivider]}
            >
              <item.Icon
                color={item.destructive ? "#EF4444" : "#E2E8F0"}
                size={18}
                style={styles.menuItemIcon}
              />
              <Text
                style={[
                  styles.menuItemLabel,
                  item.destructive && styles.menuItemLabelDestructive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  menuPanel: {
    position: "absolute",
    top: 56,
    right: 12,
    minWidth: 190,
    backgroundColor: "#211f26",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262a31",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2D3748",
  },
  menuItemIcon: {
    marginRight: 10,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  // колір текстудля видалення
  menuItemLabelDestructive: {
    color: "#E2E8F0",
  },
});
