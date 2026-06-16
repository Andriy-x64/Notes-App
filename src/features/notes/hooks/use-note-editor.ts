/**
 * Комплексний хук управління станом та збереженням нотатки в редакторі.
 * Забезпечує автозбереження чернеток, керування нагадуваннями, закріпленням, переміщенням нотатки
 * та делегує команди Undo/Redo до внутрішнього стека RichEditor (WebView).
 */
import { useAllFolders } from "@/features/folders/hooks/use-all-folders";
import {
  cancelReminder,
  getReminderForNote,
  markReminderCompleted,
  requestPermissions,
  scheduleReminder,
} from "@/features/reminders/services/reminder-service";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addNote,
  deleteNote,
  finalizeNoteDraftOnExit,
  getNote,
  moveNotes,
  saveNoteDraft,
  togglePinNotes,
} from "../services/note-service";
import { stripHtml } from "@/shared/utils/strip-html";

const getRouteId = (id: string | string[] | undefined) => {
  return Array.isArray(id) ? id[0] : id;
};

export const useNoteEditor = () => {
  const { folderId: routeFolderId, id: routeId } = useLocalSearchParams<{
    folderId?: string | string[];
    id?: string | string[];
  }>();
  const id = getRouteId(routeId);
  const folderId = getRouteId(routeFolderId) ?? null;
  const router = useRouter();
  const navigation = useNavigation();

  const isNewRef = useRef(id === "new");
  const wasCreatedInCurrentSessionRef = useRef(id === "new");
  const isInitialLoadRef = useRef(true);
  const hasUserEditedRef = useRef(false);
  const richEditorRef = useRef<any>(null);
  // Прості флаги для стану кнопок Undo/Redo (наближення без паралельного стека)
  const hasUndoneRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFinalizingExitRef = useRef(false);
  const contentRef = useRef("");

  const [noteId, setNoteId] = useState(id);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  // Стан кнопок Undo/Redo верхньої панелі
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Стан нагадувань
  const [reminder, setReminder] = useState<{
    triggerAt: number;
    titleSnapshot: string;
    notificationId: string;
    isCompleted: number;
  } | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [tempDateTime, setTempDateTime] = useState<Date>(new Date());
  const [isDeleteNoteDialogVisible, setIsDeleteNoteDialogVisible] =
    useState(false);
  const [isReminderOptionsVisible, setIsReminderOptionsVisible] =
    useState(false);
  const [isDeleteReminderDialogVisible, setIsDeleteReminderDialogVisible] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKebabVisible, setIsKebabVisible] = useState(false);
  const [isMoveDialogVisible, setIsMoveDialogVisible] = useState(false);
  const { folders: allFolders } = useAllFolders();

  useEffect(() => {
    let isMounted = true;

    const loadNote = async () => {
      if (!isInitialLoadRef.current) {
        return;
      }

      if (!id || id === "new") {
        isInitialLoadRef.current = false;
        return;
      }

      const existingNote = await getNote(id);

      if (isMounted && existingNote) {
        setNoteId(existingNote.id);
        setTitle(existingNote.title);
        setContent(existingNote.content);
        contentRef.current = existingNote.content;
        setIsPinned(existingNote.isPinned);
        richEditorRef.current?.setContentHTML(existingNote.content);

        // Отримуємо нагадування
        const activeReminder = await getReminderForNote(existingNote.id);
        setReminder(activeReminder);
      }

      isInitialLoadRef.current = false;
    };

    loadNote();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const triggerAutoSave = useCallback((updatedTitle: string, updatedContent: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const resolvedId = await saveNoteDraft(updatedTitle, updatedContent, folderId, noteId);

      if (resolvedId && resolvedId !== noteId) {
        isNewRef.current = false;
        setNoteId(resolvedId);
        router.setParams({ id: resolvedId });
      }
    }, 500);
  }, [folderId, noteId, router]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const finalizeAndLeaveEditor = useCallback(async () => {
    try {
      const result = await finalizeNoteDraftOnExit(
        title,
        contentRef.current,
        folderId,
        noteId,
        wasCreatedInCurrentSessionRef.current,
      );

      if (result.noteId && result.noteId !== noteId) {
        isNewRef.current = false;
        setNoteId(result.noteId);
        router.setParams({ id: result.noteId });
      }
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Не вдалося зберегти нотатку перед виходом",
      );
      throw error;
    }
  }, [folderId, noteId, router, setErrorMessage, title]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener("beforeRemove", (event) => {
        if (isFinalizingExitRef.current) {
          return;
        }

        event.preventDefault();
        isFinalizingExitRef.current = true;
        void (async () => {
          try {
            await finalizeAndLeaveEditor();
            navigation.dispatch(event.data.action);
          } catch {
            // Помилку вже показано через setErrorMessage.
          } finally {
            isFinalizingExitRef.current = false;
          }
        })();
      });

      return unsubscribe;
    }, [finalizeAndLeaveEditor, navigation]),
  );

  const forceSaveNote = useCallback(async (): Promise<string | undefined> => {
    if (isNewRef.current || noteId === "new") {
      const newId = await addNote(title, contentRef.current, folderId);
      isNewRef.current = false;
      setNoteId(newId);
      router.setParams({ id: newId });
      wasCreatedInCurrentSessionRef.current = true;
      return newId;
    }
    return noteId;
  }, [noteId, title, folderId, router]);

  const handleTitleChange = (nextTitle: string) => {
    hasUserEditedRef.current = true;
    setTitle(nextTitle);
    triggerAutoSave(nextTitle, contentRef.current);
  };

  // Делегуємо нативному API Pell Editor — той самий механізм що використовує RichToolbar.
  // Єдине джерело правди для Undo/Redo: внутрішній стек WebView.
  const handleUndo = useCallback(() => {
    richEditorRef.current?.focusContentEditor();
    richEditorRef.current?.sendAction("undo", "result");
  }, []);

  const handleRedo = useCallback(() => {
    richEditorRef.current?.focusContentEditor();
    richEditorRef.current?.sendAction("redo", "result");
  }, []);

  const handleDelete = () => {
    if (noteId && noteId !== "new") {
      setIsDeleteNoteDialogVisible(true);
    }
  };

  const handleConfirmDeleteNote = async () => {
    if (noteId && noteId !== "new") {
      await deleteNote(noteId);
      setIsDeleteNoteDialogVisible(false);
      router.back();
    }
  };

  const onEditorChange = (html: string) => {
    hasUserEditedRef.current = true;
    contentRef.current = html;
    triggerAutoSave(title, html);
  };

  const handleMessage = useCallback((message: any) => {
    if (message.type === "UNDO_REDO_STATE") {
      setCanUndo(message.data.canUndo);
      setCanRedo(message.data.canRedo);
    }
  }, []);


  const handlePinToggle = useCallback(async () => {
    let activeId = noteId;
    if (isNewRef.current || !activeId || activeId === "new") {
      activeId = await forceSaveNote();
    }
    if (!activeId) return;

    try {
      const nextPinnedState = !isPinned;
      await togglePinNotes([activeId], nextPinnedState);
      setIsPinned(nextPinnedState);
    } catch (e: any) {
      setErrorMessage(e.message || "Не вдалося змінити стан закріплення");
    }
  }, [noteId, isPinned, forceSaveNote]);

  // Обробники інтерфейсу нагадувань
  const handleBellPress = async () => {
    let activeId = noteId;
    if (isNewRef.current || !activeId || activeId === "new") {
      activeId = await forceSaveNote();
    }

    if (!activeId) return;

    if (reminder) {
      setIsReminderOptionsVisible(true);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setErrorMessage(
        "Для отримання нагадувань увімкніть сповіщення у системних налаштуваннях вашого пристрою.",
      );
      return;
    }

    setTempDateTime(new Date(Date.now() + 5 * 60 * 1000));
    setOpenDatePicker(true);
  };

  const saveReminder = async (targetDate: Date) => {
    let activeId = noteId;
    if (!activeId || activeId === "new") {
      activeId = await forceSaveNote();
    }
    if (!activeId) return;

    if (targetDate.getTime() <= Date.now()) {
      setErrorMessage("Час нагадування має бути в майбутньому");
      return;
    }

    try {
      const cleanBody = stripHtml(contentRef.current).slice(0, 120) || "Нагадування";
      await scheduleReminder(
        activeId,
        title || "Нотатка без назви",
        cleanBody,
        targetDate.getTime(),
      );
      const updated = await getReminderForNote(activeId);
      setReminder(updated);
    } catch (e: any) {
      setErrorMessage(e.message || "Не вдалося зберегти нагадування");
    }
  };

  const handleEditReminder = () => {
    if (!reminder) {
      return;
    }

    setIsReminderOptionsVisible(false);
    setTempDateTime(new Date(reminder.triggerAt));
    setOpenDatePicker(true);
  };

  const handleConfirmDeleteReminder = async () => {
    if (!noteId || noteId === "new") {
      return;
    }

    await cancelReminder(noteId);
    setReminder(null);
    setIsDeleteReminderDialogVisible(false);
  };

  const handleConfirmMoveNote = async (targetFolderId: string | null) => {
    let activeId = noteId;
    if (isNewRef.current || !activeId || activeId === "new") {
      activeId = await forceSaveNote();
    }
    if (!activeId) return;

    try {
      await moveNotes([activeId], targetFolderId);
      setIsMoveDialogVisible(false);
    } catch (e: any) {
      setErrorMessage(e.message || "Не вдалося перемістити нотатку");
    }
  };

  const handleBottomBarAction = async () => {
    if (noteId && reminder && reminder.isCompleted === 0) {
      try {
        await markReminderCompleted(noteId);
        const updated = await getReminderForNote(noteId);
        setReminder(updated);
      } catch (error: any) {
        setErrorMessage(error.message || "Не вдалося завершити нагадування");
      }
    }
  };

  return {
    isNew: isNewRef.current,
    richEditorRef,
    noteId,
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
  };
};
