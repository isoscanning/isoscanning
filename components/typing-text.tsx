"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView } from "framer-motion"

interface TypingTextProps {
    text: string
    className?: string
    speed?: number
    delay?: number
    cursor?: boolean
    cursorChar?: string
    once?: boolean
}

export function TypingText({
    text,
    className = "",
    speed = 50,
    delay = 0,
    cursor = true,
    cursorChar = "|",
    once = true,
}: TypingTextProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once, amount: 0.5 })
    const [displayedText, setDisplayedText] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)

    useEffect(() => {
        if (!isInView || hasStarted) return

        const startTimeout = setTimeout(() => {
            setHasStarted(true)
            setIsTyping(true)
            let currentIndex = 0

            const typeInterval = setInterval(() => {
                if (currentIndex < text.length) {
                    setDisplayedText(text.slice(0, currentIndex + 1))
                    currentIndex++
                } else {
                    clearInterval(typeInterval)
                    setIsTyping(false)
                }
            }, speed)

            return () => clearInterval(typeInterval)
        }, delay)

        return () => clearTimeout(startTimeout)
    }, [isInView, text, speed, delay, hasStarted])

    return (
        <span ref={ref} className={className}>
            {displayedText}
            {cursor && (isTyping || !hasStarted) && (
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                    className="inline-block ml-1"
                >
                    {cursorChar}
                </motion.span>
            )}
        </span>
    )
}

// Counter animation for stats
interface CountUpProps {
    end: number
    duration?: number
    prefix?: string
    suffix?: string
    className?: string
}

export function CountUp({
    end,
    duration = 2,
    prefix = "",
    suffix = "",
    className = "",
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once: true, amount: 0.5 })
    const [count, setCount] = useState(0)
    const [hasStarted, setHasStarted] = useState(false)

    useEffect(() => {
        if (!isInView || hasStarted) return

        setHasStarted(true)
        const startTime = Date.now()
        const endTime = startTime + duration * 1000

        const updateCount = () => {
            const now = Date.now()
            const progress = Math.min((now - startTime) / (duration * 1000), 1)
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            const currentCount = Math.floor(easeOutQuart * end)

            setCount(currentCount)

            if (progress < 1) {
                requestAnimationFrame(updateCount)
            } else {
                setCount(end)
            }
        }

        requestAnimationFrame(updateCount)
    }, [isInView, end, duration, hasStarted])

    return (
        <span ref={ref} className={className}>
            {prefix}{count.toLocaleString('pt-BR')}{suffix}
        </span>
    )
}

// Gradient text with glow effect
interface GlowTextProps {
    children: React.ReactNode
    className?: string
    colors?: string[]
}

export function GlowText({
    children,
    className = "",
    colors = ["from-blue-500", "via-purple-500", "to-pink-500"],
}: GlowTextProps) {
    return (
        <span
            className={`
        relative inline-block
        text-transparent bg-clip-text
        bg-gradient-to-r ${colors.join(" ")}
        ${className}
      `}
        >
            <span
                className={`
          absolute inset-0 blur-2xl opacity-50
          bg-gradient-to-r ${colors.join(" ")}
        `}
                aria-hidden="true"
            />
            {children}
        </span>
    )
}
