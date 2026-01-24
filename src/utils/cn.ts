/**
 * cn utility function
 *
 * Combines clsx and tailwind-merge for conditional className merging.
 * This utility ensures that Tailwind CSS classes are properly merged
 * without conflicts when multiple className sources are combined.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
