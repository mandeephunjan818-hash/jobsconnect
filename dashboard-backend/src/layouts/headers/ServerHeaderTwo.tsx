'use client'
// src/layouts/headers/HeaderTwo.tsx
import { Suspense } from "react";
import HeaderClientWrapper from "./HeaderClientWrapper";
import AuthSection from "./AuthSection";
import AuthFallback from "./AuthFallback"; // optional, see step 5

export default function HeaderTwo() {
    return (
        <HeaderClientWrapper>
            {
                ({ isOpen }: any) => (
                    <Suspense fallback={<AuthFallback />}>
                        <AuthSection />
                    </Suspense>
                )
            }
        </HeaderClientWrapper>
    );
}