import { ArrowUp, Paperclip } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  return (
    <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
      <Button variant="ghost" size="icon" className="mb-0.5 shrink-0 text-muted-foreground" aria-label="Attach file" disabled={disabled}>
        <Paperclip className="h-4 w-4" />
      </Button>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your emails, GitHub, calendar, documents..."
        rows={1}
        disabled={disabled}
        className="min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 shadow-none focus-visible:ring-0"
      />
      <Button
        size="icon"
        className="mb-0.5 shrink-0"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
