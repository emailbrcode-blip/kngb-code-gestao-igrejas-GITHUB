import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAvailability, evaluateAvailabilityWithExceptions, weekdayForDate } from './availability.rules.js';

test('available within its configured time permits an assignment', () => {
  assert.equal(evaluateAvailability([{ status: 'available', startTime: '18:00', endTime: '23:00' }], { startTime: '19:00', endTime: '21:00' }).status, 'available');
});

test('an unavailable period blocks and returns its reason', () => {
  const result = evaluateAvailability([{ status: 'unavailable', startTime: '18:00', endTime: '23:00', notes: 'Compromisso familiar' }], { startTime: '19:00', endTime: '20:00' });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'Compromisso familiar');
});

test('a schedule outside available hours is blocked', () => {
  assert.equal(evaluateAvailability([{ status: 'available', startTime: '08:00', endTime: '12:00' }], { startTime: '18:00', endTime: '20:00' }).status, 'unavailable');
});

test('availability must cover the full schedule interval', () => {
  assert.equal(evaluateAvailability([{ status: 'available', startTime: '18:00', endTime: '20:00' }], { startTime: '19:00', endTime: '21:00' }).status, 'unavailable');
});

test('missing schedule times are a conflict and block assignment', () => {
  assert.equal(evaluateAvailability([{ status: 'available', startTime: '18:00', endTime: '23:00' }], {}).status, 'conflict');
});

test('a date resolves to the correct recurring weekday in UTC', () => {
  assert.equal(weekdayForDate('2026-10-04T00:00:00.000Z'), 'sunday');
});

test('date-specific unavailability overrides the weekly availability and preserves its reason', () => {
  const result = evaluateAvailabilityWithExceptions([{ status: 'available', startTime: '08:00', endTime: '22:00' }], [{ status: 'unavailable', notes: 'Compromisso pessoal' }], { startTime: '18:00', endTime: '20:00' });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'Compromisso pessoal');
});

test('a dated unavailable interval blocks an overlapping schedule', () => {
  assert.equal(evaluateAvailabilityWithExceptions([], [{ status: 'unavailable', startTime: '18:00', endTime: '20:00' }], { startTime: '19:00', endTime: '21:00' }).status, 'unavailable');
});

test('a dated available interval can override the weekly schedule when it covers the event', () => {
  assert.equal(evaluateAvailabilityWithExceptions([{ status: 'unavailable' }], [{ status: 'available', startTime: '18:00', endTime: '21:00' }], { startTime: '19:00', endTime: '20:00' }).status, 'available');
});

test('an unrelated date-specific interval does not block a schedule outside its hours', () => {
  assert.equal(evaluateAvailabilityWithExceptions([{ status: 'available', startTime: '18:00', endTime: '22:00' }], [{ status: 'unavailable', startTime: '08:00', endTime: '09:00' }], { startTime: '19:00', endTime: '21:00' }).status, 'available');
});
