/**
 * Unbreakable Vow — Sound Module
 *
 * Three custom sounds for the native-perfect build:
 * - Seal thud (screen 06 apex)
 * - Verdict kept chime (D1)
 * - Verdict broken glide (D2)
 *
 * Audio session: AVAudioSessionCategoryAmbient — mixes with Spotify,
 * respects silent-mode rocker.
 *
 * RULE: Pre-load all 3 sounds at app boot. Use playSyncedFeedback()
 * for any moment that pairs sound + haptic.
 */
import { Audio } from 'expo-av';

let sealThud: Audio.Sound | null = null;
let verdictKeptChime: Audio.Sound | null = null;
let verdictBrokenGlide: Audio.Sound | null = null;
let initialized = false;

/**
 * Configure audio session and pre-load all 3 sounds.
 * Call once at app boot (e.g. in root _layout.tsx useEffect).
 */
export async function initSounds(): Promise<void> {
  if (initialized) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeOnIOS: false, // respect silent-mode rocker
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Stub sound files — replace with real assets when sourced.
    // Using require() for bundled assets; these paths will point to
    // actual .wav/.mp3 files in expo/assets/sounds/ once sourced.
    // For now, sounds are optional — if the file doesn't exist,
    // playback silently no-ops.

    // TODO: Replace stubs with real sound files:
    // sealThud: ~300ms, low woody thud, -14 dB
    // verdictKeptChime: ~400ms, bright bell-tone, -16 dB
    // verdictBrokenGlide: ~600ms, descending tone, -16 dB

    initialized = true;
  } catch {
    // Audio init failure is non-fatal — app works without sound
    console.warn('[sounds] Audio initialization failed');
  }
}

async function playSound(sound: Audio.Sound | null): Promise<void> {
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Sound playback failure is non-fatal
  }
}

export function playSealThud(): Promise<void> {
  return playSound(sealThud);
}

export function playVerdictKept(): Promise<void> {
  return playSound(verdictKeptChime);
}

export function playVerdictBroken(): Promise<void> {
  return playSound(verdictBrokenGlide);
}

/**
 * Fire sound + haptic on the same frame for ceremonial moments.
 * Per STEP_4 §C.3: expo-av is sub-frame latency, so calling
 * both in sequence is reliable.
 */
export async function playSyncedFeedback(
  soundFn: () => Promise<void>,
  hapticFn: () => void,
): Promise<void> {
  await soundFn();
  hapticFn();
}

/**
 * Load a sound file from assets. Call after initSounds() when
 * real sound files are available.
 */
export async function loadSoundAssets(): Promise<void> {
  try {
    // Uncomment and update paths when sound files are sourced:
    // const { sound: s1 } = await Audio.Sound.createAsync(
    //   require('../assets/sounds/seal-thud.wav'),
    //   { volume: 0.2 } // -14 dB ≈ 0.2 linear
    // );
    // sealThud = s1;
    //
    // const { sound: s2 } = await Audio.Sound.createAsync(
    //   require('../assets/sounds/verdict-kept.wav'),
    //   { volume: 0.16 } // -16 dB ≈ 0.16 linear
    // );
    // verdictKeptChime = s2;
    //
    // const { sound: s3 } = await Audio.Sound.createAsync(
    //   require('../assets/sounds/verdict-broken.wav'),
    //   { volume: 0.16 }
    // );
    // verdictBrokenGlide = s3;
  } catch {
    console.warn('[sounds] Failed to load sound assets');
  }
}

/**
 * Unload all sounds. Call on app teardown if needed.
 */
export async function unloadSounds(): Promise<void> {
  await sealThud?.unloadAsync();
  await verdictKeptChime?.unloadAsync();
  await verdictBrokenGlide?.unloadAsync();
  sealThud = null;
  verdictKeptChime = null;
  verdictBrokenGlide = null;
  initialized = false;
}
