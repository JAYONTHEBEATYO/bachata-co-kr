import { avatarFromSeed, avatarPresets } from "@/lib/avatars";

export function ProfileAvatar({
  name,
  avatarUrl,
  avatarPreset,
  size = 38
}: {
  name: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  size?: number;
}) {
  const preset = avatarPresets.find((item) => item.id === avatarPreset)
    || avatarFromSeed(name);
  const style = { width: size, height: size };

  return (
    <span className="profile-avatar" style={style} aria-hidden="true">
      {avatarUrl
        ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
        : <span style={{ fontSize: Math.max(14, Math.round(size * 0.5)) }}>{preset.emoji}</span>}
    </span>
  );
}
