"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Upload,
  Eye,
  Download,
  Trash2,
  SendHorizonal,
  FileText,
  File,
  Pencil,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AlertModal } from "@/components/ui/alert-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { uploadToS3, removeFromS3 } from "@/lib/s3-upload";
import useUser from "@/hooks/use-user";
import type { ITaskDetails } from "@/types/tasks";
import type { FileAttachment } from "@/types/common";
import {
  getTaskAttachments,
  updateTaskAttachments,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateTaskComment,
  markTaskCommentsSeen,
} from "@/data-access/tasks";

interface TaskDetailSheetProps {
  task: ITaskDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttachmentsChange?: (attachments: FileAttachment[]) => void;
  onEdit?: (task: ITaskDetails) => void;
  onDelete?: (id: string) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getFileIcon(type: string) {
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500 shrink-0" />;
  if (type.includes("image")) return <File className="h-5 w-5 text-blue-400 shrink-0" />;
  return <File className="h-5 w-5 text-muted-foreground shrink-0" />;
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onAttachmentsChange,
  onEdit,
  onDelete,
}: TaskDetailSheetProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], isLoading: loadingAttachments } = useQuery({
    queryKey: ["task-attachments", task.id],
    queryFn: () => getTaskAttachments(task.id),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["task-comments", task.id],
    queryFn: () => getTaskComments(task.id),
    enabled: open,
    staleTime: 15_000,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    try {
      const result = await uploadToS3({ file, userId: user.id, prefix: `tasks/${task.id}/` });
      if (result.error) throw new Error(result.error);

      const newAttachment: FileAttachment = { name: file.name, type: file.type, url: result.url! };
      const updated = [...attachments, newAttachment];

      const ok = await updateTaskAttachments(task.id, updated);
      if (!ok) throw new Error("Failed to save attachment");

      queryClient.setQueryData(["task-attachments", task.id], updated);
      onAttachmentsChange?.(updated);
      toast.success("File uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (index: number) => {
    const attachment = attachments[index];
    const updated = attachments.filter((_, i) => i !== index);
    const ok = await updateTaskAttachments(task.id, updated);
    if (!ok) {
      toast.error("Failed to remove attachment");
      return;
    }
    queryClient.setQueryData(["task-attachments", task.id], updated);
    onAttachmentsChange?.(updated);
    await removeFromS3(attachment.url).catch(() => {});
    toast.success("Attachment removed");
  };

  const handleAddComment = async () => {
    const body = commentText.trim();
    if (!body) return;
    setIsSubmittingComment(true);
    const comment = await addTaskComment(task.id, body);
    setIsSubmittingComment(false);
    if (!comment) {
      toast.error("Failed to post comment");
      return;
    }
    queryClient.setQueryData(["task-comments", task.id], (prev: typeof comments) => [...prev, comment]);
    setCommentText("");
    // Update last_seen_at so own comment doesn't show as unread
    markTaskCommentsSeen(task.id);
    queryClient.setQueryData(["query-tasks", task.query_id], (prev: ITaskDetails[]) =>
      prev?.map((t) => (t.id === task.id ? { ...t, comment_count: (t.comment_count ?? 0) + 1, has_unread: false } : t))
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    const ok = await deleteTaskComment(commentId);
    if (!ok) {
      toast.error("Failed to delete comment");
      return;
    }
    queryClient.setQueryData(["task-comments", task.id], (prev: typeof comments) =>
      prev.filter((c) => c.id !== commentId)
    );
    queryClient.setQueryData(["query-tasks", task.query_id], (prev: ITaskDetails[]) =>
      prev?.map((t) => (t.id === task.id ? { ...t, comment_count: Math.max(0, (t.comment_count ?? 1) - 1) } : t))
    );
  };

  const handleSaveEdit = async (commentId: string) => {
    const body = editingCommentText.trim();
    if (!body) return;
    const ok = await updateTaskComment(commentId, body);
    if (!ok) {
      toast.error("Failed to update comment");
      return;
    }
    queryClient.setQueryData(["task-comments", task.id], (prev: typeof comments) =>
      prev.map((c) => (c.id === commentId ? { ...c, body } : c))
    );
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      markTaskCommentsSeen(task.id);
      // Optimistically clear unread so the card updates immediately
      queryClient.setQueryData(["query-tasks", task.query_id], (prev: ITaskDetails[]) =>
        prev?.map((t) => (t.id === task.id ? { ...t, has_unread: false } : t))
      );
    } else {
      queryClient.invalidateQueries({ queryKey: ["query-tasks", task.query_id] });
    }
  };

  return (
    <>
      <AlertModal
        isOpen={!!deletingCommentId}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={() => {
          if (deletingCommentId) handleDeleteComment(deletingCommentId);
          setDeletingCommentId(null);
        }}
        loading={false}
        title="Delete comment?"
        description="This action cannot be undone."
      />
      <AlertModal
        isOpen={deleteTaskOpen}
        onClose={() => setDeleteTaskOpen(false)}
        onConfirm={() => {
          onDelete?.(task.id);
          setDeleteTaskOpen(false);
          onOpenChange(false);
        }}
        loading={false}
        title="Delete task?"
        description="This will permanently delete the task. This action cannot be undone."
      />
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden">
          {/* Scrollable body */}
          <ScrollArea className="flex-1 h-0">
            {/* Header */}
            <div className="px-5 py-4 border-b space-y-2">
              <SheetTitle className="text-lg font-semibold pr-8">{task.name}</SheetTitle>

              <div className="flex items-center gap-6">
                <span className="text-xs text-muted-foreground w-24 shrink-0">Created at</span>
                <span className="text-xs">{format(new Date(task.created_at), "MMMM d, yyyy")}</span>
              </div>
              {task.due_at && (
                <div className="flex items-center gap-6">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">Due Date</span>
                  <span className="text-xs">{format(new Date(task.due_at), "MMMM d, yyyy")}</span>
                </div>
              )}
              {(task.assignees?.length ?? 0) > 0 && (
                <div className="flex items-center gap-6">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">Assignees</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.assignees.map((a) => (
                      <div key={a.user_id} className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">{getInitials(a.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{a.full_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {task.description && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Task Description</p>
                  <p className="text-xs leading-relaxed">{task.description}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/40 hover:border-destructive hover:bg-destructive/5"
                  onClick={() => setDeleteTaskOpen(true)}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Task
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-3 text-xs gap-1.5" onClick={() => onEdit?.(task)}>
                  <Pencil className="h-3 w-3" />
                  Edit Task
                </Button>
              </div>
            </div>

            {/* Attachments */}
            <div className="border-b">
              <button
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
                onClick={() => setAttachmentsOpen((v) => !v)}
              >
                <span className="text-sm font-medium">Attachments</span>
                {attachmentsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {attachmentsOpen && (
                <div className="px-5 pb-4 space-y-2">
                  {/* Upload button */}
                  <Button
                    variant="ghost"
                    className="w-full bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

                  {/* File list */}
                  {loadingAttachments ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
                  ) : attachments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No attachments yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {attachments.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 bg-card"
                        >
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.name}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-teal-500 hover:text-teal-600">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                            <a href={file.url} download={file.name}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-teal-500 hover:text-teal-600">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteAttachment(i)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <button
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
                onClick={() => setCommentsOpen((v) => !v)}
              >
                <span className="text-sm font-medium">Comments</span>
                {commentsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {commentsOpen && (
                <div className="px-5 pb-4 space-y-4">
                  {loadingComments ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                  ) : (
                    comments.map((comment) => {
                      const isOwn = comment.author_id === user?.id;
                      const isEditing = editingCommentId === comment.id;
                      return (
                        <div key={comment.id} className="flex gap-3 group">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-[11px] bg-muted">
                              {comment.author_name ? getInitials(comment.author_name) : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold leading-tight">
                                  {comment.author_name ?? "Unknown"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  commented on {format(new Date(comment.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                              {isOwn && !isEditing && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentText(comment.body);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingCommentId(comment.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="mt-2">
                                <Textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  className="min-h-[40px] max-h-[120px] resize-none text-xs rounded-lg"
                                  rows={1}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit(comment.id);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingCommentId(null);
                                      setEditingCommentText("");
                                    }
                                  }}
                                />
                                <div className="flex justify-end gap-1 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleSaveEdit(comment.id)}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{comment.body}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Comment input */}
          <div className="border-t px-5 py-5 shrink-0 bg-background">
            <div className="relative">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write your comment..."
                className="min-h-[50px] max-h-[120px] resize-none text-sm pr-14 rounded-xl border border-input shadow-sm hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary/20"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                size="icon"
                disabled={!commentText.trim() || isSubmittingComment}
                onClick={handleAddComment}
                className="absolute top-1/2 -translate-y-1/2 right-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <SendHorizonal />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
