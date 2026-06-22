import { useState, useEffect } from 'react';

export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );
  const [viewportOffset, setViewportOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      setViewportHeight(window.visualViewport!.height);
      setViewportOffset(window.innerHeight - window.visualViewport!.height);
    };

    handleResize(); // Initial measurement
    
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    // Add window resize as fallback
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.visualViewport!.removeEventListener('resize', handleResize);
      window.visualViewport!.removeEventListener('scroll', handleResize);
      window.addEventListener('resize', handleResize);
    };
  }, []);

  return { height: viewportHeight, offset: viewportOffset };
}
