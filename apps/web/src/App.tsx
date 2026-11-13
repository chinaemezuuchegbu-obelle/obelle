import { useState } from "react";
import { PreJoinLobby, type InterviewContext, type ParticipantRole } from "./features/lobby/PreJoinLobby";
import { VideoRoom } from "./features/room/VideoRoom";

interface RoomConfig {
  roomName: string;
  participantName: string;
  role: ParticipantRole;
  interviewDomain: string;
  token: string;
  wsUrl: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function App() {
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(
    roomName: string,
    participantName: string,
    role: ParticipantRole,
    interviewContext: InterviewContext,
  ) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/rooms/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, participantName, role, ...interviewContext }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data
          ? String(data.error)
          : "Failed to generate a session token.";
        throw new Error(message);
      }
      if (
        typeof data !== "object" || data === null ||
        !("token" in data) || typeof data.token !== "string" ||
        !("wsUrl" in data) || typeof data.wsUrl !== "string"
      ) {
        throw new Error("The token service returned an invalid response.");
      }
      setRoomConfig({ roomName, participantName, role, interviewDomain: interviewContext.interviewDomain, token: data.token, wsUrl: data.wsUrl });
    } catch (joinError) {
      console.error(joinError);
      setError(joinError instanceof Error ? joinError.message : "Could not connect to the token server.");
    } finally {
      setLoading(false);
    }
  }

  if (roomConfig) {
    return (
      <VideoRoom
        roomName={roomConfig.roomName}
        token={roomConfig.token}
        serverUrl={roomConfig.wsUrl}
        role={roomConfig.role}
        interviewDomain={roomConfig.interviewDomain}
        participantName={roomConfig.participantName}
        onLeave={() => setRoomConfig(null)}
      />
    );
  }

  return (
    <>
      <PreJoinLobby onJoin={(roomName, participantName, role, interviewContext) => void handleJoin(roomName, participantName, role, interviewContext)} />
      {error && (
        <div role="alert" className="fixed left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 shadow-xl">
          {error}
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/80 text-zinc-300 backdrop-blur-sm" role="status">
          Connecting to secure room…
        </div>
      )}
    </>
  );
}

export default App;
