import React, { useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';
import { checkSharedArrayBufferSupport } from '@site/src/components/SharedArrayBufferStatus';

export default function TryPage() {
  return (
    <Layout title="Try OCC" description="Try OCC WebAssembly in your browser" noFooter>
      <div style={{ height: 'calc(100vh - var(--ifm-navbar-height))' }}>
        <BrowserOnly fallback={<div>Loading...</div>}>
          {() => <TryPageContent />}
        </BrowserOnly>
      </div>
    </Layout>
  );
}

function TryPageContent() {
  useEffect(() => {
    // Dynamically load xterm CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css';
    document.head.appendChild(link);

    // Load the terminal script and fit addon
    Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit')
    ]).then(([xtermModule, fitAddonModule]) => {
      const { Terminal } = xtermModule;
      const { FitAddon } = fitAddonModule;
      initializeTerminal(Terminal, FitAddon);
    });

    return () => {
      // Cleanup will be handled by the script
    };
  }, []);

  return (
    <div
      id="terminal-app"
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        background: 'var(--ifm-background-color)',
        overflow: 'hidden',
      }}
    />
  );
}

function initializeTerminal(Terminal: any, FitAddon: any) {
  let currentFile = null;
  let moduleReady = false;
  let currentLine = '';
  let isRunningCommand = false;
  let cwd = '/';
  let commandHistory: string[] = [];
  let historyIndex = -1;
  let worker: Worker | null = null;
  let workerReady = false;
  let term: any = null;
  let fitAddon: any = null;

  const app = document.getElementById('terminal-app');
  if (!app) return;

  // Get CSS variables for theming
  function getThemeColors() {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const isDark = root.getAttribute('data-theme') === 'dark';

    return {
      background: style.getPropertyValue('--ifm-background-color').trim(),
      surface: style.getPropertyValue('--ifm-background-surface-color').trim() || style.getPropertyValue('--ifm-background-color').trim(),
      foreground: style.getPropertyValue('--ifm-font-color-base').trim(),
      primary: style.getPropertyValue('--ifm-color-primary').trim(),
      border: style.getPropertyValue('--ifm-color-emphasis-300').trim(),
      isDark,
    };
  }

  const colors = getThemeColors();

  // Tokyo Night terminal themes based on mode
  const getTerminalBackground = (isDark: boolean) => isDark ? '#1a1b26' : '#e1e2e7';
  const getSidebarBackground = (isDark: boolean) => isDark ? '#24283b' : '#dfe0e8';

  // Build the UI
  app.innerHTML = `
    <button id="sidebarToggle" style="display: none; position: fixed; top: calc(var(--ifm-navbar-height) + 0.5rem); left: 0.5rem; z-index: 1001; background: ${colors.isDark ? '#24283b' : '#dfe0e8'}; border: 1px solid ${colors.border}; border-radius: 6px; padding: 0.5rem 0.75rem; color: ${colors.foreground}; cursor: pointer; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">☰</button>
    <div id="fileSidebar" style="width: 280px; background: ${getSidebarBackground(colors.isDark)}; border-right: 1px solid ${colors.border}; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; transition: transform 0.3s ease;">
      <div id="fileHeader" style="padding: 1rem; border-bottom: 1px solid ${colors.border}; color: ${colors.foreground}; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
        <span>Files</span>
        <div style="display: flex; gap: 0.5rem;">
          <button id="closeSidebarBtn" style="display: none; background: ${colors.border}; border: none; color: ${colors.foreground}; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">✕</button>
          <button id="refreshBtn" style="background: ${colors.border}; border: none; color: ${colors.foreground}; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">↻</button>
        </div>
      </div>
      <div id="fileList" style="flex: 1; overflow-y: auto; padding: 0.5rem 0; min-height: 0;">
        <div style="padding: 2rem 1rem; text-align: center; color: ${colors.foreground}; opacity: 0.6; font-size: 0.85rem;">Loading...</div>
      </div>
    </div>
    <div id="terminalContainer" style="flex: 1; position: relative; background: ${getTerminalBackground(colors.isDark)}; min-width: 0; height: 100%; padding-left: 1rem;">
      <div id="terminal" style="width: 100%; height: 100%;"></div>
      <div id="dropOverlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: ${colors.primary}33; border: 3px dashed ${colors.primary}; display: none; align-items: center; justify-content: center; font-size: 1.5rem; color: ${colors.primary}; pointer-events: none; z-index: 1000;">
        📁 Drop files here to upload
      </div>
      <div id="statusBar" style="position: absolute; top: 1rem; right: 1.5rem; background: ${colors.isDark ? '#24283b' : '#dfe0e8'}; border: 1px solid ${colors.isDark ? '#414868' : '#c4c6d4'}; border-radius: 6px; padding: 0.4rem 0.8rem; color: ${colors.isDark ? '#a9b1d6' : '#6172b0'}; font-size: 0.75rem; display: flex; gap: 0.5rem; z-index: 100;">
        <div id="statusIndicator" style="display: flex; align-items: center; gap: 0.4rem;">
          <span>○</span>
          <span id="statusText">Loading...</span>
        </div>
      </div>
    </div>
  `;

  // Tokyo Night terminal themes
  const terminalTheme = colors.isDark
    ? {
        // Tokyo Night Storm (Dark)
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selection: 'rgba(122, 162, 247, 0.3)',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      }
    : {
        // Tokyo Night Day (Light)
        background: '#e1e2e7',
        foreground: '#3760bf',
        cursor: '#3760bf',
        cursorAccent: '#e1e2e7',
        selection: 'rgba(46, 125, 233, 0.2)',
        black: '#e9e9ed',
        red: '#f52a65',
        green: '#587539',
        yellow: '#8c6c3e',
        blue: '#2e7de9',
        magenta: '#9854f1',
        cyan: '#007197',
        white: '#6172b0',
        brightBlack: '#a8aecb',
        brightRed: '#f52a65',
        brightGreen: '#587539',
        brightYellow: '#8c6c3e',
        brightBlue: '#2e7de9',
        brightMagenta: '#9854f1',
        brightCyan: '#007197',
        brightWhite: '#3760bf',
      };

  // Initialize xterm.js terminal with Tokyo Night theme
  term = new Terminal({
    theme: terminalTheme,
    fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    cursorBlink: true,
    scrollback: 10000,
    scrollOnUserInput: true,
    smoothScrollDuration: 100,
  });

  const terminalElement = document.getElementById('terminal');
  if (!terminalElement) return;

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalElement);

  // Fit the terminal to container
  setTimeout(() => fitAddon.fit(), 0);

  // Listen for theme changes and update terminal theme + UI
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const newColors = getThemeColors();
        const newTerminalTheme = newColors.isDark
          ? {
              // Tokyo Night Storm (Dark)
              background: '#1a1b26',
              foreground: '#c0caf5',
              cursor: '#c0caf5',
              cursorAccent: '#1a1b26',
              selection: 'rgba(122, 162, 247, 0.3)',
              black: '#15161e',
              red: '#f7768e',
              green: '#9ece6a',
              yellow: '#e0af68',
              blue: '#7aa2f7',
              magenta: '#bb9af7',
              cyan: '#7dcfff',
              white: '#a9b1d6',
              brightBlack: '#414868',
              brightRed: '#f7768e',
              brightGreen: '#9ece6a',
              brightYellow: '#e0af68',
              brightBlue: '#7aa2f7',
              brightMagenta: '#bb9af7',
              brightCyan: '#7dcfff',
              brightWhite: '#c0caf5',
            }
          : {
              // Tokyo Night Day (Light)
              background: '#e1e2e7',
              foreground: '#3760bf',
              cursor: '#3760bf',
              cursorAccent: '#e1e2e7',
              selection: 'rgba(46, 125, 233, 0.2)',
              black: '#e9e9ed',
              red: '#f52a65',
              green: '#587539',
              yellow: '#8c6c3e',
              blue: '#2e7de9',
              magenta: '#9854f1',
              cyan: '#007197',
              white: '#6172b0',
              brightBlack: '#a8aecb',
              brightRed: '#f52a65',
              brightGreen: '#587539',
              brightYellow: '#8c6c3e',
              brightBlue: '#2e7de9',
              brightMagenta: '#9854f1',
              brightCyan: '#007197',
              brightWhite: '#3760bf',
            };
        term.options.theme = newTerminalTheme;

        // Update UI container backgrounds
        const fileSidebar = document.getElementById('fileSidebar');
        const terminalContainer = document.getElementById('terminalContainer');
        const statusBar = document.getElementById('statusBar');
        const fileHeader = document.getElementById('fileHeader');
        const refreshBtn = document.getElementById('refreshBtn');

        if (fileSidebar) {
          fileSidebar.style.background = getSidebarBackground(newColors.isDark);
          fileSidebar.style.borderRight = `1px solid ${newColors.border}`;
        }
        if (terminalContainer) {
          terminalContainer.style.background = getTerminalBackground(newColors.isDark);
        }
        if (statusBar) {
          statusBar.style.background = newColors.isDark ? '#24283b' : '#dfe0e8';
          statusBar.style.border = `1px solid ${newColors.isDark ? '#414868' : '#c4c6d4'}`;
          statusBar.style.color = newColors.isDark ? '#a9b1d6' : '#6172b0';
        }
        if (fileHeader) {
          fileHeader.style.borderBottom = `1px solid ${newColors.border}`;
          fileHeader.style.color = newColors.foreground;
        }
        if (refreshBtn) {
          refreshBtn.style.background = newColors.border;
          refreshBtn.style.color = newColors.foreground;
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  function checkAndReportSharedArrayBufferSupport() {
    const { hasSharedArrayBuffer, isCrossOriginIsolated, isSupported } = checkSharedArrayBufferSupport();

    if (!isSupported) {
      const indicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');

      if (statusText) statusText.textContent = 'Limited Mode';
      if (indicator) {
        const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--ifm-color-danger').trim();
        indicator.style.color = dangerColor;
        indicator.innerHTML = `
          <span>●</span>
          <span id="statusText" style="cursor: help;" title="SharedArrayBuffer not available. Multi-threading disabled. ${!isCrossOriginIsolated ? 'Cross-Origin Isolation required.' : ''}">Limited Mode</span>
        `;
      }

      term.writeln('\x1b[93m⚠ Warning: SharedArrayBuffer not available\x1b[0m');
      term.writeln('\x1b[93mMulti-threading is disabled. Performance may be limited.\x1b[0m');

      if (!isCrossOriginIsolated) {
        term.writeln('\x1b[93mCross-Origin Isolation is not enabled.\x1b[0m');
        term.writeln('\x1b[93mTry refreshing the page or using a different browser.\x1b[0m');
      }

      term.writeln('');

      return false;
    }

    return true;
  }

  function initWorker() {
    worker = new Worker('/occ-worker.js');

    worker.onmessage = (e) => {
      handleWorkerMessage(e.data);
    };

    worker.onerror = (error) => {
      term.writeln(`\x1b[91mWorker error: ${error.message}\x1b[0m\r\n`);
    };
  }

  function handleWorkerMessage(msg: any) {
    switch (msg.type) {
      case 'ready':
        workerReady = true;
        const hasFullSupport = checkAndReportSharedArrayBufferSupport();
        setStatus(hasFullSupport ? 'Ready' : 'Limited Mode', hasFullSupport);
        term.writeln('\x1b[1;34m╔═══════════════════════════════════════════════════════════════╗');
        term.writeln('\x1b[1;34m║         Welcome to OCC WebAssembly Interactive Demo!         ║');
        term.writeln('\x1b[1;34m╚═══════════════════════════════════════════════════════════════╝\x1b[0m');
        term.writeln('');
        term.writeln('\x1b[1mTry these example commands:\x1b[0m');
        term.writeln('  \x1b[33mls\x1b[0m              - List pre-loaded files');
        term.writeln('  \x1b[33mcat water.xyz\x1b[0m   - View water molecule structure');
        term.writeln('  \x1b[33mcat urea.cif\x1b[0m    - View urea crystal structure');
        term.writeln('  \x1b[33mhelp\x1b[0m            - Show all available commands');
        term.writeln('');
        term.writeln('\x1b[32m✓ Ready\x1b[0m');
        writePrompt();
        refreshFileList();
        break;
      case 'error':
        term.writeln(`\x1b[91m${msg.text}\x1b[0m`);
        term.scrollToBottom();
        break;
      case 'ls':
        msg.files.forEach((f: string) => term.writeln(f));
        term.writeln('');
        term.scrollToBottom();
        isRunningCommand = false;
        writePrompt();
        break;
      case 'cat':
        // Write content preserving original formatting
        const lines = msg.content.split('\n');
        lines.forEach((line: string, index: number) => {
          // Don't add extra newline for last empty line
          if (index === lines.length - 1 && line === '') {
            return;
          }
          term.write(line + '\r\n');
        });
        term.write('\r\n');
        term.scrollToBottom();
        isRunningCommand = false;
        writePrompt();
        break;
      case 'pwd':
        cwd = msg.path;
        term.writeln(cwd + '\r\n');
        isRunningCommand = false;
        writePrompt();
        break;
      case 'cd':
        cwd = msg.path;
        isRunningCommand = false;
        writePrompt();
        break;
      case 'mkdir':
        isRunningCommand = false;
        writePrompt();
        refreshFileList();
        break;
      case 'writeFile':
      case 'syncFiles':
        refreshFileList();
        break;
    }
  }

  function writePrompt() {
    term.write(`\r\n\x1b[36m${cwd}\x1b[0m \x1b[32m$\x1b[0m `);
    // Ensure cursor is visible
    setTimeout(() => {
      term.scrollToBottom();
      const buffer = term.buffer.active;
      term.scrollToLine(buffer.baseY + buffer.cursorY);
    }, 0);
  }

  term.onData((data: string) => {
    if (isRunningCommand) return;

    if (data === '\x1b[A') {
      // Arrow Up
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        term.write('\r\x1b[K');
        writePrompt();
        historyIndex++;
        currentLine = commandHistory[commandHistory.length - 1 - historyIndex];
        term.write(currentLine);
      }
      return;
    }

    if (data === '\x1b[B') {
      // Arrow Down
      if (historyIndex > 0) {
        term.write('\r\x1b[K');
        writePrompt();
        historyIndex--;
        currentLine = commandHistory[commandHistory.length - 1 - historyIndex];
        term.write(currentLine);
      } else if (historyIndex === 0) {
        term.write('\r\x1b[K');
        writePrompt();
        historyIndex = -1;
        currentLine = '';
      }
      return;
    }

    if (data === '\r') {
      // Enter
      term.write('\r\n');
      if (currentLine.trim()) {
        commandHistory.push(currentLine.trim());
        historyIndex = -1;
        handleCommand(currentLine.trim());
        currentLine = '';
      } else {
        writePrompt();
      }
      return;
    }

    if (data === '\x7f') {
      // Backspace
      if (currentLine.length > 0) {
        currentLine = currentLine.slice(0, -1);
        term.write('\b \b');
      }
      return;
    }

    if (data === '\x03') {
      // Ctrl+C
      term.write('^C\r\n');
      currentLine = '';
      isRunningCommand = false;
      writePrompt();
      return;
    }

    // Regular character input
    if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7e)) {
      currentLine += data;
      term.write(data);
    }
  });

  function fitTerminal() {
    if (fitAddon) {
      fitAddon.fit();
    }
  }

  window.addEventListener('resize', fitTerminal);
  setTimeout(fitTerminal, 100);

  async function handleCommand(cmdLine: string) {
    if (!workerReady || !worker) {
      term.writeln('\x1b[91mModule not ready yet, please wait...\x1b[0m\r\n');
      writePrompt();
      return;
    }

    isRunningCommand = true;

    const parts = cmdLine.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'clear':
          term.clear();
          isRunningCommand = false;
          writePrompt();
          break;

        case 'pwd':
          worker.postMessage({ type: 'pwd' });
          break;

        case 'cd':
          let targetPath;
          if (args.length === 0) {
            targetPath = '/';
          } else if (args[0] === '..') {
            if (cwd !== '/') {
              targetPath = cwd.substring(0, cwd.lastIndexOf('/')) || '/';
            } else {
              targetPath = '/';
            }
          } else if (args[0].startsWith('/')) {
            targetPath = args[0];
          } else {
            targetPath = cwd === '/' ? '/' + args[0] : cwd + '/' + args[0];
          }
          worker.postMessage({ type: 'cd', data: { path: targetPath } });
          break;

        case 'ls':
          const targetDir = args.length > 0 ? args[0] : cwd;
          worker.postMessage({ type: 'ls', data: { path: targetDir } });
          break;

        case 'mkdir':
          if (args.length === 0) {
            term.writeln('mkdir: missing operand\r\n');
            isRunningCommand = false;
            writePrompt();
          } else {
            const mkdirPath = args[0].startsWith('/')
              ? args[0]
              : cwd === '/'
              ? '/' + args[0]
              : cwd + '/' + args[0];
            worker.postMessage({ type: 'mkdir', data: { path: mkdirPath } });
          }
          break;

        case 'cat':
          if (args.length === 0) {
            term.writeln('cat: missing operand\r\n');
            isRunningCommand = false;
            writePrompt();
          } else {
            const catPath = args[0].startsWith('/')
              ? args[0]
              : cwd === '/'
              ? '/' + args[0]
              : cwd + '/' + args[0];
            worker.postMessage({ type: 'cat', data: { path: catPath } });
          }
          break;

        case 'help':
          term.writeln('\x1b[1mAvailable commands:\x1b[0m');
          term.writeln('  \x1b[36mocc <args>\x1b[0m  - Run OCC with arguments');
          term.writeln('  \x1b[36mls [dir]\x1b[0m    - List directory contents');
          term.writeln('  \x1b[36mcd <dir>\x1b[0m    - Change directory');
          term.writeln('  \x1b[36mpwd\x1b[0m         - Print working directory');
          term.writeln('  \x1b[36mcat <file>\x1b[0m  - Display file contents');
          term.writeln('  \x1b[36mmkdir <dir>\x1b[0m - Create directory');
          term.writeln('  \x1b[36mclear\x1b[0m       - Clear the terminal');
          term.writeln('  \x1b[36mhelp\x1b[0m        - Show this help');
          term.writeln('');
          term.writeln('\x1b[1mPre-loaded sample files:\x1b[0m');
          term.writeln('  \x1b[33mwater.xyz\x1b[0m   - Water molecule (XYZ format)');
          term.writeln('  \x1b[33murea.cif\x1b[0m    - Urea crystal structure (CIF format)');
          term.writeln('');
          term.writeln('\x1b[90mTip: Use Up/Down arrows for command history');
          term.writeln('Tip: Drag & drop files to upload to the virtual filesystem\x1b[0m\r\n');
          isRunningCommand = false;
          writePrompt();
          break;

        case 'occ':
          await runOccCommand(args);
          return;

        default:
          term.writeln(`\x1b[91mCommand not found: ${cmd}\x1b[0m`);
          term.writeln('Type "help" for available commands\r\n');
          isRunningCommand = false;
          writePrompt();
      }
    } catch (e: any) {
      term.writeln(`\x1b[91mError: ${e.message}\x1b[0m\r\n`);
      isRunningCommand = false;
      writePrompt();
    }
  }

  async function runOccCommand(args: string[]) {
    if (!worker) return;

    return new Promise((resolve, reject) => {
      setStatus('Running...', false);

      const getFilesPromise = new Promise((resolveFiles) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'getFiles') {
            worker!.removeEventListener('message', handler);
            resolveFiles(e.data.files);
          }
        };
        worker!.addEventListener('message', handler);
        worker!.postMessage({ type: 'getFiles', data: { path: '/' } });
      });

      getFilesPromise.then((files) => {
        const occWorker = new Worker('/occ-run-worker.js');

        occWorker.onmessage = (e) => {
          const { type, text, code, files: outputFiles } = e.data;

          switch (type) {
            case 'output':
              term.writeln(text);
              term.scrollToBottom();
              break;
            case 'error':
              term.writeln(`\x1b[91m${text}\x1b[0m`);
              term.scrollToBottom();
              break;
            case 'ready':
              break;
            case 'exit':
              worker!.postMessage({
                type: 'syncFiles',
                data: { files: outputFiles },
              });

              setStatus(code === 0 ? 'Ready' : 'Error', code === 0);
              occWorker.terminate();
              isRunningCommand = false;
              term.scrollToBottom();
              writePrompt();
              resolve(code);
              break;
          }
        };

        occWorker.onerror = (error) => {
          term.writeln(`\x1b[91mWorker error: ${error.message}\x1b[0m`);
          setStatus('Error', false);
          occWorker.terminate();
          isRunningCommand = false;
          writePrompt();
          reject(error);
        };

        occWorker.postMessage({
          command: args.join(' '),
          cwd: cwd,
          files: files,
        });
      });
    });
  }

  function setStatus(text: string, isReady: boolean) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const colors = getThemeColors();

    if (statusText) statusText.textContent = text;
    if (indicator) {
      indicator.className =
        isReady ? 'status-ready' : text === 'Error' ? 'status-error' : '';

      // Use CSS variables for status colors
      const successColor = getComputedStyle(document.documentElement).getPropertyValue('--ifm-color-success').trim();
      const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--ifm-color-danger').trim();
      const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--ifm-color-secondary').trim();

      indicator.style.color = isReady ? successColor : text === 'Error' ? dangerColor : secondaryColor;
      indicator.style.cursor = 'help';

      // Update icon based on status
      const icon = isReady ? '✓' : text === 'Error' || text === 'Limited Mode' ? '●' : '○';

      // Get diagnostic info
      const { hasSharedArrayBuffer, isCrossOriginIsolated, hasWorker } = checkSharedArrayBufferSupport();

      const diagnostics = [
        `SharedArrayBuffer: ${hasSharedArrayBuffer ? '✓' : '✗'}`,
        `Cross-Origin Isolated: ${isCrossOriginIsolated ? '✓' : '✗'}`,
        `Web Workers: ${hasWorker ? '✓' : '✗'}`,
        `User Agent: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`
      ].join('\n');

      indicator.innerHTML = `
        <span>${icon}</span>
        <span id="statusText" title="${diagnostics}">${text}</span>
      `;

      // Make it clickable to show details in terminal
      indicator.onclick = () => {
        if (term) {
          term.writeln('\r\n\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
          term.writeln('\x1b[1mSystem Diagnostics:\x1b[0m');
          term.writeln('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
          term.writeln('');
          term.writeln(`  SharedArrayBuffer:      ${hasSharedArrayBuffer ? '\x1b[32m✓ Supported\x1b[0m' : '\x1b[31m✗ Not available\x1b[0m'}`);
          term.writeln(`  Cross-Origin Isolated:  ${isCrossOriginIsolated ? '\x1b[32m✓ Enabled\x1b[0m' : '\x1b[31m✗ Disabled\x1b[0m'}`);
          term.writeln(`  Web Workers:            ${hasWorker ? '\x1b[32m✓ Supported\x1b[0m' : '\x1b[31m✗ Not available\x1b[0m'}`);
          term.writeln(`  Multi-threading:        ${hasSharedArrayBuffer && isCrossOriginIsolated ? '\x1b[32m✓ Available\x1b[0m' : '\x1b[33m⚠ Limited\x1b[0m'}`);
          term.writeln('');
          term.writeln(`  Browser: ${navigator.userAgent}`);
          term.writeln('');
          term.writeln('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
          if (!isRunningCommand) {
            writePrompt();
          }
        }
      };
    }
  }

  function refreshFileList() {
    if (!worker) return;

    const handler = (e: MessageEvent) => {
      if (e.data.type === 'getFiles') {
        worker!.removeEventListener('message', handler);
        updateFileList(e.data.files);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'getFiles', data: { path: '/' } });
  }

  const expandedDirs = new Set(['/']);

  function updateFileList(files: Record<string, any>) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    const paths = Object.keys(files).sort();

    if (paths.length === 0) {
      fileList.innerHTML =
        '<div style="padding: 2rem 1rem; text-align: center; color: #565f89; font-size: 0.85rem;">No files</div>';
      return;
    }

    const tree: any = {};
    paths.forEach((path) => {
      const parts = path.split('/').filter((p) => p);
      let current = tree;

      parts.forEach((part, idx) => {
        if (idx === parts.length - 1) {
          if (!current._files) current._files = [];
          current._files.push({ name: part, path: path });
        } else {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      });
    });

    function renderTree(node: any, level = 0, parentPath = ''): string {
      let html = '';

      for (const [name, children] of Object.entries(node)) {
        if (name === '_files') continue;

        const dirPath = parentPath + '/' + name;
        const isExpanded = expandedDirs.has(dirPath);
        const indent = level * 1.5;

        html += `
          <div class="dir-item" data-dir="${dirPath}" style="padding: 0.4rem 1rem; padding-left: ${
          indent + 1
        }rem; color: var(--ifm-font-color-base); cursor: pointer; display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; transition: background 0.15s; user-select: none; font-weight: 500;">
            <span style="font-size: 0.6rem; width: 12px; transition: transform 0.15s; flex-shrink: 0; ${
              isExpanded ? 'transform: rotate(90deg);' : ''
            }">▶</span>
            <span>${name}/</span>
          </div>
          <div class="dir-children" data-parent="${dirPath}" style="display: ${
          isExpanded ? 'block' : 'none'
        };">
            ${renderTree(children, level + 1, dirPath)}
          </div>
        `;
      }

      if (node._files) {
        node._files.forEach((file: any) => {
          const indent = level * 1.5;
          html += `
            <div class="file-item" data-path="${file.path}" style="padding: 0.4rem 1rem; padding-left: ${
            indent + 1.2
          }rem; color: var(--ifm-font-color-base); cursor: pointer; display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; transition: background 0.15s; user-select: none;">
              <span>${file.name}</span>
            </div>
          `;
        });
      }

      return html;
    }

    fileList.innerHTML = renderTree(tree);

    fileList.querySelectorAll('.dir-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const dirPath = (item as HTMLElement).dataset.dir!;
        const arrow = item.querySelector('span');
        const children = fileList.querySelector(`.dir-children[data-parent="${dirPath}"]`) as HTMLElement;

        if (expandedDirs.has(dirPath)) {
          expandedDirs.delete(dirPath);
          if (arrow) arrow.style.transform = '';
          if (children) children.style.display = 'none';
        } else {
          expandedDirs.add(dirPath);
          if (arrow) arrow.style.transform = 'rotate(90deg)';
          if (children) children.style.display = 'block';
        }
      });
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.background = 'var(--ifm-color-emphasis-100)';
      });
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.background = '';
      });
    });

    fileList.querySelectorAll('.file-item').forEach((item) => {
      item.addEventListener('click', () => {
        const path = (item as HTMLElement).dataset.path!;
        downloadFile(path, files[path]);
      });
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.background = 'var(--ifm-color-emphasis-100)';
      });
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.background = '';
      });
    });
  }

  function downloadFile(path: string, content: any) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    term.writeln(`\x1b[32mDownloaded: ${path}\x1b[0m\r\n`);
  }

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshFileList);
  }

  // Sidebar toggle for mobile
  const sidebarToggle = document.getElementById('sidebarToggle');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const fileSidebar = document.getElementById('fileSidebar');
  let sidebarCollapsed = false;

  function updateSidebarVisibility() {
    const isMobile = window.innerWidth <= 768;
    const terminalContainer = document.getElementById('terminalContainer');

    if (sidebarToggle && closeSidebarBtn && fileSidebar && terminalContainer) {
      if (isMobile) {
        sidebarToggle.style.display = sidebarCollapsed ? 'block' : 'none';
        closeSidebarBtn.style.display = 'inline-block';
        fileSidebar.style.position = 'fixed';
        fileSidebar.style.left = '0';
        fileSidebar.style.top = 'var(--ifm-navbar-height)';
        fileSidebar.style.height = 'calc(100% - var(--ifm-navbar-height))';
        fileSidebar.style.zIndex = '1000';
        fileSidebar.style.boxShadow = '2px 0 8px rgba(0,0,0,0.2)';
        terminalContainer.style.paddingLeft = '0.5rem';
        if (sidebarCollapsed) {
          fileSidebar.style.transform = 'translateX(-100%)';
        } else {
          fileSidebar.style.transform = 'translateX(0)';
        }
      } else {
        sidebarToggle.style.display = 'none';
        closeSidebarBtn.style.display = 'none';
        fileSidebar.style.position = 'relative';
        fileSidebar.style.transform = 'translateX(0)';
        fileSidebar.style.boxShadow = 'none';
        terminalContainer.style.paddingLeft = '1rem';
        sidebarCollapsed = false;
      }
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebarCollapsed = false;
      updateSidebarVisibility();
    });
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebarCollapsed = true;
      updateSidebarVisibility();
    });
  }

  window.addEventListener('resize', updateSidebarVisibility);
  updateSidebarVisibility();

  // Drag and drop
  const mainContent = app.querySelector('div:nth-child(2)') as HTMLElement;
  const dropOverlay = document.getElementById('dropOverlay');

  if (mainContent && dropOverlay) {
    mainContent.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropOverlay.style.display = 'flex';
    });

    mainContent.addEventListener('dragleave', (e) => {
      if (e.target === mainContent) {
        dropOverlay.style.display = 'none';
      }
    });

    mainContent.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropOverlay.style.display = 'none';

      if (!worker) return;

      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      for (const file of files) {
        const content = await file.arrayBuffer();
        const uint8Array = new Uint8Array(content);

        worker.postMessage({
          type: 'writeFile',
          data: {
            path: cwd === '/' ? '/' + file.name : cwd + '/' + file.name,
            content: uint8Array,
          },
        });

        term.writeln(`\x1b[32mUploaded: ${file.name}\x1b[0m\r\n`);
      }

      setTimeout(refreshFileList, 100);
    });
  }

  setStatus('Initializing...', false);
  initWorker();
}
