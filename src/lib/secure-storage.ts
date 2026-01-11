import { Preferences } from '@capacitor/preferences';

// NOTE: @aparajita/capacitor-secure-storage has compatibility issues with iOS SPM
// Using Capacitor Preferences as fallback (less secure but functional)
// TODO: Fix secure storage plugin or switch to a different solution

export async function secureSet(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value });
}

export async function secureGet(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}

export async function secureRemove(key: string): Promise<void> {
  await Preferences.remove({ key });
}
