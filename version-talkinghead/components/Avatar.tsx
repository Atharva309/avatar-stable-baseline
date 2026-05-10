"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Canvas, useFrame, useGraph } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const TEETH_VISIBILITY_MULTIPLIER = 3;
const MOUTH_CLOSE_THRESHOLD = 0.35;
const ARM_MOTION_THRESHOLD = 0.08;
const MOUTH_OPEN_SPEED = 0.38;
const MOUTH_CLOSE_SPEED = 0.72;
const VIS_ANTICIPATION_SEC = 0.055;
const VIS_RELEASE_SEC = 0.09;
const PAUSE_CLOSE_THRESHOLD_SEC = 0.08;
const OPEN_CUE_MIN_STRENGTH = 0.06;
const ENERGY_ACTIVE_THRESHOLD = 0.14;
const ENERGY_INACTIVE_THRESHOLD = 0.08;
const SPEECH_HANGOVER_SEC = 0.09;
const MOUTH_MOTION_SCALE = 0.6;

type TimedVisemeCue = {
  t: number;
  d: number;
  aa: number;
  o: number;
  i: number;
  pp: number;
};

type TimedVisemeState = {
  speech: number;
  aa: number;
  o: number;
  i: number;
  pp: number;
};

function mapCharToCue(char: string): Omit<TimedVisemeCue, "t" | "d"> {
  const c = char.toLowerCase();
  if ("a".includes(c)) return { aa: 1, o: 0, i: 0, pp: 0 };
  if ("o".includes(c)) return { aa: 0.25, o: 1, i: 0, pp: 0 };
  if ("iye".includes(c)) return { aa: 0, o: 0, i: 1, pp: 0 };
  if ("u".includes(c)) return { aa: 0, o: 0.7, i: 0.1, pp: 0 };
  if ("bmp".includes(c)) return { aa: 0, o: 0, i: 0, pp: 1 };
  if ("fv".includes(c)) return { aa: 0, o: 0.15, i: 0, pp: 0.45 };
  if (".,!?;:".includes(c) || c.trim() === "") return { aa: 0, o: 0, i: 0, pp: 0.3 };
  if ("tdkgnhrlszxjqcw".includes(c)) return { aa: 0.05, o: 0.03, i: 0.04, pp: 0 };
  return { aa: 0, o: 0, i: 0, pp: 0 };
}

export interface AvatarRef {
  speakAudio: (data: {
    audio: ArrayBuffer | Blob;
    words?: string[];
    wtimes?: number[];
    wdurations?: number[];
    chars?: string[];
    ctimes?: number[];
    cdurations?: number[];
    /** Optional caption path for alternate avatar implementations (e.g. Rapport TTS). */
    text?: string;
  }) => Promise<void>;
  resumeAudioContext: () => void;
  stopSpeaking: () => void;
}

const FallbackAvatarModel = ({
  speechLevelRef,
  timedVisemeRef,
}: {
  speechLevelRef: React.MutableRefObject<number>;
  timedVisemeRef: React.MutableRefObject<TimedVisemeState>;
}) => {
  // Outfit/clothing is baked into the GLB. For formal wear, export a new Ready Player Me avatar and replace `public/avatar.glb`.
  const { scene } = useGLTF("/avatar.glb");
  const { nodes } = useGraph(scene);
  const jawIdxRef = useRef<number | null>(null);
  const blinkLeftIdxRef = useRef<number | null>(null);
  const blinkRightIdxRef = useRef<number | null>(null);
  const visemeAaIdxRef = useRef<number | null>(null);
  const visemeOIdxRef = useRef<number | null>(null);
  const visemeIIdxRef = useRef<number | null>(null);
  const visemePpIdxRef = useRef<number | null>(null);
  const mouthUpperUpLeftIdxRef = useRef<number | null>(null);
  const mouthUpperUpRightIdxRef = useRef<number | null>(null);
  const mouthLowerDownLeftIdxRef = useRef<number | null>(null);
  const mouthLowerDownRightIdxRef = useRef<number | null>(null);
  const headMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const teethMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const jawBoneRef = useRef<THREE.Bone | null>(null);
  const initJawRotXRef = useRef(0);
  const neckRef = useRef<THREE.Bone | null>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const spineRef = useRef<THREE.Bone | null>(null);
  const leftArmRef = useRef<THREE.Bone | null>(null);
  const rightArmRef = useRef<THREE.Bone | null>(null);
  const leftForeArmRef = useRef<THREE.Bone | null>(null);
  const rightForeArmRef = useRef<THREE.Bone | null>(null);
  const initHeadRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initArmRotRef = useRef<{
    leftArmY: number;
    rightArmY: number;
    leftArmZ: number;
    rightArmZ: number;
    leftForeArmX: number;
    rightForeArmX: number;
  }>({
    leftArmY: 0,
    rightArmY: 0,
    leftArmZ: 0,
    rightArmZ: 0,
    leftForeArmX: 0,
    rightForeArmX: 0,
  });
  const blinkRef = useRef<{ active: boolean; start: number; duration: number; nextAt: number }>({
    active: false,
    start: 0,
    duration: 0.12,
    nextAt: 2.2 + Math.random() * 2.2,
  });

  useEffect(() => {
    Object.values(nodes).forEach((node: any) => {
      if (node.isMesh && node.name === "Wolf3D_Head" && node.morphTargetDictionary) {
        headMeshRef.current = node;
        const jawIdx = node.morphTargetDictionary.jawOpen;
        const blinkLeft = node.morphTargetDictionary.eyeBlinkLeft;
        const blinkRight = node.morphTargetDictionary.eyeBlinkRight;
        const visemeAa = node.morphTargetDictionary.viseme_aa;
        const visemeO = node.morphTargetDictionary.viseme_O;
        const visemeI = node.morphTargetDictionary.viseme_I;
        const visemePp = node.morphTargetDictionary.viseme_PP;
        const mouthUpperUpLeft = node.morphTargetDictionary.mouthUpperUpLeft;
        const mouthUpperUpRight = node.morphTargetDictionary.mouthUpperUpRight;
        const mouthLowerDownLeft = node.morphTargetDictionary.mouthLowerDownLeft;
        const mouthLowerDownRight = node.morphTargetDictionary.mouthLowerDownRight;
        jawIdxRef.current = jawIdx !== undefined ? jawIdx : null;
        blinkLeftIdxRef.current = blinkLeft !== undefined ? blinkLeft : null;
        blinkRightIdxRef.current = blinkRight !== undefined ? blinkRight : null;
        visemeAaIdxRef.current = visemeAa !== undefined ? visemeAa : null;
        visemeOIdxRef.current = visemeO !== undefined ? visemeO : null;
        visemeIIdxRef.current = visemeI !== undefined ? visemeI : null;
        visemePpIdxRef.current = visemePp !== undefined ? visemePp : null;
        mouthUpperUpLeftIdxRef.current = mouthUpperUpLeft !== undefined ? mouthUpperUpLeft : null;
        mouthUpperUpRightIdxRef.current = mouthUpperUpRight !== undefined ? mouthUpperUpRight : null;
        mouthLowerDownLeftIdxRef.current = mouthLowerDownLeft !== undefined ? mouthLowerDownLeft : null;
        mouthLowerDownRightIdxRef.current = mouthLowerDownRight !== undefined ? mouthLowerDownRight : null;
      }
      if (
        node.isMesh &&
        typeof node.name === "string" &&
        node.name.toLowerCase().includes("teeth") &&
        node.morphTargetDictionary
      ) {
        teethMeshRef.current = node;
      }
    });

    spineRef.current = scene.getObjectByName("Spine") as THREE.Bone;
    neckRef.current = scene.getObjectByName("Neck") as THREE.Bone;
    headBoneRef.current = scene.getObjectByName("Head") as THREE.Bone;
    jawBoneRef.current = scene.getObjectByName("Jaw") as THREE.Bone;
    leftArmRef.current = scene.getObjectByName("LeftArm") as THREE.Bone;
    rightArmRef.current = scene.getObjectByName("RightArm") as THREE.Bone;
    leftForeArmRef.current = scene.getObjectByName("LeftForeArm") as THREE.Bone;
    rightForeArmRef.current = scene.getObjectByName("RightForeArm") as THREE.Bone;

    if (headBoneRef.current) {
      initHeadRotRef.current = {
        x: headBoneRef.current.rotation.x,
        y: headBoneRef.current.rotation.y,
      };
    }
    if (jawBoneRef.current) {
      initJawRotXRef.current = jawBoneRef.current.rotation.x;
    }
    if (leftArmRef.current && rightArmRef.current && leftForeArmRef.current && rightForeArmRef.current) {
      // Stronger anti-T-pose baseline.
      leftArmRef.current.rotation.y += 1.05;
      rightArmRef.current.rotation.y -= 1.05;
      leftArmRef.current.rotation.z += 0.14;
      rightArmRef.current.rotation.z -= 0.14;
      leftForeArmRef.current.rotation.x -= 0.25;
      rightForeArmRef.current.rotation.x -= 0.25;

      initArmRotRef.current = {
        leftArmY: leftArmRef.current.rotation.y,
        rightArmY: rightArmRef.current.rotation.y,
        leftArmZ: leftArmRef.current.rotation.z,
        rightArmZ: rightArmRef.current.rotation.z,
        leftForeArmX: leftForeArmRef.current.rotation.x,
        rightForeArmX: rightForeArmRef.current.rotation.x,
      };
    }

  }, [nodes, scene]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const rawSpeechLevel = speechLevelRef.current;
    const timedViseme = timedVisemeRef.current;
    const speechLevel = THREE.MathUtils.clamp((rawSpeechLevel - 0.1) / 0.9, 0, 1);
    const mixedSpeech = THREE.MathUtils.clamp(Math.max(speechLevel * 0.55, timedViseme.speech), 0, 1);
    const gatedSpeechLevel = mixedSpeech < MOUTH_CLOSE_THRESHOLD ? 0 : mixedSpeech;
    // Arms use their own gate so mouth tuning does not change arm motion.
    const armSpeechLevel = THREE.MathUtils.clamp(
      (rawSpeechLevel - ARM_MOTION_THRESHOLD) / (1 - ARM_MOTION_THRESHOLD),
      0,
      1
    );

    if (spineRef.current) {
      spineRef.current.rotation.x = Math.sin(t * 1.3) * 0.01;
    }

    if (neckRef.current) {
      neckRef.current.rotation.y = Math.sin(t * 0.35) * 0.02;
      neckRef.current.rotation.z = Math.cos(t * 0.22) * 0.01;
    }

    if (headBoneRef.current) {
      headBoneRef.current.rotation.x =
        initHeadRotRef.current.x + Math.sin(t * 0.9) * 0.01 + gatedSpeechLevel * 0.03;
      headBoneRef.current.rotation.y = initHeadRotRef.current.y + Math.cos(t * 0.55) * 0.008;
    }
    if (leftArmRef.current && rightArmRef.current && leftForeArmRef.current && rightForeArmRef.current) {
      // Keep arms alive: subtle idle sway + speaking emphasis.
      const idle = Math.sin(t * 0.8) * 0.025;
      const speakingLift = armSpeechLevel * 0.08;
      const forePulse = Math.sin(t * 2.6) * (0.03 + armSpeechLevel * 0.05);

      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.z,
        initArmRotRef.current.leftArmZ + idle + speakingLift,
        0.09
      );
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.z,
        initArmRotRef.current.rightArmZ - idle - speakingLift,
        0.09
      );

      leftForeArmRef.current.rotation.x = THREE.MathUtils.lerp(
        leftForeArmRef.current.rotation.x,
        initArmRotRef.current.leftForeArmX + forePulse,
        0.1
      );
      rightForeArmRef.current.rotation.x = THREE.MathUtils.lerp(
        rightForeArmRef.current.rotation.x,
        initArmRotRef.current.rightForeArmX + forePulse,
        0.1
      );
    }
    if (jawBoneRef.current) {
      const jawTarget =
        initJawRotXRef.current +
        THREE.MathUtils.clamp(gatedSpeechLevel * 0.12 * MOUTH_MOTION_SCALE, 0, 0.12 * MOUTH_MOTION_SCALE);
      jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        jawBoneRef.current.rotation.x,
        jawTarget,
        jawTarget > jawBoneRef.current.rotation.x ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
      );
    }

    if (headMeshRef.current && jawIdxRef.current !== null) {
      const idx = jawIdxRef.current;
      const current = headMeshRef.current.morphTargetInfluences?.[idx] ?? 0;
      const target = THREE.MathUtils.clamp(gatedSpeechLevel * 0.62 * MOUTH_MOTION_SCALE, 0, 0.18 * MOUTH_MOTION_SCALE);
      const next = THREE.MathUtils.lerp(
        current,
        target,
        target > current ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
      );
      if (headMeshRef.current.morphTargetInfluences) {
        headMeshRef.current.morphTargetInfluences[idx] = next;
      }
      if (teethMeshRef.current?.morphTargetDictionary && teethMeshRef.current.morphTargetInfluences) {
        const teethJawIdx = teethMeshRef.current.morphTargetDictionary.jawOpen;
        if (teethJawIdx !== undefined) {
          teethMeshRef.current.morphTargetInfluences[teethJawIdx] = THREE.MathUtils.clamp(
            next * TEETH_VISIBILITY_MULTIPLIER,
            0,
            1
          );
        }
      }
    }

    if (headMeshRef.current?.morphTargetInfluences) {
      const influences = headMeshRef.current.morphTargetInfluences;
      const speech = THREE.MathUtils.clamp(gatedSpeechLevel, 0, 1);
      const speechWave = (Math.sin(t * 10.5) + 1) * 0.5;

      if (visemeAaIdxRef.current !== null) {
        const idx = visemeAaIdxRef.current;
        const target = THREE.MathUtils.clamp(
          (speech * (0.06 + speechWave * 0.04) + timedViseme.aa * 0.95) * MOUTH_MOTION_SCALE,
          0,
          1
        );
        const value = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          target,
          target > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
        influences[idx] = value;
        if (teethMeshRef.current?.morphTargetDictionary && teethMeshRef.current.morphTargetInfluences) {
          const teethIdx = teethMeshRef.current.morphTargetDictionary.viseme_aa;
          if (teethIdx !== undefined)
            teethMeshRef.current.morphTargetInfluences[teethIdx] = THREE.MathUtils.clamp(
              value * TEETH_VISIBILITY_MULTIPLIER,
              0,
              1
            );
        }
      }
      if (visemeOIdxRef.current !== null) {
        const idx = visemeOIdxRef.current;
        const target = THREE.MathUtils.clamp(
          (speech * (0.045 + (1 - speechWave) * 0.055) + timedViseme.o * 0.9) * MOUTH_MOTION_SCALE,
          0,
          1
        );
        const value = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          target,
          target > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
        influences[idx] = value;
        if (teethMeshRef.current?.morphTargetDictionary && teethMeshRef.current.morphTargetInfluences) {
          const teethIdx = teethMeshRef.current.morphTargetDictionary.viseme_O;
          if (teethIdx !== undefined)
            teethMeshRef.current.morphTargetInfluences[teethIdx] = THREE.MathUtils.clamp(
              value * TEETH_VISIBILITY_MULTIPLIER,
              0,
              1
            );
        }
      }
      if (visemeIIdxRef.current !== null) {
        const idx = visemeIIdxRef.current;
        const target = THREE.MathUtils.clamp((speech * 0.03 + timedViseme.i * 0.8) * MOUTH_MOTION_SCALE, 0, 1);
        const value = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          target,
          target > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
        influences[idx] = value;
        if (teethMeshRef.current?.morphTargetDictionary && teethMeshRef.current.morphTargetInfluences) {
          const teethIdx = teethMeshRef.current.morphTargetDictionary.viseme_I;
          if (teethIdx !== undefined)
            teethMeshRef.current.morphTargetInfluences[teethIdx] = THREE.MathUtils.clamp(
              value * TEETH_VISIBILITY_MULTIPLIER,
              0,
              1
            );
        }
      }
      if (visemePpIdxRef.current !== null) {
        const idx = visemePpIdxRef.current;
        const target = THREE.MathUtils.clamp(timedViseme.pp * 0.95 + (speech > 0.12 ? 0.01 : 0.16), 0, 1);
        const value = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          target,
          target > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
        influences[idx] = value;
        if (teethMeshRef.current?.morphTargetDictionary && teethMeshRef.current.morphTargetInfluences) {
          const teethIdx = teethMeshRef.current.morphTargetDictionary.viseme_PP;
          if (teethIdx !== undefined)
            teethMeshRef.current.morphTargetInfluences[teethIdx] = THREE.MathUtils.clamp(
              value * TEETH_VISIBILITY_MULTIPLIER,
              0,
              1
            );
        }
      }

      // Pull lips away from teeth during speech so teeth become visible naturally.
      const upperLift = (speech * 0.24 + timedViseme.aa * 0.18) * MOUTH_MOTION_SCALE;
      const lowerDrop = (speech * 0.27 + (timedViseme.aa + timedViseme.o) * 0.2) * MOUTH_MOTION_SCALE;
      if (mouthUpperUpLeftIdxRef.current !== null) {
        const idx = mouthUpperUpLeftIdxRef.current;
        influences[idx] = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          upperLift,
          upperLift > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
      }
      if (mouthUpperUpRightIdxRef.current !== null) {
        const idx = mouthUpperUpRightIdxRef.current;
        influences[idx] = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          upperLift,
          upperLift > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
      }
      if (mouthLowerDownLeftIdxRef.current !== null) {
        const idx = mouthLowerDownLeftIdxRef.current;
        influences[idx] = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          lowerDrop,
          lowerDrop > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
      }
      if (mouthLowerDownRightIdxRef.current !== null) {
        const idx = mouthLowerDownRightIdxRef.current;
        influences[idx] = THREE.MathUtils.lerp(
          influences[idx] ?? 0,
          lowerDrop,
          lowerDrop > (influences[idx] ?? 0) ? MOUTH_OPEN_SPEED : MOUTH_CLOSE_SPEED
        );
      }
    }

    if (
      headMeshRef.current &&
      blinkLeftIdxRef.current !== null &&
      blinkRightIdxRef.current !== null &&
      headMeshRef.current.morphTargetInfluences
    ) {
      if (!blinkRef.current.active && t >= blinkRef.current.nextAt) {
        blinkRef.current.active = true;
        blinkRef.current.start = t;
        blinkRef.current.duration = 0.09 + Math.random() * 0.07;
      }

      let blink = 0;
      if (blinkRef.current.active) {
        const p = (t - blinkRef.current.start) / blinkRef.current.duration;
        if (p >= 1) {
          blinkRef.current.active = false;
          blinkRef.current.nextAt = t + 2.1 + Math.random() * 2.4;
        } else {
          blink = Math.sin(p * Math.PI);
        }
      }

      headMeshRef.current.morphTargetInfluences[blinkLeftIdxRef.current] = blink;
      headMeshRef.current.morphTargetInfluences[blinkRightIdxRef.current] = blink;
    }
  });

  return <primitive object={scene} position={[0, -1.55, 0]} />;
};

export const Avatar = forwardRef<AvatarRef, {}>((props, ref) => {
  const TALKINGHEAD_CDN_URLS = [
    "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/modules/talkinghead.mjs",
    "https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7.0/modules/talkinghead.mjs",
  ] as const;
  const HEADAUDIO_MODULE_URLS = [
    "https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@v0.1.0-alpha/modules/headaudio.mjs",
    "https://cdn.jsdelivr.net/npm/@met4citizen/headaudio@0.1.0/modules/headaudio.mjs",
  ] as const;
  const HEADAUDIO_WORKLET_URLS = [
    "https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@v0.1.0-alpha/modules/headworklet.mjs",
    "https://cdn.jsdelivr.net/npm/@met4citizen/headaudio@0.1.0/modules/headworklet.mjs",
  ] as const;
  const HEADAUDIO_MODEL_URLS = [
    "https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@v0.1.0-alpha/models/model-en-mixed.bin",
    "https://cdn.jsdelivr.net/npm/@met4citizen/headaudio@0.1.0/models/model-en-mixed.bin",
  ] as const;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<any>(null);
  const headAudioRef = useRef<any>(null);
  const headOriginalUpdateRef = useRef<((dt: number) => void) | null>(null);
  const fallbackAudioCtxRef = useRef<AudioContext | null>(null);
  const fallbackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fallbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const fallbackDataRef = useRef<Uint8Array | null>(null);
  const fallbackRafRef = useRef<number | null>(null);
  const fallbackSpeechLevelRef = useRef(0);
  const fallbackTimedVisemeRef = useRef<TimedVisemeState>({ speech: 0, aa: 0, o: 0, i: 0, pp: 0 });
  const fallbackTimedCuesRef = useRef<TimedVisemeCue[]>([]);
  const fallbackTimedStartRef = useRef(0);
  const fallbackTimedEndRef = useRef(0);
  const fallbackSpeechActiveUntilRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const [useFallbackRenderer, setUseFallbackRenderer] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const importFromUrls = async (urls: readonly string[]) => {
      let lastError: unknown = null;
      for (const url of urls) {
        try {
          return await import(/* webpackIgnore: true */ url);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError ?? new Error("Failed to import module from all URLs");
    };

    const registerWorklet = async (audioCtx: AudioContext, urls: readonly string[]) => {
      let lastError: unknown = null;
      for (const url of urls) {
        try {
          await audioCtx.audioWorklet.addModule(url);
          return;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError ?? new Error("Failed to register worklet from all URLs");
    };

    const loadHeadAudioModel = async (headAudio: any, urls: readonly string[]) => {
      let lastError: unknown = null;
      for (const url of urls) {
        try {
          await headAudio.loadModel(url);
          return;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError ?? new Error("Failed to load HeadAudio model from all URLs");
    };

    const setupHeadAudio = async (head: any) => {
      try {
        if (!head?.audioCtx || !head?.audioSpeechGainNode) return;
        await registerWorklet(head.audioCtx, HEADAUDIO_WORKLET_URLS);
        const headAudioModule = await importFromUrls(HEADAUDIO_MODULE_URLS);
        const HeadAudioNode = headAudioModule.HeadAudioNode ?? headAudioModule.default ?? headAudioModule.HeadAudio;
        if (!HeadAudioNode) return;

        const headAudio = new HeadAudioNode(head.audioCtx, {
          processorOptions: {},
          parameterData: {
            vadMode: 1,
            vadGateActiveDb: -38,
            vadGateInactiveDb: -54,
            vadGateInactiveMs: 16,
          },
        });

        await loadHeadAudioModel(headAudio, HEADAUDIO_MODEL_URLS);
        head.audioSpeechGainNode.connect(headAudio);

        headAudio.onvalue = (key: string, value: number) => {
          const mt = head.mtAvatar?.[key];
          if (!mt) return;
          Object.assign(mt, { newvalue: value, needsUpdate: true });
        };
        headAudio.onstarted = () => head.lookAtCamera?.(350);

        headOriginalUpdateRef.current = typeof head.opt?.update === "function" ? head.opt.update.bind(head) : null;
        head.opt.update = (dt: number) => {
          if (headOriginalUpdateRef.current) headOriginalUpdateRef.current(dt);
          headAudio.update(dt);
        };
        headAudioRef.current = headAudio;
      } catch (error) {
        console.warn("HeadAudio setup failed, using TalkingHead default lipsync.", error);
      }
    };

    const initHead = async () => {
      if (!containerRef.current) return;
      const module = await importFromUrls(TALKINGHEAD_CDN_URLS);
      const TalkingHeadCtor = module?.TalkingHead as
        | (new (container: HTMLElement, options: Record<string, unknown>) => any)
        | undefined;
      if (!TalkingHeadCtor) throw new Error("Unable to import TalkingHead from CDN");
      const head = new TalkingHeadCtor(containerRef.current, {
        cameraView: "upper",
        cameraZoomEnable: false,
        cameraPanEnable: false,
        cameraRotateEnable: false,
        modelMovementFactor: 0.8,
        lipsyncModules: ["en"],
      });
      try {
        await head.showAvatar({
          // Same model file as fallback renderer; replace `public/avatar.glb` to change outfit.
          url: "/avatar.glb",
          body: "F",
          avatarMood: "neutral",
          lipsyncLang: "en",
          avatarIdleEyeContact: 0.5,
          avatarSpeakingEyeContact: 0.9,
          avatarSpeakingHeadMove: 0.42,
        });
      } catch (showError) {
        console.warn("TalkingHead showAvatar full config failed, retrying minimal config.", showError);
        await head.showAvatar({ url: "/avatar.glb", lipsyncLang: "en" });
      }

      if (isCancelled) {
        head.stop?.();
        return;
      }

      await setupHeadAudio(head);
      headRef.current = head;
      setUseFallbackRenderer(false);
      setIsReady(true);
    };

    initHead().catch((error) => {
      console.error("Failed to initialize TalkingHead:", error);
      setUseFallbackRenderer(true);
      setIsReady(true);
    });

    return () => {
      isCancelled = true;
      if (headRef.current) {
        headRef.current.stop?.();
      }
      if (headAudioRef.current) {
        try {
          headAudioRef.current.disconnect?.();
        } catch {
          // no-op
        }
        headAudioRef.current = null;
      }
      if (fallbackSourceRef.current) {
        fallbackSourceRef.current.stop();
      }
      if (fallbackRafRef.current !== null) {
        cancelAnimationFrame(fallbackRafRef.current);
      }
      fallbackAudioCtxRef.current?.close();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    resumeAudioContext: () => {
      const audioCtx = headRef.current?.audioCtx;
      if (audioCtx?.state === "suspended") {
        audioCtx.resume();
      }
      if (fallbackAudioCtxRef.current?.state === "suspended") {
        fallbackAudioCtxRef.current.resume();
      }
    },
    stopSpeaking: () => {
      try {
        headRef.current?.stopSpeaking?.();
      } catch {
        // no-op
      }
      try {
        headRef.current?.streamStart?.();
        headRef.current?.streamStop?.();
      } catch {
        // no-op if stream mode is not available
      }
      if (fallbackSourceRef.current) {
        try {
          fallbackSourceRef.current.stop();
        } catch {
          // no-op
        }
        fallbackSourceRef.current = null;
      }
      if (fallbackRafRef.current !== null) {
        cancelAnimationFrame(fallbackRafRef.current);
        fallbackRafRef.current = null;
      }
      fallbackSpeechLevelRef.current = 0;
      fallbackTimedVisemeRef.current = { speech: 0, aa: 0, o: 0, i: 0, pp: 0 };
      fallbackTimedCuesRef.current = [];
      fallbackTimedStartRef.current = 0;
      fallbackTimedEndRef.current = 0;
      fallbackSpeechActiveUntilRef.current = 0;
    },
    speakAudio: async ({ audio, words, wtimes, wdurations, chars, ctimes, cdurations }) => {
      const arrayBuffer = audio instanceof Blob ? await audio.arrayBuffer() : audio;

      if (!headRef.current) {
        if (!fallbackAudioCtxRef.current) {
          fallbackAudioCtxRef.current = new AudioContext();
        }
        const fallbackCtx = fallbackAudioCtxRef.current;
        if (fallbackCtx.state === "suspended") {
          await fallbackCtx.resume();
        }

        const decoded = await fallbackCtx.decodeAudioData(arrayBuffer.slice(0));
        const source = fallbackCtx.createBufferSource();
        source.buffer = decoded;
        const analyser = fallbackCtx.createAnalyser();
        analyser.fftSize = 1024;
        const data = new Uint8Array(analyser.frequencyBinCount);

        source.connect(analyser);
        analyser.connect(fallbackCtx.destination);

        if (fallbackSourceRef.current) {
          try {
            fallbackSourceRef.current.stop();
          } catch {
            // no-op
          }
        }

        fallbackSourceRef.current = source;
        fallbackAnalyserRef.current = analyser;
        fallbackDataRef.current = data;
        if (chars && ctimes && cdurations && chars.length === ctimes.length && chars.length === cdurations.length) {
          const cues: TimedVisemeCue[] = chars.map((char, i) => {
            const mapped = mapCharToCue(char);
            const tMs = ctimes[i] ?? 0;
            const dMs = Math.max(cdurations[i] ?? 40, 20);
            return { t: tMs / 1000, d: dMs / 1000, ...mapped };
          });
          fallbackTimedCuesRef.current = cues;
          fallbackTimedStartRef.current = fallbackCtx.currentTime;
          fallbackTimedEndRef.current = fallbackTimedStartRef.current + (cues.at(-1)?.t ?? 0) + (cues.at(-1)?.d ?? 0);
        } else {
          fallbackTimedCuesRef.current = [];
          fallbackTimedStartRef.current = 0;
          fallbackTimedEndRef.current = 0;
        }

        const tick = () => {
          if (!fallbackAnalyserRef.current || !fallbackDataRef.current) return;
          fallbackAnalyserRef.current.getByteFrequencyData(fallbackDataRef.current as any);
          let sum = 0;
          for (let i = 0; i < fallbackDataRef.current.length; i++) {
            sum += fallbackDataRef.current[i];
          }
          const avg = sum / fallbackDataRef.current.length;
          const energySpeech = THREE.MathUtils.clamp(avg / 90, 0, 1);

          let timedSpeech = 0;
          let aa = 0;
          let o = 0;
          let i = 0;
          let pp = 0;
          let openCueStrength = 0;
          if (fallbackTimedCuesRef.current.length > 0 && fallbackTimedStartRef.current > 0) {
            const now = fallbackCtx.currentTime - fallbackTimedStartRef.current;
            for (const cue of fallbackTimedCuesRef.current) {
              const center = cue.t + cue.d * 0.5;
              const dt = now - center;
              if (dt < -VIS_ANTICIPATION_SEC || dt > VIS_RELEASE_SEC) continue;
              // Asymmetric coarticulation: shorter anticipation, slightly longer release.
              const spread = dt < 0 ? VIS_ANTICIPATION_SEC : VIS_RELEASE_SEC;
              const norm = dt / Math.max(spread, 0.001);
              const weight = Math.exp(-0.5 * norm * norm);
              aa += cue.aa * weight;
              o += cue.o * weight;
              i += cue.i * weight;
              pp += cue.pp * weight;
              // Keep speech openness driven by open-mouth visemes only.
              const open = Math.max(cue.aa, cue.o, cue.i);
              timedSpeech += open * weight;
              openCueStrength += open * weight;
            }
            const pauseDist = Math.min(
              ...fallbackTimedCuesRef.current.map((cue) => Math.abs(now - (cue.t + cue.d)))
            );
            if (Number.isFinite(pauseDist) && pauseDist > PAUSE_CLOSE_THRESHOLD_SEC) {
              timedSpeech *= 0.35;
            }
            if (openCueStrength < OPEN_CUE_MIN_STRENGTH) {
              timedSpeech = 0;
              aa *= 0.2;
              o *= 0.2;
              i *= 0.2;
              pp = Math.max(pp, 0.28);
            }
          }

          const nowAbs = fallbackCtx.currentTime;
          if (energySpeech > ENERGY_ACTIVE_THRESHOLD) {
            fallbackSpeechActiveUntilRef.current = nowAbs + SPEECH_HANGOVER_SEC;
          } else if (energySpeech < ENERGY_INACTIVE_THRESHOLD && nowAbs > fallbackSpeechActiveUntilRef.current) {
            fallbackSpeechActiveUntilRef.current = 0;
          }
          const speechActive = nowAbs < fallbackSpeechActiveUntilRef.current;

          fallbackTimedVisemeRef.current = {
            speech: THREE.MathUtils.clamp(speechActive ? timedSpeech : 0, 0, 1),
            aa: THREE.MathUtils.clamp(aa, 0, 1),
            o: THREE.MathUtils.clamp(o, 0, 1),
            i: THREE.MathUtils.clamp(i, 0, 1),
            pp: THREE.MathUtils.clamp(pp, 0, 1),
          };
          // Prioritize complete closure whenever no open-mouth cue is active.
          fallbackSpeechLevelRef.current = THREE.MathUtils.clamp(
            Math.max(
              openCueStrength < OPEN_CUE_MIN_STRENGTH ? 0 : (speechActive ? energySpeech * 0.2 : 0),
              speechActive ? timedSpeech : 0
            ),
            0,
            1
          );
          fallbackRafRef.current = requestAnimationFrame(tick);
        };

        tick();
        source.start();

        await new Promise<void>((resolve) => {
          source.onended = () => {
            fallbackSpeechLevelRef.current = 0;
            fallbackTimedVisemeRef.current = { speech: 0, aa: 0, o: 0, i: 0, pp: 0 };
            fallbackTimedCuesRef.current = [];
            fallbackTimedStartRef.current = 0;
            fallbackTimedEndRef.current = 0;
            fallbackSpeechActiveUntilRef.current = 0;
            if (fallbackRafRef.current !== null) {
              cancelAnimationFrame(fallbackRafRef.current);
              fallbackRafRef.current = null;
            }
            fallbackSourceRef.current = null;
            resolve();
          };
        });
        return;
      }

      const audioCtx: AudioContext | null = headRef.current.audioCtx ?? null;
      if (!audioCtx) return;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      await headRef.current.speakAudio(
        {
          audio: audioBuffer,
          words: words ?? [],
          wtimes: wtimes ?? [],
          wdurations: wdurations ?? [],
        },
        { lipsyncLang: "en" }
      );
    },
  }));

  return (
    <div className="w-full max-w-sm aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-800 to-black relative">
      {!isReady && (
        <div className="absolute inset-0 grid place-items-center text-sm text-gray-300">
          Loading avatar...
        </div>
      )}
      {useFallbackRenderer ? (
        <Canvas camera={{ position: [0, 0, 2.5], fov: 15 }}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[2, 2, 2]} intensity={1.3} />
          <Environment preset="city" />
          <React.Suspense fallback={null}>
            <FallbackAvatarModel speechLevelRef={fallbackSpeechLevelRef} timedVisemeRef={fallbackTimedVisemeRef} />
          </React.Suspense>
        </Canvas>
      ) : (
        <div ref={containerRef} className="h-full w-full" />
      )}
    </div>
  );
});

Avatar.displayName = "Avatar";
useGLTF.preload("/avatar.glb");
