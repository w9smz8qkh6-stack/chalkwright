export interface TranslationDisplayText {
  readonly languageCode: 'vi' | 'ko' | 'zh-Hans';
  readonly sourceTerm: string;
  readonly term?: string;
  readonly definition?: string;
  readonly example?: string;
}

/**
 * Aligns cased translated headwords with an already-normalized lowercase source
 * headword. Korean and Chinese intentionally pass through because their scripts
 * do not have uppercase/lowercase forms.
 */
export function normalizeTranslationDisplayCasing(
  value: TranslationDisplayText,
): Omit<TranslationDisplayText, 'sourceTerm'> {
  if (
    value.term === undefined ||
    value.term.length === 0 ||
    !languageHasLetterCase(value.languageCode) ||
    !startsWithLowercaseLetter(value.sourceTerm, 'en')
  )
    return displayText(value);

  const term = lowercaseFirstLetter(value.term, value.languageCode);
  if (term === value.term) return displayText(value);
  return {
    languageCode: value.languageCode,
    term,
    ...(value.definition === undefined
      ? {}
      : {
          definition: normalizeMidSentenceTerm(
            value.definition,
            value.term,
            term,
          ),
        }),
    ...(value.example === undefined
      ? {}
      : {
          example: normalizeMidSentenceTerm(value.example, value.term, term),
        }),
  };
}

function displayText(
  value: TranslationDisplayText,
): Omit<TranslationDisplayText, 'sourceTerm'> {
  return {
    languageCode: value.languageCode,
    ...(value.term === undefined ? {} : { term: value.term }),
    ...(value.definition === undefined ? {} : { definition: value.definition }),
    ...(value.example === undefined ? {} : { example: value.example }),
  };
}

function languageHasLetterCase(
  languageCode: TranslationDisplayText['languageCode'],
): boolean {
  return languageCode.toLowerCase() === 'vi';
}

function startsWithLowercaseLetter(value: string, locale: string): boolean {
  for (const character of value) {
    const lower = character.toLocaleLowerCase(locale);
    const upper = character.toLocaleUpperCase(locale);
    if (lower === upper) continue;
    return character === lower;
  }
  return false;
}

function lowercaseFirstLetter(value: string, locale: string): string {
  let offset = 0;
  for (const character of value) {
    const lower = character.toLocaleLowerCase(locale);
    const upper = character.toLocaleUpperCase(locale);
    if (lower !== upper)
      return `${value.slice(0, offset)}${lower}${value.slice(offset + character.length)}`;
    offset += character.length;
  }
  return value;
}

function normalizeMidSentenceTerm(
  text: string,
  originalTerm: string,
  normalizedTerm: string,
): string {
  let result = '';
  let cursor = 0;
  while (cursor < text.length) {
    const index = text.indexOf(originalTerm, cursor);
    if (index === -1) return result + text.slice(cursor);
    const afterIndex = index + originalTerm.length;
    const previous = previousCharacter(text, index);
    const next = nextCharacter(text, afterIndex);
    const bounded = !isWordCharacter(previous) && !isWordCharacter(next);
    const sentenceInitial = sentenceStartsAt(text, index);
    result += text.slice(cursor, index);
    result += bounded && !sentenceInitial ? normalizedTerm : originalTerm;
    cursor = afterIndex;
  }
  return result;
}

function sentenceStartsAt(value: string, offset: number): boolean {
  return /(?:^|[.!?\u2026])[\s"'“”‘’([{]*$/u.test(value.slice(0, offset));
}

function previousCharacter(value: string, offset: number): string | undefined {
  return Array.from(value.slice(0, offset)).at(-1);
}

function nextCharacter(value: string, offset: number): string | undefined {
  return Array.from(value.slice(offset))[0];
}

function isWordCharacter(value: string | undefined): boolean {
  return value !== undefined && /[\p{L}\p{N}_]/u.test(value);
}
