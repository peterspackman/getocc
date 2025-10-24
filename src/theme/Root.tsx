import React from 'react';

// Root component - COI service worker now loaded via docusaurus.config.ts
export default function Root({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
