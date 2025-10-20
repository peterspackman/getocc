import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import InteractiveCommand from '@site/src/components/InteractiveCommand';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  const waterXYZ = `3

O 0.0000000 0.0000000 0.1192419
H 0.0000000 0.7632609 -0.4769676
H 0.0000000 -0.7632609 -0.4769676`;

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={styles.heroContainer}>
        <div className={styles.heroLeft}>
          <ThemedImage
            sources={{
              light: useBaseUrl('/img/occ_light.png'),
              dark: useBaseUrl('/img/occ_dark.png'),
            }}
            alt="Open Computational Chemistry"
            className={styles.heroLogo}
          />
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/intro">
              Get Started with Tutorials
            </Link>
            <Link
              className="button button--primary button--lg"
              to="https://peterspackman.github.io/occ/"
              target="_blank"
              rel="noopener noreferrer">
              C++ API Documentation
            </Link>
          </div>
        </div>
        <div className={styles.heroRight}>
          <Heading as="h2" className={styles.demoTitle}>
            Real Quantum Chemistry calculations in the browser!
          </Heading>
          <InteractiveCommand
            command="occ scf water.xyz wb97x def2-svp -o fchk"
            inputFiles={{
              'water.xyz': waterXYZ
            }}
            expectedOutputs={['water.owf.fchk']}
            maxHeight="400px"
          />
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Open Computational Chemistry - Quantum chemistry calculations in your browser">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
