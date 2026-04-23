"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryCombobox } from "./query-combobox";
import type { ActiveQuerySummary } from "@/data-access/crm-queries";

interface ComposeFieldsProps {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  showCcBcc: boolean;
  queryId?: string;
  dmcId?: string;
  activeQueries?: ActiveQuerySummary[];
  selectedQueryId: string | null;
  onToChange: (v: string) => void;
  onCcChange: (v: string) => void;
  onBccChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onShowCcBcc: () => void;
  onQueryChange: (v: string | null) => void;
}

const fieldCls = "h-7 border-0 shadow-none focus-visible:ring-0 px-0 text-sm";
const rowCls = "flex items-center gap-2 py-1.5 border-b border-border/30";
const labelCls = "text-xs text-muted-foreground w-9 shrink-0 font-medium";

export function ComposeFields({
  to, cc, bcc, subject, showCcBcc,
  queryId, dmcId, activeQueries, selectedQueryId,
  onToChange, onCcChange, onBccChange, onSubjectChange,
  onShowCcBcc, onQueryChange,
}: ComposeFieldsProps) {
  return (
    <div className="px-4 py-1 shrink-0 border-b border-border/20">
      <div className={rowCls}>
        <span className={labelCls}>To</span>
        <Input
          placeholder="recipient@example.com"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className={fieldCls}
        />
        {!showCcBcc && (
          <Button type="button" variant="ghost" size="sm"
            className="text-[10px] text-muted-foreground h-5 px-2 shrink-0"
            onClick={onShowCcBcc}
          >
            Cc/Bcc
          </Button>
        )}
      </div>

      {showCcBcc && (
        <>
          <div className={rowCls}>
            <span className={labelCls}>Cc</span>
            <Input placeholder="optional" value={cc} onChange={(e) => onCcChange(e.target.value)} className={fieldCls} />
          </div>
          <div className={rowCls}>
            <span className={labelCls}>Bcc</span>
            <Input placeholder="optional" value={bcc} onChange={(e) => onBccChange(e.target.value)} className={fieldCls} />
          </div>
        </>
      )}

      <div className={rowCls}>
        <span className={labelCls}>Subj</span>
        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className={`${fieldCls} font-medium`}
        />
      </div>

      {dmcId && (
        <div className="flex items-center gap-2 py-2">
          <span className={labelCls}>Query</span>
          <div className="flex-1">
            {queryId ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  #{queryId.toUpperCase()}
                </span>
                <span className="text-[10px] text-muted-foreground">Auto-attached</span>
              </div>
            ) : (
              <QueryCombobox
                dmcId={dmcId}
                queries={activeQueries ?? []}
                value={selectedQueryId}
                onChange={onQueryChange}
                placeholder="Link to query…"
                variant="button"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
