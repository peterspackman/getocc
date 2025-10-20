import React, { useState, useMemo } from 'react';
import styles from './styles.module.css';

export interface FileListProps {
  files: Record<string, Uint8Array | string>;
  onFileClick?: (path: string, content: Uint8Array | string) => void;
  onRefresh?: () => void;
}

interface TreeNode {
  [key: string]: TreeNode | Array<{ name: string; path: string }> | undefined;
  _files?: Array<{ name: string; path: string }>;
}

export default function FileList({ files, onFileClick, onRefresh }: FileListProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));

  const tree = useMemo(() => {
    const result: TreeNode = {};
    const paths = Object.keys(files).sort();

    paths.forEach((path) => {
      const parts = path.split('/').filter((p) => p);
      let current: any = result;

      parts.forEach((part, idx) => {
        if (idx === parts.length - 1) {
          // This is a file
          if (!current._files) current._files = [];
          current._files.push({ name: part, path: path });
        } else {
          // This is a directory
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      });
    });

    return result;
  }, [files]);

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const handleFileClick = (path: string) => {
    if (onFileClick) {
      onFileClick(path, files[path]);
    } else {
      // Default: download the file
      downloadFile(path, files[path]);
    }
  };

  const downloadFile = (path: string, content: Uint8Array | string) => {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTree = (node: TreeNode, level = 0, parentPath = ''): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];

    // Render directories
    for (const [name, children] of Object.entries(node)) {
      if (name === '_files') continue;

      const dirPath = parentPath + '/' + name;
      const isExpanded = expandedDirs.has(dirPath);
      const indent = level * 1.5;

      elements.push(
        <div key={`dir-${dirPath}`}>
          <div
            className={styles.dirItem}
            onClick={() => toggleDir(dirPath)}
            style={{ paddingLeft: `${indent + 1}rem` }}
          >
            <span className={`${styles.dirArrow} ${isExpanded ? styles.expanded : ''}`}>
              ▶
            </span>
            <span>{name}/</span>
          </div>
          {isExpanded && (
            <div className={styles.dirChildren}>
              {renderTree(children as TreeNode, level + 1, dirPath)}
            </div>
          )}
        </div>
      );
    }

    // Render files in this directory
    if (node._files) {
      node._files.forEach((file) => {
        const indent = level * 1.5;
        elements.push(
          <div
            key={`file-${file.path}`}
            className={styles.fileItem}
            onClick={() => handleFileClick(file.path)}
            style={{ paddingLeft: `${indent + 1.2}rem` }}
          >
            <span>{file.name}</span>
          </div>
        );
      });
    }

    return elements;
  };

  const paths = Object.keys(files);

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span>Files</span>
        {onRefresh && (
          <button className={styles.refreshBtn} onClick={onRefresh}>
            ↻
          </button>
        )}
      </div>
      <div className={styles.fileListContainer}>
        {paths.length === 0 ? (
          <div className={styles.emptyState}>No files</div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
}
