import assert from 'node:assert/strict';
import test from 'node:test';

import {
  presentationCard,
  presentationCourseBanner,
  presentationCourseLabel,
} from '../../src/app/mvp-controller.js';
import type { DayPlanMeeting } from '../../src/contracts/v1/day-plan.js';

function meeting(courseKey: string, blockLabel: string): DayPlanMeeting {
  return {
    meetingId: `meeting-${courseKey}`,
    courseKey,
    blockLabel,
    checkInOpensAt: '2035-04-13T07:55:00Z',
    checkInClosesAt: '2035-04-13T08:00:00Z',
    officialStartsAt: '2035-04-13T08:00:00Z',
    contentStartsAt: '2035-04-13T08:00:00Z',
    dismissalStartsAt: '2035-04-13T08:55:00Z',
    officialEndsAt: '2035-04-13T09:00:00Z',
  };
}

test('projects a human course title only from its matching section suffix', () => {
  assert.equal(
    presentationCourseLabel(meeting('ic008-1', 'Robotics (IC008.1)')),
    'Robotics',
  );
  assert.equal(
    presentationCourseLabel(meeting('ic008-1', 'Robotics (OTHER.1)')),
    'Robotics (OTHER.1)',
  );
  assert.equal(
    presentationCourseLabel(meeting('ic008-1', 'Robotics')),
    'Robotics',
  );
});

test('retains normalized-key and synthetic-fixture fallbacks', () => {
  assert.equal(
    presentationCourseLabel(meeting('ic008-1', 'IC008.1')),
    'ic008-1',
  );
  assert.equal(
    presentationCourseLabel(meeting('course-a', 'Synthetic block A')),
    'Web Design',
  );
});

test('removes a live section suffix from known friendly course titles and maps their banner', () => {
  const liveMeeting = meeting(
    'mict03-1',
    'Digital Media Production A (MICT03.1)',
  );
  assert.equal(
    presentationCourseLabel(liveMeeting),
    'Digital Media Production',
  );
  assert.equal(
    presentationCourseBanner(liveMeeting),
    '/assets/banner-digital-media-production-v2.png',
  );
  assert.equal(
    presentationCourseLabel(meeting('unknown-1', 'Unknown Course A')),
    'Unknown Course A',
  );
  assert.equal(
    presentationCourseBanner(meeting('unknown-1', 'Unknown Course A')),
    undefined,
  );
  assert.equal(
    presentationCourseLabel(meeting('advisory-1', 'Advisory A')),
    'Advisory',
  );
  assert.equal(
    presentationCourseBanner(meeting('advisory-1', 'Advisory A')),
    '/assets/banner-advisory-v1.png',
  );
  assert.equal(
    presentationCourseLabel(meeting('advisory-1', 'Advisory 12A')),
    'Advisory',
  );
  assert.equal(
    presentationCourseBanner(meeting('advisory-1', 'Advisory 12A')),
    '/assets/banner-advisory-v1.png',
  );
  assert.equal(
    presentationCourseLabel(meeting('unknown-1', 'Unknown Course 12A')),
    'Unknown Course 12A',
  );
});

test('preserves structured Classroom objective content for presentation icons', () => {
  assert.deepEqual(
    presentationCard({
      cardId: 'card-objective',
      type: 'objective',
      title: 'Objective 1',
      lines: [
        'Changing the Wheels',
        'Complete Lesson 3.',
        'Open Classroom for full directions.',
        'Due Tue, April 17.',
      ],
      featured: 'Changing the Wheels',
      details: [
        'Complete Lesson 3.',
        'Open Classroom for full directions.',
        'Due Tue, April 17.',
      ],
      accent: 'warm',
      durationSeconds: 12,
    }),
    {
      cardId: 'card-objective',
      type: 'objective',
      title: 'Objective 1',
      lines: [],
      featured: 'Changing the Wheels',
      details: [
        'Complete Lesson 3.',
        'Open Classroom for full directions.',
        'Due Tue, April 17.',
      ],
      accent: 'warm',
      durationSeconds: 12,
    },
  );
});
