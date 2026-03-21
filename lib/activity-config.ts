/**
 * Activity display config helpers.
 * Separate from difficulty colors (green→red scale) to avoid visual conflict.
 */

export interface DurationConfig {
    color: string;
    label: string;
}

/**
 * Returns a color class for duration using a blue scale (sky→violet).
 * Distinct from difficulty which uses green→orange→red.
 */
export function getDurationConfig(duration: number | null | undefined): DurationConfig {
    if (!duration) return { color: 'text-text-muted', label: '' };
    if (duration <= 15) return { color: 'text-sky-400', label: `${duration} min` };
    if (duration <= 30) return { color: 'text-blue-400', label: `${duration} min` };
    if (duration <= 60) return { color: 'text-indigo-400', label: `${duration} min` };
    return { color: 'text-violet-500', label: `${duration} min` };
}
