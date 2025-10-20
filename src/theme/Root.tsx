import React, { useEffect } from 'react';

// Root component with COI service worker
export default function Root({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load COI service worker only on client side
    const script = document.createElement('script');
    script.src = '/coi-serviceworker.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return <>{children}</>;
}
