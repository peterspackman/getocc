// Web Worker for running OCC CLI with threading support
// Each worker instance runs one command then terminates

let moduleReady = false;

self.onmessage = async function(e) {
    const { type, data } = e.data;

    if (!moduleReady && type !== 'init') {
        self.postMessage({ type: 'error', text: 'Module not ready' });
        return;
    }

    switch (type) {
        case 'ls':
            executeLs(data);
            break;
        case 'cat':
            executeCat(data);
            break;
        case 'mkdir':
            executeMkdir(data);
            break;
        case 'cd':
            executeCd(data);
            break;
        case 'pwd':
            self.postMessage({ type: 'pwd', path: Module.FS.cwd() });
            break;
        case 'writeFile':
            executeWriteFile(data);
            break;
        case 'getFiles':
            executeGetFiles(data);
            break;
        case 'syncFiles':
            executeSyncFiles(data);
            break;
    }
};

function executeGetFiles(data) {
    const { path } = data;
    try {
        const files = {};

        function collectFiles(dir) {
            const contents = Module.FS.readdir(dir);
            for (const item of contents) {
                if (item === '.' || item === '..') continue;

                const fullPath = dir === '/' ? '/' + item : dir + '/' + item;
                try {
                    const stat = Module.FS.stat(fullPath);
                    if (Module.FS.isDir(stat.mode)) {
                        collectFiles(fullPath);
                    } else {
                        files[fullPath] = Module.FS.readFile(fullPath);
                    }
                } catch (e) {
                    // Skip files we can't read
                }
            }
        }

        collectFiles(path || '/');
        self.postMessage({ type: 'getFiles', files });
    } catch (e) {
        self.postMessage({ type: 'error', text: `getFiles: ${e.message}` });
    }
}

function executeSyncFiles(data) {
    const { files } = data;
    try {
        for (const [path, content] of Object.entries(files)) {
            // Create parent directories if needed
            const parts = path.split('/').filter(p => p);
            let currentPath = '/';
            for (let i = 0; i < parts.length - 1; i++) {
                currentPath += parts[i];
                try {
                    Module.FS.mkdir(currentPath);
                } catch (e) {
                    // Directory might already exist
                }
                currentPath += '/';
            }

            // Write the file
            Module.FS.writeFile(path, content);
        }
        self.postMessage({ type: 'syncFiles', success: true });
    } catch (e) {
        self.postMessage({ type: 'error', text: `syncFiles: ${e.message}` });
    }
}

function executeLs(data) {
    const { path } = data;
    try {
        const stat = Module.FS.stat(path);
        let files = [];

        if (Module.FS.isDir(stat.mode)) {
            const contents = Module.FS.readdir(path);
            files = contents.filter(f => f !== '.' && f !== '..');
        } else {
            files = [path.split('/').pop()];
        }

        self.postMessage({ type: 'ls', files });
    } catch (e) {
        self.postMessage({ type: 'error', text: `ls: cannot access '${path}': No such file or directory` });
    }
}

function executeCat(data) {
    const { path } = data;
    try {
        const content = Module.FS.readFile(path, { encoding: 'utf8' });
        self.postMessage({ type: 'cat', content });
    } catch (e) {
        self.postMessage({ type: 'error', text: `cat: ${path}: No such file or directory` });
    }
}

function executeMkdir(data) {
    const { path } = data;
    try {
        Module.FS.mkdir(path);
        self.postMessage({ type: 'mkdir', success: true });
    } catch (e) {
        self.postMessage({ type: 'error', text: `mkdir: cannot create directory '${path}': ${e.message}` });
    }
}

function executeCd(data) {
    const { path } = data;
    try {
        Module.FS.chdir(path);
        self.postMessage({ type: 'cd', path: Module.FS.cwd() });
    } catch (e) {
        self.postMessage({ type: 'error', text: `cd: ${path}: No such file or directory` });
    }
}

function executeWriteFile(data) {
    const { path, content } = data;
    try {
        Module.FS.writeFile(path, content);
        self.postMessage({ type: 'writeFile', success: true });
    } catch (e) {
        self.postMessage({ type: 'error', text: `write: ${path}: ${e.message}` });
    }
}

// Set up Module configuration BEFORE loading
var Module = {
    print: (text) => {
        self.postMessage({ type: 'output', text });
    },
    printErr: (text) => {
        self.postMessage({ type: 'error', text });
    },
    onAbort: (msg) => {
        self.postMessage({ type: 'error', text: `Module aborted: ${msg}` });
        self.postMessage({ type: 'exit', code: 1 });
    },
    onRuntimeInitialized: () => {
        try {
            // Create default water.xyz in root directory
            const waterXyz = `3
Water molecule
O          0.00000        0.00000        0.11779
H          0.00000        0.75545       -0.47116
H          0.00000       -0.75545       -0.47116
`;
            Module.FS.writeFile('/water.xyz', waterXyz);

            // Create urea.cif sample
            const ureaCif = `data_urea
_symmetry_space_group_name_H-M   'P -4 21 m'
_symmetry_Int_Tables_number      113
loop_
_symmetry_equiv_pos_site_id
_symmetry_equiv_pos_as_xyz
1 x,y,z
2 -y,x,-z
3 -x,-y,z
4 y,-x,-z
5 1/2-x,1/2+y,-z
6 1/2+y,1/2+x,z
7 1/2+x,1/2-y,-z
8 1/2-y,1/2-x,z
_cell_length_a                   5.582
_cell_length_b                   5.582
_cell_length_c                   4.686
_cell_angle_alpha                90
_cell_angle_beta                 90
_cell_angle_gamma                90
_cell_volume                     146.01
_cell_formula_units_Z            2
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.00000 0.50000 0.32720
H1 H 0.26900 0.76900 0.27900
H2 H 0.14200 0.64200 -0.02800
N1 N 0.14550 0.64550 0.18000
O1 O 0.00000 0.50000 0.59660
N1B N -0.14550 0.35450 0.18000
H1B H -0.26900 0.23100 0.27900
H2B H -0.14200 0.35800 -0.02800
`;
            Module.FS.writeFile('/urea.cif', ureaCif);

            moduleReady = true;
            self.postMessage({ type: 'ready' });
        } catch (error) {
            self.postMessage({ type: 'error', text: `Initialization error: ${error.message}` });
            self.postMessage({ type: 'exit', code: 1 });
        }
    },
    locateFile: (path) => {
        if (path.endsWith('.wasm') || path.endsWith('.data')) {
            const base = self.location.href.substring(0, self.location.href.lastIndexOf('/'));
            return base + '/../dist/' + path;
        }
        return path;
    },
    noInitialRun: true
};

// Load the OCC module
try {
    importScripts('../dist/occ.js');
} catch (error) {
    self.postMessage({ type: 'error', text: `Failed to load occ.js: ${error.message}` });
    self.postMessage({ type: 'exit', code: 1 });
}
