import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { adminError } from "../lib/admin-data";

export function Modal({ title, children, onClose, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={titleId} className="modal" onCancel={(event) => {
      event.preventDefault();
      if (!busy) onClose();
    }}>
      <header className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" disabled={busy} onClick={onClose} aria-label="关闭">
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function ConfirmDelete({ title, description, onDelete, onClose, onSuccess }: {
  title: string; description: string; onDelete: () => Promise<void>; onClose: () => void; onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await onDelete();
      onSuccess();
    } catch (failure) {
      setError(adminError(failure, "删除失败，请重试。"));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} busy={busy} onClose={onClose}>
      <div className="modal-body"><p>{description}</p>{error && <p role="alert" className="error-message">{error}</p>}</div>
      <footer className="form-actions">
        <button type="button" className="button" disabled={busy} onClick={onClose}>取消</button>
        <button type="button" className="button danger" disabled={busy} onClick={() => void remove()}>
          {busy ? "正在删除…" : "确认删除"}
        </button>
      </footer>
    </Modal>
  );
}
