import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard, type KeyboardInfo } from '@capacitor/keyboard';

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to track iOS keyboard visibility and height
 * Returns keyboard state for adjusting UI layout
 */
export function useKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    // Only set up listeners on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const showListener = Keyboard.addListener(
      'keyboardWillShow',
      (info: KeyboardInfo) => {
        setState({
          isVisible: true,
          keyboardHeight: info.keyboardHeight,
        });
      }
    );

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setState({
        isVisible: false,
        keyboardHeight: 0,
      });
    });

    return () => {
      showListener.then((l) => l.remove());
      hideListener.then((l) => l.remove());
    };
  }, []);

  return state;
}

/**
 * Scroll an element into view when keyboard appears
 */
export function scrollIntoViewOnKeyboard(element: HTMLElement | null): void {
  if (!element) return;

  // Small delay to allow keyboard animation
  setTimeout(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}
