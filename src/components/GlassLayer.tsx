import React from 'react';

interface GlassLayerProps {
  layer: 1 | 2 | 3 | 4 | 5;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassLayer: React.FC<GlassLayerProps> = ({ layer, children, className = '', onClick }) => {
  const layerClasses = {
    1: 'glass-layer-1', // Base atmosphere
    2: 'glass-layer-2', // Secondary surfaces
    3: 'glass-layer-3', // Interactive surfaces
    4: 'glass-layer-4', // Floating surfaces
    5: 'glass-layer-5', // Active objects
  };

  return (
    <div className={`glass-base ${layerClasses[layer]} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
