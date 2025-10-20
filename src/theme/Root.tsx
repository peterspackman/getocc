import React from 'react';

// Simple pass-through Root component
export default function Root({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
