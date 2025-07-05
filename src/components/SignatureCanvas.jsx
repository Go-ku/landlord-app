// components/SignatureCanvas.jsx - Custom signature canvas component
'use client';

import { useRef, useEffect, useState } from 'react';

const SignatureCanvas = ({ onSignatureChange, width = 600, height = 200 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const getEventPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (event.touches && event.touches[0]) {
      return {
        x: (event.touches[0].clientX - rect.left) * scaleX,
        y: (event.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    setIsDrawing(true);
    const position = getEventPosition(event);
    setLastPosition(position);
  };

  const draw = (event) => {
    if (!isDrawing) return;

    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentPosition = getEventPosition(event);

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    ctx.stroke();

    setLastPosition(currentPosition);

    if (onSignatureChange) {
      onSignatureChange(canvas.toDataURL());
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (onSignatureChange) {
      onSignatureChange('');
    }
  };

  const getSignatureData = () => {
    return canvasRef.current?.toDataURL();
  };

  const isEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i] !== 255 || 
          imageData.data[i + 1] !== 255 || 
          imageData.data[i + 2] !== 255) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.clear = clearCanvas;
      canvasRef.current.getSignatureData = getSignatureData; // fixed to avoid recursion
      canvasRef.current.isEmpty = isEmpty;
    }
  }, []);

  return (
    <div className="signature-canvas-container">
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ 
          width: '100%', 
          maxWidth: `${width}px`, 
          height: `${height}px`,
          touchAction: 'none'
        }}
      />
      <p className="text-sm text-gray-500 mt-2 text-center">
        Sign above using your mouse or finger
      </p>
    </div>
  );
};

export default SignatureCanvas;
