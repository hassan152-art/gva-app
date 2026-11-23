import { Eye, FileText, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  deleteAdminOrphanDocument,
  listAdminOrphanDocuments,
  uploadAdminOrphanDocument,
  type OrphanDocument,
} from '@/lib/adminApi';
import { cn } from '@/lib/utils';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf';
const MAX_BYTES = 5 * 1024 * 1024;

type OrphanDocumentsPanelProps = {
  orphanId: string | undefined;
  isNew: boolean;
  /** Staged files before the orphan record exists (uploaded on save). */
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  onError?: (message: string) => void;
};

function formatBytes(size: number | null): string {
  if (size == null || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(doc: OrphanDocument): boolean {
  if (doc.mimetype === 'application/pdf') return true;
  const name = doc.originalName?.toLowerCase() ?? doc.fileUrl.toLowerCase();
  return name.endsWith('.pdf');
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${label}`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gva-hairline bg-gva-canvas px-3 text-sm font-semibold text-gva-ink-2 hover:bg-gva-surface hover:text-gva-ink"
    >
      <Eye className="h-4 w-4" aria-hidden />
      View
    </a>
  );
}

function viewPendingFile(file: File) {
  const url = URL.createObjectURL(file);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function OrphanDocumentsPanel({
  orphanId,
  isNew,
  pendingFiles = [],
  onPendingFilesChange,
  onError,
}: OrphanDocumentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<OrphanDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orphanId || isNew) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await listAdminOrphanDocuments(orphanId);
      setDocuments(res.documents);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not load documents');
    } finally {
      setLoading(false);
    }
  }, [isNew, onError, orphanId]);

  useEffect(() => {
    load();
  }, [load]);

  function pickFile() {
    inputRef.current?.click();
  }

  function validateFile(file: File): boolean {
    if (file.size > MAX_BYTES) {
      onError?.('File is too large (max 5 MB)');
      return false;
    }
    return true;
  }

  async function onFileSelected(file: File | undefined) {
    if (!file) return;
    if (!validateFile(file)) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (isNew) {
      if (!onPendingFilesChange) return;
      onPendingFilesChange([...pendingFiles, file]);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (!orphanId) return;
    setUploading(true);
    try {
      const res = await uploadAdminOrphanDocument(orphanId, file);
      setDocuments((prev) => [res.document, ...prev]);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removePending(index: number) {
    if (!onPendingFilesChange) return;
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
  }

  async function removeDocument(doc: OrphanDocument) {
    if (!orphanId) return;
    if (!window.confirm(`Remove "${doc.originalName || 'this document'}"?`)) return;
    setDeletingId(doc.id);
    try {
      await deleteAdminOrphanDocument(orphanId, doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not remove document');
    } finally {
      setDeletingId(null);
    }
  }

  const addButton = (
    <Button
      type="button"
      className="h-10 w-auto gap-2 bg-gva-green px-4 text-sm hover:bg-gva-green-deep"
      onClick={pickFile}
      loading={uploading}
      loadingLabel="Adding…"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Add document
    </Button>
  );

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      onChange={(e) => onFileSelected(e.target.files?.[0])}
    />
  );

  if (isNew) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gva-muted">
            PNG, JPG, WEBP or PDF — up to 5 MB. Documents upload to the database when you save
            this orphan.
          </p>
          {addButton}
          {fileInput}
        </div>

        {pendingFiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gva-hairline py-12 text-center text-sm text-gva-muted">
            <FileText className="h-10 w-10 text-gva-muted-2" strokeWidth={1.25} />
            <p>No documents added yet.</p>
            <button
              type="button"
              onClick={pickFile}
              className="font-semibold text-gva-green hover:text-gva-green-deep"
            >
              Add document
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gva-hairline rounded-xl border border-gva-hairline bg-gva-surface">
            {pendingFiles.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    isPdfFile(file) ? 'bg-red-50 text-red-700' : 'bg-gva-tint text-gva-green',
                  )}
                >
                  <FileText className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gva-ink">{file.name}</p>
                  <p className="text-xs text-gva-muted">{formatBytes(file.size)} · Pending save</p>
                </div>
                <button
                  type="button"
                  onClick={() => viewPendingFile(file)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gva-hairline bg-gva-canvas px-3 text-sm font-semibold text-gva-ink-2 hover:bg-gva-surface hover:text-gva-ink"
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => removePending(index)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gva-muted hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remove ${file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gva-muted">
          PNG, JPG, WEBP or PDF — up to 5 MB each. Stored in Cloudious (GVA-APP) and linked in the
          database.
        </p>
        {addButton}
        {fileInput}
      </div>

      {loading ? (
        <p className="text-sm text-gva-muted">Loading documents…</p>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gva-hairline py-12 text-center text-sm text-gva-muted">
          <FileText className="h-10 w-10 text-gva-muted-2" strokeWidth={1.25} />
          <p>No documents yet.</p>
          <button
            type="button"
            onClick={pickFile}
            disabled={uploading}
            className="font-semibold text-gva-green hover:text-gva-green-deep disabled:opacity-60"
          >
            Add document
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-gva-hairline rounded-xl border border-gva-hairline bg-white">
          {documents.map((doc) => {
            const pdf = isPdf(doc);
            const label = doc.originalName || 'Document';
            const meta = [formatBytes(doc.size)].filter(Boolean).join(' · ');
            return (
              <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    pdf ? 'bg-red-50 text-red-700' : 'bg-gva-tint text-gva-green',
                  )}
                >
                  <FileText className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gva-ink">{label}</p>
                  {meta ? <p className="text-xs text-gva-muted">{meta}</p> : null}
                </div>
                <ViewLink href={doc.fileUrl} label={label} />
                <button
                  type="button"
                  onClick={() => removeDocument(doc)}
                  disabled={deletingId === doc.id}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gva-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  aria-label={`Remove ${label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
