import React, { useState, useRef, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { vfsManager } from './vfsManager';
import { setCommandOutput } from '../OutputSnippet/commandOutputs';
import styles from './styles.module.css';

interface HighlightPattern {
  pattern: string | RegExp;
  className?: 'highlight' | 'info' | 'success' | 'warning' | 'error';
  label?: string;
}

interface InteractiveCommandProps {
  id?: string;
  command: string;
  inputFiles?: { [filename: string]: string };
  expectedOutputs?: string[];
  language?: string;
  maxHeight?: string;
  highlights?: HighlightPattern[];
}

function InteractiveCommandContent({
  id,
  command,
  inputFiles = {},
  expectedOutputs = [],
  language = 'bash',
  maxHeight = '500px',
  highlights = [],
}: InteractiveCommandProps): JSX.Element {
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<{ [filename: string]: any }>({});
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [editedCommand, setEditedCommand] = useState<string>(command);
  const [isEditing, setIsEditing] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [activeFileTab, setActiveFileTab] = useState<'input' | 'output'>('input');
  const workerRef = useRef<Worker | null>(null);
  const outputRef = useRef<HTMLPreElement | null>(null);

  // Subscribe to VFS changes
  useEffect(() => {
    const updateAvailableFiles = () => {
      setAvailableFiles(vfsManager.getFilePaths());
    };
    updateAvailableFiles();
    const unsubscribe = vfsManager.subscribe(updateAvailableFiles);
    return unsubscribe;
  }, []);

  // Auto-scroll output to bottom when it updates
  useEffect(() => {
    if (outputRef.current && !isOutputCollapsed) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, isOutputCollapsed]);

  // Store output if id is provided
  useEffect(() => {
    if (id && output) {
      setCommandOutput(id, output);
    }
  }, [id, output]);

  // Auto-switch to output tab when files are generated
  useEffect(() => {
    if (Object.keys(generatedFiles).length > 0) {
      setActiveFileTab('output');
    }
  }, [generatedFiles]);

  const runCommand = async () => {
    setOutput('');
    setError(null);
    setGeneratedFiles({});
    setIsRunning(true);
    setIsEditing(false);
    setIsOutputCollapsed(false);

    try {
      // Parse command to extract OCC args
      const parts = editedCommand.trim().split(/\s+/);
      if (parts[0] !== 'occ') {
        setError('Command must start with "occ"');
        setIsRunning(false);
        return;
      }
      const args = parts.slice(1);

      // Prepare files object with input files AND existing VFS files
      const files: Record<string, Uint8Array> = {};

      // First, load all existing files from the shared VFS
      const existingFiles = vfsManager.getFiles();
      Object.assign(files, existingFiles);

      // Then add/override with provided input files
      for (const [filename, content] of Object.entries(inputFiles)) {
        const encoder = new TextEncoder();
        files['/' + filename] = encoder.encode(content);
      }

      // Track which files existed before command
      const initialFiles = new Set(Object.keys(files));

      // Create OCC run worker
      const worker = new Worker('/occ-run-worker.js');
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, text, code, files: outputFiles } = e.data;

        switch (type) {
          case 'output':
            setOutput((prev) => prev + text + '\n');
            break;
          case 'error':
            setOutput((prev) => prev + text + '\n');
            break;
          case 'ready':
            // Worker is ready
            break;
          case 'exit':
            // Command finished
            if (outputFiles) {
              // Filter to only show newly created files (not input files or system files)
              const newFiles: Record<string, any> = {};
              const vfsFiles: Record<string, Uint8Array> = {};

              for (const [path, content] of Object.entries(outputFiles)) {
                const isSystemFile =
                  path.startsWith('/basis/') ||
                  path.startsWith('/methods/') ||
                  path.startsWith('/solvent/') ||
                  path.startsWith('/lib/') ||
                  path.startsWith('/usr/') ||
                  path.startsWith('/etc/') ||
                  path.startsWith('/dev/') ||
                  path === '/dev/null' ||
                  path === '/sgdata.json';

                // Add all user files to VFS (not system files)
                if (!isSystemFile) {
                  vfsFiles[path] = content;
                }

                // Show only newly created files (not pre-existing)
                if (!initialFiles.has(path) && !isSystemFile) {
                  newFiles[path] = content;
                }
              }

              // Update the shared VFS with all generated files
              vfsManager.addFiles(vfsFiles);
              setGeneratedFiles(newFiles);
            }
            worker.terminate();
            workerRef.current = null;
            setIsRunning(false);
            if (code !== 0) {
              setError(`Command exited with code ${code}`);
            }
            break;
        }
      };

      worker.onerror = (err) => {
        setError(err.message);
        setIsRunning(false);
        worker.terminate();
        workerRef.current = null;
      };

      // Send command to worker
      worker.postMessage({
        command: args.join(' '),
        cwd: '/',
        files: files,
      });
    } catch (err) {
      setError(err.message);
      setIsRunning(false);
    }
  };

  const downloadFile = (filename: string) => {
    const content = generatedFiles[filename];
    if (!content) return;

    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.split('/').pop() || 'download';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedCommand);
  };

  const resetCommand = () => {
    setEditedCommand(command);
    setIsEditing(false);
  };

  const stopCommand = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsRunning(false);
      setOutput((prev) => prev + '\n[Command interrupted by user]\n');
    }
  };

  const generatedFileNames = Object.keys(generatedFiles);

  // Function to apply highlights to output
  const renderHighlightedOutput = () => {
    if (highlights.length === 0 || !output) {
      return output;
    }

    const lines = output.split('\n');
    const highlightedLines: JSX.Element[] = [];

    lines.forEach((line, lineIndex) => {
      let processedLine: (string | JSX.Element)[] = [line];

      // Apply each highlight pattern
      highlights.forEach((highlight, highlightIndex) => {
        const regex = typeof highlight.pattern === 'string'
          ? new RegExp(highlight.pattern, 'g')
          : highlight.pattern;

        const newProcessedLine: (string | JSX.Element)[] = [];

        processedLine.forEach((segment) => {
          if (typeof segment === 'string') {
            let lastIndex = 0;
            const matches: RegExpExecArray[] = [];
            let match: RegExpExecArray | null;

            // Reset regex
            regex.lastIndex = 0;

            // Collect all matches
            while ((match = regex.exec(segment)) !== null) {
              matches.push({ ...match } as RegExpExecArray);
              // Prevent infinite loop on zero-length matches
              if (match.index === regex.lastIndex) {
                regex.lastIndex++;
              }
            }

            if (matches.length === 0) {
              newProcessedLine.push(segment);
            } else {
              matches.forEach((m, i) => {
                // Add text before match
                if (m.index > lastIndex) {
                  newProcessedLine.push(segment.substring(lastIndex, m.index));
                }
                // Add highlighted match
                const className = highlight.className || 'highlight';
                newProcessedLine.push(
                  <span
                    key={`${lineIndex}-${highlightIndex}-${i}`}
                    className={styles[className]}
                    title={highlight.label}
                  >
                    {m[0]}
                  </span>
                );
                lastIndex = m.index + m[0].length;
              });

              // Add remaining text
              if (lastIndex < segment.length) {
                newProcessedLine.push(segment.substring(lastIndex));
              }
            }
          } else {
            newProcessedLine.push(segment);
          }
        });

        processedLine = newProcessedLine;
      });

      highlightedLines.push(
        <React.Fragment key={lineIndex}>
          {processedLine}
          {lineIndex < lines.length - 1 && '\n'}
        </React.Fragment>
      );
    });

    return highlightedLines;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.commandBlock}>
          {isEditing ? (
            <input
              type="text"
              value={editedCommand}
              onChange={(e) => setEditedCommand(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  runCommand();
                } else if (e.key === 'Escape') {
                  resetCommand();
                }
              }}
              className={styles.commandInput}
              autoFocus
            />
          ) : (
            <code
              className={styles.command}
              onClick={() => setIsEditing(true)}
              title="Click to edit"
            >
              {editedCommand}
            </code>
          )}
        </div>
        <div className={styles.actions}>
          {editedCommand !== command && (
            <button
              onClick={resetCommand}
              className={styles.button}
              title="Reset to original command"
            >
              Reset
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className={styles.button}
            title="Copy command to clipboard"
          >
            Copy
          </button>
          <button
            onClick={isRunning ? stopCommand : runCommand}
            className={`${styles.button} ${isRunning ? styles.stopButton : styles.runButton}`}
            title={isRunning ? "Stop command" : "Run command in browser"}
          >
            {isRunning ? 'Stop' : 'Run'}
          </button>
        </div>
      </div>

      {(Object.keys(inputFiles).length > 0 || generatedFileNames.length > 0) && (
        <div className={styles.fileTabsContainer}>
          <div className={styles.fileTabs}>
            {Object.keys(inputFiles).length > 0 && (
              <button
                className={`${styles.fileTab} ${activeFileTab === 'input' ? styles.fileTabActive : ''}`}
                onClick={() => setActiveFileTab('input')}
              >
                Input Files ({Object.keys(inputFiles).length})
              </button>
            )}
            {generatedFileNames.length > 0 && (
              <button
                className={`${styles.fileTab} ${activeFileTab === 'output' ? styles.fileTabActive : ''}`}
                onClick={() => setActiveFileTab('output')}
              >
                Output Files ({generatedFileNames.length})
              </button>
            )}
          </div>
          <div className={styles.fileTabContent}>
            {activeFileTab === 'input' && Object.keys(inputFiles).length > 0 && (
              <ul className={styles.inputFilesList}>
                {Object.keys(inputFiles).map((filename) => (
                  <li key={filename}>
                    <code>{filename}</code>
                  </li>
                ))}
              </ul>
            )}
            {activeFileTab === 'output' && generatedFileNames.length > 0 && (
              <div className={styles.fileGrid}>
                {generatedFileNames.map((filename) => (
                  <div
                    key={filename}
                    className={styles.fileItem}
                    onClick={() => downloadFile(filename)}
                    title="Click to download"
                  >
                    <span className={styles.fileName}>
                      {filename.startsWith('/') ? filename.slice(1) : filename}
                    </span>
                    <span className={styles.downloadIcon}>↓</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {availableFiles.length > 0 && Object.keys(inputFiles).length === 0 && generatedFileNames.length === 0 && (
        <div className={styles.availableFiles}>
          <strong>Available files from previous commands:</strong>
          <div className={styles.fileChips}>
            {availableFiles.map((filename) => (
              <span key={filename} className={styles.fileChip}>
                {filename.startsWith('/') ? filename.slice(1) : filename}
              </span>
            ))}
          </div>
        </div>
      )}

      {output && (
        <div className={styles.output}>
          <div
            className={styles.outputHeader}
            onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
          >
            <strong>Output</strong>
            <button className={styles.collapseButton}>
              {isOutputCollapsed ? '▶' : '▼'}
            </button>
          </div>
          {!isOutputCollapsed && (
            <pre
              ref={outputRef}
              className={styles.outputContent}
              style={{ maxHeight }}
            >
              {renderHighlightedOutput()}
            </pre>
          )}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {expectedOutputs.length > 0 && !isRunning && generatedFileNames.length === 0 && !output && (
        <div className={styles.expectedOutputs}>
          <small>
            Expected outputs: {expectedOutputs.join(', ')}
          </small>
        </div>
      )}
    </div>
  );
}

// Wrapper component with BrowserOnly to avoid SSR issues
export default function InteractiveCommand(props: InteractiveCommandProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => <InteractiveCommandContent {...props} />}
    </BrowserOnly>
  );
}
