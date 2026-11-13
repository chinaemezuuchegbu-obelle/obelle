import { AgentDispatchClient, EgressClient, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";
import { env } from "./env.js";

export function createLiveKitClients() {
  if (!env.LIVEKIT_WS_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) return undefined;
  const httpUrl = env.LIVEKIT_WS_URL.replace("ws://", "http://").replace("wss://", "https://");
  return {
    rooms: new RoomServiceClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET),
    agents: new AgentDispatchClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET),
    egress: new EgressClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET),
    webhook: new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET),
  };
}
