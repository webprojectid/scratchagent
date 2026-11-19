type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const unsafe: Record<string, boolean> = { ['__proto__']: true, constructor: true, prototype: true };

/** Models mix camelCase, snake_case, PascalCase and loose prose keys. */
const canonicalKey = (key: string): string => key
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  .replace(/[^A-Za-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .toLowerCase();

const aliases: Record<string, string> = {
  phases: 'features', subfeatures: 'sub_features', sub_features: 'sub_features',
  acceptance_criteria: 'selesai_bila', acceptancecriteria: 'selesai_bila', goal: 'tujuan',
  userflow: 'user_flow', user_flow: 'user_flow', techstack: 'tech_stack', tech_stack: 'tech_stack',
  functional: 'fungsional', nonfunctional: 'non_fungsional', non_functional: 'non_fungsional',
  tablename: 'name', table_name: 'name', columns: 'fields', relations: 'relationships',
  diagram: 'mermaid', requirementids: 'requirement_ids', requirement_ids: 'requirement_ids',
  parententities: 'parentEntities', parent_entities: 'parentEntities',
  dependencies: 'deps', depends_on: 'dependsOn',
  source_quote: 'sourceQuote', out_of_scope: 'outOfScope', release_checks: 'releaseChecks',
};
const detailAliases: Record<string, string> = {
  requirement_ids: 'requirementIds', requirementids: 'requirementIds',
  acceptance_criteria: 'acceptanceCriteria', acceptancecriteria: 'acceptanceCriteria',
  prerequisite_requirement_ids: 'prerequisiteRequirementIds',
  prerequisite_requirementids: 'prerequisiteRequirementIds',
};

/** Known snake_case fields accept any model casing without inventing aliases. */
const knownFields: Record<string, true> = {
  title: true, assumptions: true, stack: true, features: true, requirement_ids: true,
  steps: true, text: true, requirement: true,
  icon: true, description: true, tujuan: true, selesai_bila: true, priority: true,
  sub_features: true, user_flow: true, requirements: true, fungsional: true,
  non_fungsional: true, tech_stack: true, paragraphs: true, mermaid: true,
  invariants: true, tables: true, name: true, purpose: true, fields: true,
  constraints: true, relationships: true, supporting: true, parent_entities: true,
  id: true, feature: true, sub_feature: true, layer: true, phase: true, page: true,
  deps: true, detail: true, objective: true, deliverables: true,
  acceptance_criteria: true, tests: true, prerequisite_requirement_ids: true,
  problem: true, audiences: true, outcomes: true, decisions: true, topic: true,
  status: true, value: true, source_quote: true, entities: true, states: true,
  values: true, out_of_scope: true, metrics: true, definition: true,
  measurement: true, target: true, risks: true, risk: true, mitigation: true,
  owner: true, rollout: true, stages: true, release_checks: true, rollback: true,
  corrections: true, section: true, path: true, op: true, reason: true,
  verification: true, depends_on: true, statement: true, tasks: true,
  action: true, expected: true, scenario: true,
};

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  if (record(value)) return Object.values(value);
  return value === undefined || value === null ? [] : [value];
}

function textList(value: unknown): unknown[] {
  return list(value);
}

function objectList(value: unknown, titleKey?: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (!record(value)) return value === undefined || value === null ? [] : [value];
  return Object.entries(value).map(([key, item]) => {
    if (!record(item)) return item;
    const result: RecordValue = { ...item };
    if (titleKey && result[titleKey] === undefined) result[titleKey] = key;
    return result;
  });
}

function sentence(value: unknown): unknown {
  if (!record(value)) return value;
  const known = new Set(['id', 'text', 'statement', 'criterion', 'description', 'name']);
  if (Object.keys(value).some(key => !known.has(key))) return value;
  for (const key of ['text', 'statement', 'criterion', 'description', 'name']) {
    if (typeof value[key] === 'string') return typeof value.id === 'string' ? `[${value.id}] ${value[key]}` : value[key];
  }
  return value;
}

function normalizeIds(value: unknown): unknown[] {
  return textList(value).map(item => typeof item === 'string' ? item.trim() : item).filter(item => item !== '');
}

function normalizeVerification(value: unknown): unknown[] {
  const allowed = new Set(['success', 'failure', 'duplicate', 'concurrency', 'recovery']);
  const values = (typeof value === 'string' ? value.split(/[,/|]+/) : list(value))
    .map(item => String(item).toLowerCase().trim())
    .filter(item => allowed.has(item));
  return values.length ? [...new Set(values)] : ['success'];
}

function normalizePriority(value: unknown): string {
  const text = String(value ?? '').toLowerCase();
  if (/must|high|tinggi|wajib|critical|kritis/.test(text)) return 'must';
  if (/should|medium|sedang/.test(text)) return 'should';
  return 'could';
}

function requirementId(value: unknown, index: number): string {
  const raw = String(value ?? '').trim();
  if (/^R\d{2,3}$/i.test(raw)) return raw.toUpperCase();
  const numeric = raw.match(/\d+/)?.[0];
  return `R${String(numeric ?? index + 1).padStart(2, '0')}`;
}

function normalizeRequirements(value: unknown): unknown {
  const entries = record(value) ? Object.entries(value) : list(value).map((item, index) => [String(index), item] as const);
  return entries.map(([key, item], index) => {
    if (typeof item === 'string') return {
      id: requirementId(key, index), statement: item, sourceQuote: item,
      priority: 'must', dependsOn: [], verification: ['success', 'failure'],
    };
    if (!record(item)) return item;
    const statement = item.statement ?? item.text ?? item.requirement ?? item.description ?? item.title ?? '';
    const sourceQuote = item.sourceQuote ?? item.source_quote ?? item.quote ?? item.evidence ?? statement;
    return {
      ...item,
      id: requirementId(item.id ?? key, index),
      statement,
      sourceQuote,
      priority: normalizePriority(item.priority),
      dependsOn: normalizeIds(item.dependsOn ?? item.depends_on ?? item.dependencies),
      verification: normalizeVerification(item.verification),
    };
  });
}

function normalizeEntityNames(value: unknown): unknown {
  if (!record(value)) return value;
  const name = canonicalKey(String(value.name ?? ''));
  return { ...value, name, fields: normalizeIds(value.fields ?? value.columns) };
}

function normalizeDiscovery(value: RecordValue): RecordValue {
  const audiences = textList(value.audiences ?? value.audience ?? value.users);
  const outcomes = textList(value.outcomes ?? value.outcome ?? value.goals ?? value.results);
  const decisions = objectList(value.decisions ?? value.decision, 'id').map((item, index) => {
    if (!record(item)) return item;
    const status = String(item.status ?? 'open').toLowerCase();
    return {
      ...item,
      id: String(item.id ?? `D${String(index + 1).padStart(2, '0')}`),
      status: ['confirmed', 'proposed', 'open'].includes(status) ? status : 'open',
      sourceQuote: String(item.sourceQuote ?? item.source_quote ?? item.quote ?? ''),
    };
  });
  const entities = objectList(value.entities ?? value.entity, 'name').map(normalizeEntityNames);
  const states = objectList(value.states ?? value.state, 'entity').map(item => record(item)
    ? { ...item, values: normalizeIds(item.values ?? item.value ?? item.statuses) }
    : item);
  return {
    ...value,
    audiences,
    outcomes,
    requirements: normalizeRequirements(value.requirements ?? value.requirement),
    decisions,
    entities,
    states,
  };
}

/** Adapt equivalent representations only; missing product facts still fail validation. */
export function normalizeGenerationOutput(stage: string, input: unknown): unknown {
  let root = input;
  for (let depth = 0; depth < 3 && record(root); depth++) {
    const keys = Object.keys(root);
    if (keys.length !== 1) break;
    const key = keys[0];
    const canonical = canonicalKey(key);
    if (!['data', 'result', 'output', 'payload', 'response', 'plan', 'prd'].includes(canonical)) break;
    const child = root[key];
    if (!record(child) && !Array.isArray(child)) break;
    root = child;
  }
  if (Array.isArray(root)) {
    if (stage === 'outline' || stage === 'subfeatures') root = { features: root };
    else if (stage === 'tasks') root = { tasks: root };
    else if (stage === 'architecture') root = { paragraphs: root };
    else if (stage === 'database') root = { tables: root };
    else if (stage === 'requirements') root = { requirements: { fungsional: root } };
    else if (stage === 'review') root = { corrections: root };
    else if (stage === 'discovery') root = { requirements: root };
  }
  if (!record(root)) return root;
  input = root;

  const walk = (value: unknown, parent = ''): unknown => {
    if (Array.isArray(value)) return value.map(item => walk(item, parent));
    if (!record(value)) return value;
    const result: RecordValue = {};
    for (const [key, item] of Object.entries(value)) {
      const canonical = canonicalKey(key);
      if (unsafe[key] || unsafe[canonical]) continue;
      // Task detail uses its own canonical acceptanceCriteria, not phase criteria.
      const target = parent === 'detail'
        ? detailAliases[canonical] ?? (knownFields[canonical] ? canonical : key)
        : aliases[canonical] ?? (knownFields[canonical] ? canonical : key);
      if (!(target in result) || target === key) result[target] = walk(item, target);
    }
    for (const key of ['assumptions', 'invariants', 'constraints', 'relationships', 'selesai_bila', 'fungsional', 'non_fungsional', 'steps', 'paragraphs', 'deliverables', 'acceptanceCriteria', 'requirementIds', 'prerequisiteRequirementIds']) {
      if (typeof result[key] === 'string') result[key] = [result[key]];
      if (Array.isArray(result[key])) result[key] = result[key].map(sentence);
    }
    return result;
  };
  let value = walk(input) as RecordValue;

  if (stage === 'outline' || stage === 'subfeatures') {
    const features = objectList(value.features ?? value.feature ?? value.phases, 'title');
    value.features = stage === 'subfeatures'
      ? features.map(feature => record(feature)
        ? { ...feature, sub_features: objectList(feature.sub_features, 'title') }
        : feature)
      : features;
  }
  if (stage === 'architecture') {
    if (typeof value.paragraphs === 'string') value.paragraphs = [value.paragraphs];
    if (!value.paragraphs && typeof value.architecture === 'string') {
      const text = value.architecture;
      value.paragraphs = text.replace(/```mermaid[\s\S]*?```/gi, '').trim().split(/\n\s*\n/).filter(Boolean);
      value.mermaid ??= text.match(/```mermaid\s*([\s\S]*?)```/i)?.[1];
    }
  }
  if (stage === 'database') {
    value.tables = objectList(value.tables ?? value.table, 'name');
    if (Array.isArray(value.tables)) {
      const column = (field: unknown): unknown => {
        if (!record(field) || typeof field.name !== 'string' || typeof field.type !== 'string') return field;
        const extras = Object.entries(field).filter(([key]) => !['name', 'type', 'primaryKey', 'nullable', 'unique'].includes(key))
          .map(([key, item]) => `${key}: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
        return `${field.name} ${field.type}${field.primaryKey === true ? ' PRIMARY KEY' : ''}${field.nullable === false ? ' NOT NULL' : ''}${field.unique === true ? ' UNIQUE' : ''}${extras.length ? '; ' + extras.join('; ') : ''}`;
      };
      value.tables = value.tables.map(table => {
        if (!record(table)) return table;
        const fields = record(table.fields)
          ? Object.entries(table.fields).map(([name, definition]) => typeof definition === 'string' ? `${name} ${definition}` : record(definition) ? column({ ...definition, name }) : definition)
          : Array.isArray(table.fields) ? table.fields.map(column) : table.fields;
        const item = (entry: unknown) => typeof entry === 'string' ? [entry] : entry;
        return { ...table, fields,
          supporting: table.supporting === 'true' ? true : table.supporting === 'false' ? false : table.supporting,
          requirementIds: item(table.requirementIds ?? table.requirement_ids),
          parentEntities: item(table.parentEntities ?? table.parent_entities),
        };
      });
    }
  }
  if (stage === 'requirements') {
    if (Array.isArray(value.requirements)) value.requirements = { fungsional: value.requirements, non_fungsional: [] };
    if (record(value.requirements)) {
      const raw = value.requirements as RecordValue;
      value.requirements = {
        fungsional: textList(raw.fungsional ?? raw.functional ?? []),
        non_fungsional: textList(raw.non_fungsional ?? raw.non_functional ?? []),
      };
    }
    value.user_flow = objectList(value.user_flow ?? value.userflow, 'title');
    if (Array.isArray(value.user_flow)) value.user_flow = value.user_flow.map(flow => record(flow)
      ? { ...flow, requirementIds: normalizeIds(flow.requirementIds ?? flow.requirement_ids), steps: textList(flow.steps) }
      : flow);
    value.tech_stack = textList(value.tech_stack).map(item => typeof item === 'string' ? { name: item, desc: '' } : item);
  }
  if (stage === 'tasks') {
    const rawTasks = value.tasks ?? value.task;
    value.tasks = objectList(rawTasks, 'id');
    if (Array.isArray(value.tasks)) {
      value.tasks = value.tasks.map((task, index) => record(task) ? {
        ...task,
        id: String(task.id ?? `t${index + 1}`),
        sub_feature: task.sub_feature_id ?? task.sub_feature ?? task.subFeature ?? task.subfeature,
        deps: task.deps ?? task.dependencies ?? task.dependsOn,
        phase: typeof task.phase === 'string' && /^\d+$/.test(task.phase) ? Number(task.phase) : task.phase,
      } : task);
    }
  }
  if (stage === 'discovery') value = normalizeDiscovery(value);
  if (stage === 'review') value.corrections = objectList(value.corrections ?? value.correction);
  if (stage === 'outline' || stage === 'subfeatures') {
    const ids = (node: unknown): unknown => Array.isArray(node) ? node.map(ids) : record(node)
      ? Object.fromEntries(Object.entries(node).map(([key, item]) => [key === 'requirementIds' ? 'requirement_ids' : key, ids(item)])) : node;
    return ids(value);
  }
  return value;
}

export class GenerationOutputRejected extends Error {
  constructor(public readonly stage: string, public readonly issues: string[]) {
    super(`Generation output rejected at ${stage}; targeted repair did not satisfy the content contract.`);
    this.name = 'GenerationOutputRejected';
  }
}
