"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { motion } from "framer-motion";

interface FullPageScrollerProps {
  children: ReactNode;
  sectionsCount?: number;
}

export function FullPageScroller({ children, sectionsCount = 9 }: FullPageScrollerProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sectionHeight, setSectionHeight] = useState(0);
  const isScrolling = useRef(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
      setSectionHeight(window.innerHeight - 64); // 64px é a altura do LpHeader
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop || !mounted) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".allow-scroll")) return;

      e.preventDefault();

      if (isScrolling.current) return;

      const direction = Math.sign(e.deltaY);

      if (direction > 0 && activeSection < sectionsCount - 1) {
        changeSection(activeSection + 1);
      } else if (direction < 0 && activeSection > 0) {
        changeSection(activeSection - 1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [activeSection, sectionsCount, isDesktop, mounted]);

  const changeSection = (index: number) => {
    isScrolling.current = true;
    setActiveSection(index);
    setTimeout(() => {
      isScrolling.current = false;
    }, 1200);
  };

  if (!mounted || !isDesktop) {
    return (
      <div className="flex-1 w-full h-full overflow-y-auto">
        {children}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 w-full h-full overflow-hidden relative">
      <motion.div
        className="w-full"
        animate={{ y: -(activeSection * sectionHeight) }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
