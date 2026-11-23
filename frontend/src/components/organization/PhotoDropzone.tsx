import { ProfilePictureField } from '@/components/ProfilePictureField';

type PhotoDropzoneProps = {
  imageUrl?: string | null;
  fullImageUrl?: string | null;
  disabled?: boolean;
  uploading?: boolean;
  onFile: (file: File) => void;
  onDelete?: () => void;
};

/** Admin orphan/student photo field — same hover actions as profile (view, crop, replace, delete). */
export function PhotoDropzone({
  imageUrl,
  fullImageUrl,
  disabled,
  uploading,
  onFile,
  onDelete,
}: PhotoDropzoneProps) {
  return (
    <ProfilePictureField
      showLabel={false}
      size="lg"
      className="w-full max-w-[200px] shrink-0"
      imageUrl={imageUrl ?? null}
      fullImageUrl={fullImageUrl ?? imageUrl ?? null}
      disabled={disabled}
      uploading={uploading}
      onFileSelected={onFile}
      onDelete={onDelete}
    />
  );
}
