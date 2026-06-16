/**
 * Інформаційний діалог.
 * Відображає інформаційні повідомлення для користувача з однією кнопкою закриття.
 */
import { DialogActions } from "@/shared/ui/dialogs/DialogActions";
import { DialogBody } from "@/shared/ui/dialogs/DialogBody";
import { DialogContainer } from "@/shared/ui/dialogs/DialogContainer";
import { DialogHeader } from "@/shared/ui/dialogs/DialogHeader";
import { DialogOverlay } from "@/shared/ui/dialogs/DialogOverlay";

interface InfoDialogProps {
  actionLabel?: string;
  message: string;
  onClose: () => void;
  title: string;
  visible: boolean;
}

export function InfoDialog({
  actionLabel = "OK",
  message,
  onClose,
  title,
  visible,
}: InfoDialogProps) {
  return (
    <DialogOverlay onClose={onClose} visible={visible}>
      <DialogContainer>
        <DialogHeader title={title} />
        <DialogBody message={message} />
        <DialogActions
          actions={[{ label: actionLabel, onPress: onClose, variant: "primary" }]}
        />
      </DialogContainer>
    </DialogOverlay>
  );
}
