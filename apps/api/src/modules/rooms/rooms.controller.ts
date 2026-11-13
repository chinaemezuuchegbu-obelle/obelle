import { randomUUID } from "node:crypto";
import { AccessToken, EncodedFileOutput, EncodedFileType, EgressStatus, TokenVerifier } from "livekit-server-sdk";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { createLiveKitClients } from "../../config/livekit.js";

export const roomsRouter: Router = Router();

const pendingAbuchiDispatches = new Map<string, Promise<void>>();

interface InterviewContext {
  interviewDomain: string;
  candidateExperience: string;
  companyPolicies: string;
}

async function ensureAbuchiDispatched(
  roomName: string,
  interviewContext: InterviewContext,
): Promise<void> {
  const pending = pendingAbuchiDispatches.get(roomName);
  if (pending) return pending;

  const clients = createLiveKitClients();
  if (!clients) throw new Error("LiveKit service credentials are not configured.");

  const dispatchOperation = (async () => {
    const rooms = await clients.rooms.listRooms([roomName]);
    if (rooms.length === 0) {
      await clients.rooms.createRoom({ name: roomName });
    }

    const participants = await clients.rooms.listParticipants(roomName);
    if (participants.some((participant) => participant.kind === 4)) {
      return;
    }

    const dispatches = (await clients.agents.listDispatch(roomName)).filter(
      (dispatch) => dispatch.agentName === "Abuchi",
    );
    const now = Date.now();
    for (const dispatch of dispatches) {
      const jobs = dispatch.state?.jobs ?? [];
      const hasLiveJob = jobs.some(
        (job) => job.state?.status === 0 || job.state?.status === 1,
      );
      const createdAtMs = dispatch.state?.createdAt
        ? Number(dispatch.state.createdAt / 1_000_000n)
        : 0;
      const isFreshDispatch = createdAtMs > 0 && now - createdAtMs < 30_000;

      if (hasLiveJob || isFreshDispatch) {
        return;
      }

      await clients.agents.deleteDispatch(dispatch.id, roomName);
    }

    await clients.agents.createDispatch(roomName, "Abuchi", {
      metadata: JSON.stringify(interviewContext),
    });
  })();

  pendingAbuchiDispatches.set(roomName, dispatchOperation);
  try {
    await dispatchOperation;
  } finally {
    if (pendingAbuchiDispatches.get(roomName) === dispatchOperation) {
      pendingAbuchiDispatches.delete(roomName);
    }
  }
}

roomsRouter.post("/token", async (req, res) => {
  const parsed = TokenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid room, participant name, or role." });
  }

  const {
    roomName,
    participantName,
    role,
    interviewDomain,
    candidateExperience,
    companyPolicies,
  } = parsed.data;
  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return res.status(503).json({ error: "LiveKit token service is not configured." });
  }

  try {
    const token = new AccessToken(apiKey, apiSecret, {
      identity: `${role}-${randomUUID()}`,
      name: participantName,
      metadata: JSON.stringify({ role }),
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    if (role === "interviewer") {
      await ensureAbuchiDispatched(roomName, {
        interviewDomain,
        candidateExperience,
        companyPolicies,
      });
    }

    const jwt = await token.toJwt();
    return res.json({ token: jwt, wsUrl: env.LIVEKIT_WS_URL });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return res.status(500).json({ error: "Unable to create a room token." });
  }
});

roomsRouter.post("/recording", async (req, res) => {
  const parsed = RecordingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid room and recording state are required." });
  }

  const { roomName, recording } = parsed.data;
  const clients = createLiveKitClients();
  if (!clients) return res.status(503).json({ error: "LiveKit recording is not configured." });

  const authorization = req.header("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return res.status(401).json({ error: "A valid interviewer room token is required." });
  }

  try {
    const verified = await new TokenVerifier(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET).verify(accessToken);
    const claims = verified as unknown as { sub?: unknown; video?: { room?: unknown } };
    const participantIdentity = typeof claims.sub === "string" ? claims.sub : "";
    if (!participantIdentity || claims.video?.room !== roomName) {
      return res.status(403).json({ error: "This token is not authorized to control recording in this room." });
    }

    const participants = await clients.rooms.listParticipants(roomName);
    const participant = participants.find((item) => item.identity === participantIdentity);
    if (!participant) return res.status(404).json({ error: "Interviewer is not connected to this room." });

    let metadata: { role?: string } = {};
    try {
      metadata = JSON.parse(participant.metadata || "{}") as { role?: string };
    } catch {
      return res.status(403).json({ error: "Could not verify interviewer role." });
    }
    if (metadata.role !== "interviewer") {
      return res.status(403).json({ error: "Only the interviewer can control recording." });
    }

    const egresses = await clients.egress.listEgress(roomName);
    const matching = egresses.filter((egress) =>
      egress.request.case === "participant" &&
      egress.request.value.identity === participantIdentity &&
      (egress.status === EgressStatus.EGRESS_STARTING || egress.status === EgressStatus.EGRESS_ACTIVE),
    );

    if (recording) {
      if (matching.length) return res.json({ recording: true, egressId: matching[0].egressId });
      const safeRoom = roomName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
      const safeIdentity = participantIdentity.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
      const egress = await clients.egress.startParticipantEgress(
        roomName,
        participantIdentity,
        { file: new EncodedFileOutput({ fileType: EncodedFileType.MP4, filepath: `/out/${safeRoom}-${safeIdentity}-${Date.now()}.mp4` }) },
      );
      return res.json({ recording: true, egressId: egress.egressId });
    }

    await Promise.all(matching.map((egress) => clients.egress.stopEgress(egress.egressId)));
    return res.json({ recording: false });
  } catch (error) {
    console.error("Unable to update interviewer recording:", error);
    return res.status(503).json({ error: "Recording could not start. Ensure the LiveKit Egress service is running." });
  }
});

const TokenRequestSchema = z.object({
  roomName: z.string().trim().min(1).max(128),
  participantName: z.string().trim().min(1).max(80),
  role: z.enum(["interviewer", "candidate", "ai_copilot"]),
  interviewDomain: z.string().trim().min(1).max(120).default("Software Engineering"),
  candidateExperience: z.string().trim().max(12000).default(""),
  companyPolicies: z.string().trim().max(12000).default(""),
});

const RecordingRequestSchema = z.object({
  roomName: z.string().trim().min(1).max(128),
  recording: z.boolean(),
});
