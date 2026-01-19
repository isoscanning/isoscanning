"use client"

import { useRef, useEffect, useState, ReactNode } from "react"
import { motion, useInView, Variants } from "framer-motion"

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
