import styled from "styled-components";
import { varWithFallback } from "../styles/theme";

export const defaultBorderRadius = "5px";
export const lightGray = "#999998";
export const greenButtonColor = "#189e72";

/* BAS Customization - WhatsApp-style chat bubble colors */
export const userMessageBubbleColor = "#E5D8FA"; // Light purple for user messages
export const assistantMessageBubbleColor = "#F3F4F6"; // Light gray for assistant messages
export const userMessageTextColor = "#1D2D3E "; 
export const assistantMessageTextColor = "#1D2D3E "; 
/* BAS Customization End */

export const vscInputBackground = varWithFallback("input-background");
export const vscQuickInputBackground = varWithFallback("input-background");
export const vscBackground = varWithFallback("background");
export const vscForeground = varWithFallback("foreground");
export const vscButtonBackground = varWithFallback("primary-background");
export const vscButtonForeground = varWithFallback("primary-foreground");
export const vscEditorBackground = varWithFallback("editor-background");
export const vscListActiveBackground = varWithFallback("list-active");
export const vscFocusBorder = varWithFallback("border-focus");
export const vscListActiveForeground = varWithFallback(
  "list-active-foreground",
);
export const vscInputBorder = varWithFallback("input-border");
export const vscInputBorderFocus = varWithFallback("border-focus");
export const vscBadgeBackground = varWithFallback("badge-background");
export const vscBadgeForeground = varWithFallback("badge-foreground");
export const vscCommandCenterActiveBorder = varWithFallback(
  "command-border-focus",
);
export const vscCommandCenterInactiveBorder = varWithFallback("command-border");

export const Button = styled.button`
  padding: 6px 12px;
  margin: 8px 0;
  border-radius: ${defaultBorderRadius};

  border: none;
  color: ${vscBackground};
  background-color: ${vscForeground};

  &:disabled {
    color: ${vscBackground};
    opacity: 0.5;
    pointer-events: none;
  }

  &:hover:enabled {
    cursor: pointer;
    filter: brightness(1.2);
  }
`;

export const SecondaryButton = styled.button`
  padding: 6px 12px;
  margin: 8px;
  border-radius: ${defaultBorderRadius};

  border: 1px solid ${lightGray};
  color: ${vscForeground};
  background-color: ${vscInputBackground};

  &:disabled {
    color: gray;
  }

  &:hover:enabled {
    cursor: pointer;
    background-color: ${vscBackground};
    opacity: 0.9;
  }
`;

export const GhostButton = styled.button`
  padding: 6px 8px;
  margin: 6px 0;
  border-radius: ${defaultBorderRadius};

  border: none;
  color: ${vscForeground};
  background-color: rgba(128, 128, 128, 0.4);
  &:disabled {
    color: gray;
    pointer-events: none;
  }

  &:hover:enabled {
    cursor: pointer;
    filter: brightness(125%);
  }
`;

export const InputSubtext = styled.span`
  font-size: 0.75rem;
  line-height: 1rem;
  color: ${lightGray};
  margin-top: 0.25rem;
`;

export const ButtonSubtext = styled.span`
  display: block;
  margin-top: 0;
  text-align: center;
  color: ${lightGray};
  font-size: 0.75rem;
`;

export const CustomScrollbarDiv = styled.div`
  scrollbar-base-color: transparent;
  scrollbar-width: thin;
  background-color: ${vscBackground};

  & * {
    ::-webkit-scrollbar {
      width: 4px;
    }

    ::-webkit-scrollbar:horizontal {
      height: 4px;
    }

    ::-webkit-scrollbar-thumb {
      border-radius: 2px;
    }
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  box-sizing: border-box;
  margin: 4px 0px;
  border-radius: ${defaultBorderRadius};
  outline: 1px solid ${lightGray};
  border: none;
  background-color: ${vscBackground};
  color: ${vscForeground};

  &:focus {
    background: ${vscInputBackground};
    outline: 1px solid ${lightGray};
  }

  &:invalid {
    outline: 1px solid red;
  }
`;

export const HeaderButton = styled.button<{
  inverted: boolean | undefined;
  backgroundColor?: string;
  hoverBackgroundColor?: string;
}>`
  background-color: ${({ inverted, backgroundColor }) => {
    return backgroundColor ?? (inverted ? vscForeground : "transparent");
  }};
  color: ${({ inverted }) => (inverted ? vscBackground : vscForeground)};

  border: none;
  border-radius: ${defaultBorderRadius};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};

  &:focus {
    outline: none;
    border: none;
  }

  &:hover {
    background-color: ${({ inverted, hoverBackgroundColor }) =>
      typeof inverted === "undefined" || inverted
        ? (hoverBackgroundColor ?? vscInputBackground)
        : "transparent"};
  }

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px;
`;

export const StyledActionButton = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 200ms;
  border-radius: ${defaultBorderRadius};
  padding: 2px 12px;
  background-color: ${lightGray}33;
  background-opacity: 0.1;

  &:hover {
    background-color: ${lightGray}55;
  }
`;

export const CloseButton = styled.button`
  border: none;
  background-color: inherit;
  color: ${lightGray};
  position: absolute;
  top: 0.6rem;
  right: 1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const AnimatedEllipsis = styled.span`
  &::after {
    content: ".";
    animation: ellipsis 2.5s infinite;
    animation-fill-mode: forwards;
    animation-play-state: running;
    will-change: content;
    display: inline-block;
    width: 16px;
    text-align: left;
  }

  @keyframes ellipsis {
    0% {
      content: ".";
    }
    33% {
      content: "..";
    }
    66% {
      content: "...";
    }
    100% {
      content: ".";
    }
  }
`;

//BAS Customization - Chat bubble components
/* BAS Customization - Increase vertical gap between bubbles */
export const ChatBubbleContainer = styled.div<{ isUser: boolean }>`
  display: flex;
  width: 100%;
  margin: 0 0 20px 0;
  justify-content: ${({ isUser }) => (isUser ? "flex-end" : "flex-start")};
`;

export const ChatBubble = styled.div<{ isUser: boolean }>`
  max-width: 70%;
  min-width: 60px;
  padding: 8px 16px;
  border-radius: 12px;
  background-color: ${({ isUser }) =>
    isUser ? userMessageBubbleColor : assistantMessageBubbleColor};
  color: ${({ isUser }) =>
    isUser ? userMessageTextColor : assistantMessageTextColor};
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

  ${({ isUser }) =>
    isUser
      ? `
    border-bottom-right-radius: 6px;
    margin-right: 12px;
    align-self: flex-end;
  `
      : `
    border-bottom-left-radius: 6px;
    margin-left: 12px;
    align-self: flex-start;
  `}
`;

/* BAS Customization: User bubble 8px radius except right bottom */
export const UserMessageBubble = styled(ChatBubble).attrs({ isUser: true })`
  display: inline-block;
  text-align: left;
  padding: 0px;
  border-radius: 8px 8px 0px 8px;
  min-width: unset;
  max-width: 80%;
  line-height: 1.4;
`;

/* BAS Customization: Assistant bubble 8px radius except left bottom 0px */
export const AssistantMessageBubble = styled(ChatBubble).attrs({ isUser: false })`
  display: inline-block;
  text-align: left;
  padding-left: 10px;
  padding-right:10px;
  padding-top: 0px;
  padding-bottom: 0px;
  border-radius: 8px 8px 8px 0px;
`;
/* BAS Customization End */
