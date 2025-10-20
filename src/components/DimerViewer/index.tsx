import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { vfsManager } from '../InteractiveCommand/vfsManager';
import NGLViewer from '../NGLViewer';
import styles from './styles.module.css';

interface DimerViewerProps {
  directory: string;
  format?: 'xyz' | 'pdb' | 'cif';
  representation?: 'ball+stick' | 'cartoon' | 'licorice' | 'spacefill';
  height?: number;
  width?: number | string;
}

function DimerViewerContent({
  directory,
  format = 'xyz',
  representation = 'ball+stick',
  height = 400,
  width = '100%',
}: DimerViewerProps): JSX.Element {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileData, setFileData] = useState<string>('');
  const [energy, setEnergy] = useState<string>('');
  const [vfsVersion, setVfsVersion] = useState<number>(0);

  // Subscribe to VFS changes
  useEffect(() => {
    const unsubscribe = vfsManager.subscribe(() => {
      setVfsVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // Extract energy from XYZ comment line and convert from Hartrees to kJ/mol
  const extractEnergy = (xyzData: string): string => {
    try {
      const lines = xyzData.trim().split('\n');
      if (lines.length < 2) return '';

      const commentLine = lines[1];

      // Try to extract energy from comment line (typically in Hartrees)
      // Format: "E=-0.014567" or "-0.014567" etc.
      const energyMatch = commentLine.match(/[-+]?\d+\.?\d*/);
      if (energyMatch) {
        const valueHartrees = parseFloat(energyMatch[0]);
        // Convert Hartrees to kJ/mol: 1 Hartree = 2625.5 kJ/mol
        const valueKjMol = valueHartrees * 2625.5;
        return `${valueKjMol.toFixed(2)} kJ/mol`;
      }

      return '';
    } catch (e) {
      return '';
    }
  };

  // Natural sort for files like dimer_1.xyz, dimer_2.xyz, dimer_10.xyz
  const naturalSort = (a: string, b: string): number => {
    const aMatch = a.match(/dimer_(\d+)/);
    const bMatch = b.match(/dimer_(\d+)/);

    if (aMatch && bMatch) {
      const aNum = parseInt(aMatch[1]);
      const bNum = parseInt(bMatch[1]);
      return aNum - bNum;
    }

    return a.localeCompare(b);
  };

  // Load files from directory
  useEffect(() => {
    try {
      const vfsFiles = vfsManager.getFiles();
      const dirPath = directory.startsWith('/') ? directory : '/' + directory;

      console.log('DimerViewer: Looking for files in:', dirPath);
      console.log('DimerViewer: Available VFS paths:', Object.keys(vfsFiles));

      // Filter files in the directory
      const dimerFiles = Object.keys(vfsFiles)
        .filter(path => path.startsWith(dirPath) && path.endsWith(`.${format}`))
        .map(path => path.replace(dirPath + '/', ''))
        .sort(naturalSort);

      console.log('DimerViewer: Found dimer files:', dimerFiles);

      setFiles(dimerFiles);

      // Select first file by default
      if (dimerFiles.length > 0 && !selectedFile) {
        setSelectedFile(dimerFiles[0]);
      }
    } catch (e) {
      console.error('Error loading directory:', e);
    }
  }, [directory, format, vfsVersion]);

  // Load selected file data
  useEffect(() => {
    if (!selectedFile) return;

    try {
      const filePath = `${directory.startsWith('/') ? directory : '/' + directory}/${selectedFile}`;
      const vfsFiles = vfsManager.getFiles();
      const fileContent = vfsFiles[filePath];

      if (fileContent) {
        const decoder = new TextDecoder();
        const text = decoder.decode(fileContent);
        setFileData(text);

        // Extract energy if XYZ format
        if (format === 'xyz') {
          const energyStr = extractEnergy(text);
          setEnergy(energyStr);
        }
      }
    } catch (e) {
      console.error('Error loading file:', e);
    }
  }, [selectedFile, directory, format]);

  return (
    <div className={styles.container} style={{ width, height }}>
      <div className={styles.header}>
        <div className={styles.title}>Dimer Structures</div>
        {energy && (
          <div className={styles.energyInfo}>
            <span className={styles.energyLabel}>Energy:</span>
            <span className={styles.energyValue}>{energy}</span>
          </div>
        )}
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.viewerWrapper}>
          {fileData ? (
            <div style={{ width: '100%', height: '100%' }}>
              <NGLViewer
                data={fileData}
                format={format}
                representation={representation}
                width="100%"
                height="100%"
              />
            </div>
          ) : (
            <div className={styles.placeholder}>
              {files.length === 0
                ? 'Run a lattice energy calculation to generate dimer structures'
                : 'Select a dimer to visualize'
              }
            </div>
          )}
        </div>
        <div className={styles.listWrapper}>
          <div className={styles.listHeader}>Dimers ({files.length})</div>
          <div className={styles.list}>
            {files.length === 0 ? (
              <div className={styles.emptyList}>
                No dimers found
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file}
                  className={`${styles.listItem} ${selectedFile === file ? styles.listItemActive : ''}`}
                  onClick={() => setSelectedFile(file)}
                >
                  {file}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DimerViewer(props: DimerViewerProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading viewer...</div>}>
      {() => <DimerViewerContent {...props} />}
    </BrowserOnly>
  );
}
