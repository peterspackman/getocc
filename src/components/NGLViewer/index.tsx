import React, { useEffect, useRef, useState } from 'react';
import * as NGL from 'ngl';
import styles from './styles.module.css';

export interface NGLViewerProps {
  data: string;
  cubeData?: string; // Optional cube file data to overlay on the molecule
  format?: 'pdb' | 'cif' | 'xyz' | 'mol2' | 'sdf' | 'gro' | 'cube';
  representation?: 'ball+stick' | 'cartoon' | 'licorice' | 'spacefill' | 'surface' | 'ribbon';
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  showControls?: boolean;
  // Cube file specific options
  cubeIsovalue?: number;
  cubeColor?: string;
  cubeOpacity?: number;
  showMolecule?: boolean; // For cube files, whether to also show the molecular structure
}

// Parse cube file grid boundaries
function parseCubeBoundaries(cubeData: string): { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number } | null {
  try {
    const lines = cubeData.trim().split('\n');
    if (lines.length < 6) return null;

    // Line 2: N_atoms, origin_x, origin_y, origin_z
    const atomLine = lines[2].trim().split(/\s+/);
    const originX = parseFloat(atomLine[1]);
    const originY = parseFloat(atomLine[2]);
    const originZ = parseFloat(atomLine[3]);

    // Lines 3-5: grid dimensions and vectors
    const xLine = lines[3].trim().split(/\s+/);
    const yLine = lines[4].trim().split(/\s+/);
    const zLine = lines[5].trim().split(/\s+/);

    const nx = parseInt(xLine[0]);
    const ny = parseInt(yLine[0]);
    const nz = parseInt(zLine[0]);

    const voxelX = parseFloat(xLine[1]);
    const voxelY = parseFloat(yLine[2]);
    const voxelZ = parseFloat(zLine[3]);

    // Cube files use bohr units, convert to angstrom for NGL
    const bohrToAngstrom = 0.529177;

    // Calculate boundaries
    return {
      xMin: originX * bohrToAngstrom,
      xMax: (originX + (nx - 1) * voxelX) * bohrToAngstrom,
      yMin: originY * bohrToAngstrom,
      yMax: (originY + (ny - 1) * voxelY) * bohrToAngstrom,
      zMin: originZ * bohrToAngstrom,
      zMax: (originZ + (nz - 1) * voxelZ) * bohrToAngstrom,
    };
  } catch (error) {
    console.error('Error parsing cube boundaries:', error);
    return null;
  }
}

// Parse cube file to extract min/max values
function parseCubeMinMax(cubeData: string): { min: number; max: number } {
  const lines = cubeData.trim().split('\n');

  if (lines.length < 6) {
    return { min: 0.00001, max: 0.5 }; // Fallback
  }

  // Skip header (2 comment lines + 1 atom count line + 3 grid lines)
  // Then skip atom lines
  const numAtomsLine = lines[2].trim().split(/\s+/);
  const numAtoms = Math.abs(parseInt(numAtomsLine[0]));

  // Data starts after header (6 lines) + atom lines
  const dataStartLine = 6 + numAtoms;

  let min = Infinity;
  let max = -Infinity;

  // Parse all data values
  for (let i = dataStartLine; i < lines.length; i++) {
    const values = lines[i].trim().split(/\s+/);
    for (const val of values) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        if (num < min) min = num;
        if (num > max) max = num;
      }
    }
  }

  // Return reasonable defaults if parsing failed
  if (!isFinite(min) || !isFinite(max)) {
    return { min: 0.00001, max: 0.5 };
  }

  // Add some padding for better range
  const range = max - min;
  let adjustedMin = min - range * 0.1;
  let adjustedMax = max + range * 0.1;

  // For positive-only values (like density), ensure min is positive
  if (min >= 0) {
    adjustedMin = Math.max(0.00001, adjustedMin);
  } else {
    // Clamp min to -1.0 to keep reasonable range
    adjustedMin = Math.max(-1.0, adjustedMin);
  }

  // Clamp max to 1.0 to keep reasonable range
  adjustedMax = Math.min(1.0, adjustedMax);

  return {
    min: adjustedMin,
    max: adjustedMax
  };
}

// Convert CIF format to PDB format for NGL (basic conversion - asymmetric unit only)
function convertCIFtoPDB(cifData: string): string {
  const lines = cifData.trim().split('\n');

  // Parse unit cell parameters
  let a = 1, b = 1, c = 1, alpha = 90, beta = 90, gamma = 90;
  const atoms: { label: string; element: string; x: number; y: number; z: number }[] = [];

  let inAtomLoop = false;
  let labelIdx = -1, typeIdx = -1, xIdx = -1, yIdx = -1, zIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse cell parameters
    if (line.startsWith('_cell_length_a')) {
      a = parseFloat(line.split(/\s+/)[1]);
    } else if (line.startsWith('_cell_length_b')) {
      b = parseFloat(line.split(/\s+/)[1]);
    } else if (line.startsWith('_cell_length_c')) {
      c = parseFloat(line.split(/\s+/)[1]);
    } else if (line.startsWith('_cell_angle_alpha')) {
      alpha = parseFloat(line.split(/\s+/)[1]);
    } else if (line.startsWith('_cell_angle_beta')) {
      beta = parseFloat(line.split(/\s+/)[1]);
    } else if (line.startsWith('_cell_angle_gamma')) {
      gamma = parseFloat(line.split(/\s+/)[1]);
    }

    // Detect atom site loop
    if (line.startsWith('_atom_site_label')) {
      inAtomLoop = true;
      labelIdx = 0;
    } else if (inAtomLoop && line.startsWith('_atom_site_')) {
      if (line.includes('_atom_site_type_symbol')) typeIdx = line.split(/\s+/).length - 1;
      else if (line.includes('_atom_site_fract_x')) xIdx = line.split(/\s+/).length - 1;
      else if (line.includes('_atom_site_fract_y')) yIdx = line.split(/\s+/).length - 1;
      else if (line.includes('_atom_site_fract_z')) zIdx = line.split(/\s+/).length - 1;
    } else if (inAtomLoop && !line.startsWith('_') && !line.startsWith('loop_') && line.length > 0) {
      // Parse atom line
      const parts = line.split(/\s+/);
      if (parts.length >= 5) {
        const label = parts[0];
        const element = parts[1];
        const xFrac = parseFloat(parts[2]);
        const yFrac = parseFloat(parts[3]);
        const zFrac = parseFloat(parts[4]);

        // Convert fractional to Cartesian (simplified - orthogonal cells only)
        const x = xFrac * a;
        const y = yFrac * b;
        const z = zFrac * c;

        atoms.push({ label, element, x, y, z });
      }
    }
  }

  if (atoms.length === 0) {
    throw new Error('No atoms found in CIF file');
  }

  // Generate PDB format
  let pdbLines: string[] = [];
  pdbLines.push('REMARK   CIF file converted to PDB (asymmetric unit only)');
  pdbLines.push(`CRYST1${a.toFixed(3).padStart(9)}${b.toFixed(3).padStart(9)}${c.toFixed(3).padStart(9)}${alpha.toFixed(2).padStart(7)}${beta.toFixed(2).padStart(7)}${gamma.toFixed(2).padStart(7)} P 1           1`);

  atoms.forEach((atom, i) => {
    const serial = (i + 1).toString().padStart(5);
    const atomName = atom.element.padEnd(4);
    const resName = 'MOL'.padEnd(3);
    const chainID = 'A';
    const resSeq = '1'.padStart(4);
    const xStr = atom.x.toFixed(3).padStart(8);
    const yStr = atom.y.toFixed(3).padStart(8);
    const zStr = atom.z.toFixed(3).padStart(8);
    const occupancy = '1.00';
    const tempFactor = '0.00'.padStart(6);
    const elementPadded = atom.element.padStart(12);

    pdbLines.push(
      `ATOM  ${serial} ${atomName} ${resName} ${chainID}${resSeq}    ${xStr}${yStr}${zStr}  ${occupancy}${tempFactor}${elementPadded}`
    );
  });

  pdbLines.push('END');
  return pdbLines.join('\n');
}

// Convert XYZ format to PDB format for NGL
function convertXYZtoPDB(xyzData: string): string {
  const lines = xyzData.trim().split('\n');

  if (lines.length < 3) {
    throw new Error('Invalid XYZ file: too few lines');
  }

  const numAtoms = parseInt(lines[0]);
  if (isNaN(numAtoms)) {
    throw new Error('Invalid XYZ file: first line must be number of atoms');
  }

  let pdbLines: string[] = [];
  pdbLines.push('REMARK   XYZ file converted to PDB');
  pdbLines.push(`REMARK   ${lines[1]}`); // Comment line

  // Parse atoms starting from line 3 (index 2)
  for (let i = 0; i < numAtoms && i + 2 < lines.length; i++) {
    const line = lines[i + 2].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;

    const element = parts[0];
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);

    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    // PDB ATOM record format
    // ATOM serial name altLoc resName chainID resSeq iCode x y z occupancy tempFactor element charge
    const serial = (i + 1).toString().padStart(5);
    const atomName = element.padEnd(4);
    const resName = 'MOL'.padEnd(3);
    const chainID = 'A';
    const resSeq = '1'.padStart(4);
    const xStr = x.toFixed(3).padStart(8);
    const yStr = y.toFixed(3).padStart(8);
    const zStr = z.toFixed(3).padStart(8);
    const occupancy = '1.00';
    const tempFactor = '0.00'.padStart(6);
    const elementPadded = element.padStart(12);

    pdbLines.push(
      `ATOM  ${serial} ${atomName} ${resName} ${chainID}${resSeq}    ${xStr}${yStr}${zStr}  ${occupancy}${tempFactor}${elementPadded}`
    );
  }

  pdbLines.push('END');
  return pdbLines.join('\n');
}

export default function NGLViewer({
  data,
  cubeData,
  format = 'xyz',
  representation = 'ball+stick',
  width,
  height,
  backgroundColor = '#ffffff',
  showControls = true,
  cubeIsovalue = 0.002,
  cubeColor = '#4169e1',
  cubeOpacity = 0.8,
  showMolecule = true,
}: NGLViewerProps): JSX.Element {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<NGL.Stage | null>(null);
  const componentRef = useRef<NGL.Component | null>(null);
  const surfaceRepRef = useRef<any>(null);
  const boxRepRef = useRef<any>(null);
  const [currentIsovalue, setCurrentIsovalue] = useState(cubeIsovalue);
  const [minValue, setMinValue] = useState(0.00001);
  const [maxValue, setMaxValue] = useState(0.5);
  const [showOptions, setShowOptions] = useState(false);
  const [showCubeBounds, setShowCubeBounds] = useState(false);
  const [cubeBounds, setCubeBounds] = useState<{ xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number } | null>(null);

  // Get theme-aware background color
  const getBackgroundColor = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? '#1b1b1d' : backgroundColor;
  };

  useEffect(() => {
    if (!viewerRef.current) return;

    // Create NGL Stage
    const stage = new NGL.Stage(viewerRef.current, {
      backgroundColor: getBackgroundColor(),
    });
    stageRef.current = stage;

    // Handle window resize
    const handleResize = () => {
      if (stageRef.current) {
        stageRef.current.handleResize();
      }
    };
    window.addEventListener('resize', handleResize);

    // Listen for theme changes
    const handleThemeChange = () => {
      if (stageRef.current) {
        stageRef.current.setParameters({ backgroundColor: getBackgroundColor() });
      }
    };

    // Use MutationObserver to watch for theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (stageRef.current) {
        stageRef.current.dispose();
      }
    };
  }, [backgroundColor]);

  useEffect(() => {
    if (!stageRef.current || !data) return;

    const stage = stageRef.current;

    // Clear existing components
    stage.removeAllComponents();
    surfaceRepRef.current = null;
    componentRef.current = null;

    // Handle cube files differently
    if (format === 'cube') {
      // Parse cube file to get value range and boundaries
      const { min, max } = parseCubeMinMax(data);
      setMinValue(min);
      setMaxValue(max);

      const bounds = parseCubeBoundaries(data);
      setCubeBounds(bounds);

      const blob = new Blob([data], { type: 'text/plain' });
      stage.loadFile(blob, { ext: 'cube' }).then((component) => {
        if (!component) return;

        // Store component reference for later updates
        componentRef.current = component;

        // Add surface representation for the volume data
        const surfaceRep = component.addRepresentation('surface', {
          color: cubeColor,
          opacity: cubeOpacity,
          isolevel: currentIsovalue,
          isolevelType: 'value',
          smooth: 1,
        });
        surfaceRepRef.current = surfaceRep;

        // Optionally show the molecular structure from the cube file
        if (showMolecule) {
          component.addRepresentation('ball+stick', {
            sele: '*', // Select all atoms from cube file header
          });
        }

        // Auto-center and zoom
        component.autoView();
      }).catch((error) => {
        console.error('Error loading cube file:', error);
      });
    } else {
      // Handle other molecular formats
      let processedData = data;
      let loadFormat = format;

      if (format === 'xyz') {
        try {
          processedData = convertXYZtoPDB(data);
          loadFormat = 'pdb';
        } catch (error) {
          console.error('Error converting XYZ to PDB:', error);
          return;
        }
      } else if (format === 'cif') {
        try {
          processedData = convertCIFtoPDB(data);
          loadFormat = 'pdb';
        } catch (error) {
          console.error('Error converting CIF to PDB:', error);
          return;
        }
      }

      // Load structure from string data
      const blob = new Blob([processedData], { type: 'text/plain' });
      stage.loadFile(blob, { ext: loadFormat }).then((component) => {
        if (!component) return;

        // Add representation
        component.addRepresentation(representation);

        // Auto-center and zoom
        component.autoView();

        // If cubeData is provided, load it as an overlay
        if (cubeData) {
          // Parse cube file to get value range and boundaries
          const { min, max } = parseCubeMinMax(cubeData);
          setMinValue(min);
          setMaxValue(max);

          const bounds = parseCubeBoundaries(cubeData);
          setCubeBounds(bounds);

          const cubeBlob = new Blob([cubeData], { type: 'text/plain' });
          stage.loadFile(cubeBlob, { ext: 'cube' }).then((cubeComponent) => {
            if (!cubeComponent) return;

            // Store cube component reference for later updates
            componentRef.current = cubeComponent;

            // Add surface representation for the volume data
            const surfaceRep = cubeComponent.addRepresentation('surface', {
              color: cubeColor,
              opacity: cubeOpacity,
              isolevel: currentIsovalue,
              isolevelType: 'value',
              smooth: 1,
            });
            surfaceRepRef.current = surfaceRep;

            // Auto-center and zoom to show both
            stage.autoView();
          }).catch((error) => {
            console.error('Error loading cube overlay:', error);
          });
        }
      }).catch((error) => {
        console.error('Error loading structure:', error);
      });
    }
  }, [data, cubeData, format, representation, cubeIsovalue, cubeColor, cubeOpacity, showMolecule]);

  const handleIsovalueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setCurrentIsovalue(newValue);

    // Update the surface representation isolevel directly
    if (surfaceRepRef.current) {
      surfaceRepRef.current.setParameters({ isolevel: newValue });
    }
  };

  // Handle showing/hiding cube boundaries
  useEffect(() => {
    if (!stageRef.current || !cubeBounds) return;

    // Clean up previous box if it exists
    if (boxRepRef.current) {
      try {
        const parentComp = boxRepRef.current.parent;
        if (parentComp) {
          stageRef.current.removeComponent(parentComp);
        }
        boxRepRef.current = null;
      } catch (error) {
        console.warn('Error removing previous box:', error);
      }
    }

    if (showCubeBounds) {
      try {
        // Create a shape to draw the bounding box
        const shape = new NGL.Shape('cube-bounds');
        const { xMin, xMax, yMin, yMax, zMin, zMax } = cubeBounds;

        // Draw edges of the box
        const color = [0.5, 0.5, 0.5]; // grey
        const radius = 0.02;

        // Bottom face
        shape.addCylinder([xMin, yMin, zMin], [xMax, yMin, zMin], color, radius);
        shape.addCylinder([xMax, yMin, zMin], [xMax, yMax, zMin], color, radius);
        shape.addCylinder([xMax, yMax, zMin], [xMin, yMax, zMin], color, radius);
        shape.addCylinder([xMin, yMax, zMin], [xMin, yMin, zMin], color, radius);

        // Top face
        shape.addCylinder([xMin, yMin, zMax], [xMax, yMin, zMax], color, radius);
        shape.addCylinder([xMax, yMin, zMax], [xMax, yMax, zMax], color, radius);
        shape.addCylinder([xMax, yMax, zMax], [xMin, yMax, zMax], color, radius);
        shape.addCylinder([xMin, yMax, zMax], [xMin, yMin, zMax], color, radius);

        // Vertical edges
        shape.addCylinder([xMin, yMin, zMin], [xMin, yMin, zMax], color, radius);
        shape.addCylinder([xMax, yMin, zMin], [xMax, yMin, zMax], color, radius);
        shape.addCylinder([xMax, yMax, zMin], [xMax, yMax, zMax], color, radius);
        shape.addCylinder([xMin, yMax, zMin], [xMin, yMax, zMax], color, radius);

        const shapeComp = stageRef.current.addComponentFromObject(shape);
        const boxRep = shapeComp.addRepresentation('buffer');
        boxRepRef.current = boxRep;
      } catch (error) {
        console.error('Could not show cube boundaries:', error);
      }
    }
  }, [showCubeBounds, cubeBounds]);

  return (
    <div
      className={styles.viewerContainer}
      style={{
        width,
        height: height || undefined,
        minHeight: height ? undefined : 400
      }}
    >
      <div ref={viewerRef} className={styles.viewer} />
      {(format === 'cube' || cubeData) && (
        <>
          <div className={styles.cubeControls}>
            <label className={styles.sliderLabel}>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Isovalue:</span>
              <strong>{currentIsovalue.toExponential(2)}</strong>
              <input
                type="range"
                min={minValue}
                max={maxValue}
                step={(maxValue - minValue) / 1000}
                value={currentIsovalue}
                onChange={handleIsovalueChange}
                className={styles.slider}
              />
            </label>
            <button
              className={styles.optionsButton}
              onClick={() => setShowOptions(!showOptions)}
              title="Options"
            >
              ⋮
            </button>
          </div>
          {showOptions && (
            <div className={styles.optionsPanel}>
              <div className={styles.optionItem}>
                <label>
                  <input
                    type="checkbox"
                    checked={showCubeBounds}
                    onChange={(e) => setShowCubeBounds(e.target.checked)}
                  />
                  <span>Show cube boundaries</span>
                </label>
              </div>
              <div className={styles.optionItem} style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--ifm-color-emphasis-200)' }}>
                Range: {minValue.toExponential(2)} to {maxValue.toExponential(2)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
