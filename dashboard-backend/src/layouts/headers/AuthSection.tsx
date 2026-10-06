// src/layouts/headers/AuthSection.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AuthButtonClient from "./AuthButtonClient";

export default async function AuthSection() {
    const session = await getServerSession(authOptions);
    return <AuthButtonClient session={session} />;
}