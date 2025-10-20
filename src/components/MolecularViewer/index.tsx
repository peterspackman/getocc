import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import styles from './styles.module.css';

interface MolecularViewerProps {
  plyData?: string;
  xyzData?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  showControls?: boolean;
}

// Component to render PLY mesh
function PLYMesh({ plyData }: { plyData: string }) {
  const [geometry, setGeometry] = React.useState<THREE.BufferGeometry | null>(null);

  React.useEffect(() => {
    if (!plyData) return;

    const loader = new PLYLoader();

    try {
      // Parse the PLY data directly using the parse method
      const parsed = loader.parse(plyData);
      if (parsed) {
        parsed.computeVertexNormals();
        parsed.computeBoundingSphere();
        setGeometry(parsed);
      }
    } catch (error) {
      console.error('Error parsing PLY data:', error);
      setGeometry(null);
    }
  }, [plyData]);

  if (!geometry) return null;

  const center = geometry.boundingSphere?.center || new THREE.Vector3();

  return (
    <mesh geometry={geometry} position={[-center.x, -center.y, -center.z]}>
      <meshPhongMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

// Component to render atoms from XYZ data
function Atoms({ xyzData }: { xyzData: string }) {
  const atoms = useMemo(() => {
    const atomColors: { [key: string]: string } = {
      H: '#ffffff',
      C: '#909090',
      N: '#3050f8',
      O: '#ff0d0d',
      S: '#ffff30',
      P: '#ff8000',
      F: '#90e050',
      Cl: '#1ff01f',
      Br: '#a62929',
    };

    const atomRadii: { [key: string]: number } = {
      H: 0.31,
      C: 0.76,
      N: 0.71,
      O: 0.66,
      S: 1.05,
      P: 1.07,
      F: 0.57,
      Cl: 1.02,
      Br: 1.20,
    };

    const lines = xyzData.trim().split('\n');
    const nAtoms = parseInt(lines[0]);
    const atomList: Array<{
      element: string;
      position: [number, number, number];
      color: string;
      radius: number;
    }> = [];

    for (let i = 2; i < nAtoms + 2; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length < 4) continue;

      const element = parts[0];
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);

      if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

      atomList.push({
        element,
        position: [x, y, z],
        color: atomColors[element] || '#ff00ff',
        radius: atomRadii[element] || 0.5,
      });
    }

    return atomList;
  }, [xyzData]);

  return (
    <group>
      {atoms.map((atom, idx) => (
        <mesh key={idx} position={atom.position}>
          <sphereGeometry args={[atom.radius, 32, 32]} />
          <meshPhongMaterial color={atom.color} />
        </mesh>
      ))}
    </group>
  );
}

// Scene component
function Scene({ plyData, xyzData }: { plyData?: string; xyzData?: string }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 5, 5]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={50}
      />

      <ambientLight intensity={0.6} color="#404040" />
      <directionalLight position={[1, 1, 1]} intensity={0.5} />
      <directionalLight position={[-1, -1, -1]} intensity={0.3} />

      {plyData && <PLYMesh plyData={plyData} />}
      {xyzData && <Atoms xyzData={xyzData} />}
    </>
  );
}

export default function MolecularViewer({
  plyData,
  xyzData,
  width = 600,
  height = 400,
  backgroundColor = '#ffffff',
  showControls = true,
}: MolecularViewerProps): JSX.Element {
  return (
    <div className={styles.viewerContainer} style={{ width, height }}>
      <Canvas>
        <color attach="background" args={[backgroundColor]} />
        <Suspense fallback={null}>
          <Scene plyData={plyData} xyzData={xyzData} />
        </Suspense>
      </Canvas>
      {showControls && (
        <div className={styles.controls}>
          <small>
            Left-click: rotate • Right-click: pan • Scroll: zoom
          </small>
        </div>
      )}
    </div>
  );
}
