"use client";

import { useEffect, useRef, useState } from "react";

interface MouseGlowProps {
  /** RGB values string, e.g. "99, 102, 241" */
  color?: string;
  size?: number;
  opacity?: number;
  className?: string;
}

export function MouseGlow({
  color = "99, 102, 241",
  size = 500,
  opacity = 0.12,
  className = "",
}: MouseGlowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setVisible(true);
    };

    const onLeave = () => setVisible(false);

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={{
        background: `radial-gradient(${size}px circle at ${pos.x}px ${pos.y}px, rgba(${color}, ${opacity}), transparent 70%)`,
      }}
    />
  );
}
