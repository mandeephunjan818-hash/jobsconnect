"use client";

import dynamic from "next/dynamic";

const AuthButton = dynamic(() => import("./AuthButton"), {
    ssr: false,
});

// 1. Define the interface for the props the component receives
interface AuthButtonWrapperProps {
    isOpen: boolean;
}

// 2. Apply the interface to the component arguments
export default function AuthButtonWrapper({ isOpen }: AuthButtonWrapperProps) {
    // You can now use isOpen or toggleMenu here or pass them to AuthButton
    return <AuthButton
        isOpen={isOpen}
    />;
}
