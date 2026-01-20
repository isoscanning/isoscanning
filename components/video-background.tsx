"use client"

import { useRef, useEffect, useState } from "react"

interface VideoBackgroundProps {
    src: string
    poster?: string
    className?: string
    overlay?: boolean
    overlayOpacity?: number
    children?: React.ReactNode
}

export function VideoBackground({
    src,
    poster,
    className = "",
    overlay = true,
    overlayOpacity = 0.6,
    children,
}: VideoBackgroundProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleLoaded = () => setIsLoaded(true)
        video.addEventListener("loadeddata", handleLoaded)

        return () => video.removeEventListener("loadeddata", handleLoaded)
    }, [])

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Video */}
            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                poster={poster}
                className={`
          absolute inset-0 w-full h-full object-cover
          transition-opacity duration-1000
          ${isLoaded ? "opacity-100" : "opacity-0"}
        `}
            >
                <source src={src} type="video/mp4" />
            </video>

            {/* Overlay */}
            {overlay && (
                <div
                    className="absolute inset-0 bg-background/60 dark:bg-background/80"
                    style={{ opacity: overlayOpacity }}
                />
            )}

            {/* Gradient Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background/80" />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    )
}

// Animated gradient background
interface GradientBackgroundProps {
    children?: React.ReactNode
    className?: string
    variant?: "subtle" | "vibrant" | "dark"
}

export function GradientBackground({
    children,
    className = "",
    variant = "subtle",
}: GradientBackgroundProps) {
    const gradients = {
        subtle: `
      bg-gradient-to-br 
      from-blue-50/50 via-purple-50/30 to-pink-50/50
      dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20
    `,
        vibrant: `
      bg-gradient-to-br 
      from-blue-100/80 via-purple-100/60 to-pink-100/80
      dark:from-blue-900/30 dark:via-purple-900/20 dark:to-pink-900/30
    `,
        dark: `
      bg-gradient-to-br 
      from-slate-900 via-purple-900/50 to-slate-900
      dark:from-black dark:via-purple-950/30 dark:to-black
    `,
    }

    return (
        <div className={`relative overflow-hidden ${gradients[variant]} ${className}`}>
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="
            absolute -top-1/2 -left-1/2 w-full h-full
            bg-gradient-radial from-blue-400/20 to-transparent
            dark:from-blue-500/10
            animate-pulse
          "
                    style={{ animationDuration: "4s" }}
                />
                <div
                    className="
            absolute -bottom-1/2 -right-1/2 w-full h-full
            bg-gradient-radial from-purple-400/20 to-transparent
            dark:from-purple-500/10
            animate-pulse
          "
                    style={{ animationDuration: "5s", animationDelay: "1s" }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    )
}

// Floating particles/dots effect
export function FloatingParticles({ count = 20 }: { count?: number }) {
    const [particles, setParticles] = useState<Array<{
        id: number
        size: number
        x: number
        y: number
        duration: number
        delay: number
    }>>([])

    useEffect(() => {
        // Generate particles only on client side to avoid hydration mismatch
        setParticles(
            Array.from({ length: count }, (_, i) => ({
                id: i,
                size: Math.random() * 4 + 2,
                x: Math.random() * 100,
                y: Math.random() * 100,
                duration: Math.random() * 10 + 10,
                delay: Math.random() * 5,
            }))
        )
    }, [count])

    if (particles.length === 0) return null

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full bg-primary/20 dark:bg-primary/10"
                    style={{
                        width: particle.size,
                        height: particle.size,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        animation: `float ${particle.duration}s ease-in-out infinite`,
                        animationDelay: `${particle.delay}s`,
                    }}
                />
            ))}
            <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
      `}</style>
        </div>
    )
}

