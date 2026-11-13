import { useEffect, useRef, useState, type FormEvent } from "react";

export type ParticipantRole = "interviewer" | "candidate";

const interviewDomains = [
  "Software Engineering (Full Stack)",
  "Frontend Engineering (React / Vue)",
  "Backend Engineering (Node / Python / Go)",
  "DevOps & Cloud Infrastructure",
  "Data Science & Machine Learning",
  "Product Management",
  "UI/UX Design",
  "Cybersecurity & InfoSec",
  "Quality Assurance & Automation",
  "Engineering Management",
];

export interface InterviewContext {
  interviewDomain: string;
  candidateExperience: string;
  companyPolicies: string;
}

interface PreJoinProps {
  onJoin: (
    roomName: string,
    participantName: string,
    role: ParticipantRole,
    interviewContext: InterviewContext,
  ) => void;
}

export function PreJoinLobby({ onJoin }: PreJoinProps) {
  const [roomName, setRoomName] = useState("obelle-interview-1");
  const [participantName, setParticipantName] = useState("");
  const [role, setRole] = useState<ParticipantRole>("interviewer");
  const [interviewDomain, setInterviewDomain] = useState(interviewDomains[0]);
  const [candidateExperience, setCandidateExperience] = useState("");
  const [pastedCompanyPolicies, setPastedCompanyPolicies] = useState("");
  const [uploadedCompanyPolicies, setUploadedCompanyPolicies] = useState("");
  const [policyInputMode, setPolicyInputMode] = useState<"paste" | "upload">("paste");
  const [policyFileName, setPolicyFileName] = useState("");
  const [policyFileError, setPolicyFileError] = useState("");
  const [deviceError, setDeviceError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let mounted = true;

    async function previewDevices() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (mounted && videoRef.current) videoRef.current.srcObject = stream;
        else stream.getTracks().forEach((track) => track.stop());
      } catch {
        if (mounted) setDeviceError("Allow camera and microphone access to preview your devices.");
      }
    }

    void previewDevices();
    return () => {
      mounted = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participantName.trim() || !roomName.trim()) return;
    onJoin(roomName.trim(), participantName.trim(), role, {
      interviewDomain: interviewDomain.trim(),
      candidateExperience: candidateExperience.trim(),
      companyPolicies: (policyInputMode === "paste" ? pastedCompanyPolicies : uploadedCompanyPolicies).trim(),
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-zinc-100">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl md:grid-cols-2">
        <section className="p-7 md:p-10">
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">Obelle · Interview</p>
            <h1 className="text-3xl font-semibold tracking-tight">{role === "interviewer" ? "Set up your interview" : "Join your interview"}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {role === "interviewer"
                ? "Add optional, anonymized interview context for Abuchi, then enter the room."
                : "Check your setup, then enter the room."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-medium text-zinc-300">
              Your name
              <input required maxLength={80} value={participantName} onChange={(event) => setParticipantName(event.target.value)} placeholder="e.g. Sarah Jenkins" className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20" />
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Room ID
              <input required maxLength={128} value={roomName} onChange={(event) => setRoomName(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20" />
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-zinc-300">Join as</legend>
              <div className="grid grid-cols-2 gap-3">
                {(["interviewer", "candidate"] as const).map((option) => (
                  <button key={option} type="button" onClick={() => setRole(option)} aria-pressed={role === option} className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${role === option ? "border-zinc-400 bg-zinc-200 text-zinc-950" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}>
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
            {role === "interviewer" && (
              <section className="space-y-4 rounded-2xl border border-zinc-800 bg-black/60 p-4" aria-label="Abuchi interview context">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">Abuchi interview context</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">This context is sent privately to Abuchi for this interview. Remove names and other identifying details.</p>
                </div>
                <label className="block text-sm font-medium text-zinc-300">
                  Interview domain
                  <select value={interviewDomain} onChange={(event) => setInterviewDomain(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20">
                    {interviewDomains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-zinc-300">
                  Candidate experience (anonymized)
                  <textarea maxLength={12000} rows={4} value={candidateExperience} onChange={(event) => setCandidateExperience(event.target.value)} placeholder="Past roles, technologies, projects, and relevant experience" className="mt-2 w-full resize-y rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20" />
                </label>
                <div>
                  <span className="block text-sm font-medium text-zinc-300">Company policies and evaluation guidance</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-black p-1" role="group" aria-label="Company policy input method">
                    <button type="button" aria-pressed={policyInputMode === "paste"} onClick={() => setPolicyInputMode("paste")} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${policyInputMode === "paste" ? "bg-zinc-200 text-zinc-950" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}>
                      Paste text
                    </button>
                    <button type="button" aria-pressed={policyInputMode === "upload"} onClick={() => setPolicyInputMode("upload")} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${policyInputMode === "upload" ? "bg-zinc-200 text-zinc-950" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}>
                      Upload file
                    </button>
                  </div>
                  {policyInputMode === "paste" ? (
                    <textarea maxLength={12000} rows={4} value={pastedCompanyPolicies} onChange={(event) => setPastedCompanyPolicies(event.target.value)} placeholder="Company values, interview guidelines, and relevant compliance rules" className="mt-2 w-full resize-y rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20" />
                  ) : (
                    <div className="mt-2 rounded-xl border border-dashed border-zinc-700 bg-black p-4">
                      <label className="block cursor-pointer text-sm text-zinc-300">
                        <span className="mb-2 block text-xs text-zinc-500">Choose a plain-text policy file (.txt or .md, up to 12,000 characters)</span>
                        <input
                          type="file"
                          accept=".txt,.md,text/plain,text/markdown"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            setPolicyFileError("");
                            setPolicyFileName("");
                            setUploadedCompanyPolicies("");
                            if (!file) return;
                            if (!/\.(txt|md)$/i.test(file.name)) {
                              setPolicyFileError("Choose a .txt or .md file.");
                              event.currentTarget.value = "";
                              return;
                            }
                            void file.text().then((text) => {
                              if (text.length > 12000) {
                                setPolicyFileError("This file is over the 12,000 character limit. Shorten it or paste a relevant excerpt.");
                                return;
                              }
                              if (!text.trim()) {
                                setPolicyFileError("This file is empty. Choose another file.");
                                return;
                              }
                              setUploadedCompanyPolicies(text);
                              setPolicyFileName(file.name);
                            }).catch(() => setPolicyFileError("Could not read this file. Try saving it as plain text."));
                          }}
                          className="block w-full text-xs text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-100 hover:file:bg-zinc-700"
                        />
                      </label>
                      {policyFileName && <p className="mt-3 text-xs text-zinc-300">Loaded: {policyFileName}</p>}
                      {policyFileError && <p role="alert" className="mt-3 text-xs text-rose-300">{policyFileError}</p>}
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-5 text-zinc-500">Only the selected input method is sent privately to Abuchi. Remove names and other identifying details.</p>
                </div>
              </section>
            )}
            <button type="submit" className="w-full rounded-xl bg-zinc-100 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/40 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950">
              {role === "interviewer" ? "Start interview" : "Join video call"}
            </button>
          </form>
        </section>

        <aside className="flex flex-col justify-center border-t border-zinc-800 bg-black/60 p-7 md:border-l md:border-t-0 md:p-10">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
            <span className={`h-2 w-2 rounded-full ${deviceError ? "bg-zinc-500" : "bg-zinc-200"}`} />
            {deviceError || "Camera and microphone preview"}
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Your browser will ask for camera and microphone access. You can change device permissions in your browser settings.</p>
        </aside>
      </div>
    </main>
  );
}
