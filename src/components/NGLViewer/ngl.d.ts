declare module 'ngl' {
  export class Stage {
    constructor(element: HTMLElement, params?: { backgroundColor?: string });
    loadFile(file: string | Blob, params?: { ext?: string }): Promise<Component>;
    removeAllComponents(): void;
    handleResize(): void;
    dispose(): void;
  }

  export class Component {
    addRepresentation(type: string, params?: any): any;
    autoView(): void;
    trajList?: Trajectory[];
  }

  export class Trajectory {
    numframes: number;
    signals: {
      frameChanged: {
        add(callback: (frame: number) => void): void;
      };
    };
    setFrame(frame: number): void;
  }

  export class TrajectoryPlayer {
    constructor(trajectory: Trajectory, params?: {
      step?: number;
      timeout?: number;
      mode?: string;
      interpolateType?: string;
      interpolateStep?: number;
    });
    play(): void;
    pause(): void;
    traj?: Trajectory;
  }
}
