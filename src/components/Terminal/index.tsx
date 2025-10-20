import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import styles from './styles.module.css';

export interface TerminalProps {
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  theme?: any;
}

export interface TerminalHandle {
  term: XTerm;
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
}

const Terminal = React.forwardRef<TerminalHandle, TerminalProps>(
  ({ onData, onResize, theme }, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);

    useEffect(() => {
      if (!terminalRef.current) return;

      // Tokyo Night theme
      const defaultTheme = {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selection: '#283457',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
      };

      const term = new XTerm({
        theme: theme || defaultTheme,
        fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        cursorBlink: true,
        scrollback: 10000,
      });

      term.open(terminalRef.current);
      xtermRef.current = term;

      if (onData) {
        term.onData(onData);
      }

      // Auto-resize
      const fitTerminal = () => {
        if (!terminalRef.current) return;
        const container = terminalRef.current;
        const cols = Math.floor(container.clientWidth / 9);
        const rows = Math.floor(container.clientHeight / 17);
        term.resize(cols, rows);
        if (onResize) {
          onResize(cols, rows);
        }
      };

      const resizeObserver = new ResizeObserver(fitTerminal);
      resizeObserver.observe(terminalRef.current);
      setTimeout(fitTerminal, 100);

      // Expose methods via ref
      if (ref) {
        if (typeof ref === 'function') {
          ref({
            term,
            write: (data: string) => term.write(data),
            writeln: (data: string) => term.writeln(data),
            clear: () => term.clear(),
            focus: () => term.focus(),
          });
        } else {
          ref.current = {
            term,
            write: (data: string) => term.write(data),
            writeln: (data: string) => term.writeln(data),
            clear: () => term.clear(),
            focus: () => term.focus(),
          };
        }
      }

      return () => {
        resizeObserver.disconnect();
        term.dispose();
      };
    }, [onData, onResize, theme, ref]);

    return <div ref={terminalRef} className={styles.terminal} />;
  }
);

Terminal.displayName = 'Terminal';

export default Terminal;
