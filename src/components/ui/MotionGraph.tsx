import { useEffect, useRef } from 'react';

interface MotionGraphProps {
  data: number[];
  color: string;
  label: string;
}

export function MotionGraph({ data, color, label }: MotionGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    // Horizontal midline
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw data
    if (data.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const maxDataPoints = 100;
      const visibleData = data.slice(-maxDataPoints);
      const stepX = width / (maxDataPoints - 1);

      // Scale Y: typical acceleration is -10 to 10 m/s²
      const scaleY = height / 20; // 20 m/s² range
      const midY = height / 2;

      visibleData.forEach((value, index) => {
        const x = index * stepX;
        const y = midY - (value * scaleY);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }
  }, [data, color]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{data[data.length - 1]?.toFixed(2) ?? '—'}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        className="w-full border border-border rounded bg-black/30"
      />
    </div>
  );
}

export default MotionGraph;
