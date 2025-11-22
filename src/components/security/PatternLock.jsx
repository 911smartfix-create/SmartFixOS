import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, Unlock, RotateCcw } from "lucide-react";

export default function PatternLock({ open, onClose, onSave, mode = "set", savedPattern = null }) {
  const canvasRef = useRef(null);
  const [pattern, setPattern] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dots, setDots] = useState([]);
  const [message, setMessage] = useState("");
  const [attempts, setAttempts] = useState(0);

  const GRID_SIZE = 3;
  const DOT_RADIUS = 20;
  const LINE_WIDTH = 4;

  useEffect(() => {
    if (open) {
      initializeDots();
      setPattern([]);
      setMessage(mode === "set" ? "Dibuja tu patrón de desbloqueo" : "Verifica tu patrón");
      setAttempts(0);
    }
  }, [open, mode]);

  const initializeDots = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const spacing = Math.min(rect.width, rect.height) / (GRID_SIZE + 1);
    const offsetX = (rect.width - (GRID_SIZE - 1) * spacing) / 2;
    const offsetY = (rect.height - (GRID_SIZE - 1) * spacing) / 2;

    const newDots = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        newDots.push({
          id: row * GRID_SIZE + col,
          x: offsetX + col * spacing,
          y: offsetY + row * spacing,
          active: false
        });
      }
    }
    setDots(newDots);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines between connected dots
    if (pattern.length > 0) {
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const firstDot = dots[pattern[0]];
      ctx.moveTo(firstDot.x, firstDot.y);
      
      for (let i = 1; i < pattern.length; i++) {
        const dot = dots[pattern[i]];
        ctx.lineTo(dot.x, dot.y);
      }
      ctx.stroke();
    }

    // Draw dots
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
      
      if (pattern.includes(dot.id)) {
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#2B2B2B';
        ctx.fill();
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  useEffect(() => {
    drawCanvas();
  }, [pattern, dots]);

  const getDotAtPosition = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    for (const dot of dots) {
      const distance = Math.sqrt(
        Math.pow(canvasX - dot.x, 2) + Math.pow(canvasY - dot.y, 2)
      );
      if (distance <= DOT_RADIUS * 1.5) {
        return dot.id;
      }
    }
    return null;
  };

  const handleStart = (e) => {
    setIsDrawing(true);
    handleMove(e);
  };

  const handleMove = (e) => {
    if (!isDrawing && e.type.includes('mouse')) return;

    const touch = e.touches ? e.touches[0] : e;
    const dotId = getDotAtPosition(touch.clientX, touch.clientY);

    if (dotId !== null && !pattern.includes(dotId)) {
      setPattern([...pattern, dotId]);
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
    
    if (pattern.length < 4) {
      setMessage("El patrón debe tener al menos 4 puntos");
      setPattern([]);
      return;
    }

    if (mode === "set") {
      const patternString = pattern.join('-');
      setMessage("✓ Patrón guardado correctamente");
      setTimeout(() => {
        onSave(patternString);
        onClose();
      }, 1000);
    } else if (mode === "verify") {
      const inputPattern = pattern.join('-');
      if (inputPattern === savedPattern) {
        setMessage("✓ Patrón correcto!");
        setTimeout(() => {
          onSave(true);
          onClose();
        }, 1000);
      } else {
        setAttempts(attempts + 1);
        if (attempts >= 2) {
          setMessage("❌ Demasiados intentos fallidos");
          setTimeout(() => {
            onSave(false);
            onClose();
          }, 1500);
        } else {
          setMessage(`❌ Patrón incorrecto. Intento ${attempts + 1}/3`);
          setPattern([]);
        }
      }
    }
  };

  const handleReset = () => {
    setPattern([]);
    setMessage(mode === "set" ? "Dibuja tu patrón de desbloqueo" : "Verifica tu patrón");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-[#2B2B2B] to-black border-[#FF0000]/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-[#FF0000]" />
            {mode === "set" ? "Configurar Patrón" : "Verificar Patrón"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 mb-2">{message}</p>
            {mode === "set" && pattern.length > 0 && (
              <p className="text-sm text-gray-400">Puntos conectados: {pattern.length}</p>
            )}
          </div>

          <div className="relative bg-black rounded-lg border-2 border-gray-800 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="touch-none cursor-pointer"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500">
            {mode === "set" ? "Conecta al menos 4 puntos para crear tu patrón" : "Dibuja el patrón para desbloquear"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}