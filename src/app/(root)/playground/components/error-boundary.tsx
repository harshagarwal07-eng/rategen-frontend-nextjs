"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for catching and gracefully handling React errors
 * Prevents entire app crashes when a component fails
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">
            {this.props.fallbackMessage || "An error occurred while rendering this content."}
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="text-xs text-left bg-muted p-2 rounded mb-4 max-w-full overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Specialized error boundary for the message list
 */
export function MessageListErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallbackMessage="Failed to display messages. Your conversation data is safe - please try refreshing."
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized error boundary for streaming messages
 */
export function StreamingMessageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallbackMessage="Failed to display the streaming response. The response may still be processing.">
      {children}
    </ErrorBoundary>
  );
}
