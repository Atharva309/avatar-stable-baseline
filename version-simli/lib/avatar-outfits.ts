export type AvatarOutfit = {
  id: string;
  label: string;
  /** Path under `public/` — full RPM exports, same rig/morph names as `avatar.glb`. */
  url: string;
  /**
   * TalkingHead often shows nothing for off-scale/non-RPM GLBs — force Canvas fallback.
   * Use for Sketchfab exports until you match RPM scale.
   */
  webGlFallbackOnly?: boolean;
};

export const AVATAR_OUTFITS: AvatarOutfit[] = [
  { id: "default", label: "Default", url: "/avatar.glb" },
  { id: "formal", label: "Formal", url: "/avatars/formal.glb" },
  { id: "casual", label: "Casual", url: "/avatars/casual.glb", webGlFallbackOnly: true },
];

export const DEFAULT_AVATAR_OUTFIT_ID = AVATAR_OUTFITS[0].id;

export function outfitUrlForId(id: string): string {
  return AVATAR_OUTFITS.find((o) => o.id === id)?.url ?? AVATAR_OUTFITS[0].url;
}

export function outfitWebGlFallbackOnly(id: string): boolean {
  return AVATAR_OUTFITS.find((o) => o.id === id)?.webGlFallbackOnly === true;
}
