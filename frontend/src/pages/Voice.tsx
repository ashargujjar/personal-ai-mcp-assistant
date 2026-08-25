import { Mic, Square } from "lucide-react";
import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn, sleep } from "@/lib/utils";

const sampleTranscript =
  "Summarize my emails and let me know if anything needs a reply before end of day.";

export default function Voice() {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");

  async function handleToggle() {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      await sleep(900);
      setTranscript(sampleTranscript);
      setIsProcessing(false);
    } else {
      setTranscript("");
      setIsRecording(true);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-8 p-6 text-center">
      <PageHeader title="Voice" subtitle="Talk to NEXUS instead of typing." />

      <button
        onClick={handleToggle}
        className={cn(
          "flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all",
          isRecording ? "border-destructive bg-destructive/10 text-destructive animate-pulse-dot" : "border-primary bg-primary/10 text-primary hover:bg-primary/15"
        )}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
      </button>

      <p className="text-sm text-muted-foreground">
        {isRecording ? "Listening... tap to stop" : isProcessing ? "Transcribing..." : "Tap to start speaking"}
      </p>

      {transcript && (
        <div className="w-full rounded-xl border border-border bg-card p-4 text-left">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Transcript</p>
          <p className="text-sm leading-relaxed">{transcript}</p>
        </div>
      )}
    </div>
  );
}
