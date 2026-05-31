"use client"

import { useRef, useEffect, useState, ReactNode } from "react"
import { motion, useInView, useMotionValue, useSpring, Variants } from "framer-motion"

interface ScrollRevealProps {
    children: ReactNode
    className?: string
    delay?: number
    duration?: number
    direction?: "up" | "down" | "left" | "right" | "none"
    distance?: number
    once?: boolean
    threshold?: number
}

export function ScrollReveal({
    children,
    className = "",
    delay = 0,
    duration = 0.6,
    direction = "up",
    distance = 50,
    once = true,
    threshold = 0.1,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once, amount: threshold })

    const getInitialPosition = () => {
        switch (direction) {
            case "up":
                return { y: distance, x: 0 }
            case "down":
                return { y: -distance, x: 0 }
            case "left":
                return { x: distance, y: 0 }
            case "right":
                return { x: -distance, y: 0 }
            case "none":
                return { x: 0, y: 0 }
        }
    }

    const initial = getInitialPosition()

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, ...initial }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...initial }}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.1, 0.25, 1],
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// ─── SplitWordReveal ──────────────────────────────────────────────
// Words cascade in with a blur-to-sharp, slide-up animation on scroll
interface SplitWordRevealProps {
    text: string
    className?: string
    delay?: number
    staggerDelay?: number
}

export function SplitWordReveal({
    text,
    className = "",
    delay = 0,
    staggerDelay = 0.07,
}: SplitWordRevealProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once: true, amount: 0.5 })
    const words = text.split(" ")

    return (
        <span ref={ref} className={className} aria-label={text}>
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    className="inline-block mr-[0.28em] last:mr-0"
                    initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                    animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                    transition={{
                        duration: 0.55,
                        delay: delay + i * staggerDelay,
                        ease: [0.25, 0.1, 0.25, 1],
                    }}
                >
                    {word}
                </motion.span>
            ))}
        </span>
    )
}

// ─── BlurReveal ───────────────────────────────────────────────────
// Single-unit blur-fade reveal — ideal for gradient or styled text
interface BlurRevealProps {
    children: ReactNode
    className?: string
    delay?: number
    duration?: number
}

export function BlurReveal({
    children,
    className = "",
    delay = 0,
    duration = 0.65,
}: BlurRevealProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once: true, amount: 0.5 })

    return (
        <motion.span
            ref={ref}
            className={`inline-block ${className}`}
            initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
        >
            {children}
        </motion.span>
    )
}

// ─── TiltCard ─────────────────────────────────────────────────────
// 3-D perspective tilt that follows the cursor on hover
interface TiltCardProps {
    children: ReactNode
    className?: string
    intensity?: number
}

export function TiltCard({
    children,
    className = "",
    intensity = 10,
}: TiltCardProps) {
    const ref = useRef<HTMLDivElement>(null)
    const rotateX = useMotionValue(0)
    const rotateY = useMotionValue(0)
    const springX = useSpring(rotateX, { stiffness: 280, damping: 28 })
    const springY = useSpring(rotateY, { stiffness: 280, damping: 28 })

    function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width - 0.5
        const relY = (e.clientY - rect.top) / rect.height - 0.5
        rotateX.set(-relY * intensity)
        rotateY.set(relX * intensity)
    }

    function onMouseLeave() {
        rotateX.set(0)
        rotateY.set(0)
    }

    return (
        <div style={{ perspective: 900 }} className={`h-full ${className}`}>
            <motion.div
                ref={ref}
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
                style={{
                    rotateX: springX,
                    rotateY: springY,
                    transformStyle: "preserve-3d",
                }}
                className="h-full"
            >
                {children}
            </motion.div>
        </div>
    )
}

// Staggered children animation
interface StaggerRevealProps {
    children: ReactNode[]
    className?: string
    staggerDelay?: number
    duration?: number
    direction?: "up" | "down" | "left" | "right"
}

export function StaggerReveal({
    children,
    className = "",
    staggerDelay = 0.1,
    duration = 0.5,
    direction = "up",
}: StaggerRevealProps) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, amount: 0.2 })

    const containerVariants: Variants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: staggerDelay,
            },
        },
    }

    const getItemVariants = (): Variants => {
        const distance = 30
        switch (direction) {
            case "up":
                return {
                    hidden: { opacity: 0, y: distance },
                    visible: { opacity: 1, y: 0 },
                }
            case "down":
                return {
                    hidden: { opacity: 0, y: -distance },
                    visible: { opacity: 1, y: 0 },
                }
            case "left":
                return {
                    hidden: { opacity: 0, x: distance },
                    visible: { opacity: 1, x: 0 },
                }
            case "right":
                return {
                    hidden: { opacity: 0, x: -distance },
                    visible: { opacity: 1, x: 0 },
                }
        }
    }

    const itemVariants = getItemVariants()

    return (
        <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className={className}
        >
            {children.map((child, index) => (
                <motion.div
                    key={index}
                    variants={itemVariants}
                    transition={{ duration, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    {child}
                </motion.div>
            ))}
        </motion.div>
    )
}
