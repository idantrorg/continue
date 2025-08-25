import styled from "styled-components";
import {
  defaultBorderRadius,
  lightGray,
  vscBadgeBackground,
  vscCommandCenterActiveBorder,
  vscCommandCenterInactiveBorder,
  vscForeground,
  vscInputBackground,
  vscInputBorderFocus,
  userMessageTextColor,
} from "../../..";
import { getFontSize } from "../../../../util";

//BAS Customization - Updated InputBoxDiv to support chat bubbles
export const InputBoxDiv = styled.div<{ isInChatBubble?: boolean }>`
  resize: none;
  font-family: inherit;
  border-radius: ${defaultBorderRadius};
  padding-bottom: 1px;
  margin: 0;
  height: auto;
  width: 100%;
  background-color: ${({ isInChatBubble }) => 
    isInChatBubble ? 'transparent' : vscInputBackground};
  color: ${({ isInChatBubble }) => 
    isInChatBubble ? userMessageTextColor : vscForeground};

  border: ${({ isInChatBubble }) => 
    isInChatBubble ? 'none' : `1px solid ${vscCommandCenterInactiveBorder}`};
  transition: border-color 0.15s ease-in-out;
  &:focus-within {
    border: ${({ isInChatBubble }) => 
      isInChatBubble ? 'none' : `1px solid ${vscCommandCenterActiveBorder}`};
  }

  outline: none;
  font-size: ${getFontSize()}px;

  &:focus {
    outline: none;
    border: ${({ isInChatBubble }) => 
      isInChatBubble ? 'none' : `0.5px solid ${vscInputBorderFocus}`};
  }

  &::placeholder {
    color: ${lightGray}cc;
  }

  display: flex;
  flex-direction: column;
`;
//BAS Customization End

export const HoverDiv = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  opacity: 0.5;
  background-color: ${vscBadgeBackground};
  color: ${vscForeground};
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const HoverTextDiv = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  color: ${vscForeground};
  display: flex;
  align-items: center;
  justify-content: center;
`;
