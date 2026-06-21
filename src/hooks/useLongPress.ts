import { useCallback, useRef, useState } from 'react';

export const useLongPress = (
  onLongPress: (e: any) => void,
  onClick: (e: any) => void,
  { shouldPreventDefault = true, delay = 400 } = {}
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: any) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false
        });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      shouldTriggerClick && !longPressTriggered && onClick(event);
      setLongPressTriggered(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchEnd: (e: any) => clear(e)
  };
};

const isTouchEvent = (event: any) => {
  return 'touches' in event;
};

const preventDefault = (event: any) => {
  if (!isTouchEvent(event)) return;

  if ((event as any).touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};
