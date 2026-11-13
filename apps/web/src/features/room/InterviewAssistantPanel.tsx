import { useState } from "react";
import { Chat, useParticipants, useTranscriptions } from "@livekit/components-react";
import type { ParticipantRole } from "../lobby/PreJoinLobby";

interface InterviewAssistantPanelProps {
  role: ParticipantRole;
}

export function InterviewAssistantPanel({ role }: InterviewAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "transcript">("chat");
  const transcriptions = useTranscriptions();
  const participants = useParticipants();

  return (
    <aside className="flex h-64 min-h-0 w-full shrink-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:h-full md:w-80 lg:w-96">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          {activeTab === "chat" ? "Room chat · Everyone can see this" : role === "candidate" ? "Live transcript" : "AI copilot transcript"}
        </h2>
        <div className="flex rounded-lg border border-zinc-700 bg-black p-0.5" role="tablist" aria-label="Room panel">
          <button type="button" role="tab" aria-selected={activeTab === "chat"} onClick={() => setActiveTab("chat")} className={`rounded-md px-2.5 py-1 text-xs ${activeTab === "chat" ? "bg-zinc-200 text-zinc-950" : "text-zinc-400 hover:text-white"}`}>
            Chat
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "transcript"} onClick={() => setActiveTab("transcript")} className={`rounded-md px-2.5 py-1 text-xs ${activeTab === "transcript" ? "bg-zinc-200 text-zinc-950" : "text-zinc-400 hover:text-white"}`}>
            Transcript
          </button>
        </div>
      </div>

      {activeTab === "chat" ? (
        <div className="obelle-chat min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-black/60">
          <Chat className="h-full w-full" />
        </div>
      ) : (
        <div role="tabpanel" aria-live="polite" aria-label="Interview transcript" className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-zinc-800 bg-black/60 p-3 text-sm">
          {transcriptions.length === 0 ? (
            <p className="text-zinc-500">Waiting for spoken audio…</p>
          ) : transcriptions.slice(-50).map((item) => {
            const identity = item.participantInfo.identity;
            const speaker = participants.find((participant) => participant.identity === identity);
            let speakerName = speaker?.name || identity;
            if (speaker?.metadata) {
              try {
                const metadata = JSON.parse(speaker.metadata) as { display_name?: string };
                speakerName = metadata.display_name || speakerName;
              } catch {
                // Fall back to the LiveKit participant name if metadata is not JSON.
              }
            }
            const isFinal = item.streamInfo.attributes?.["lk.transcription_final"] === "true";
            const segmentId = item.streamInfo.attributes?.["lk.segment_id"];

            return (
              <p key={segmentId ?? item.streamInfo.id} className="leading-relaxed">
                <span className="mr-2 font-semibold text-zinc-200">{speakerName}:</span>
                <span className={isFinal ? "text-white" : "italic text-zinc-400"}>{item.text}</span>
              </p>
            );
          })}
        </div>
      )}
    </aside>
  );
}
