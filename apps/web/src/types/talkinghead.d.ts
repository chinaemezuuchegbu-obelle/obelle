declare module "@met4citizen/talkinghead" {
  export class TalkingHead {
    constructor(container: HTMLElement, options?: Record<string, unknown>);
    opt: { update?: (deltaMs: number) => void };
    mtAvatar?: Record<string, Record<string, unknown> | undefined>;
    showAvatar(avatar: { url: string; body?: string; avatarMood?: string }): Promise<void>;
    lookAtCamera(durationMs: number): void;
    dispose(): void;
  }
}

declare module "@met4citizen/headaudio/modules/headaudio.mjs" {
  export class HeadAudio extends AudioWorkletNode {
    constructor(context: AudioContext, options?: { parameterData?: Record<string, number> });
    onvalue: ((key: string, value: number) => void) | null;
    loadModel(url: string): Promise<void>;
    update(deltaMs: number): void;
    stop(): void;
  }
}

declare module "@met4citizen/headaudio/dist/*.mjs?url" {
  const url: string;
  export default url;
}

declare module "@met4citizen/headaudio/dist/*.bin?url" {
  const url: string;
  export default url;
}
