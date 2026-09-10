import { Upload } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function UploadDialog({ onUpload }: { onUpload: (file: File) => Promise<unknown> }) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  async function handleUpload() {
    if (!file || pending) return;
    setPending(true); setError("");
    try { await onUpload(file); setFile(null); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setPending(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setFile(null); setError(""); } }}>
    <DialogTrigger asChild><Button size="sm"><Upload className="h-3.5 w-3.5" />Upload</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Upload a PDF</DialogTitle><DialogDescription>Store a PDF securely. Maximum file size: 20 MB.</DialogDescription></DialogHeader>
      <div className="space-y-2"><Label htmlFor="document-file">PDF file</Label><Input id="document-file" type="file" accept=".pdf,application/pdf" disabled={pending} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!file || pending} onClick={handleUpload}>{pending ? "Uploading..." : "Upload"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
