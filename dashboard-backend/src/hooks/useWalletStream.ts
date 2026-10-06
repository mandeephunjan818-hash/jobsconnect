import { useEffect } from 'react';

/**
 * Opens an SSE connection to /api/employer/credits/wallet-stream.
 * Calls onUpdate() the moment the server signals the wallet changed.
 * Automatically closes on unmount or when enabled=false.
 */
export function useWalletStream(
    enabled: boolean,
    onUpdate: () => void
) {
    useEffect(() => {
        if (!enabled) return;

        const es = new EventSource('/api/employer/credits/wallet-stream');

        es.addEventListener('wallet-updated', () => {
            onUpdate();
            es.close();
        });

        es.addEventListener('timeout', () => {
            // Server gave up waiting — close cleanly, no error shown
            es.close();
        });

        es.onerror = () => {
            // Network error — close silently, wallet page still works normally
            es.close();
        };

        return () => es.close();
    }, [enabled, onUpdate]);
}