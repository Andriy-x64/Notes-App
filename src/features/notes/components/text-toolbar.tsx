/**
 * Панель інструментів форматування тексту для вбудованого редактора.
 * Дозволяє користувачеві застосовувати стилі (жирний, курсив, списки тощо) до виділеного тексту в WebView редакторі.
 */
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline,
  Undo2,
  Redo2,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { actions, RichToolbar } from "react-native-pell-rich-editor";

interface RichTextToolbarProps {
  editorRef: React.RefObject<any>;
}

export const MarkdownToolbar: React.FC<RichTextToolbarProps> = ({
  editorRef,
}) => {
  return (
    <View style={styles.container}>
      <RichToolbar
        actions={[
          actions.heading1,
          actions.heading2,
          actions.setBold,
          actions.setItalic,
          actions.setUnderline,
          actions.setStrikethrough,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.blockquote,
          actions.line,
          actions.undo,
          actions.redo,
        ]}
        disabledIconTint="#444"
        editor={editorRef}
        iconSize={24}
        iconMap={{
          [actions.setBold]: ({ tintColor, iconSize }: any) => (
            <Bold color={tintColor} size={iconSize} />
          ),
          [actions.setItalic]: ({ tintColor, iconSize }: any) => (
            <Italic color={tintColor} size={iconSize} />
          ),
          [actions.setUnderline]: ({ tintColor, iconSize }: any) => (
            <Underline color={tintColor} size={iconSize} />
          ),
          [actions.setStrikethrough]: ({ tintColor, iconSize }: any) => (
            <Strikethrough color={tintColor} size={iconSize} />
          ),
          [actions.heading1]: ({ tintColor, iconSize }: any) => (
            <Heading1 color={tintColor} size={iconSize} />
          ),
          [actions.heading2]: ({ tintColor, iconSize }: any) => (
            <Heading2 color={tintColor} size={iconSize} />
          ),
          [actions.insertBulletsList]: ({ tintColor, iconSize }: any) => (
            <List color={tintColor} size={iconSize} />
          ),
          [actions.insertOrderedList]: ({ tintColor, iconSize }: any) => (
            <ListOrdered color={tintColor} size={iconSize} />
          ),
          [actions.blockquote]: ({ tintColor, iconSize }: any) => (
            <Quote color={tintColor} size={iconSize} />
          ),
          [actions.line]: ({ tintColor, iconSize }: any) => (
            <Minus color={tintColor} size={iconSize} />
          ),
          [actions.undo]: ({ tintColor, iconSize }: any) => (
            <Undo2 color={tintColor} size={iconSize} />
          ),
          [actions.redo]: ({ tintColor, iconSize }: any) => (
            <Redo2 color={tintColor} size={iconSize} />
          ),
        }}
        iconTint="#FFF"
        selectedIconTint="#3B82F6"
        style={styles.toolbar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1E1E",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  toolbar: {
    backgroundColor: "transparent",
  },
});
