/**
 * Напівпрозорий задній фон (overlay) для діалогових вікон.
 * Блокує взаємодію з основним екраном та дозволяє закрити діалог натисканням поза ним.
 */
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DialogOverlayProps extends PropsWithChildren {
  dismissible?: boolean;
  onClose: () => void;
  visible: boolean;
}

export function DialogOverlay({
  children,
  dismissible = true,
  onClose,
  visible,
}: DialogOverlayProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[
          styles.overlay,
          {
            paddingBottom: insets.bottom + 20,
            paddingTop: insets.top + 20,
          },
        ]}
      >
        <Pressable
          disabled={!dismissible}
          onPress={dismissible ? onClose : undefined}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
  },
});
