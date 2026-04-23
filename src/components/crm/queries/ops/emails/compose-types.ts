export interface ReplyContext {
  threadId: string;
  messageId: string;
  from: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  date: string;
  headers: Record<string, string>;
  mode: "reply" | "forward";
  cc?: string;
}

export interface DraftContext {
  draftId: string;
  messageId: string;
  to?: string;
  cc?: string;
  subject?: string;
  bodyHtml?: string;
}

export interface ComposeDialogHandle {
  setZIndex: (z: number) => void;
}

export interface ComposeDialogProps {
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  replyTo?: ReplyContext;
  draftContext?: DraftContext;
  queryId?: string;
  dmcId?: string;
  onSent?: () => void;
  onDiscard?: () => void;
  dockOffsetPx?: number;
  zIndex?: number;
  onFocusCompose?: () => void;
}

export const MAX_FILE_SIZE_MB = 4;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
