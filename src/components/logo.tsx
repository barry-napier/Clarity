import { type SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-foreground', className)}
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <rect
        x="10"
        y="10"
        width="4"
        height="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="1"
      />
    </svg>
  );
}
