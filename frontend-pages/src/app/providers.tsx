'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/**
 * Single client boundary for session context.
 *
 * Keep this as the ONLY place `SessionProvider` is mounted. Anything that
 * calls `useSession()` / `useAuth()` (like HeaderOneClient) needs to render
 * underneath this — including static/marketing routes such as /blog. If a
 * route's layout doesn't nest under the one that renders <Providers>, its
 * pages lose session context entirely, and `useSession()` will come back
 * `undefined` there (this is what caused the /blog prerender crash).
 *
 * Usage — app/layout.tsx (root, Server Component):
 *
 *   import Providers from './Providers';
 *
 *   export default function RootLayout({ children }: { children: React.ReactNode }) {
 *     return (
 *       <html lang="en">
 *         <body>
 *           <Providers>{children}</Providers>
 *         </body>
 *       </html>
 *     );
 *   }
 *
 * The root layout itself stays a Server Component — only this wrapper is
 * 'use client'. Server Components (like a static /blog/page.tsx) can still
 * be passed in as `children`; React only needs the Provider itself to be a
 * client component, not everything beneath it.
 */
export default function Providers({ children }: { children: ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}