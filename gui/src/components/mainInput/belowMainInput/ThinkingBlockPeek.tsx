// src/components/ThinkingBlockPeek.tsx
import { ChatHistoryItem } from "core";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { vscBackground } from "../..";
import { ThinkingDots } from "../../ThinkingDots.bas";
// BAS Customization: Remove old imports for spoiler/thinking text, add ThinkingDots

/* BAS Customization: Remove old thinking/markdown/spoiler styles for new thinking dots */

interface ThinkingBlockPeekProps {
  content: string;
  redactedThinking?: string;
  index: number;
  prevItem: ChatHistoryItem | null;
  inProgress?: boolean;
  signature?: string;
  tokens?: number;
}

function ThinkingBlockPeek({
  inProgress,
  item,
}: ThinkingBlockPeekProps & { item?: any }) {
  // BAS Customization: Show animated dots for "thinking" message
  if (item && item.message.role === "thinking") {
    return (
      <div className="thread-message" style={{ marginLeft: 8 }}>
        <ThinkingDots />
      </div>
    );
  }
  // fallback for inProgress (legacy)
  if (inProgress) {
    return (
      <div className="-message" style={{ marginLeft: 8 }}>
        <ThinkingDots />
      </div>
    );
  }
  return null;
}

export default ThinkingBlockPeek;
