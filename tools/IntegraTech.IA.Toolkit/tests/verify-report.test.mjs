import test from 'node:test';
import assert from 'node:assert/strict';
import { failureCode, testSuiteOutcome } from '../scripts/lib/verify-report.mjs';

test('failureCode preserves a sanitized process spawn code', () => {
  assert.equal(failureCode({ error: 'EPERM' }), 'EPERM');
});

test('failureCode distinguishes process failures without exposing stderr', () => {
  assert.equal(failureCode({ code: 7 }), 'EXIT_NONZERO');
  assert.equal(failureCode({ timedOut: true }), 'TIMEOUT');
  assert.equal(failureCode({ overflow: true }), 'OUTPUT_OVERFLOW');
  assert.equal(failureCode({ error: 'secrets were printed' }), 'UNKNOWN');
});

test('verification never marks a suite complete when symlink security oracles are unavailable',()=>{
 assert.deepEqual(testSuiteOutcome({result:{code:0},report:'# SKIP symlink_unavailable',symlinkStatus:'available'}),{status:'blocked',reason_code:'symlink_unavailable'});
 assert.deepEqual(testSuiteOutcome({result:{code:0},report:'all tests passed',symlinkStatus:'unavailable'}),{status:'blocked',reason_code:'symlink_unavailable'});
 assert.deepEqual(testSuiteOutcome({result:{code:0},report:'all tests passed',symlinkStatus:'available'}),{status:'passed'});
});
