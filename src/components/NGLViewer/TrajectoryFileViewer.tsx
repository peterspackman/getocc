import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import TrajectoryViewer from './TrajectoryViewer';
import { vfsManager } from '../InteractiveCommand/vfsManager';

interface TrajectoryFileViewerProps {
  file: string;
  format?: 'xyz' | 'pdb' | 'gro' | 'dcd' | 'xtc';
  representation?: 'ball+stick' | 'cartoon' | 'licorice' | 'spacefill' | 'surface' | 'ribbon';
  width?: number;
  height?: number;
  backgroundColor?: string;
  autoPlay?: boolean;
  playbackSpeed?: number;
}

function TrajectoryFileViewerContent({
  file,
  format = 'xyz',
  representation = 'ball+stick',
  width = 600,
  height = 400,
  backgroundColor = '#ffffff',
  autoPlay = false,
  playbackSpeed = 50,
}: TrajectoryFileViewerProps): JSX.Element {
  const [data, setData] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadFile = () => {
      try {
        const files = vfsManager.getFiles();
        const filePath = file.startsWith('/') ? file : '/' + file;
        const fileContent = files[filePath];

        if (fileContent) {
          const decoder = new TextDecoder();
          setData(decoder.decode(fileContent));
          setError('');
        } else {
          setError(`File not found: ${file}. Run the command above first.`);
        }
      } catch (e) {
        setError(`Error loading file: ${e.message}`);
      }
    };

    loadFile();
    // Poll for file updates
    const interval = setInterval(loadFile, 1000);
    return () => clearInterval(interval);
  }, [file]);

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        margin: '1rem 0',
      }}>
        <strong>Trajectory Viewer:</strong> {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '2rem',
        background: '#e7f3ff',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        margin: '1rem 0',
        textAlign: 'center',
      }}>
        <p>Waiting for trajectory file to load...</p>
        <small>Run the command above to generate the trajectory file.</small>
      </div>
    );
  }

  return (
    <TrajectoryViewer
      trajectoryData={data}
      format={format}
      representation={representation}
      width={width}
      height={height}
      backgroundColor={backgroundColor}
      autoPlay={autoPlay}
      playbackSpeed={playbackSpeed}
    />
  );
}

export default function TrajectoryFileViewer(props: TrajectoryFileViewerProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading trajectory viewer...</div>}>
      {() => <TrajectoryFileViewerContent {...props} />}
    </BrowserOnly>
  );
}
