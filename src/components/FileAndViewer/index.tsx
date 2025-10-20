import React, { ReactNode } from 'react';
import styles from './styles.module.css';

interface FileAndViewerProps {
  children: [ReactNode, ReactNode]; // Expect exactly two children
}

export default function FileAndViewer({ children }: FileAndViewerProps): JSX.Element {
  const [leftChild, rightChild] = children;

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        {leftChild}
      </div>
      <div className={styles.rightPanel}>
        {rightChild}
      </div>
    </div>
  );
}
