// src/components/auth/AuthLogoClient.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

interface AuthLogoClientProps {
    logoUrl?: string;
    logoAlt?: string;
    theme?: 'light' | 'dark'; // 'light' = dark text (auth pages), 'dark' = white text (admin card)
}

export default function AuthLogoClient({ logoUrl, logoAlt, theme = 'light' }: AuthLogoClientProps) {
    return (
        <Link href="/" className="d-inline-block text-decoration-none">
            {logoUrl ? (
                <Image
                    src={logoUrl}
                    alt={logoAlt || 'Logo'}
                    width={160}
                    height={48}
                    style={{
                        objectFit: 'contain',
                        objectPosition: 'left center',
                        maxWidth: '140px',
                        maxHeight: '70px',
                        width: 'auto',
                        height: 'auto',
                    }}
                    unoptimized={logoUrl.startsWith('http')}
                    priority
                />
            ) : (
                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                    <div
                        className="rounded text-white fw-bold logo-icon-bg-colour d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '36px', height: '36px', fontSize: '1rem' }}
                    >
                        JC
                    </div>
                    <p
                        className="mb-0 fw-semibold"
                        style={{
                            fontSize: '1rem',
                            whiteSpace: 'nowrap',
                            color: theme === 'light' ? '#1a1a1a' : '#ffffff',
                        }}
                    >
                        Jobs<span className="logo-text-colour"> Connect</span>
                    </p>
                </div>
            )}
        </Link>
    );
}