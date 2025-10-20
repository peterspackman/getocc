import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { vfsManager } from '../InteractiveCommand/vfsManager';
import styles from './styles.module.css';

interface Preset {
  name: string;
  content: string;
}

interface EditableFileProps {
  file: string;
  initialContent?: string;
  language?: string;
  width?: number | string;
  height?: number | string;
  readonly?: boolean;
  presets?: Preset[];
}

function EditableFileContent({
  file,
  initialContent = '',
  language = 'text',
  width = '100%',
  height = 300,
  readonly = false,
  presets = [],
}: EditableFileProps): JSX.Element {
  const [content, setContent] = useState<string>(initialContent);
  const [savedContent, setSavedContent] = useState<string>(initialContent);
  const [hasChanges, setHasChanges] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load file from VFS on mount and write initial content if needed
  useEffect(() => {
    const loadFile = () => {
      try {
        const files = vfsManager.getFiles();
        const filePath = file.startsWith('/') ? file : '/' + file;
        const fileContent = files[filePath];

        if (fileContent) {
          const decoder = new TextDecoder();
          const text = decoder.decode(fileContent);
          setContent(text);
          setSavedContent(text);
        } else if (initialContent) {
          // Use initial content if file doesn't exist yet
          setContent(initialContent);
          setSavedContent(initialContent);

          // Automatically write initial content to VFS
          const encoder = new TextEncoder();
          const data = encoder.encode(initialContent);
          vfsManager.writeFile(filePath, data);
        }
      } catch (e) {
        console.error('Error loading file:', e);
      }
    };

    loadFile();
  }, [file, initialContent]);

  // Track changes
  useEffect(() => {
    setHasChanges(content !== savedContent);
  }, [content, savedContent]);

  const handleSave = () => {
    try {
      const filePath = file.startsWith('/') ? file : '/' + file;
      const encoder = new TextEncoder();
      const data = encoder.encode(content);

      vfsManager.writeFile(filePath, data);
      setSavedContent(content);
      setMessage('File saved successfully!');

      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage(`Error saving file: ${e.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleReset = () => {
    setContent(savedContent);
    setMessage('Changes discarded');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setMessage('Copied to clipboard!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('Failed to copy');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handlePresetClick = (presetContent: string) => {
    setContent(presetContent);
    // Auto-save the preset to VFS
    try {
      const filePath = file.startsWith('/') ? file : '/' + file;
      const encoder = new TextEncoder();
      const data = encoder.encode(presetContent);
      vfsManager.writeFile(filePath, data);
      setSavedContent(presetContent);
      setMessage('Loaded preset');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) {
      setMessage(`Error loading preset: ${e.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className={styles.container} style={{ width, height }}>
      {presets.length > 0 && (
        <div className={styles.presetsBar}>
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(preset.content)}
              className={styles.presetButton}
              title={`Load ${preset.name}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}
      <div className={styles.header}>
        <div className={styles.filename}>{file}</div>
        <div className={styles.actions}>
          <button
            onClick={() => setIsModalOpen(true)}
            className={styles.buttonSecondary}
            title="Expand to full screen"
          >
            Expand
          </button>
          <button
            onClick={handleCopy}
            className={styles.buttonSecondary}
            title="Copy to clipboard"
          >
            Copy
          </button>
          {!readonly && hasChanges && (
            <>
              <button
                onClick={handleReset}
                className={styles.buttonSecondary}
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className={styles.buttonPrimary}
              >
                Save to VFS
              </button>
            </>
          )}
        </div>
      </div>
      <div className={styles.editorWrapper}>
        <textarea
          value={content}
          onChange={handleChange}
          readOnly={readonly}
          className={styles.editor}
          spellCheck={false}
        />
        {message && (
          <span className={styles.message}>{message}</span>
        )}
      </div>
      {hasChanges && !readonly && (
        <div className={styles.footer}>
          <small className={styles.hint}>
            Unsaved changes - click "Save to VFS" to update the file
          </small>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.filename}>{file}</div>
              <div className={styles.actions}>
                <button
                  onClick={handleCopy}
                  className={styles.buttonSecondary}
                  title="Copy to clipboard"
                >
                  Copy
                </button>
                {!readonly && hasChanges && (
                  <>
                    <button
                      onClick={handleReset}
                      className={styles.buttonSecondary}
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSave}
                      className={styles.buttonPrimary}
                    >
                      Save to VFS
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={styles.buttonSecondary}
                  title="Close"
                >
                  Close
                </button>
              </div>
            </div>
            <div className={styles.editorWrapper}>
              <textarea
                value={content}
                onChange={handleChange}
                readOnly={readonly}
                className={styles.modalEditor}
                spellCheck={false}
                autoFocus
              />
              {message && (
                <span className={styles.message}>{message}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditableFile(props: EditableFileProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading editor...</div>}>
      {() => <EditableFileContent {...props} />}
    </BrowserOnly>
  );
}
