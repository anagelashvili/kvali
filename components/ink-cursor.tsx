"use client";

// The tattoo-machine cursor and its fading ink trail (desktop pointers only).
import { useEffect, useRef } from "react";

export function InkCursor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pen = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let w = 0;
    let h = 0;
    let last: { x: number; y: number } | null = null;
    let idle = 0;
    let fading = false;
    let raf = 0;

    const size = () => {
      const d = devicePixelRatio || 1;
      w = innerWidth;
      h = innerHeight;
      cv.width = w * d;
      cv.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    // the fade loop sleeps once the trail is gone
    const fade = () => {
      if (++idle > 150) {
        ctx.clearRect(0, 0, w, h);
        fading = false;
        return;
      }
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,.04)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(fade);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const x = e.clientX;
      const y = e.clientY;
      const j = last ? (Math.random() - 0.5) * 1.4 : 0;
      pen.current!.style.transform = `translate(${x - 3 + j}px,${y - 53 + j}px)`;
      if (last) {
        const sp = Math.hypot(x - last.x, y - last.y);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = Math.max(1.5, 6 - sp * 0.06);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      last = { x, y };
      idle = 0;
      if (!fading) {
        fading = true;
        raf = requestAnimationFrame(fade);
      }
    };
    const leave = () => (last = null);

    size();
    addEventListener("resize", size);
    addEventListener("pointermove", move);
    document.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      removeEventListener("pointermove", move);
      document.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="ink-trail" aria-hidden="true" />
      <svg ref={pen} className="pen" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <path d="M3 53L12 38L18 44Z" />
        <path d="M12 38L36 14L46 24L18 44Z" />
        <path d="M36 14L42 8L52 18L46 24Z" />
      </svg>
      <svg className="grain" aria-hidden="true">
        <filter id="grain-noise">
          <feTurbulence baseFrequency=".8" numOctaves={2} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-noise)" />
      </svg>
    </>
  );
}
