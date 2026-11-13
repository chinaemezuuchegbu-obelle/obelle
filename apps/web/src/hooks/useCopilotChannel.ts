// TODO: Implement targeted interviewer-only LiveKit data channel events.
export function useCopilotChannel() {
  return { suggestions: [], status: "disconnected" as const };
}
