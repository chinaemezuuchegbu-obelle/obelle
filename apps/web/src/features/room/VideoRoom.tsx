import { useEffect, useState } from "react";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useParticipants,
  useTracks,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { ParticipantRole } from "../lobby/PreJoinLobby";
import { InterviewAssistantPanel } from "./InterviewAssistantPanel";
import { AbuchiAvatar } from "./AbuchiAvatar";

interface VideoRoomProps {
  roomName: string;
  token: string;
  serverUrl: string;
  role: ParticipantRole;
  participantName: string;
  interviewDomain: string;
  onLeave: () => void;
}

export function VideoRoom({ roomName, token, serverUrl, role, participantName, interviewDomain, onLeave }: VideoRoomProps) {
  const [showChat, setShowChat] = useState(true);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onLeave}
      onConnected={() => setConnectedAt((startedAt) => startedAt ?? Date.now())}
      data-lk-theme="default"
      className="obelle-room flex h-screen flex-col bg-black text-zinc-100"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-300" />
          <h1 className="text-sm font-semibold tracking-wide">Obelle Interview</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 md:gap-4">
          <span className="hidden lg:inline">Domain: <strong className="text-zinc-200">{interviewDomain}</strong></span>
          <SessionStatus connectedAt={connectedAt} role={role} roomName={roomName} token={token} />
          <span className="hidden sm:inline">Room: <strong className="text-zinc-200">{roomName}</strong></span>
          <span>User: <strong className="text-zinc-200">{participantName}</strong></span>
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-semibold uppercase tracking-wider text-zinc-300">{role}</span>
          <button type="button" aria-expanded={showChat} onClick={() => setShowChat((visible) => !visible)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-medium text-zinc-200 transition hover:bg-zinc-800">
            {showChat ? "Hide panel" : "Open chat"}
          </button>
          <LeaveButton />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 md:flex-row md:p-6">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <div className="min-h-0 flex-1 p-2 md:p-4">
            <CustomVideoGrid />
          </div>
          <div className="flex shrink-0 justify-center border-t border-zinc-800 bg-zinc-950 px-3 py-2 md:px-6 md:py-3">
            <ControlBar controls={{ chat: false, screenShare: true, settings: false }} />
          </div>
        </main>

        {showChat && <InterviewAssistantPanel role={role} />}
      </div>

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function SessionStatus({ connectedAt, role, roomName, token }: { connectedAt: number | null; role: ParticipantRole; roomName: string; token: string }) {
  const [now, setNow] = useState(Date.now());
  const [recordingIndicator, setRecordingIndicator] = useState(false);
  const [recordingPending, setRecordingPending] = useState(false);
  const [recordingError, setRecordingError] = useState("");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const elapsedSeconds = connectedAt === null ? 0 : Math.floor((now - connectedAt) / 1000);
  const timer = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;

  async function toggleRecording() {
    if (recordingPending) return;
    setRecordingPending(true);
    setRecordingError("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/rooms/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomName, recording: !recordingIndicator }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result ? String(result.error) : "Recording could not be updated.";
        throw new Error(message);
      }
      if (typeof result !== "object" || result === null || !("recording" in result) || typeof result.recording !== "boolean") {
        throw new Error("Recording service returned an invalid response.");
      }
      setRecordingIndicator(result.recording);
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : "Recording could not be updated.");
    } finally {
      setRecordingPending(false);
    }
  }

  return (
    <div className="hidden items-center gap-3 rounded-full border border-zinc-800 bg-black px-3 py-1.5 sm:flex" aria-label="Session status">
      <span className="font-mono text-xs tabular-nums text-zinc-300" aria-label="Session duration">{timer}</span>
      {role === "interviewer" && (
        <>
          <span className="h-4 border-l border-zinc-800" aria-hidden="true" />
          <div className="relative">
            <button
              type="button"
              aria-pressed={recordingIndicator}
              disabled={recordingPending}
              title="Records only the interviewer’s own audio and camera tracks. Candidate and Abuchi tracks are excluded."
              onClick={() => void toggleRecording()}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-wait disabled:opacity-60 ${recordingIndicator ? "border-rose-800 bg-rose-950 text-rose-200" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
            >
              {recordingPending ? "Updating…" : recordingIndicator ? "Stop recording" : "Record me"}
            </button>
            {recordingError && <span role="status" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-left text-xs text-zinc-300 shadow-xl">{recordingError}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function CustomVideoGrid() {
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const avatarAgentIdentities = new Set(
    participants
      .map((participant) => participant.attributes["lk.publish_on_behalf"])
      .filter((identity): identity is string => Boolean(identity)),
  );
  const visibleTracks = tracks.filter((trackRef) => {
    const participant = trackRef.participant;
    const isAvatarWorker = Boolean(participant.attributes["lk.publish_on_behalf"]);
    const isAvatarBackedAgent = avatarAgentIdentities.has(participant.identity);
    let isAbuchi = false;
    try {
      isAbuchi = JSON.parse(participant.metadata || "{}").role === "ai-interviewer";
    } catch {
      // Keep regular participants visible if their metadata isn't JSON.
    }
    return !isAvatarWorker && !isAvatarBackedAgent && !isAbuchi;
  });

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <GridLayout tracks={visibleTracks} className="h-full min-h-0 w-full">
        <ParticipantTile />
      </GridLayout>
      <AbuchiAvatar />
    </div>
  );
}

function LeaveButton() {
  const room = useRoomContext();
  return (
    <button
      type="button"
      onClick={() => void room.disconnect()}
      className="rounded-lg bg-zinc-200 px-3 py-2 font-semibold text-zinc-950 transition hover:bg-white"
    >
      Leave
    </button>
  );
}
