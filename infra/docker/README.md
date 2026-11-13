# Local interviewer-only recording

The Record control starts a LiveKit participant egress for the authenticated interviewer identity. It records that participant's camera and microphone; the candidate and Abuchi are not part of this egress.

Start the optional Egress service from this directory:

```sh
docker compose -f docker-compose.dev.yml --profile recording up -d
```

The egress image is large and may take a while to download. Recordings are written to `infra/docker/recordings/`, which is ignored by Git. The Egress service must be running before the interviewer presses **Record me**. The button changes state only after the API confirms that LiveKit started or stopped the recording.

This compose configuration uses the local development LiveKit key and insecure WebSocket mode. Do not use it for a deployed environment. Production recording should use secured LiveKit/Egress endpoints and a configured private object-storage destination.
