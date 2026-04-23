"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface ChatContextType {
  sendMessage?: (message: { text: string }) => void;
}

const ChatContext = createContext<ChatContextType>({});

interface ChatProviderProps {
  children: ReactNode;
  sendMessage?: (message: { text: string }) => void;
}

export function ChatProvider({ children, sendMessage }: ChatProviderProps) {
  return (
    <ChatContext.Provider value={{ sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  // Return the context even if it's empty - components can handle missing functions
  return context || {};
}
