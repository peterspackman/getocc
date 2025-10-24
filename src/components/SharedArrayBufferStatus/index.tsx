import React from 'react';
import styles from './styles.module.css';

interface SharedArrayBufferStatusProps {
  showText?: boolean;
  position?: 'inline' | 'corner';
  onClick?: () => void;
}

export function checkSharedArrayBufferSupport() {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
  const hasWorker = typeof Worker !== 'undefined';

  return {
    hasSharedArrayBuffer,
    isCrossOriginIsolated,
    hasWorker,
    isSupported: hasSharedArrayBuffer && isCrossOriginIsolated,
  };
}

export function SharedArrayBufferStatus({
  showText = false,
  position = 'inline',
  onClick,
}: SharedArrayBufferStatusProps): JSX.Element {
  const { isSupported, hasSharedArrayBuffer, isCrossOriginIsolated, hasWorker } =
    checkSharedArrayBufferSupport();

  const title = [
    `SharedArrayBuffer: ${hasSharedArrayBuffer ? '✓' : '✗'}`,
    `Cross-Origin Isolated: ${isCrossOriginIsolated ? '✓' : '✗'}`,
    `Web Workers: ${hasWorker ? '✓' : '✗'}`,
    isSupported ? 'Multi-threading available' : 'Limited mode - performance may be reduced',
  ].join('\n');

  const statusClass = position === 'corner' ? styles.cornerIndicator : styles.inlineIndicator;

  return (
    <div
      className={`${statusClass} ${isSupported ? styles.supported : styles.unsupported}`}
      title={title}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={styles.dot}>{isSupported ? '●' : '●'}</span>
      {showText && (
        <span className={styles.text}>
          {isSupported ? 'Ready' : 'Limited'}
        </span>
      )}
    </div>
  );
}
