import * as PIXI from 'pixi.js';

const CHAT_BUBBLE_MAX_TEXT_WIDTH = 220;
const CHAT_BUBBLE_MIN_WIDTH = 72;
const CHAT_BUBBLE_MAX_WIDTH = 260;
const CHAT_BUBBLE_HEIGHT = 44;
const CHAT_BUBBLE_DURATION_MS = 3600;

export interface ChatBubbleController {
  say: (message: string) => void;
  destroy: () => void;
}

export function createChatBubbleController(
  parent: PIXI.Container,
): ChatBubbleController {
  const bubble = new PIXI.Container();
  bubble.y = -130;
  bubble.visible = false;
  bubble.zIndex = 50;

  const background = new PIXI.Graphics();
  const text = new PIXI.Text({
    text: '',
    style: {
      fill: 0x1e293b,
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
      wordWrap: false,
    },
  });
  text.anchor.set(0.5);

  bubble.addChild(background, text);
  parent.addChild(bubble);

  let timeoutId: number | null = null;

  const hide = () => {
    bubble.visible = false;
    timeoutId = null;
  };

  const say = (message: string) => {
    const normalizedMessage = normalizeChatBubbleMessage(message);

    if (normalizedMessage === '') {
      return;
    }

    text.text = getEllipsizedMessage(text, normalizedMessage);

    const bubbleWidth = Math.min(
      Math.max(text.width + 28, CHAT_BUBBLE_MIN_WIDTH),
      CHAT_BUBBLE_MAX_WIDTH,
    );

    background
      .clear()
      .roundRect(
        -bubbleWidth / 2,
        -CHAT_BUBBLE_HEIGHT / 2,
        bubbleWidth,
        CHAT_BUBBLE_HEIGHT,
        14,
      )
      .fill({ color: 0xffffff, alpha: 0.96 })
      .stroke({ color: 0xe2e8f0, width: 2 })
      .moveTo(-10, CHAT_BUBBLE_HEIGHT / 2 - 1)
      .lineTo(0, CHAT_BUBBLE_HEIGHT / 2 + 12)
      .lineTo(10, CHAT_BUBBLE_HEIGHT / 2 - 1)
      .fill({ color: 0xffffff, alpha: 0.96 })
      .stroke({ color: 0xe2e8f0, width: 2 });

    bubble.visible = true;

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(hide, CHAT_BUBBLE_DURATION_MS);
  };

  const destroy = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    parent.removeChild(bubble);
    bubble.destroy({ children: true });
  };

  return { say, destroy };
}

function normalizeChatBubbleMessage(message: string) {
  return message.replace(/\s+/g, ' ').trim();
}

function getEllipsizedMessage(text: PIXI.Text, message: string) {
  text.text = message;

  if (text.width <= CHAT_BUBBLE_MAX_TEXT_WIDTH) {
    return message;
  }

  let left = 0;
  let right = message.length;
  let result = '...';

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const candidate = `${message.slice(0, mid).trimEnd()}...`;
    text.text = candidate;

    if (text.width <= CHAT_BUBBLE_MAX_TEXT_WIDTH) {
      result = candidate;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}
