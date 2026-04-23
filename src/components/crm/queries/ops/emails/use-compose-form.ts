"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { toast } from "sonner";
import { useSendEmail, useSaveDraft, useActiveQueryIds, useDeleteDraft } from "./use-gmail-queries";
import type { SendEmailVariables } from "./use-gmail-queries";
import { validateComposeEmail } from "./compose-email-schema";
import { applyQueryLabelToMessage } from "@/data-access/gmail";
import { saveEmailQueryAssociation } from "@/data-access/email-metadata";
import type { ActiveQuerySummary } from "@/data-access/crm-queries";
import type { AttachmentFile } from "@/lib/gmail/types";
import type { ReplyContext, DraftContext } from "./compose-types";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB, MAX_ATTACHMENTS } from "./compose-types";

function findQuery(queries: ActiveQuerySummary[], displayId: string) {
  const lower = displayId.toLowerCase();
  return queries.find((q) => q.query_id.toLowerCase() === lower);
}

function buildSubjectTag(query: ActiveQuerySummary): string {
  const id = query.query_id.toUpperCase();
  const name = query.traveler_name?.trim() ?? "";
  const dest = query.travel_country_names?.join(", ") ?? "";
  const details = [name, dest].filter(Boolean).join(" | ");
  return details ? `[#${id} - ${details}]` : `[#${id}]`;
}

function stripSubjectTag(subject: string): string {
  return subject.replace(/^\[#[^\]]+\]\s*/, "").trim();
}

function applyTagToSubject(subject: string, query: ActiveQuerySummary): string {
  return `${buildSubjectTag(query)} ${stripSubjectTag(subject)}`.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type AttachmentItem = { file: File; preview?: string };

export interface UseComposeFormOptions {
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  replyTo?: ReplyContext;
  draftContext?: DraftContext;
  fromAddress: string;
  queryId?: string;
  dmcId?: string;
  onSent?: () => void;
  onDiscard?: () => void;
}

export function useComposeForm({
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  replyTo,
  draftContext,
  fromAddress,
  queryId,
  dmcId,
  onSent,
}: UseComposeFormOptions) {
  const isDraftEdit = !!draftContext;
  const { data: activeQueries } = useActiveQueryIds(dmcId);

  const initialSubject = draftContext?.subject ?? (() => {
    if (!replyTo) return defaultSubject;
    if (replyTo.mode === "forward")
      return replyTo.subject.startsWith("Fwd:") ? replyTo.subject : `Fwd: ${replyTo.subject}`;
    return replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`;
  })();

  const initialBody = draftContext?.bodyHtml ?? defaultBody;

  const quotedReplyHtml = replyTo
    ? `<br/><br/><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:4px;color:#666">`
      + `<p style="font-size:12px;margin:0 0 8px">On ${escapeHtml(replyTo.date)}, ${escapeHtml(replyTo.from)} wrote:</p>`
      + (replyTo.htmlBody || `<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px">${escapeHtml(replyTo.textBody || "")}</pre>`)
      + `</div>`
    : "";

  const [to, setTo] = useState(draftContext?.to ?? (replyTo?.mode === "reply" ? replyTo.from : defaultTo));
  const [cc, setCc] = useState(draftContext?.cc ?? replyTo?.cc ?? "");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(stripSubjectTag(initialSubject));
  const [showCcBcc, setShowCcBcc] = useState(!!replyTo?.cc);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(draftContext?.draftId ?? null);
  const [editorPlainText, setEditorPlainText] = useState("");
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  const subjectUserEdited = useRef(false);
  const autoSelectedRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: "list-disc ml-4" } },
        orderedList: { HTMLAttributes: { class: "list-decimal ml-4" } },
      }),
      UnderlineExt,
      Link.configure({ autolink: true, openOnClick: false }),
    ],
    content: initialBody || "",
    editorProps: {
      attributes: {
        class: "min-h-[80px] h-full outline-none text-sm leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
      },
    },
    onUpdate: ({ editor }) => setEditorPlainText(editor.getText().trim()),
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(initialBody || "", { emitUpdate: false });
      setEditorPlainText(editor.getText().trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (queryId || autoSelectedRef.current || !activeQueries?.length) return;
    autoSelectedRef.current = true;
    const first = activeQueries[0];
    setSelectedQueryId(first.query_id);
    if (!subjectUserEdited.current) setSubject((prev) => applyTagToSubject(prev, first));
  }, [queryId, activeQueries]);

  useEffect(() => {
    if (!queryId || !activeQueries?.length || subjectUserEdited.current) return;
    const query = findQuery(activeQueries, queryId);
    if (query) setSubject((prev) => applyTagToSubject(prev, query));
  }, [queryId, activeQueries]);

  const deleteDraftMutation = useDeleteDraft();

  const resolveActiveQuery = useCallback(() => {
    const displayId = queryId ?? selectedQueryId;
    if (!displayId) return null;
    const query = activeQueries ? (findQuery(activeQueries, displayId) ?? null) : null;
    return { displayId, query };
  }, [activeQueries, queryId, selectedQueryId]);

  const saveDraftMutation = useSaveDraft(async (result) => {
    if (result.messageId.startsWith("optimistic-")) return;
    setSavedDraftId(result.draftId);
    const resolved = resolveActiveQuery();
    if (!resolved) return;
    applyQueryLabelToMessage(result.messageId, resolved.displayId)
      .then((res) => { if ("error" in res) toast.error(`Draft saved but label failed: ${res.error}`); })
      .catch(() => {});
    if (dmcId && resolved.query?.id) {
      saveEmailQueryAssociation({
        gmailMessageId: result.messageId,
        gmailThreadId: result.threadId,
        queryId: resolved.query.id,
        dmcId,
        isDraft: true,
      }).catch(() => {});
    }
  });

  const sendMutation = useSendEmail(() => {
    if (draftContext?.draftId) deleteDraftMutation.mutate(draftContext.draftId);
    resetForm();
    onSent?.();
  });

  const resetForm = useCallback(() => {
    setTo(""); setCc(""); setBcc(""); setSubject("");
    setSelectedQueryId(null);
    subjectUserEdited.current = false;
    autoSelectedRef.current = false;
    setLinkUrl(""); setShowLinkInput(false);
    setAttachments([]); setShowCcBcc(false);
    setSavedDraftId(null); setEditorPlainText("");
    editor?.commands.clearContent();
  }, [editor]);

  const handleAttachFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const next: AttachmentItem[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`);
        continue;
      }
      if (attachments.length + next.length >= MAX_ATTACHMENTS) {
        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments`);
        break;
      }
      next.push({ file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined });
    }
    setAttachments((prev) => [...prev, ...next]);
  }, [attachments.length]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleInsertLink = useCallback(() => {
    const url = linkUrl.trim();
    if (!url || !editor) return;
    editor.chain().focus().setLink({ href: url }).run();
    setLinkUrl(""); setShowLinkInput(false);
  }, [linkUrl, editor]);

  const handleQueryChange = useCallback((val: string | null) => {
    setSelectedQueryId(val);
    subjectUserEdited.current = false;
    if (!val || !activeQueries) return;
    const query = findQuery(activeQueries, val);
    if (query) setSubject((prev) => applyTagToSubject(prev, query));
  }, [activeQueries]);

  const buildSendRequest = useCallback(async (): Promise<SendEmailVariables> => {
    const editorHtml = editor?.getHTML() ?? "";
    const html = replyTo && !draftContext ? `${editorHtml}${quotedReplyHtml}` : editorHtml;
    const attachmentFiles: AttachmentFile[] = await Promise.all(
      attachments.map(async ({ file }) => {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""));
        return { filename: file.name, contentType: file.type || "application/octet-stream", data: base64 };
      })
    );
    const resolved = resolveActiveQuery();
    return {
      from: fromAddress || undefined,
      to: to.trim() || "undisclosed-recipients:;",
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      subject: subject.trim() || "(no subject)",
      body: html,
      isHtml: true,
      attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
      threadId: replyTo?.threadId,
      inReplyTo: replyTo?.headers["message-id"],
      references: replyTo
        ? [replyTo.headers["references"], replyTo.headers["message-id"]].filter(Boolean).join(" ")
        : undefined,
      queryDisplayId: resolved?.displayId,
      queryUuid: resolved?.query?.id ?? undefined,
      dmcId,
    };
  }, [fromAddress, to, cc, bcc, subject, attachments, editor, replyTo, draftContext, quotedReplyHtml, resolveActiveQuery, dmcId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = editor?.getText() ?? "";
    const validation = validateComposeEmail({ to: to.trim(), cc: cc.trim(), bcc: bcc.trim(), subject: subject.trim(), bodyText: text.trim() });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message ?? "Please fix the form errors");
      return;
    }
    sendMutation.mutate(await buildSendRequest());
  }, [editor, to, cc, bcc, subject, buildSendRequest, sendMutation]);

  const handleSaveDraft = useCallback(async () => {
    saveDraftMutation.mutate({ draftId: savedDraftId ?? undefined, request: await buildSendRequest() });
  }, [savedDraftId, buildSendRequest, saveDraftMutation]);

  return {
    to, setTo,
    cc, setCc,
    bcc, setBcc,
    subject, setSubject: (val: string) => { subjectUserEdited.current = true; setSubject(val); },
    showCcBcc, setShowCcBcc,
    attachments, handleAttachFiles, removeAttachment,
    linkUrl, setLinkUrl,
    showLinkInput, setShowLinkInput,
    editorPlainText,
    editor,
    activeQueries,
    selectedQueryId,
    handleQueryChange,
    effectiveQueryId: queryId ?? selectedQueryId,
    isDraftEdit,
    sendMutation,
    saveDraftMutation,
    handleSubmit,
    handleSaveDraft,
    handleInsertLink,
    resetForm,
  };
}
