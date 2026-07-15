import { randomBytes } from 'node:crypto';
import { MINOR_AGE_THRESHOLD_YEARS } from '@scoutai/domain';

/**
 * Platform policy helper: treats athletes under MINOR_AGE_THRESHOLD_YEARS as minors.
 * LEGAL REVIEW REQUIRED before production collection/enforcement of DOB-based minor gating.
 */
export function isMinorAthlete(dateOfBirth: Date | string | null | undefined): boolean {
  if (!dateOfBirth) {
    // Minor-by-default when DOB is unknown (high-school athlete context).
    return true;
  }
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) {
    return true;
  }
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age < MINOR_AGE_THRESHOLD_YEARS;
}

export function slugifyName(parts: string[]): string {
  const base = parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'athlete';
}

export function generateAthleteSlug(firstName: string, lastName: string, displayName?: string): string {
  const base = slugifyName([displayName || '', firstName, lastName].filter(Boolean));
  const suffix = randomBytes(2).toString('hex');
  return `${base}-${suffix}`;
}

export function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function decimalToNumber(value: { toNumber(): number } | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  return value.toNumber();
}
