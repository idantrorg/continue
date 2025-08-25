// BAS Customization - Animated three purple dots for "thinking" state
import React from "react";
import styled, { keyframes } from "styled-components";
import { userMessageBubbleColor } from ".";

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
  40% { transform: scale(1.3); opacity: 1; }
`;

const DotsWrapper = styled.div`
  display: flex;
  align-items center;
  justify-content: flex-start;
  height: 32px;
  padding: 0 8px;
`;

const Dot = styled.div<{ delay: string }>`
  width: 10px;
  height: 10px;
  margin: 0 4px;
  border-radius: 50%;
  background: ${userMessageBubbleColor};
  animation: ${bounce} 1.2s infinite;
  animation-delay: ${({ delay }) => delay};
`;

export const ThinkingDots: React.FC = () => (
  <DotsWrapper>
    <Dot delay="0s" />
    <Dot delay="0.2s" />
    <Dot delay="0.4s" />
  </DotsWrapper>
);

// BAS Customization End
