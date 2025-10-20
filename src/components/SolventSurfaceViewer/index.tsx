import React, { useState, useEffect, useMemo, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { vfsManager } from '../InteractiveCommand/vfsManager';
import * as THREE from 'three';
import styles from './styles.module.css';

interface SolventSurfaceViewerProps {
  surfaceFile: string;
  height?: number;
  width?: number | string;
}

interface SurfaceData {
  cds: {
    positions: [number[], number[], number[]];
    energies: number[];
    neighbors: number[];
  };
  coulomb: {
    positions: [number[], number[], number[]];
    energies: number[];
    neighbors: number[];
  };
  atoms?: Array<{ n: number; pos: [number, number, number] }>;
}

type ColorMode = 'uniform' | 'energy' | 'neighbor';
type SurfaceMode = 'cds' | 'coulomb' | 'both';

// Van der Waals radii in Angstroms
const atomicRadii: { [key: number]: number } = {
  1: 1.20,   // H
  6: 1.70,   // C
  7: 1.55,   // N
  8: 1.52,   // O
  9: 1.47,   // F
  15: 1.80,  // P
  16: 1.80,  // S
  17: 1.75,  // Cl
  35: 1.85,  // Br
  53: 1.98,  // I
};

const atomicColors: { [key: number]: string } = {
  1: '#FFFFFF',  // H - white
  6: '#909090',  // C - gray
  7: '#3050F8',  // N - blue
  8: '#FF0D0D',  // O - red
};

function Atoms({ atoms }: {
  atoms: Array<{ n: number; pos: [number, number, number] }>;
}) {
  const BOHR_TO_ANGSTROM = 0.529177;

  return (
    <group>
      {atoms.map((atom, i) => {
        // Convert from Bohr to Angstroms
        const x = atom.pos[0] * BOHR_TO_ANGSTROM;
        const y = atom.pos[1] * BOHR_TO_ANGSTROM;
        const z = atom.pos[2] * BOHR_TO_ANGSTROM;
        // Use VDW radius in Angstroms
        const radius = atomicRadii[atom.n] || 1.5;
        const color = atomicColors[atom.n] || '#CCCCCC';

        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function PointCloud({ positions, energies, neighbors, colorMode, baseColor }: {
  positions: [number[], number[], number[]];
  energies: number[];
  neighbors: number[];
  colorMode: ColorMode;
  baseColor: [number, number, number];
}) {
  const [pointsArray, colorsArray] = useMemo(() => {
    console.log('PointCloud: Computing geometry for color mode:', colorMode);

    // Determine which values to use for coloring
    let values: number[];

    if (colorMode === 'energy') {
      values = energies;
    } else if (colorMode === 'neighbor') {
      values = neighbors;
    } else {
      // Uniform color
      values = null;
    }

    if (!positions || positions[0].length === 0) {
      console.log('PointCloud: No positions data');
      return [null, null];
    }

    console.log('PointCloud: Creating arrays for', positions[0].length, 'points');

    const points = new Float32Array(positions[0].length * 3);
    const colors = new Float32Array(positions[0].length * 3);

    // Find value range for color mapping
    let minValue = 0, maxValue = 1, valueRange = 1;
    if (values) {
      minValue = Math.min(...values);
      maxValue = Math.max(...values);
      valueRange = maxValue - minValue;
    }

    for (let i = 0; i < positions[0].length; i++) {
      // Positions - use directly in Angstroms
      points[i * 3] = positions[0][i];
      points[i * 3 + 1] = positions[1][i];
      points[i * 3 + 2] = positions[2][i];

      // Colors
      if (colorMode === 'uniform') {
        // Uniform base color
        colors[i * 3] = baseColor[0];
        colors[i * 3 + 1] = baseColor[1];
        colors[i * 3 + 2] = baseColor[2];
      } else {
        // Map value to color
        const value = values[i];
        let r, g, b;

        if (colorMode === 'neighbor') {
          // Use distinct colors for different neighbors (qualitative colormap)
          const neighborColors = [
            [0.89, 0.10, 0.11], // Red
            [0.22, 0.49, 0.72], // Blue
            [0.30, 0.69, 0.29], // Green
            [0.60, 0.31, 0.64], // Purple
            [1.00, 0.50, 0.00], // Orange
            [1.00, 1.00, 0.20], // Yellow
            [0.65, 0.34, 0.16], // Brown
            [0.97, 0.51, 0.75], // Pink
            [0.50, 0.50, 0.50], // Gray
            [0.09, 0.75, 0.81], // Cyan
          ];
          const neighborIdx = Math.floor(value) % neighborColors.length;
          r = neighborColors[neighborIdx][0];
          g = neighborColors[neighborIdx][1];
          b = neighborColors[neighborIdx][2];
        } else {
          // Use viridis colormap for energy (perceptually uniform)
          const t = valueRange > 0 ? 1.0 - (value - minValue) / valueRange : 0.5; // Reverse for blue=low, yellow=high

          // Simplified viridis approximation (reversed: blue at 0, yellow at 1)
          if (t < 0.25) {
            const t2 = t / 0.25;
            r = 0.993 * (1 - t2) + 0.478 * t2;
            g = 0.906 * (1 - t2) + 0.647 * t2;
            b = 0.144 * (1 - t2) + 0.408 * t2;
          } else if (t < 0.5) {
            const t2 = (t - 0.25) / 0.25;
            r = 0.478 * (1 - t2) + 0.164 * t2;
            g = 0.647 * (1 - t2) + 0.384 * t2;
            b = 0.408 * (1 - t2) + 0.553 * t2;
          } else if (t < 0.75) {
            const t2 = (t - 0.5) / 0.25;
            r = 0.164 * (1 - t2) + 0.282 * t2;
            g = 0.384 * (1 - t2) + 0.141 * t2;
            b = 0.553 * (1 - t2) + 0.471 * t2;
          } else {
            const t2 = (t - 0.75) / 0.25;
            r = 0.282 * (1 - t2) + 0.267 * t2;
            g = 0.141 * (1 - t2) + 0.005 * t2;
            b = 0.471 * (1 - t2) + 0.329 * t2;
          }
        }

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
    }

    console.log('PointCloud: First 3 positions:', points[0], points[1], points[2]);
    console.log('PointCloud: First 3 colors:', colors[0], colors[1], colors[2]);

    return [points, colors];
  }, [positions, energies, neighbors, colorMode, baseColor]);

  if (!pointsArray || !colorsArray) {
    console.log('PointCloud: Returning null - no arrays');
    return null;
  }

  console.log('PointCloud: Rendering with', pointsArray.length / 3, 'points');

  const geometryRef = useRef<THREE.BufferGeometry>();

  useEffect(() => {
    if (geometryRef.current && pointsArray && colorsArray) {
      console.log('PointCloud: Setting attributes on geometry');
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(pointsArray, 3));
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.attributes.color.needsUpdate = true;
      geometryRef.current.computeBoundingSphere();
      console.log('PointCloud: Attributes set, bounding sphere:', geometryRef.current.boundingSphere);
    }
  }, [pointsArray, colorsArray]);

  return (
    <points>
      <bufferGeometry ref={geometryRef} attach="geometry" />
      <shaderMaterial
        attach="material"
        vertexShader={`
          attribute vec3 color;
          varying vec3 vColor;

          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 5.0;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;

          void main() {
            // Make points circular by discarding fragments outside circle
            vec2 coord = gl_PointCoord - vec2(0.5);
            if (length(coord) > 0.5) {
              discard;
            }
            gl_FragColor = vec4(vColor, 1.0);
          }
        `}
        depthWrite={true}
      />
    </points>
  );
}

function SolventSurfaceViewerContent({
  surfaceFile,
  height = 500,
  width = '100%',
}: SolventSurfaceViewerProps): JSX.Element {
  const [surfaceData, setSurfaceData] = useState<SurfaceData | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('uniform');
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('both');
  const [showAtoms, setShowAtoms] = useState<boolean>(true);
  const [vfsVersion, setVfsVersion] = useState<number>(0);

  // Subscribe to VFS changes
  useEffect(() => {
    const unsubscribe = vfsManager.subscribe(() => {
      setVfsVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // Load file from VFS
  useEffect(() => {
    const vfsFiles = vfsManager.getFiles();
    const basePath = surfaceFile.replace('_surface.json', '');
    const baseFile = basePath.startsWith('/') ? basePath : '/' + basePath;

    console.log('SolventSurfaceViewer: Looking for files with base:', baseFile);
    console.log('SolventSurfaceViewer: Available VFS files:', Object.keys(vfsFiles));

    const cdsPath = `${baseFile}_cds.txt`;
    const coulombPath = `${baseFile}_coulomb.txt`;

    if (vfsFiles[cdsPath] && vfsFiles[coulombPath]) {
      try {
        const decoder = new TextDecoder();

        // Parse CDS file
        const cdsText = decoder.decode(vfsFiles[cdsPath]);
        const cdsLines = cdsText.trim().split('\n');
        const cdsNumPoints = parseInt(cdsLines[0]);
        const cdsX: number[] = [], cdsY: number[] = [], cdsZ: number[] = [];
        const cdsEnergies: number[] = [], cdsNeighbors: number[] = [];

        for (let i = 2; i < cdsLines.length && i < cdsNumPoints + 2; i++) {
          const parts = cdsLines[i].trim().split(/\s+/);
          if (parts.length >= 5) {
            cdsX.push(parseFloat(parts[0]));
            cdsY.push(parseFloat(parts[1]));
            cdsZ.push(parseFloat(parts[2]));
            cdsEnergies.push(parseFloat(parts[3]));
            cdsNeighbors.push(parseInt(parts[4]));
          }
        }

        // Parse Coulomb file
        const coulombText = decoder.decode(vfsFiles[coulombPath]);
        const coulombLines = coulombText.trim().split('\n');
        const coulombNumPoints = parseInt(coulombLines[0]);
        const coulombX: number[] = [], coulombY: number[] = [], coulombZ: number[] = [];
        const coulombEnergies: number[] = [], coulombNeighbors: number[] = [];

        for (let i = 2; i < coulombLines.length && i < coulombNumPoints + 2; i++) {
          const parts = coulombLines[i].trim().split(/\s+/);
          if (parts.length >= 5) {
            coulombX.push(parseFloat(parts[0]));
            coulombY.push(parseFloat(parts[1]));
            coulombZ.push(parseFloat(parts[2]));
            coulombEnergies.push(parseFloat(parts[3]));
            coulombNeighbors.push(parseInt(parts[4]));
          }
        }

        console.log('SolventSurfaceViewer: Loaded', cdsX.length, 'CDS points');
        console.log('SolventSurfaceViewer: Loaded', coulombX.length, 'Coulomb points');

        // Try to load atoms from the wavefunction file
        let atoms = undefined;
        const wfPath = `${baseFile}.owf.json`;
        if (vfsFiles[wfPath]) {
          try {
            const wfText = decoder.decode(vfsFiles[wfPath]);
            const wfData = JSON.parse(wfText);
            if (wfData.atoms) {
              atoms = wfData.atoms;
              console.log('SolventSurfaceViewer: Loaded', atoms.length, 'atoms from wavefunction');
            }
          } catch (e) {
            console.warn('SolventSurfaceViewer: Could not load atoms:', e);
          }
        }

        setSurfaceData({
          cds: {
            positions: [cdsX, cdsY, cdsZ],
            energies: cdsEnergies,
            neighbors: cdsNeighbors,
          },
          coulomb: {
            positions: [coulombX, coulombY, coulombZ],
            energies: coulombEnergies,
            neighbors: coulombNeighbors,
          },
          atoms,
        });
        console.log('SolventSurfaceViewer: Surface data loaded successfully');
      } catch (e) {
        console.error('Error loading surface data:', e);
      }
    } else {
      console.log('SolventSurfaceViewer: Text files not found in VFS');
    }
  }, [surfaceFile, vfsVersion]);

  const hasData = surfaceData !== null;

  return (
    <div className={styles.container} style={{ width, height }}>
      <div className={styles.header}>
        <div className={styles.title}>Solvent Accessible Surface</div>
        <div className={styles.controls}>
          <button
            className={`${styles.modeButton} ${surfaceMode === 'cds' ? styles.modeButtonActive : ''}`}
            onClick={() => setSurfaceMode('cds')}
            disabled={!hasData}
          >
            CDS
          </button>
          <button
            className={`${styles.modeButton} ${surfaceMode === 'coulomb' ? styles.modeButtonActive : ''}`}
            onClick={() => setSurfaceMode('coulomb')}
            disabled={!hasData}
          >
            Coulomb
          </button>
          <button
            className={`${styles.modeButton} ${surfaceMode === 'both' ? styles.modeButtonActive : ''}`}
            onClick={() => setSurfaceMode('both')}
            disabled={!hasData}
          >
            Both
          </button>
          <span style={{ margin: '0 0.5rem', color: 'var(--ifm-color-emphasis-500)' }}>|</span>
          <button
            className={`${styles.modeButton} ${colorMode === 'uniform' ? styles.modeButtonActive : ''}`}
            onClick={() => setColorMode('uniform')}
            disabled={!hasData}
          >
            Uniform
          </button>
          <button
            className={`${styles.modeButton} ${colorMode === 'energy' ? styles.modeButtonActive : ''}`}
            onClick={() => setColorMode('energy')}
            disabled={!hasData}
          >
            Energy
          </button>
          <button
            className={`${styles.modeButton} ${colorMode === 'neighbor' ? styles.modeButtonActive : ''}`}
            onClick={() => setColorMode('neighbor')}
            disabled={!hasData}
          >
            Neighbor
          </button>
          <span style={{ margin: '0 0.5rem', color: 'var(--ifm-color-emphasis-500)' }}>|</span>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showAtoms}
              onChange={(e) => setShowAtoms(e.target.checked)}
              disabled={!hasData || !surfaceData?.atoms}
            />
            <span style={{ marginLeft: '0.4rem' }}>Show Atoms</span>
          </label>
        </div>
      </div>
      <div className={styles.viewerWrapper}>
        {hasData ? (
          <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
            <OrbitControls enableDamping dampingFactor={0.05} target={[0, 0, 0]} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />
            <directionalLight position={[-10, -10, -5]} intensity={0.4} />
            <axesHelper args={[5]} />
            {showAtoms && surfaceData.atoms && (
              <Atoms atoms={surfaceData.atoms} />
            )}
            {(surfaceMode === 'cds' || surfaceMode === 'both') && (
              <PointCloud
                positions={surfaceData.cds.positions}
                energies={surfaceData.cds.energies}
                neighbors={surfaceData.cds.neighbors}
                colorMode={colorMode}
                baseColor={[0.0, 0.5, 1.0]} // Vibrant blue for CDS
              />
            )}
            {(surfaceMode === 'coulomb' || surfaceMode === 'both') && (
              <PointCloud
                positions={surfaceData.coulomb.positions}
                energies={surfaceData.coulomb.energies}
                neighbors={surfaceData.coulomb.neighbors}
                colorMode={colorMode}
                baseColor={[1.0, 0.35, 0.0]} // Vibrant orange for Coulomb
              />
            )}
          </Canvas>
        ) : (
          <div className={styles.placeholder}>
            Run the crystal growth calculations above to visualize the solvent surface
          </div>
        )}
      </div>
    </div>
  );
}

export default function SolventSurfaceViewer(props: SolventSurfaceViewerProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading viewer...</div>}>
      {() => <SolventSurfaceViewerContent {...props} />}
    </BrowserOnly>
  );
}
