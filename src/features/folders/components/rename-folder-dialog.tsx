/**
 * Діалогове вікно перейменування папки.
 * Надає інтерфейс для швидкої зміни назви обраної папки з валідацією.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  InteractionManager,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { NativeSyntheticEvent, TextInputSelectionChangeEventData } from "react-native";

import { useFoldersStore } from "@/features/folders/store/folders-store";
import { ErrorDialog } from "@/shared/ui/dialogs/ErrorDialog";
import { DialogActions } from "@/shared/ui/dialogs/DialogActions";
import { DialogBody } from "@/shared/ui/dialogs/DialogBody";
import { DialogContainer } from "@/shared/ui/dialogs/DialogContainer";
import { DialogHeader } from "@/shared/ui/dialogs/DialogHeader";
import { DialogOverlay } from "@/shared/ui/dialogs/DialogOverlay";

interface RenameFolderDialogProps {
  visible: boolean;
  folderId: string;
  currentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RenameFolderDialog({
  visible,
  folderId,
  currentName,
  onClose,
  onSuccess,
}: RenameFolderDialogProps) {
  const renameFolder = useFoldersStore((state) => state.renameFolder);
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // selection керує виділенням тексту при відкритті діалогу.
  // Скидається тільки в onChangeText — коли користувач починає вводити.
  // НЕ скидається в onSelectionChange, бо фокус сам по собі викликає
  // onSelectionChange, що призводило б до миттєвого скидання виділення.
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(
    undefined
  );
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setSelection(undefined);
      return;
    }

    setName(currentName);
    setIsSaving(false);
    setErrorMessage(null);
    // Виділяємо весь текст одразу при відкритті
    setSelection({ start: 0, end: currentName.length });

    // InteractionManager чекає завершення всіх анімацій (зокрема fade Modal),
    // після чого програмно фокусуємо поле — це надійніше за autoFocus у Modal.
    // Додатковий setTimeout потрібен на Android, де Modal-анімація
    // не завжди реєструється в InteractionManager.
    let timerId: ReturnType<typeof setTimeout>;
    const task = InteractionManager.runAfterInteractions(() => {
      timerId = setTimeout(
        () => {
          inputRef.current?.focus();
        },
        Platform.OS === "android" ? 100 : 0
      );
    });

    return () => {
      task.cancel();
      clearTimeout(timerId);
    };
  // Свідомо залежимо тільки від visible: не хочемо повторного фокуса
  // якщо currentName зміниться ззовні поки діалог відкритий.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const safeCurrentName = useMemo(() => currentName.trim(), [currentName]);
  const safeName = name.trim();
  const hasChanges = safeName !== safeCurrentName;
  const isSaveDisabled = isSaving;

  const handleTextChange = (text: string) => {
    // Знімаємо контрольоване виділення при введенні тексту.
    // Перше натискання замінює весь виділений текст, далі TextInput
    // сам керує позицією курсору.
    if (selection !== undefined) {
      setSelection(undefined);
    }
    setName(text);
  };

  // Відпускаємо контрольований selection лише якщо користувач вручну
  // перемістив курсор (виділення ≠ повний текст). Якщо виділення збігається
  // з нашим початковим (start=0, end=name.length) — це наш програмний
  // selection або «Select All», залишаємо контроль.
  const handleSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    if (selection === undefined) return;
    const { start, end } = e.nativeEvent.selection;
    if (start === 0 && end === name.length) return;
    setSelection(undefined);
  };

  const closeWithReset = () => {
    setName(currentName);
    setIsSaving(false);
    setErrorMessage(null);
    onClose();
  };

  const handleSave = async () => {
    const nextName = name.trim();
    if (!nextName) {
      setErrorMessage("Назва папки не може бути порожньою");
      return;
    }

    if (!hasChanges) {
      closeWithReset();
      return;
    }

    setIsSaving(true);

    try {
      await renameFolder(folderId, nextName);
      setIsSaving(false);
      setName(nextName);
      onSuccess?.();
      onClose();
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Назва папки не може бути порожньою"
      );
    }
  };

  const handleCancel = () => {
    closeWithReset();
  };

  const handleDialogClose = () => {
    if (isSaving) return;
    handleCancel();
  };

  return (
    <>
      <DialogOverlay dismissible={!isSaving} onClose={handleDialogClose} visible={visible}>
        <DialogContainer>
          <DialogHeader title="Перейменувати папку" />
          <DialogBody>
            <View style={styles.fieldWrapper}>
              <TextInput
                ref={inputRef}
                /* autoFocus навмисно прибрано: конфліктує з програмним focus() у Modal.
                   Фокус обробляється через InteractionManager вище. */
                editable={!isSaving}
                onChangeText={handleTextChange}
                onSelectionChange={handleSelectionChange}
                onSubmitEditing={handleSave}
                returnKeyType="done"
                selection={selection}
                selectTextOnFocus
                selectionColor="#3B82F6"
                style={styles.input}
                value={name}
              />
            </View>
          </DialogBody>
          <DialogActions
            actions={[
              { label: "Скасувати", onPress: handleCancel, disabled: isSaving },
              {
                label: isSaving ? "Збереження..." : "Зберегти",
                onPress: handleSave,
                variant: "primary",
                disabled: isSaveDisabled,
              },
            ]}
          />
        </DialogContainer>
      </DialogOverlay>

      <ErrorDialog
        message={errorMessage ?? ""}
        onClose={() => setErrorMessage(null)}
        title="Помилка"
        visible={errorMessage !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fieldWrapper: {
    gap: 10,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    color: "#FFF",
    backgroundColor: "#121212",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },
});
