import { useState, useCallback, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { createCapture } from '@/lib/captures';

interface CaptureInputProps {
  onCapture?: () => void;
}

export function CaptureInput({ onCapture }: CaptureInputProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createCapture(trimmed);
      setValue('');
      onCapture?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [value, isSubmitting, onCapture]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="What's on your mind?"
      disabled={isSubmitting}
      className="bg-card border-border"
    />
  );
}
