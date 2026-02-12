"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

interface AuthAwareLinkProps {
    href: string;
    authenticatedHref?: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * A link component that checks authentication state before navigating.
 * - If user is logged in: navigates to `authenticatedHref` (defaults to /dashboard)
 * - If user is logged out: navigates to `href` (e.g., /cadastro, /login)
 * 
 * This prevents logged-in users from being sent to signup pages.
 */
export function AuthAwareLink({
    href,
    authenticatedHref = "/dashboard",
    children,
    className,
    onClick,
}: AuthAwareLinkProps) {
    const { userProfile, loading } = useAuth();
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        // Call custom onClick if provided
        if (onClick) {
            onClick();
        }

        // Wait for auth context to finish loading before deciding
        if (loading) {
            // Show a brief loading state, then navigate once loaded
            return;
        }

        // If user is authenticated, go to dashboard (or custom authenticated route)
        if (userProfile) {
            router.push(authenticatedHref);
        } else {
            // User is not authenticated, proceed to target (signup/login)
            router.push(href);
        }
    };

    return (
        <a
            href={href}
            onClick={handleClick}
            className={className}
            style={{ cursor: loading ? "wait" : "pointer" }}
        >
            {children}
        </a>
    );
}
