"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { userProfile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!userProfile) {
                router.push("/login");
            } else {
                // Check if user needs onboarding (missing phone)
                // AND has not skipped it in this session.
                // This ensures we ask every time they login/open the app, but not in a loop.
                const hasSkipped = sessionStorage.getItem("onboarding_skipped");

                if (!userProfile.phone && !hasSkipped) {
                    router.push("/onboarding");
                }
            }
        }
    }, [userProfile, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!userProfile) return null;

    return <>{children}</>;
}
