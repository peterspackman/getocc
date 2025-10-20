import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import NGLViewer, { NGLViewerProps } from './index';
import { vfsManager } from '../InteractiveCommand/vfsManager';

interface NGLFileViewerProps extends Omit<NGLViewerProps, 'data'> {
  file: string;
  cubeFile?: string; // Optional cube file to overlay on the molecule
}

function NGLFileViewerContent({
  file,
  cubeFile,
  format = 'xyz',
  representation = 'ball+stick',
  width = 600,
  height = 400,
  backgroundColor = '#ffffff',
  showControls = true,
  cubeIsovalue = 0.002,
  cubeColor = '#4169e1',
  cubeOpacity = 0.7,
}: NGLFileViewerProps): JSX.Element {
  const [data, setData] = useState<string>('');
  const [cubeData, setCubeData] = useState<string>('');
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

        // Load cube file if specified
        if (cubeFile) {
          const cubeFilePath = cubeFile.startsWith('/') ? cubeFile : '/' + cubeFile;
          const cubeFileContent = files[cubeFilePath];
          if (cubeFileContent) {
            const decoder = new TextDecoder();
            setCubeData(decoder.decode(cubeFileContent));
          } else {
            setCubeData('');
          }
        }
      } catch (e) {
        setError(`Error loading file: ${e.message}`);
      }
    };

    loadFile();
    // Poll for file updates
    const interval = setInterval(loadFile, 1000);
    return () => clearInterval(interval);
  }, [file, cubeFile]);

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
        <p>Waiting for file to load...</p>
        <small>Run the command above to generate the visualization file.</small>
      </div>
    );
  }

  return (
    <NGLViewer
      data={data}
      cubeData={cubeData}
      format={format}
      representation={representation}
      width={width}
      height={height}
      backgroundColor={backgroundColor}
      showControls={showControls}
      cubeIsovalue={cubeIsovalue}
      cubeColor={cubeColor}
      cubeOpacity={cubeOpacity}
    />
  );
}

export default function NGLFileViewer(props: NGLFileViewerProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading viewer...</div>}>
      {() => <NGLFileViewerContent {...props} />}
    </BrowserOnly>
  );
}
