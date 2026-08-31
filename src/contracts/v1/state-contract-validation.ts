import { createHash } from 'node:crypto';

import type { IsoDate, IsoInstant } from './common.js';
import {
  scopeIdentifier,
  type ScopeIdentifier,
  type ScopeIdentifierKind,
} from './workspace.js';

export type PlainObject = Record<string, unknown>;

export function safelyValidate(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}

export function isPlainObject(value: unknown): value is PlainObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(value).every((key) => {
      if (typeof key !== 'string') return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        descriptor !== undefined &&
        'value' in descriptor &&
        descriptor.enumerable
      );
    });
  } catch {
    return false;
  }
}

export function hasExactKeys(
  value: PlainObject,
  required: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === required.length &&
    required.every(
      (key) => Object.hasOwn(value, key) && value[key] !== undefined,
    )
  );
}

export function isDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) return false;
  try {
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== 'string')) return false;
    const entries = ownKeys.filter((key) => key !== 'length');
    if (entries.length !== value.length) return false;
    return entries.every((key) => {
      if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        return false;
      }
      const index = Number(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        Number.isSafeInteger(index) &&
        index < value.length &&
        descriptor !== undefined &&
        'value' in descriptor &&
        descriptor.enumerable
      );
    });
  } catch {
    return false;
  }
}

export function isBoundedString(
  value: unknown,
  maximumLength = 512,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
}

export function isScopeIdentifier<Kind extends ScopeIdentifierKind>(
  kind: Kind,
  value: unknown,
): value is ScopeIdentifier<Kind> {
  try {
    scopeIdentifier(kind, value);
    return true;
  } catch {
    return false;
  }
}

export function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0;
}

export function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

export function isIsoInstant(value: unknown): value is IsoInstant {
  if (typeof value !== 'string') return false;
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?Z$/u.exec(value);
  if (match === null || !isIsoDate(match[1])) return false;
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) {
    return false;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  const normalized = parsed.toISOString();
  return match[5] === undefined
    ? normalized.replace('.000Z', 'Z') === value
    : normalized === value;
}

export function isIanaTimeZone(value: unknown): value is string {
  if (!isBoundedString(value, 128)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/u.test(value);
}

export function canonicalJson(value: unknown): string {
  const ancestors = new WeakSet<object>();
  const normalize = (entry: unknown): unknown => {
    if (
      entry === null ||
      typeof entry === 'string' ||
      typeof entry === 'boolean'
    ) {
      return entry;
    }
    if (typeof entry === 'number') {
      if (!Number.isFinite(entry))
        throw new TypeError('Non-finite JSON number.');
      return entry;
    }
    if (isDenseArray(entry)) {
      if (ancestors.has(entry)) throw new TypeError('Cyclic JSON value.');
      ancestors.add(entry);
      const result = entry.map(normalize);
      ancestors.delete(entry);
      return result;
    }
    if (!isPlainObject(entry)) throw new TypeError('Non-JSON data property.');
    if (ancestors.has(entry)) throw new TypeError('Cyclic JSON value.');
    ancestors.add(entry);
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(entry).sort()) {
      const child = entry[key];
      if (child === undefined) throw new TypeError('Undefined JSON value.');
      result[key] = normalize(child);
    }
    ancestors.delete(entry);
    return result;
  };
  return JSON.stringify(normalize(value));
}

export function sha256Digest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

export function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function isSorted(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || (values[index - 1] ?? '') < value,
  );
}
