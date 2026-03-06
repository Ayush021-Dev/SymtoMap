import { useEffect, useRef } from "react";
import "./Layout.css";

export default function Layout({ children }) {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animFrame;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Animated grid + particle dots
    let t = 0;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep radial background
      const grad = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.4, 0,
        canvas.width * 0.5, canvas.height * 0.4, canvas.width * 0.85
      );
      grad.addColorStop(0, "#0a1628");
      grad.addColorStop(0.5, "#060e1e");
      grad.addColorStop(1, "#020609");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle blue-teal radial accent top-left
      const accent = ctx.createRadialGradient(
        canvas.width * 0.15, canvas.height * 0.2, 0,
        canvas.width * 0.15, canvas.height * 0.2, canvas.width * 0.45
      );
      accent.addColorStop(0, "rgba(30,100,180,0.12)");
      accent.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Right side accent
      const accent2 = ctx.createRadialGradient(
        canvas.width * 0.9, canvas.height * 0.6, 0,
        canvas.width * 0.9, canvas.height * 0.6, canvas.width * 0.4
      );
      accent2.addColorStop(0, "rgba(10,60,140,0.1)");
      accent2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = accent2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Perspective grid
      const gridColor = "rgba(30,100,200,0.07)";
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;

      const cols = 28;
      const colW = canvas.width / cols;
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * colW, 0);
        ctx.lineTo(i * colW, canvas.height);
        ctx.stroke();
      }

      const rows = 18;
      const rowH = canvas.height / rows;
      for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * rowH);
        ctx.lineTo(canvas.width, i * rowH);
        ctx.stroke();
      }

      // Particles (floating data dots)
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80,160,255,${p.alpha * (0.6 + Math.sin(t + p.x) * 0.4)})`;
        ctx.fill();
      });

      // Scanline effect
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        ctx.fillRect(0, y, canvas.width, 1);
      }

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="layout-root">
      <canvas ref={canvasRef} className="layout-bg-canvas" />

      {/* HUD corner decorations */}
      <div className="hud-corner hud-tl" />
      <div className="hud-corner hud-tr" />
      <div className="hud-corner hud-bl" />
      <div className="hud-corner hud-br" />

      {/* Top header bar */}
      <header className="layout-header">
        <div className="header-logo">
          <span className="logo-cross">✚</span>
          <span className="logo-text">SymtoMap </span>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          <span className="status-text">SYSTEM ACTIVE</span>
        </div>
      </header>

      {/* Main content */}
      <main className="layout-content">
        {children}
      </main>

      {/* Bottom bar */}
      <footer className="layout-footer">
        <span>DIAGNOSTIC ENGINE v2.1</span>
        <span>ML MODELS: ONLINE</span>
        <span>REAL-TIME ANALYSIS</span>
      </footer>
    </div>
  );
}