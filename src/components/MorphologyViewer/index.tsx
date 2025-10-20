import React, { useState, useEffect, Suspense } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Grid } from '@react-three/drei';
import { vfsManager } from '../InteractiveCommand/vfsManager';
import styles from './styles.module.css';

interface MorphologyViewerProps {
  vacuumFile: string;
  solvatedFile: string;
  height?: number;
  width?: number | string;
}

function PLYModel({ data, color }: { data: Uint8Array; color: string }) {
  const [geometry, setGeometry] = useState(null);
  const meshRef = React.useRef();

  useEffect(() => {
    Promise.all([
      import('three/examples/jsm/loaders/PLYLoader'),
      import('three')
    ]).then(([{ PLYLoader }, THREE]) => {
      const loader = new PLYLoader();
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);

      loader.load(url, (geo) => {
        // Center and scale the geometry
        geo.computeBoundingBox();
        const center = geo.boundingBox.getCenter(new THREE.Vector3());
        geo.translate(-center.x, -center.y, -center.z);

        // Scale to fit in view (make it reasonably sized)
        const size = geo.boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim; // Scale to about 4 units
        geo.scale(scale, scale, scale);

        setGeometry(geo);
        URL.revokeObjectURL(url);
      });
    });
  }, [data]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color={color} flatShading metalness={0.1} roughness={0.6} />
    </mesh>
  );
}

function MorphologyViewerContent({
  vacuumFile,
  solvatedFile,
  height = 500,
  width = '100%',
}: MorphologyViewerProps): JSX.Element {
  const [mode, setMode] = useState<'vacuum' | 'solvated'>('vacuum');
  const [vacuumData, setVacuumData] = useState<Uint8Array | null>(null);
  const [solvatedData, setSolvatedData] = useState<Uint8Array | null>(null);
  const [vfsVersion, setVfsVersion] = useState<number>(0);

  // Subscribe to VFS changes
  useEffect(() => {
    const unsubscribe = vfsManager.subscribe(() => {
      setVfsVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // Load files from VFS
  useEffect(() => {
    const vfsFiles = vfsManager.getFiles();

    const vacPath = vacuumFile.startsWith('/') ? vacuumFile : '/' + vacuumFile;
    const solvPath = solvatedFile.startsWith('/') ? solvatedFile : '/' + solvatedFile;

    if (vfsFiles[vacPath]) {
      setVacuumData(vfsFiles[vacPath]);
    }

    if (vfsFiles[solvPath]) {
      setSolvatedData(vfsFiles[solvPath]);
    }
  }, [vacuumFile, solvatedFile, vfsVersion]);

  const currentData = mode === 'vacuum' ? vacuumData : solvatedData;
  const currentColor = mode === 'vacuum' ? '#ff8c42' : '#4a90e2'; // orange for vacuum, blue for solvated
  const hasData = currentData !== null;

  return (
    <div className={styles.container} style={{ width, height }}>
      <div className={styles.header}>
        <div className={styles.title}>Crystal Morphology</div>
        <div className={styles.controls}>
          <button
            className={`${styles.modeButton} ${mode === 'vacuum' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('vacuum')}
            disabled={!vacuumData}
          >
            Vacuum
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'solvated' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('solvated')}
            disabled={!solvatedData}
          >
            Water
          </button>
        </div>
      </div>
      <div className={styles.viewerWrapper}>
        {hasData ? (
          <Canvas>
            <OrthographicCamera makeDefault position={[7, 7, 7]} zoom={100} />
            <OrbitControls enableDamping dampingFactor={0.05} target={[0, 0, 0]} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={1.2} />
            <directionalLight position={[-10, -10, -5]} intensity={0.6} />
            <directionalLight position={[0, 10, 0]} intensity={0.4} />
            <axesHelper args={[5]} />
            <Suspense fallback={null}>
              <PLYModel data={currentData} color={currentColor} />
            </Suspense>
          </Canvas>
        ) : (
          <div className={styles.placeholder}>
            Run the crystal growth calculations above to visualize morphologies
          </div>
        )}
      </div>
    </div>
  );
}

export default function MorphologyViewer(props: MorphologyViewerProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading viewer...</div>}>
      {() => <MorphologyViewerContent {...props} />}
    </BrowserOnly>
  );
}
