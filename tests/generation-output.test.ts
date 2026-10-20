import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGenerationOutput } from '../src/lib/generation-output';
import { alignProductEvidence, normalizePhaseOwnership, type ProductSpec } from '../src/lib/product-spec';

type AdaptedFixture = { tables: { fields: string[]; constraints: string[]; purpose?: string }[]; tasks: { sub_feature: string; phase: number; detail: { acceptanceCriteria: string[]; prerequisiteRequirementIds: string[] } }[]; paragraphs: string[]; mermaid: string; invariants?: string[] };

test('equivalent phase and requirement representations keep canonical ownership', () => {
  assert.deepEqual(normalizeGenerationOutput('outline', {
    phases: [{ title: 'Accounts', requirementIds: ['R01'], goal: 'Sign in', acceptanceCriteria: [{ text: 'Invalid passwords are rejected' }] }],
  }), { features: [{ title: 'Accounts', requirement_ids: ['R01'], tujuan: 'Sign in', selesai_bila: ['Invalid passwords are rejected'] }] });
});

test('database field objects preserve supplied constraints and do not invent missing facts', () => {
  const result = normalizeGenerationOutput('database', { tables: [{ tableName: 'users', columns: [{ name: 'id', type: 'uuid', primaryKey: true, nullable: false }, { name: 'email', type: 'text', unique: true }], constraints: 'CHECK role IN (owner, user)', relationships: [] }] }) as AdaptedFixture;
  assert.deepEqual(result.tables[0].fields, ['id uuid PRIMARY KEY NOT NULL', 'email text UNIQUE']);
  assert.deepEqual(result.tables[0].constraints, ['CHECK role IN (owner, user)']);
  assert.equal(result.tables[0].purpose, undefined);
});

test('task adapters retain detailed acceptance criteria and actual prerequisite IDs', () => {
  const result = normalizeGenerationOutput('tasks', { tasks: [{ subFeature: 'Sign in', phase: '2', dependencies: ['t1'], detail: { acceptanceCriteria: ['Expired sessions are denied'], requirementIds: ['R01'], prerequisiteRequirementIds: ['R00'] } }] }) as AdaptedFixture;
  assert.equal(result.tasks[0].sub_feature, 'Sign in');
  assert.equal(result.tasks[0].phase, 2);
  assert.deepEqual(result.tasks[0].detail.acceptanceCriteria, ['Expired sessions are denied']);
  assert.deepEqual(result.tasks[0].detail.prerequisiteRequirementIds, ['R00']);
});

test('adapter never assigns prototype fields or fills an incomplete database', () => {
  const result = normalizeGenerationOutput('database', JSON.parse('{"__proto__":{"polluted":true},"tables":[]}')) as AdaptedFixture;
  assert.equal(Object.hasOwn(result, '__proto__'), false);
  assert.equal(result.invariants, undefined);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('prose architecture retains both explanation and embedded diagram', () => {
  const result = normalizeGenerationOutput('architecture', { architecture: 'Owners edit rooms.\n\nThe API checks ownership.\n\n```mermaid\nflowchart TD\nA-->B\n```' }) as AdaptedFixture;
  assert.deepEqual(result.paragraphs, ['Owners edit rooms.', 'The API checks ownership.']);
  assert.match(result.mermaid, /A-->B/);
});

test('single response envelopes and task detail naming variants normalize without dropping tests', () => {
  const detail = { requirement_ids: ['R01'], acceptance_criteria: ['Only the owner can update'], prerequisite_requirement_ids: ['R00'], tests: [{ scenario: 'failure', action: 'Update another owner record', expected: 'Access denied' }] };
  const result = normalizeGenerationOutput('tasks', { data: { tasks: [{ detail }] } }) as AdaptedFixture;
  assert.deepEqual(result.tasks[0].detail.acceptanceCriteria, ['Only the owner can update']);
  assert.deepEqual(result.tasks[0].detail.prerequisiteRequirementIds, ['R00']);
  assert.equal(JSON.stringify(result).includes('Access denied'), true);
});

test('source evidence adapts punctuation and case while preserving actual user words', () => {
  const spec = { requirements: [{ sourceQuote: 'APLIKASI KOS2AN, UNTUK OWNER' }, { sourceQuote: 'pembayaran otomatis' }], decisions: [] } as unknown as ProductSpec;
  const aligned = alignProductEvidence(spec, 'Buatin aplikasi kos2an untuk owner dan pengguna');
  assert.equal(aligned.requirements[0].sourceQuote, 'aplikasi kos2an untuk owner');
  assert.equal(aligned.requirements[1].sourceQuote, 'pembayaran otomatis');
  assert.equal(spec.requirements[0].sourceQuote, 'APLIKASI KOS2AN, UNTUK OWNER');
});

test('shared references defer to one dedicated owner without hiding ambiguous ownership', () => {
  const phases = [{ requirement_ids: ['R01', 'R02'] }, { requirement_ids: ['R02'] }];
  normalizePhaseOwnership(phases);
  assert.deepEqual(phases, [{ requirement_ids: ['R01'] }, { requirement_ids: ['R02'] }]);
  const ambiguous = [{ requirement_ids: ['R01'] }, { requirement_ids: ['R01'] }];
  normalizePhaseOwnership(ambiguous);
  assert.deepEqual(ambiguous, [{ requirement_ids: ['R01'] }, { requirement_ids: ['R01'] }]);
});


