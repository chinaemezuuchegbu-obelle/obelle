"""LiveKit agent worker entry point for Abuchi interview assistant."""

import json
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    AutoSubscribe,
    JobContext,
    cli,
    room_io,
)
from livekit.plugins import groq, openai, silero

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)

logger = logging.getLogger("Abuchi")
server = AgentServer()


def read_interview_context(ctx: JobContext) -> dict[str, str]:
    raw_metadata = ctx.job.metadata or ""
    try:
        metadata = json.loads(raw_metadata) if raw_metadata else {}
    except json.JSONDecodeError:
        logger.warning("Abuchi dispatch metadata was not valid JSON; using generic context.")
        metadata = {}

    if not isinstance(metadata, dict):
        logger.warning("Abuchi dispatch metadata was not an object; using generic context.")
        metadata = {}

    def read_text(key: str, fallback: str, limit: int) -> str:
        value = metadata.get(key)
        if not isinstance(value, str):
            return fallback
        return value.strip()[:limit] or fallback

    return {
        "interview_domain": read_text("interviewDomain", "Software Engineering", 120),
        "candidate_experience": read_text(
            "candidateExperience",
            "No candidate background was supplied. Ask neutral questions and avoid assumptions.",
            12_000,
        ),
        "company_policies": read_text(
            "companyPolicies",
            "Use fair, job-related criteria and follow applicable company policies.",
            12_000,
        ),
    }


def build_interview_instructions(target_language: str, interview_context: dict[str, str]) -> str:
    instructions = [
        f"You are Abuchi, a warm, rigorous, and professional interviewer for {interview_context['interview_domain']} on the Obelle platform.",
        "Keep spoken responses concise, natural, and conversational, usually two or three sentences.",
        "Assess the candidate using job-relevant evidence. Ask one clear question at a time, give the candidate room to answer, and do not invent evidence or scores.",
        "Respond to shared room chat as well as spoken answers, and interact respectfully with both the interviewer and candidate.",
        "Treat the anonymized candidate background and company guidance below as confidential interview context. Do not recite them unnecessarily or assume claims are true until the candidate provides evidence.",
        "Anonymized candidate experience:\n" + interview_context["candidate_experience"],
        "Company policies and interview guidance:\n" + interview_context["company_policies"],
    ]

    if target_language.lower() == "auto":
        instructions.append(
            "Detect the language the candidate is using and respond in that same language."
        )
    else:
        instructions.append(f"Conduct the interview and respond in {target_language}.")

    custom_instructions = os.getenv("ABUCHI_SYSTEM_INSTRUCTIONS", "").strip()
    job_description = os.getenv("INTERVIEW_JOB_DESCRIPTION", "").strip()
    rubric = os.getenv("INTERVIEW_RUBRIC", "").strip()
    if custom_instructions:
        instructions.extend(("Additional interviewer instructions:", custom_instructions))
    if job_description:
        instructions.extend(("Role and job description:", job_description))
    if rubric:
        instructions.extend(("Evaluation rubric:", rubric))

    return "\n\n".join(instructions)


@server.rtc_session(agent_name="Abuchi")
async def entrypoint(ctx: JobContext) -> None:
    logger.info("Abuchi connecting to LiveKit room: %s", ctx.room.name)
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    target_language = os.getenv("INTERVIEW_LANGUAGE", "auto").strip() or "auto"
    if not api_key or not groq_api_key:
        missing_keys = [
            name
            for name, value in (
                ("OPENAI_API_KEY", api_key),
                ("GROQ_API_KEY", groq_api_key),
            )
            if not value
        ]
        logger.error(
            "Missing %s; Abuchi needs Groq for its LLM and OpenAI for STT/TTS.",
            ", ".join(missing_keys),
        )
        return

    interview_context = read_interview_context(ctx)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("Abuchi connected to room successfully.")
    try:
        await ctx.room.local_participant.set_metadata(
            json.dumps(
                {
                    "role": "ai-interviewer",
                    "display_name": "Abuchi",
                    "avatar": "abuchi",
                }
            )
        )
    except Exception:
        logger.warning("Could not set Abuchi participant metadata.", exc_info=True)

    stt_options: dict[str, object] = {
        "model": "gpt-4o-mini-transcribe",
        "api_key": api_key,
    }
    if target_language.lower() == "auto":
        stt_options["detect_language"] = True
    else:
        stt_options["language"] = target_language

    tts_instructions = os.getenv(
        "OPENAI_TTS_INSTRUCTIONS",
        "Speak clearly and naturally in the language used by Abuchi's response.",
    ).strip()
    tts_options: dict[str, object] = {
        "api_key": api_key,
        "voice": os.getenv("OPENAI_TTS_VOICE", "ash").strip() or "ash",
    }
    if tts_instructions:
        tts_options["instructions"] = tts_instructions

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=openai.STT(**stt_options),
        llm=groq.LLM(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            api_key=groq_api_key,
        ),
        tts=openai.TTS(**tts_options),
    )
    try:
        logger.info("Starting Abuchi session pipeline...")
        await session.start(
            room=ctx.room,
            room_options=room_io.RoomOptions(
                audio_input=True,
                text_input=True,
            ),
            agent=Agent(
                instructions=build_interview_instructions(target_language, interview_context),
            ),
        )
        logger.info("Abuchi session active. Generating opening greeting...")
        await session.generate_reply(
            instructions=(
                "Greet everyone warmly in your configured interview language, introduce yourself as "
                f"Abuchi, mention the {interview_context['interview_domain']} interview, and ask the "
                "candidate to introduce themselves. Let everyone know they can speak or use the "
                "shared room chat."
            )
        )
        logger.info("Abuchi greeting sent successfully.")
    except Exception:
        logger.exception("Abuchi encountered an error during session execution.")


def main() -> None:
    cli.run_app(server)


if __name__ == "__main__":
    main()
