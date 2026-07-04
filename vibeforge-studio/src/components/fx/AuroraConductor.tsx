import { useEffect, useRef } from "react";

export function AuroraConductor({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let mouseX = 0, mouseY = 0;
    let velX = 0, velY = 0;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    
    const onMove = (e: MouseEvent) => {
      velX = e.clientX - mouseX;
      velY = e.clientY - mouseY;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMove);
    
    let t = 0;
    const animate = () => {
      t += 0.005 + Math.abs(velX + velY) * 0.0002;
      velX *= 0.9; velY *= 0.9;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const orbs = [
        { x: 0.3 + Math.sin(t * 0.7) * 0.2, y: 0.4 + Math.cos(t * 0.5) * 0.3, color: "#7df4ff", r: 0.45 },
        { x: 0.6 + Math.cos(t * 0.4) * 0.25, y: 0.5 + Math.sin(t * 0.6) * 0.2, color: "#7c3aed", r: 0.4 },
        { x: 0.5 + Math.sin(t * 0.9) * 0.15, y: 0.3 + Math.cos(t * 0.3) * 0.25, color: "#ff6ad5", r: 0.35 },
      ];
      
      for (const orb of orbs) {
        const grd = ctx.createRadialGradient(
          orb.x * canvas.width, orb.y * canvas.height, 0,
          orb.x * canvas.width, orb.y * canvas.height, orb.r * canvas.width
        );
        grd.addColorStop(0, orb.color + "40");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      animId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
