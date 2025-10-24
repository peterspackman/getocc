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

  const diagnosticInfo = [
    `SharedArrayBuffer: ${hasSharedArrayBuffer ? '✓' : '✗'}`,
    `Cross-Origin Isolated: ${isCrossOriginIsolated ? '✓' : '✗'}`,
    `Web Workers: ${hasWorker ? '✓' : '✗'}`,
    '',
    isSupported ? 'Multi-threading available' : 'Limited mode - performance may be reduced',
    '',
    'Tap for details',
  ].join('\n');

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: show alert with diagnostic info
      e.preventDefault();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
      alert(
        `Browser Support Status\n\n` +
        `SharedArrayBuffer: ${hasSharedArrayBuffer ? '✓ Supported' : '✗ Not Available'}\n` +
        `Cross-Origin Isolated: ${isCrossOriginIsolated ? '✓ Enabled' : '✗ Disabled'}\n` +
        `Web Workers: ${hasWorker ? '✓ Supported' : '✗ Not Available'}\n\n` +
        `Status: ${isSupported ? 'Full multi-threading support' : 'Limited mode - some features may be slower'}\n\n` +
        `Browser: ${userAgent}`
      );
    }
  };

  const statusClass = position === 'corner' ? styles.cornerIndicator : styles.inlineIndicator;

  return (
    <div
      className={`${statusClass} ${isSupported ? styles.supported : styles.unsupported}`}
      title={diagnosticInfo}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
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
