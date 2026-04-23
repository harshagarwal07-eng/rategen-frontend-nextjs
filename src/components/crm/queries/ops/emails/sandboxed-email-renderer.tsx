"use client";

import { useTheme } from "next-themes";
import { Letter } from "react-letter";

interface SandboxedEmailRendererProps {
  htmlBody: string;
  textBody?: string;
}

export function SandboxedEmailRenderer({
  htmlBody,
  textBody,
}: SandboxedEmailRendererProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (!htmlBody?.trim()) {
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/85">
        {textBody || (
          <span className="text-muted-foreground/50 italic">No content</span>
        )}
      </pre>
    );
  }

  return (
    <div
      className="w-full overflow-x-auto"
      style={
        isDark
          ? {
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "16px",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
            }
          : undefined
      }
    >
      <div
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
          fontSize: "14px",
          lineHeight: "1.6",
          color: "#1a1a1a",
          colorScheme: "light",
          textAlign: "left",
          direction: "ltr",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          overflowX: "auto",
        }}
      >
        <Letter
          html={htmlBody}
          text={textBody}
          allowedSchemas={["http", "https", "mailto", "tel"]}
          preserveCssPriority
        />
      </div>
    </div>
  );
}
