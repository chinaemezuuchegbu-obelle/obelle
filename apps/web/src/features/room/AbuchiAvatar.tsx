import { useEffect, useRef, useState } from "react";
import { useVoiceAssistant } from "@livekit/components-react";
import { HeadAudio } from "@met4citizen/headaudio/modules/headaudio.mjs";
import headAudioWorkletUrl from "@met4citizen/headaudio/dist/headworklet.min.mjs?url";
import headAudioModelUrl from "@met4citizen/headaudio/dist/model-en-mixed.bin?url";

interface TalkingHeadInstance {
  opt: { update?: (deltaMs: number) => void };
  mtAvatar?: Record<string, Record<string, unknown> | undefined>;
  showAvatar(avatar: { url: string; body?: string; avatarMood?: string }): Promise<void>;
  lookAtCamera(durationMs: number): void;
  dispose(): void;
}

// This model URL, including its facial morph targets, is used in TalkingHead's
// own browser examples. Ready Player Me omits those targets unless requested.
const DEFAULT_MODEL_URL =
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png";

/** Renders Abuchi in this browser and drives her mouth from the LiveKit agent audio. */
export function AbuchiAvatar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { audioTrack, state } = useVoiceAssistant();
  const [error, setError] = useState<string | null>(null);
  const [audioGraphReady, setAudioGraphReady] = useState(false);
  const mediaTrack = audioTrack?.publication.track?.mediaStreamTrack;
  const audioGraphRef = useRef<{ context: AudioContext; lipsync: HeadAudio; source?: MediaStreamAudioSourceNode } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let head: TalkingHeadInstance | undefined;
    let context: AudioContext | undefined;
    let lipsync: HeadAudio | undefined;
    let loadingStage = "loading avatar renderer";

    async function initialize() {
      if (!containerRef.current) return;
      setError(null);
      try {
        const { TalkingHead } = await import("@met4citizen/talkinghead");
        if (cancelled || !containerRef.current) return;

        head = new TalkingHead(containerRef.current, {
          cameraView: "upper",
          cameraZoomEnable: false,
          cameraPanEnable: false,
          lipsyncModules: [],
          modelFPS: 30,
        });
        const modelUrl = import.meta.env.VITE_ABUCHI_AVATAR_MODEL_URL || DEFAULT_MODEL_URL;
        loadingStage = "loading the 3D model (check its URL, CORS, and rig)";
        await head.showAvatar({ url: modelUrl, body: "F", avatarMood: "neutral" });
        if (cancelled) return;
        head.lookAtCamera(1000);

        context = new AudioContext();
        loadingStage = "loading the lip-sync audio worklet";
        await context.audioWorklet.addModule(headAudioWorkletUrl);
        lipsync = new HeadAudio(context, {
          parameterData: { vadGateActiveDb: -40, vadGateInactiveDb: -60 },
        });
        loadingStage = "loading the lip-sync model";
        await lipsync.loadModel(headAudioModelUrl);
        if (cancelled) return;

        lipsync.onvalue = (key, value) => {
          const morph = head?.mtAvatar?.[key];
          if (morph) Object.assign(morph, { realtime: value, needsUpdate: true });
        };
        head.opt.update = (deltaMs: number) => lipsync?.update(deltaMs);
        await context.resume();
        audioGraphRef.current = { context, lipsync };
        setAudioGraphReady(true);
      } catch (cause) {
        if (!cancelled) {
          console.error("Could not load Abuchi's browser avatar:", cause);
          const reason = cause instanceof Error ? cause.message : String(cause);
          setError(`Avatar failed while ${loadingStage}: ${reason}`);
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      audioGraphRef.current?.source?.disconnect();
      audioGraphRef.current = null;
      lipsync?.stop();
      lipsync?.disconnect();
      head?.dispose();
      void context?.close();
    };
  }, []);

  useEffect(() => {
    const graph = audioGraphRef.current;
    graph?.source?.disconnect();
    if (graph && mediaTrack && mediaTrack.readyState === "live") {
      graph.source = graph.context.createMediaStreamSource(new MediaStream([mediaTrack]));
      graph.source.connect(graph.lipsync);
    }
    return () => {
      graph?.source?.disconnect();
      if (graph) graph.source = undefined;
    };
  }, [audioGraphReady, mediaTrack]);

  return (
    <section className="relative flex min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black lg:min-h-0" aria-label="Abuchi AI interviewer avatar">
      <div ref={containerRef} className="min-h-0 flex-1" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10">
        <div>
          <p className="text-sm font-semibold text-white">Abuchi</p>
          <p className="text-xs text-zinc-300">AI interviewer · {state}</p>
        </div>
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-label="Avatar is active" />
      </div>
      {error && <p role="status" className="absolute inset-x-3 top-3 rounded-lg bg-black/80 p-3 text-xs text-amber-200">{error}</p>}
    </section>
  );
}
