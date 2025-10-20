import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import MolecularViewer from './index';
import { vfsManager } from '../InteractiveCommand/vfsManager';

interface FileViewerProps {
  plyFile?: string;
  xyzFile?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

function FileViewerContent({
  plyFile,
  xyzFile,
  width = 600,
  height = 400,
  backgroundColor = '#f5f5f5',
}: FileViewerProps): JSX.Element {
  const [plyData, setPlyData] = useState<string>('');
  const [xyzData, setXyzData] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadFiles = () => {
      try {
        const files = vfsManager.getFiles();

        if (plyFile) {
          const plyPath = plyFile.startsWith('/') ? plyFile : '/' + plyFile;
          const plyContent = files[plyPath];
          if (plyContent) {
            const decoder = new TextDecoder();
            setPlyData(decoder.decode(plyContent));
          } else {
            setError(`PLY file not found: ${plyFile}. Run the command above first.`);
          }
        }

        if (xyzFile) {
          const xyzPath = xyzFile.startsWith('/') ? xyzFile : '/' + xyzFile;
          const xyzContent = files[xyzPath];
          if (xyzContent) {
            const decoder = new TextDecoder();
            setXyzData(decoder.decode(xyzContent));
          } else {
            setError(`XYZ file not found: ${xyzFile}. Run the command above first.`);
          }
        }
      } catch (e) {
        setError(`Error loading files: ${e.message}`);
      }
    };

    loadFiles();
    // Poll for file updates
    const interval = setInterval(loadFiles, 1000);
    return () => clearInterval(interval);
  }, [plyFile, xyzFile]);

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        margin: '1rem 0',
      }}>
        <strong>Viewer:</strong> {error}
      </div>
    );
  }

  if (!plyData && !xyzData) {
    return (
      <div style={{
        padding: '2rem',
        background: '#e7f3ff',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        margin: '1rem 0',
        textAlign: 'center',
      }}>
        <p>Waiting for files to load...</p>
        <small>Run the command above to generate the visualization files.</small>
      </div>
    );
  }

  return (
    <MolecularViewer
      plyData={plyData}
      xyzData={xyzData}
      width={width}
      height={height}
      backgroundColor={backgroundColor}
    />
  );
}

export default function FileViewer(props: FileViewerProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading viewer...</div>}>
      {() => <FileViewerContent {...props} />}
    </BrowserOnly>
  );
}
