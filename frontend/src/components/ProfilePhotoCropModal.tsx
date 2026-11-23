import { X } from 'lucide-react';
import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { cropImageToBlob } from '@/lib/cropImage';
import { cn } from '@/lib/utils';

import 'react-easy-crop/react-easy-crop.css';

type ProfilePhotoCropModalProps = {
  imageSrc: string;
  onClose: () => void;
  onApply: (file: File) => void;
};

export function ProfilePhotoCropModal({ imageSrc, onClose, onApply }: ProfilePhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function applyCrop() {
    if (!croppedAreaPixels || busy) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels, 'image/jpeg');
      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
      onApply(file);
    } catch {
      setError(
        'Could not crop this image. If it is stored remotely, try Replace to upload a new file first.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-photo-title"
    >
      <div
        className={cn(
          'flex w-full max-w-lg flex-col overflow-hidden bg-gva-surface shadow-2xl',
          'max-h-[100dvh] rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gva-hairline px-4 py-3">
          <h2 id="crop-photo-title" className="text-base font-bold text-gva-ink">
            Crop photo
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gva-muted hover:bg-gva-canvas hover:text-gva-ink disabled:opacity-50"
            aria-label="Close crop editor"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="relative h-[min(52vh,360px)] w-full bg-gva-ink">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-4 border-b border-gva-hairline px-4 py-4">
          <label className="block text-xs font-medium text-gva-muted">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-2 w-full accent-gva-green"
            />
          </label>
          {error ? (
            <p className="text-sm text-gva-heart" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-gva-hairline bg-gva-surface text-sm font-semibold text-gva-ink hover:bg-gva-canvas disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            className="h-11 flex-1"
            loading={busy}
            loadingLabel="Saving…"
            onClick={() => void applyCrop()}
          >
            Apply crop
          </Button>
        </div>
      </div>
    </div>
  );
}
