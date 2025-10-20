import React, { useEffect } from 'react';
import Head from '@docusaurus/Head';

// Root component with COI service worker
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <script src="/coi-serviceworker.js" />
      </Head>
      {children}
    </>
  );
}
