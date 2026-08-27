import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeTranslationDisplayCasing } from '../../../src/application/glossary/translation-casing.js';

test('lowercases a Vietnamese common-noun headword and matching mid-sentence uses', () => {
  assert.deepEqual(
    normalizeTranslationDisplayCasing({
      languageCode: 'vi',
      sourceTerm: 'battery',
      term: 'Pin',
      definition:
        'Pin cung cấp năng lượng. “Pin hoạt động.” Thảo luận về Pin hôm nay.',
      example: 'Nhóm đã thảo luận về Pin khi cải tiến robot.',
    }),
    {
      languageCode: 'vi',
      term: 'pin',
      definition:
        'Pin cung cấp năng lượng. “Pin hoạt động.” Thảo luận về pin hôm nay.',
      example: 'Nhóm đã thảo luận về pin khi cải tiến robot.',
    },
  );
});

test('preserves canonical proper-name casing and scripts without letter case', () => {
  assert.deepEqual(
    normalizeTranslationDisplayCasing({
      languageCode: 'vi',
      sourceTerm: 'Arduino',
      term: 'Arduino',
      example: 'Dùng Arduino để điều khiển robot.',
    }),
    {
      languageCode: 'vi',
      term: 'Arduino',
      example: 'Dùng Arduino để điều khiển robot.',
    },
  );
  for (const [languageCode, term] of [
    ['ko', '배터리'],
    ['zh-Hans', '电池'],
  ] as const) {
    assert.deepEqual(
      normalizeTranslationDisplayCasing({
        languageCode,
        sourceTerm: 'battery',
        term,
      }),
      { languageCode, term },
    );
  }
});
