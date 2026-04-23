"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedActionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

export default function SuggestedActions({ suggestions, onSuggestionClick, className }: SuggestedActionsProps) {
  return null;

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="font-medium">Suggestions:</span>
      </div>
      {suggestions.map((suggestion, index) => (
        <Button
          key={`${suggestion}-${index}`}
          variant="outline"
          size="sm"
          onClick={() => onSuggestionClick(suggestion)}
          className="h-7 px-3 text-xs rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary transition-all duration-200"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
