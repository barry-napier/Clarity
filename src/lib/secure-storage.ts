import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// On iOS, @aparajita/capacitor-secure-storage uses iOS Keychain
// On web, we fallback to Preferences (localStorage)
let SecureStorage: typeof import('@aparajita/capacitor-secure-storage').SecureStorage | null =
  null;

async function getSecureStorage() {
  if (SecureStorage !== null) return SecureStorage;

  if (Capacitor.isNativePlatform()) {
    const module = await import('@aparajita/capacitor-secure-storage');
    SecureStorage = module.SecureStorage;
    return SecureStorage;
  }

  // Web fallback - no secure storage available
  return null;
}

export async function secureSet(key: string, value: string): Promise<void> {
  const storage = await getSecureStorage();

  if (storage) {
    await storage.setItem(key, value);
  } else {
    // Fallback to Preferences on web
    await Preferences.set({ key, value });
  }
}

export async function secureGet(key: string): Promise<string | null> {
  const storage = await getSecureStorage();

  if (storage) {
    return await storage.getItem(key);
  } else {
    const { value } = await Preferences.get({ key });
    return value;
  }
}

export async function secureRemove(key: string): Promise<void> {
  const storage = await getSecureStorage();

  if (storage) {
    await storage.remove(key);
  } else {
    await Preferences.remove({ key });
  }
}
