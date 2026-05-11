# Saved Dimensions (Avatar Baseline)

This file stores the currently approved fallback avatar pose/tuning values from `components/Avatar.tsx`.

If future tweaks break the look/feel, restore these values in `FallbackAvatarModel`:

## Global

- `TEETH_VISIBILITY_MULTIPLIER = 3`
- `MOUTH_CLOSE_THRESHOLD = 0.35`
- `ARM_MOTION_THRESHOLD = 0.08`
- `MOUTH_OPEN_SPEED = 0.5`
- `MOUTH_CLOSE_SPEED = 0.5`

## Arm Baseline (anti T-pose)

Applied once in setup:

- `leftArm.rotation.y += 1.05`
- `rightArm.rotation.y -= 1.05`
- `leftArm.rotation.z += 0.14`
- `rightArm.rotation.z -= 0.14`
- `leftForeArm.rotation.x -= 0.25`
- `rightForeArm.rotation.x -= 0.25`

## Arm Movement (idle + speaking)

- `idle = sin(t * 0.8) * 0.025`
- `speakingLift = armSpeechLevel * 0.08`
- `forePulse = sin(t * 2.6) * (0.03 + armSpeechLevel * 0.05)`
- Arm lerp rates: `0.09` (upper arm), `0.1` (forearm)

## Speech/Jaw Behavior

- Speech normalization:
  - `speechLevel = clamp((rawSpeechLevel - 0.1) / 0.9, 0, 1)`
- `gatedSpeechLevel = speechLevel < MOUTH_CLOSE_THRESHOLD ? 0 : speechLevel`
- `armSpeechLevel = clamp((rawSpeechLevel - ARM_MOTION_THRESHOLD) / (1 - ARM_MOTION_THRESHOLD), 0, 1)`
- Jaw bone target:
- `jawTarget = initJawRotX + clamp(gatedSpeechLevel * 0.12, 0, 0.12)`
- Lerp: attack `MOUTH_OPEN_SPEED`, decay `MOUTH_CLOSE_SPEED`
- Jaw morph target:
- `target = clamp(gatedSpeechLevel * 0.62, 0, 0.18)`
- Lerp: attack `MOUTH_OPEN_SPEED`, decay `MOUTH_CLOSE_SPEED`

## Mouth/Viseme Values

- `viseme_aa`: `speech * (0.13 + speechWave * 0.1)`
- `viseme_O`: `speech * (0.095 + (1 - speechWave) * 0.11)`
- `viseme_I`: `speech * 0.07`
- `viseme_PP`: `speech > 0.12 ? 0.0 : 0.02`

## Lip Shaping (teeth reveal)

- `upperLift = speech * 0.34`
- `lowerDrop = speech * 0.42`

## Teeth Sync

For each driven mouth morph value on head, teeth mirror value with:

- `clamp(value * TEETH_VISIBILITY_MULTIPLIER, 0, 1)`

This applies to:

- `jawOpen`
- `viseme_aa`
- `viseme_O`
- `viseme_I`
- `viseme_PP`

## Revert Workflow

1. Open `components/Avatar.tsx`.
2. Compare `FallbackAvatarModel` constants/assignments to this file.
3. Restore any values that differ.
4. Restart dev server and verify pose.

---

## Archived Approach: TalkingHead + HeadAudio (May 8, 2026)

This section captures the newer "library-first" experiment so we can revert to it later if needed.

### Purpose

- Use `TalkingHead` as primary avatar runtime.
- Add `HeadAudio` (audio worklet + viseme model) to drive visemes from live audio.
- Keep custom fallback renderer as backup when CDN/module loading fails.

### Core wiring in `Avatar.tsx`

- TalkingHead import retry URLs:
  - `https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/modules/talkinghead.mjs`
  - `https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7.0/modules/talkinghead.mjs`
- HeadAudio module retry URLs:
  - `https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@v0.1.0-alpha/modules/headaudio.mjs`
  - `https://cdn.jsdelivr.net/npm/@met4citizen/headaudio@0.1.0/modules/headaudio.mjs`
- HeadAudio worklet retry URLs:
  - `https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@v0.1.0-alpha/modules/headworklet.mjs`
  - `https://cdn.jsdelivr.net/npm/@met4citizen/headaudio@0.1.0/modules/headworklet.mjs`
- HeadAudio model retry URLs:
  - `https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@v0.1.0-alpha/models/model-en-mixed.bin`
  - `https://cdn.jsdelivr.net/npm/@met4citizen/headaudio@0.1.0/models/model-en-mixed.bin`

### HeadAudio runtime options used

- `vadMode: 1`
- `vadGateActiveDb: -38`
- `vadGateInactiveDb: -54`
- `vadGateInactiveMs: 16`

### Event hooks used

- `headaudio.onvalue(key, value)` maps visemes to `head.mtAvatar[key]`.
- `headaudio.onstarted` calls `head.lookAtCamera(350)`.
- `head.opt.update` is wrapped to call `headaudio.update(dt)`.

### Note

This approach was preserved for reference, but user feedback indicates it still felt off for natural speech/pose in this project.

---

## Terminal Restart Commands

### Standard Restart

```bash
cd "/Users/sachin/Documents/Cursor/ai-sales-persona"
# Press Ctrl + C to stop the current dev server
npm install
npm run dev
```

### Clean Restart (if behavior is weird)

```bash
cd "/Users/sachin/Documents/Cursor/ai-sales-persona"
# Press Ctrl + C to stop the current dev server
rm -rf .next
npm run dev
```

### If Port 3000 Is Stuck

```bash
lsof -i :3000
kill -9 <PID>
npm run dev
```
