import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { getCommandOutput } from './commandOutputs';
import styles from './styles.module.css';

// Helper function to highlight text matching a pattern
function highlightText(text: string, pattern: string | RegExp): React.ReactNode {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  regex.lastIndex = 0; // Reset regex state
  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add highlighted match
    parts.push(
      <span key={match.index} className={styles.highlight}>
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

interface OutputSnippetProps {
  commandId: string;
  pattern?: string | RegExp;
  startPattern?: string | RegExp; // Start of range to extract
  endPattern?: string | RegExp;   // End of range to extract (exclusive)
  startLine?: number;
  endLine?: number;
  title?: string;
  maxLines?: number;
  highlightPattern?: string | RegExp;
  children?: React.ReactNode;
}

function OutputSnippetContent({
  commandId,
  pattern,
  startPattern,
  endPattern,
  startLine,
  endLine,
  title,
  maxLines,
  highlightPattern,
  children,
}: OutputSnippetProps): JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [snippet, setSnippet] = useState('');
  const [isTruncated, setIsTruncated] = useState(false);

  // Poll for output updates
  useEffect(() => {
    const updateSnippet = () => {
      const output = getCommandOutput(commandId);
      if (!output) {
        setSnippet('');
        return;
      }

      let extracted = '';

      if (startPattern || endPattern) {
        // Extract using pattern range (between startPattern and endPattern)
        const lines = output.split('\n');
        let startIdx = 0;
        let endIdx = lines.length;

        if (startPattern) {
          const startRegex = typeof startPattern === 'string' ? new RegExp(startPattern) : startPattern;
          startIdx = lines.findIndex(line => startRegex.test(line));
          if (startIdx === -1) startIdx = 0;
        }

        if (endPattern) {
          const endRegex = typeof endPattern === 'string' ? new RegExp(endPattern) : endPattern;
          const endMatch = lines.slice(startIdx + 1).findIndex(line => endRegex.test(line));
          if (endMatch !== -1) {
            endIdx = startIdx + 1 + endMatch;
          }
        }

        extracted = lines.slice(startIdx, endIdx).join('\n');
      } else if (pattern) {
        // Extract using regex pattern
        const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gm') : pattern;
        const matches = output.match(regex);
        extracted = matches ? matches.join('\n') : '';
      } else if (startLine !== undefined) {
        // Extract using line range
        const lines = output.split('\n');
        const start = startLine - 1; // Convert to 0-indexed
        const end = endLine !== undefined ? endLine : start + 1;
        extracted = lines.slice(start, end).join('\n');
      } else {
        // No extraction specified, use full output
        extracted = output;
      }

      // Apply maxLines truncation if specified
      if (maxLines && extracted) {
        const lines = extracted.split('\n');
        if (lines.length > maxLines) {
          setSnippet(lines.slice(0, maxLines).join('\n'));
          setIsTruncated(true);
        } else {
          setSnippet(extracted);
          setIsTruncated(false);
        }
      } else {
        setSnippet(extracted);
        setIsTruncated(false);
      }
    };

    updateSnippet();
    const interval = setInterval(updateSnippet, 500); // Poll every 500ms
    return () => clearInterval(interval);
  }, [commandId, pattern, startPattern, endPattern, startLine, endLine, maxLines]);

  if (!snippet) {
    return (
      <div className={styles.container}>
        <div className={styles.noOutput}>
          <em>Run the command above to see the output snippet here.</em>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {title && (
        <div
          className={styles.header}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <strong>{title}</strong>
          <button className={styles.collapseButton}>
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      )}

      {!isCollapsed && (
        <>
          <pre className={styles.snippet}>
            {highlightPattern ? highlightText(snippet, highlightPattern) : snippet}
            {isTruncated && <span className={styles.ellipsis}>{'\n...'}</span>}
          </pre>
          {children && (
            <div className={styles.explanation}>
              {children}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function OutputSnippet(props: OutputSnippetProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => <OutputSnippetContent {...props} />}
    </BrowserOnly>
  );
}
