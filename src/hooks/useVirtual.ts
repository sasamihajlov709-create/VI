import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';

interface UseVirtualOptions {
  itemCount: number;
  itemHeight: number | ((index: number) => number);
  containerRef: React.RefObject<HTMLDivElement | null>;
  buffer?: number;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export function useVirtual({
  itemCount,
  itemHeight,
  containerRef,
  buffer = 5,
}: UseVirtualOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Calculate coordinates of every user item once dimensions or counts change
  const items: VirtualItem[] = [];
  let totalHeight = 0;

  const getHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    return itemHeight;
  }, [itemHeight]);

  for (let i = 0; i < itemCount; i++) {
    const size = getHeight(i);
    items.push({
      index: i,
      start: totalHeight,
      size,
    });
    totalHeight += size;
  }

  // Bind scroll observer to the target container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Use requestAnimationFrame to sync with screen refresh matches (up to 120fps)
      requestAnimationFrame(() => {
        if (container) {
          setScrollTop(container.scrollTop);
        }
      });
    };

    const handleResize = () => {
      if (container) {
        setContainerHeight(container.clientHeight);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Resize observer for container dimension updates
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Initial state trigger
    setScrollTop(container.scrollTop);
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef, itemCount]);

  // Find start and end indices of items intersecting our viewport
  let startIndex = 0;
  let endIndex = 0;

  if (itemCount > 0) {
    // Binary search for the first visible item
    let low = 0;
    let high = itemCount - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const item = items[mid];
      if (item.start <= scrollTop) {
        startIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Determine the last visible item
    endIndex = startIndex;
    const viewBottom = scrollTop + containerHeight;
    while (endIndex < itemCount - 1 && items[endIndex].start + items[endIndex].size < viewBottom) {
      endIndex++;
    }
  }

  // Extend with safe buffers to avoid flickering or blank space during scroll accelerates
  const startIndexWithBuffer = Math.max(0, startIndex - buffer);
  const endIndexWithBuffer = Math.min(itemCount - 1, endIndex + buffer);

  const virtualItems = items.slice(startIndexWithBuffer, endIndexWithBuffer + 1);

  return {
    virtualItems,
    totalHeight,
    startIndex: startIndexWithBuffer,
    endIndex: endIndexWithBuffer,
  };
}
