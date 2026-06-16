/**
 * Діалог підтвердження незворотних дій користувача.
 * Відображає модальне вікно з текстом попередження та кнопками підтвердження/скасування.
 */
import { DialogActions } from "@/shared/ui/dialogs/DialogActions";
import { DialogBody } from "@/shared/ui/dialogs/DialogBody";
import { DialogContainer } from "@/shared/ui/dialogs/DialogContainer";
import { DialogHeader } from "@/shared/ui/dialogs/DialogHeader";
import { DialogOverlay } from "@/shared/ui/dialogs/DialogOverlay";

interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
}

export function ConfirmDialog({
  cancelLabel = "Скасувати",
  confirmLabel = "Підтвердити",
  isDestructive = false,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmDialogProps) {
  return (
    <DialogOverlay onClose={onCancel} visible={visible}>
      <DialogContainer>
        <DialogHeader title={title} />
        <DialogBody message={message} />
        <DialogActions
          actions={[
            { label: cancelLabel, onPress: onCancel },
            {
              label: confirmLabel,
              onPress: onConfirm,
              variant: isDestructive ? "destructive" : "primary",
            },
          ]}
        />
      </DialogContainer>
    </DialogOverlay>
  );
}
