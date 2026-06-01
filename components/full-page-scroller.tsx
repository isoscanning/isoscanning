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

    const scrollToHash = (hash: string) => {
      if (!hash || !hash.startsWith("#")) return;
      const id = hash.substring(1);
      const element = document.getElementById(id);
      
      if (element && containerRef.current) {
        const motionDiv = containerRef.current.firstElementChild;
        if (motionDiv) {
          const children = Array.from(motionDiv.children);
          const index = children.findIndex(child => child.id === id || child.contains(element));
          
          if (index !== -1) {
            changeSection(index);
          }
        }
      }
      
      const resetScroll = () => {
        window.scrollTo(0, 0);
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      };
      
      resetScroll();
      setTimeout(resetScroll, 10);
      setTimeout(resetScroll, 50);
    };

    const handleHashChange = () => scrollToHash(window.location.hash);
    
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor && anchor.hash && (anchor.pathname === window.location.pathname || anchor.href.includes(window.location.pathname + "#"))) {
        e.preventDefault(); 
        window.history.pushState(null, "", anchor.hash); 
        scrollToHash(anchor.hash);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("hashchange", handleHashChange);
    document.addEventListener("click", handleAnchorClick);
    
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, [activeSection, sectionsCount, isDesktop, mounted]);

  // Handle initial hash on load
  useEffect(() => {
    if (mounted && isDesktop && window.location.hash) {
      const hash = window.location.hash;
      const id = hash.substring(1);
      const element = document.getElementById(id);
      if (element && containerRef.current) {
        const motionDiv = containerRef.current.firstElementChild;
        if (motionDiv) {
          const children = Array.from(motionDiv.children);
          const index = children.findIndex(child => child.id === id || child.contains(element));
          if (index !== -1) {
            setActiveSection(index);
          }
        }
      }
    }
  }, [mounted, isDesktop]);

  const changeSection = (index: number) => {
    isScrolling.current = true;
    setActiveSection(index);
    setTimeout(() => {
      isScrolling.current = false;
    }, 400);
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
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
