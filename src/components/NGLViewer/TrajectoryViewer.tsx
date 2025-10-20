import React, { useEffect, useRef, useState } from 'react';
import * as NGL from 'ngl';
import styles from './styles.module.css';

export interface TrajectoryViewerProps {
  trajectoryData: string;
  format?: 'xyz' | 'pdb' | 'gro' | 'dcd' | 'xtc';
  representation?: 'ball+stick' | 'cartoon' | 'licorice' | 'spacefill' | 'surface' | 'ribbon';
  width?: number;
  height?: number;
  backgroundColor?: string;
  autoPlay?: boolean;
  playbackSpeed?: number;
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

export default function TrajectoryViewer({
  trajectoryData,
  format = 'xyz',
  representation = 'ball+stick',
  width = 600,
  height = 400,
  backgroundColor = '#ffffff',
  autoPlay = false,
  playbackSpeed = 50,
}: TrajectoryViewerProps): JSX.Element {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<NGL.Stage | null>(null);
  const trajectoryPlayerRef = useRef<any>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Create NGL Stage
    const stage = new NGL.Stage(viewerRef.current, {
      backgroundColor: backgroundColor,
    });
    stageRef.current = stage;

    // Handle window resize
    const handleResize = () => {
      if (stageRef.current) {
        stageRef.current.handleResize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (trajectoryPlayerRef.current) {
        trajectoryPlayerRef.current.pause();
      }
      if (stageRef.current) {
        stageRef.current.dispose();
      }
    };
  }, [backgroundColor]);

  useEffect(() => {
    if (!stageRef.current || !trajectoryData) return;

    const stage = stageRef.current;

    // Clear existing components
    stage.removeAllComponents();

    // For XYZ format, we need to convert to PDB format which NGL supports
    let processedData = trajectoryData;
    let loadFormat = format;

    if (format === 'xyz') {
      try {
        processedData = convertXYZtoPDB(trajectoryData);
        loadFormat = 'pdb';
      } catch (error) {
        console.error('Error converting XYZ to PDB:', error);
        return;
      }
    }

    // Load trajectory from string data
    const blob = new Blob([processedData], { type: 'text/plain' });
    stage.loadFile(blob, { ext: loadFormat }).then((component) => {
      if (!component) return;

      // Add representation
      component.addRepresentation(representation);

      // Auto-center and zoom
      component.autoView();

      // Set up trajectory if available
      if (component.trajList && component.trajList.length > 0) {
        const trajectory = component.trajList[0];
        setTotalFrames(trajectory.numframes);

        // Create trajectory player
        const player = new NGL.TrajectoryPlayer(trajectory, {
          step: 1,
          timeout: playbackSpeed,
          mode: 'loop',
          interpolateType: 'linear',
          interpolateStep: 5,
        });

        trajectoryPlayerRef.current = player;

        // Update current frame on trajectory change
        trajectory.signals.frameChanged.add((frame: number) => {
          setCurrentFrame(frame);
        });

        if (autoPlay) {
          player.play();
        }
      }
    }).catch((error) => {
      console.error('Error loading trajectory:', error);
    });

    return () => {
      if (trajectoryPlayerRef.current) {
        trajectoryPlayerRef.current.pause();
      }
    };
  }, [trajectoryData, format, representation, playbackSpeed, autoPlay]);

  const handlePlayPause = () => {
    if (!trajectoryPlayerRef.current) return;

    if (isPlaying) {
      trajectoryPlayerRef.current.pause();
    } else {
      trajectoryPlayerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(event.target.value);
    setCurrentFrame(frame);

    if (trajectoryPlayerRef.current && trajectoryPlayerRef.current.traj) {
      trajectoryPlayerRef.current.traj.setFrame(frame);
    }
  };

  const handlePrevFrame = () => {
    if (!trajectoryPlayerRef.current || !trajectoryPlayerRef.current.traj) return;
    const newFrame = Math.max(0, currentFrame - 1);
    trajectoryPlayerRef.current.traj.setFrame(newFrame);
  };

  const handleNextFrame = () => {
    if (!trajectoryPlayerRef.current || !trajectoryPlayerRef.current.traj) return;
    const newFrame = Math.min(totalFrames - 1, currentFrame + 1);
    trajectoryPlayerRef.current.traj.setFrame(newFrame);
  };

  return (
    <div className={styles.viewerContainer} style={{ width, height }}>
      <div ref={viewerRef} className={styles.viewer} />
      <div className={styles.trajectoryControls}>
        <div className={styles.controlButtons}>
          <button onClick={handlePrevFrame} disabled={currentFrame === 0}>
            ◀
          </button>
          <button onClick={handlePlayPause}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={handleNextFrame} disabled={currentFrame >= totalFrames - 1}>
            ▶
          </button>
        </div>
        {totalFrames > 0 && (
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={currentFrame}
              onChange={handleFrameChange}
              className={styles.frameSlider}
            />
            <div className={styles.frameInfo}>
              Frame {currentFrame + 1} / {totalFrames}
            </div>
          </div>
        )}
        <div className={styles.helpText}>
          <small>Left-click: rotate • Right-click: pan • Scroll: zoom</small>
        </div>
      </div>
    </div>
  );
}
