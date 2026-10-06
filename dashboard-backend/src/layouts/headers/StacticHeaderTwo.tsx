'use client'
// src/layouts/headers/StaticHeaderTwo.tsx
import HeaderClientWrapper from "./HeaderClientWrapper";
import AuthButtonWrapper from "./AuthButtonWrapper";

export default function StaticHeaderTwo() {
    return (
        <HeaderClientWrapper>
            {
                ({ isOpen }: any) => (
                    <AuthButtonWrapper
                        isOpen={isOpen}
                    />
                )
            }
        </HeaderClientWrapper>
    );
}