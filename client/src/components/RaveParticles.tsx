import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

const COLORS = [
  "oklch(0.65 0.28 310)", // purple
  "oklch(0.70 0.28 0)",   // pink
  "oklch(0.80 0.18 200)", // cyan
];

export default function RaveParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(Math.random() * 1.5 + 0.5),
      size: Math.random() * 3 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0,
      life: 0,
      maxLife: Math.random() * 200 + 150,
    });

    let frame = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Spawn new particles
      if (frame % 4 === 0 && particlesRef.current.length < 60) {
        particlesRef.current.push(spawnParticle());
      }

      // Update and draw
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);

      for (const p of particlesRef.current) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        p.alpha = progress < 0.1
          ? progress / 0.1
          : progress > 0.8
            ? (1 - progress) / 0.2
            : 1;

        ctx.save();
        ctx.globalAlpha = p.alpha * 0.6;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
