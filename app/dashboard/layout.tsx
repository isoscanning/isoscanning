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
                // Check for onboarding
                // We check if cpf, phone or username are missing
                if (!userProfile.cpf || !userProfile.phone || !userProfile.username) {
                    // Prevent infinite redirect if we were to use this layout for onboarding (which we don't, onboarding is at /onboarding)
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
