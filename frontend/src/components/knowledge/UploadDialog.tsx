import { FileUp, Upload } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadDialog({ onUpload }: { onUpload: (filename: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [filename, setFilename] = React.useState("");

  function handleUpload() {
    if (!filename.trim()) return;
    onUpload(filename.trim());
    setFilename("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>PDFs and docs are chunked and indexed for retrieval-augmented search.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
          <FileUp className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Drag a file here, or enter a filename below</p>
        </div>
        <div className="space-y-1.5">
          <Label>Filename</Label>
          <Input value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="e.g. Q3 Strategy.pdf" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!filename.trim()}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
