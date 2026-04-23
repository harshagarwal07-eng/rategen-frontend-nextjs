"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getTokenUsageHistory } from "@/data-access/travel-agent";
import type { TokenUsageHistory } from "@/types/chat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface TokenUsageHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
}

export default function TokenUsageHistorySheet({ open, onOpenChange, chatId }: TokenUsageHistorySheetProps) {
  const [history, setHistory] = useState<TokenUsageHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && chatId) {
      setLoading(true);
      getTokenUsageHistory(chatId)
        .then(setHistory)
        .finally(() => setLoading(false));
    }
  }, [open, chatId]);

  const totalTokens = history.reduce((sum, item) => sum + item.tokens_used, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Token Usage History</SheetTitle>
          <SheetDescription>
            Complete history of token usage for this chat. Total tokens never decrease even when messages are deleted.
          </SheetDescription>
        </SheetHeader>

        <div className="px-3">
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Total Token Usage</div>
            <div className="text-2xl font-mono font-semibold">{totalTokens.toLocaleString()}</div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No token usage history yet</div>
          ) : (
            <Table className="border rounded-lg">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(item.created_at, "PPp")}</TableCell>
                    <TableCell className="max-w-60 truncate">{item.user_message_text}</TableCell>
                    <TableCell>{item.tokens_used.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
