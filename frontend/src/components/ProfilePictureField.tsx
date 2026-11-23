import { Crop, RefreshCw, User, X, ZoomIn } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { ProfilePhotoCropModal } from '@/components/ProfilePhotoCropModal';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function PhotoActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        'bg-white/25 text-white backdrop-blur-[2px] transition-colors',
        'hover:bg-white/40 disabled:pointer-events-none disabled:opacity-40',
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export type ProfilePictureFieldProps = {
  label?: string;
  showLabel?: boolean;
  imageUrl: string | null;
  fullImageUrl?: string | null;
  disabled?: boolean;
  uploading?: boolean;
  /** md = 144px (profile page), lg = 200px (admin editors) */
  size?: 'md' | 'lg';
  className?: string;
  onFileSelected: (file: File) => void;
  onDelete?: () => void;
};

export function ProfilePictureField({
  label = 'Photo',
  showLabel = true,
  imageUrl,
  fullImageUrl,
  disabled,
  uploading,
  size = 'md',
  className,
  onFileSelected,
  onDelete,
}: ProfilePictureFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const hasImage = Boolean(imageUrl);
  const viewSrc = fullImageUrl ?? imageUrl;
  const cropSrc = viewSrc;
  const actionsDisabled = disabled || uploading;

  const boxClass =
    size === 'lg'
      ? 'aspect-square w-full max-w-[200px]'
      : 'h-36 w-36';

  function pickFile(file: File | undefined) {
    if (!file || actionsDisabled) return;
    if (!/^image\/(jpeg|jpg|png)$/i.test(file.type) || file.size > 5 * 1024 * 1024) return;
    onFileSelected(file);
  }

  function openReplace() {
    fileRef.current?.click();
  }

  return (
    <div className={cn('flex flex-col items-start gap-2', size === 'md' && 'md:items-center', className)}>
      {showLabel ? (
        <Label className="text-xs font-medium text-gva-muted">{label}</Label>
      ) : null}
      <div
        className={cn(
          'group relative shrink-0 overflow-hidden rounded-2xl border border-gva-hairline bg-gva-canvas',
          boxClass,
          !hasImage && !actionsDisabled && 'cursor-pointer',
          dragOver && 'ring-2 ring-gva-green ring-offset-2',
        )}
        onClick={!hasImage && !actionsDisabled ? openReplace : undefined}
        onKeyDown={(e) => {
          if (!hasImage && !actionsDisabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openReplace();
          }
        }}
        role={!hasImage ? 'button' : undefined}
        tabIndex={!hasImage && !actionsDisabled ? 0 : undefined}
        onDragOver={(e) => {
          if (actionsDisabled) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files[0]);
        }}
      >
        {hasImage ? (
          <img
            src={imageUrl!}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gva-muted-2">
            <User className={cn(size === 'lg' ? 'h-10 w-10' : 'h-10 w-10')} strokeWidth={1.25} aria-hidden />
            <span className="text-xs">No Photo</span>
          </div>
        )}

        {!actionsDisabled ? (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 px-2',
              'opacity-0 transition-opacity duration-200',
              'group-hover:opacity-100 group-focus-within:opacity-100',
              '[@media(hover:none)]:opacity-100',
            )}
          >
            {hasImage ? (
              <>
                <PhotoActionButton
                  label="View photo"
                  disabled={!viewSrc}
                  onClick={() => setViewOpen(true)}
                >
                  <ZoomIn className="h-4 w-4" strokeWidth={2} aria-hidden />
                </PhotoActionButton>
                <PhotoActionButton
                  label="Crop photo"
                  disabled={!cropSrc}
                  onClick={() => cropSrc && setCropOpen(true)}
                >
                  <Crop className="h-4 w-4" strokeWidth={2} aria-hidden />
                </PhotoActionButton>
                <PhotoActionButton label="Replace photo" onClick={openReplace}>
                  <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
                </PhotoActionButton>
                {onDelete ? (
                  <PhotoActionButton label="Delete photo" onClick={onDelete}>
                    <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </PhotoActionButton>
                ) : null}
              </>
            ) : (
              <PhotoActionButton label="Upload photo" onClick={openReplace}>
                <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
              </PhotoActionButton>
            )}
          </div>
        ) : null}
      </div>

      {uploading ? <p className="text-xs text-gva-muted">Uploading…</p> : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        className="sr-only"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {viewOpen && viewSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setViewOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Close preview"
            onClick={() => setViewOpen(false)}
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <img
            src={viewSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="max-h-[min(85vh,720px)] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {cropOpen && cropSrc ? (
        <ProfilePhotoCropModal
          imageSrc={cropSrc}
          onClose={() => setCropOpen(false)}
          onApply={(file) => {
            setCropOpen(false);
            onFileSelected(file);
          }}
        />
      ) : null}
    </div>
  );
}
