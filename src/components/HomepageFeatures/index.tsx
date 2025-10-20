import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Quantum Chemistry & Crystal Analysis',
    description: (
      <>
        Perform DFT calculations with B3LYP, PBE, and other functionals.
        Analyze molecular orbitals, compute properties, calculate lattice energies,
        and predict crystal morphology with solvent effects.
      </>
    ),
  },
  {
    title: 'Fully Open Source',
    description: (
      <>
        OCC is completely open source and free to use.
        Powers the backend of{' '}
        <a href="https://crystalexplorer.net/" target="_blank" rel="noopener noreferrer">CrystalExplorer</a>.
        Contribute on{' '}
        <a href="https://github.com/peterspackman/occ" target="_blank" rel="noopener noreferrer">GitHub</a>,
        report issues, or extend functionality for your research needs.
      </>
    ),
  },
  {
    title: 'Available Everywhere*',
    description: (
      <>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
          <a href="https://pypi.org/project/occpy/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <img src="https://img.shields.io/pypi/v/occpy?logo=python&logoColor=white&label=PyPI&color=3776AB" alt="PyPI" />
          </a>
          <a href="https://www.npmjs.com/package/@peterspackman/occjs" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <img src="https://img.shields.io/npm/v/@peterspackman/occjs?logo=npm&logoColor=white&label=npm&color=CB3837" alt="npm" />
          </a>
        </div>
        Available as C++ library, WebAssembly, Python package, and JavaScript/TypeScript module.{' '}
        <a href="/built-with-occ">See examples →</a>
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.7 }}>
          * If your definition of everywhere is the command line, JavaScript, and Python
        </div>
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className="text--center">
          <Heading as="h3">{title}</Heading>
        </div>
        <div>{description}</div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
