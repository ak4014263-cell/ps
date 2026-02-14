import React, { useRef, useEffect } from 'react';
import { Canvas } from 'fabric';

interface FabricCanvasProps {
  onReady: (canvas: Canvas) => void;
  width: number;
  height: number;
}

const FabricCanvas: React.FC<FabricCanvasProps> = ({ onReady, width, height }) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const onReadyRef = useRef(onReady);

  // Keep onReady ref updated to the latest version without re-triggering the initialization effect.
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Initialize canvas only once on mount.
  useEffect(() => {
    if (!canvasEl.current || canvasRef.current) {
      return;
    }

    const canvas = new Canvas(canvasEl.current, {
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: false,
      imageSmoothingEnabled: false,
    });
    canvasRef.current = canvas;

    if (onReadyRef.current) {
      onReadyRef.current(canvas);
    }

    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
    // This effect should run only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update canvas dimensions when width or height props change.
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setDimensions({ width, height });
    }
  }, [width, height]);

  // Let Fabric.js control the canvas element's size.
  // Do not set width/height attributes directly on the <canvas> element.
  return <canvas ref={canvasEl} />;
};

export default FabricCanvas;
