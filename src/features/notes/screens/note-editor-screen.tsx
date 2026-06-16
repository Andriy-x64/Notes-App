/**
 * Екран редактора тексту нотаток.
 * Об'єднує WebView-редактор RichText, панель інструментів та меню для редагування вмісту нотатки.
 */
import {
  ArrowLeft,
  Bell,
  BellOff,
  EllipsisVertical,
  FolderInput,
  Pin,
  PinOff,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react-native";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DatePicker from "react-native-date-picker";
import { RichEditor } from "react-native-pell-rich-editor";
import { SafeAreaView } from "react-native-safe-area-context";

import { MarkdownToolbar } from "@/features/notes/components/text-toolbar";
import { useNoteEditor } from "@/features/notes/hooks/use-note-editor";
import { EDITOR_WEBVIEW_SCRIPT } from "@/features/notes/utils/editor-webview-script";
import {
  ConfirmDialog,
  DialogActions,
  DialogBody,
  DialogContainer,
  DialogHeader,
  DialogOverlay,
  ErrorDialog,
  MoveDialog,
} from "@/shared/ui/dialogs";
import { KebabMenu, KebabMenuItem } from "@/shared/ui/menus/kebab-menu";

export default function NoteEditorScreen() {
  const {
    isNew,
    richEditorRef,
    title,
    content,
    reminder,
    openDatePicker,
    tempDateTime,
    isDeleteNoteDialogVisible,
    isReminderOptionsVisible,
    isDeleteReminderDialogVisible,
    errorMessage,
    canUndo,
    canRedo,
    setOpenDatePicker,
    setIsDeleteNoteDialogVisible,
    setIsReminderOptionsVisible,
    setIsDeleteReminderDialogVisible,
    setErrorMessage,
    handleTitleChange,
    handleUndo,
    handleRedo,
    handleDelete,
    handleConfirmDeleteNote,
    onEditorChange,
    handleMessage,
    handleBellPress,
    saveReminder,
    handleEditReminder,
    handleConfirmDeleteReminder,
    handleBottomBarAction,
    isPinned,
    handlePinToggle,
    router,
    isKebabVisible,
    setIsKebabVisible,
    isMoveDialogVisible,
    setIsMoveDialogVisible,
    allFolders,
    handleConfirmMoveNote,
  } = useNoteEditor();

  const noteKebabItems = React.useMemo(() => {
    const base: KebabMenuItem[] = [
      {
        id: "move",
        label: "Перемістити",
        Icon: FolderInput,
        onPress: () => setIsMoveDialogVisible(true),
      },
    ];
    if (!isNew) {
      base.push({
        id: "delete",
        label: "Видалити",
        Icon: Trash2,
        onPress: handleDelete,
        destructive: true,
      });
    }
    return base;
  }, [isNew, handleDelete, setIsMoveDialogVisible]);

  const scrollViewRef = React.useRef<ScrollView>(null);
  // Зберігаємо поточну позицію скролу та висоту видимої області ScrollView
  const currentScrollY = React.useRef(0);
  const viewportHeight = React.useRef(0);

  // Висота панелі інструментів (Rich Toolbar)
  const TOOLBAR_HEIGHT = 44;
  // Висота нижнього банера нагадування (якщо він відображається)
  const REMINDER_BAR_HEIGHT = 72;
  // Додатковий безпечний відступ для зручності
  const EXTRA_PADDING = 16;

  // Автоматичне прокручування екрана до позиції курсора, якщо він виходить за межі видимої області
  const handleCursorPosition = React.useCallback((offsetY: number) => {
    const scrollY = currentScrollY.current;
    const height = viewportHeight.current;
    if (height === 0) return;

    // Встановлюємо безпечні межі видимості для курсора
    const topThreshold = scrollY + 20;
    const bottomThreshold = scrollY + height - 60; // 60px залишає запас над toolbar

    if (offsetY < topThreshold) {
      // Курсор опинився вище видимої області
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, offsetY - 20),
        animated: true,
      });
    } else if (offsetY > bottomThreshold) {
      // Курсор опинився нижче видимої області (наприклад, під клавіатурою чи toolbar)
      scrollViewRef.current?.scrollTo({
        y: offsetY - height + 60,
        animated: true,
      });
    }
  }, []);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleBellPress}
            style={[
              styles.iconButton,
              reminder && { backgroundColor: "#1A253C" },
            ]}
          >
            {reminder ? (
              <BellOff color="#3B82F6" size={22} />
            ) : (
              <Bell color="#FFF" size={22} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePinToggle}
            style={[
              styles.iconButton,
              isPinned && { backgroundColor: "#1A253C" },
            ]}
          >
            {isPinned ? (
              <PinOff color="#3B82F6" size={22} />
            ) : (
              <Pin color="#FFF" size={22} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!canUndo}
            onPress={handleUndo}
            style={[styles.iconButton, !canUndo && styles.disabled]}
          >
            <Undo2 color={canUndo ? "#FFF" : "#444"} size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!canRedo}
            onPress={handleRedo}
            style={[styles.iconButton, !canRedo && styles.disabled]}
          >
            <Redo2 color={canRedo ? "#FFF" : "#444"} size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsKebabVisible(true)}
            style={styles.iconButton}
          >
            <EllipsisVertical color="#FFF" size={22} />
          </TouchableOpacity>
        </View>
      </View>
      {reminder && (
        <View
          style={[
            styles.reminderBanner,
            reminder.isCompleted === 1 && styles.reminderBannerCompleted,
          ]}
        >
          <Bell
            color={reminder.isCompleted === 1 ? "#888" : "#3B82F6"}
            size={14}
          />
          <Text
            style={[
              styles.reminderBannerText,
              reminder.isCompleted === 1 && styles.textCompleted,
            ]}
          >
            Нагадування: {new Date(reminder.triggerAt).toLocaleString("uk-UA")}{" "}
            ({reminder.isCompleted === 1 ? "Виконано" : "Активне"})
          </Text>
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              // Задаємо нижній відступ для ScrollView, щоб контент можна було прокрутити вище за панель інструментів
              paddingBottom:
                TOOLBAR_HEIGHT +
                (reminder ? REMINDER_BAR_HEIGHT : 0) +
                EXTRA_PADDING,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => {
            currentScrollY.current = event.nativeEvent.contentOffset.y;
          }}
          onLayout={(event) => {
            viewportHeight.current = event.nativeEvent.layout.height;
          }}

        >
          <TextInput
            multiline={true}
            onChangeText={handleTitleChange}
            placeholder="Назва"
            placeholderTextColor="#555"
            style={styles.titleInput}
            value={title}
          />

          <RichEditor
            editorStyle={{
              backgroundColor: "#121212",
              color: "#FFF",
              placeholderColor: "#555",
              contentCSSText:
                // padding-bottom: 40px додає внутрішній відступ всередині самого WebView-редактора, щоб курсор не торкався самого низу
                "font-size: 16px; line-height: 24px; font-family: sans-serif; padding-bottom: 40px; " +
                // Стилі для H1
                "h1 { font-size: 26px; line-height: 1.3; margin-top: 18px; margin-bottom: 8px; } " +
                // Стилі для H2
                "h2 { font-size: 22px; line-height: 1.3; margin-top: 14px; margin-bottom: 6px; }",
            }}
            initialContentHTML={content}
            onChange={onEditorChange}
            onCursorPosition={handleCursorPosition}
            onMessage={handleMessage}
            placeholder="Нотатка ..."
            ref={richEditorRef}
            style={styles.richEditor}
            useContainer={true}
            editorInitializedCallback={() => {
              richEditorRef.current?.injectJavascript(EDITOR_WEBVIEW_SCRIPT);
            }}
          />

        </ScrollView>

        {reminder && (
          <View style={styles.bottomReminderBar}>
            <TouchableOpacity
              disabled={reminder.isCompleted === 1}
              onPress={handleBottomBarAction}
              style={[
                styles.bottomReminderButton,
                reminder.isCompleted === 1 &&
                styles.bottomReminderButtonCompleted,
              ]}
            >
              <Text style={styles.bottomReminderButtonText}>
                {reminder.isCompleted === 1
                  ? "✓ Нагадування виконано"
                  : "Завершити нагадування"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <MarkdownToolbar editorRef={richEditorRef} />
      </KeyboardAvoidingView>
      <DatePicker
        modal
        open={openDatePicker}
        date={tempDateTime}
        mode="datetime"
        theme="dark"
        locale="uk"
        title="Встановіть нагадування"
        confirmText="Встановити"
        cancelText="Скасувати"
        onConfirm={async (date) => {
          setOpenDatePicker(false);
          await saveReminder(date);
        }}
        onCancel={() => {
          setOpenDatePicker(false);
        }}
      />
      <ConfirmDialog
        confirmLabel="Видалити"
        isDestructive
        message="Цю нотатку буде видалено назавжди."
        onCancel={() => setIsDeleteNoteDialogVisible(false)}
        onConfirm={handleConfirmDeleteNote}
        title="Видалити нотатку?"
        visible={isDeleteNoteDialogVisible}
      />
      <DialogOverlay
        onClose={() => setIsReminderOptionsVisible(false)}
        visible={isReminderOptionsVisible}
      >
        <DialogContainer>
          <DialogHeader title="Керування нагадуванням" />
          <DialogBody
            message={
              reminder
                ? `Час: ${new Date(reminder.triggerAt).toLocaleString("uk-UA")}\nСтатус: ${reminder.isCompleted === 1 ? "Виконано" : "Активне"
                }`
                : ""
            }
          />
          <DialogActions
            actions={[
              {
                label: "Скасувати",
                onPress: () => setIsReminderOptionsVisible(false),
              },
              {
                label: "Редагувати",
                onPress: handleEditReminder,
                variant: "primary",
              },
              {
                label: "Видалити",
                onPress: () => {
                  setIsReminderOptionsVisible(false);
                  setIsDeleteReminderDialogVisible(true);
                },
                variant: "destructive",
              },
            ]}
          />
        </DialogContainer>
      </DialogOverlay>
      <ConfirmDialog
        confirmLabel="Видалити"
        isDestructive
        message="Ви впевнені, що хочете видалити це нагадування?"
        onCancel={() => setIsDeleteReminderDialogVisible(false)}
        onConfirm={handleConfirmDeleteReminder}
        title="Підтвердження видалення"
        visible={isDeleteReminderDialogVisible}
      />
      {/* Відображення помилки, якщо вона є */}
      <ErrorDialog
        message={errorMessage ?? ""}
        onClose={() => setErrorMessage(null)}
        title="Помилка"
        visible={errorMessage !== null}
      />
      {/* Діалог переміщення нотатки у папку */}
      <MoveDialog
        folders={allFolders}
        mode="note"
        onClose={() => setIsMoveDialogVisible(false)}
        onConfirm={handleConfirmMoveNote}
        selectedCount={1}
        visible={isMoveDialogVisible}
      />
      {/* Меню з додатковими діями (перемістити, видалити) */}
      <KebabMenu
        items={noteKebabItems}
        visible={isKebabVisible}
        onClose={() => setIsKebabVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
  },
  disabled: {
    opacity: 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  richEditor: {
    flex: 1,
    minHeight: 400,
    backgroundColor: "#121212",
  },
  reminderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1A253C",
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A8A",
  },
  reminderBannerCompleted: {
    backgroundColor: "#1F1F1F",
    borderBottomColor: "#333",
  },
  reminderBannerText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "600",
  },
  textCompleted: {
    textDecorationLine: "line-through",
    color: "#888",
  },
  bottomReminderBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E1E1E",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
  },
  bottomReminderButton: {
    backgroundColor: "#3B82F6",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomReminderButtonCompleted: {
    backgroundColor: "#1C2D42",
    borderWidth: 1,
    borderColor: "#2B3C53",
  },
  bottomReminderButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
