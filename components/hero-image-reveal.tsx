"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface HeroImageRevealProps {
  src: string;
  alt?: string;
  /** Raio do spotlight em px */
  radius?: number;
  /** Opacidade máxima da imagem quando revelada (0–1) */
  opacity?: number;
}

export function HeroImageReveal({
  src,
  alt = "",
  radius = 380,
  opacity = 0.22,
}: HeroImageRevealProps) {
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

  const mask = `radial-gradient(${radius}px circle at ${pos.x}px ${pos.y}px, black 0%, transparent 100%)`;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-contain"
        style={{ opacity }}
      />
    </div>
  );
}
