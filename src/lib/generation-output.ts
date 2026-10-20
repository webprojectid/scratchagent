type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const unsafe = new Set(['__proto__', 'constructor', 'prototype']);

const aliases: Record<string, string> = {
  phases: 'features', subFeatures: 'sub_features', subfeatures: 'sub_features',
  acceptanceCriteria: 'selesai_bila', acceptance_criteria: 'selesai_bila', goal: 'tujuan',
  userFlow: 'user_flow', techStack: 'tech_stack', functional: 'fungsional',
  nonFunctional: 'non_fungsional', non_functional: 'non_fungsional', description: 'description',
  columns: 'fields', relations: 'relationships', tableName: 'name', table_name: 'name',
  diagram: 'mermaid',
};
const detailAliases: Record<string, string> = {
  requirement_ids: 'requirementIds', acceptance_criteria: 'acceptanceCriteria',
  prerequisite_requirement_ids: 'prerequisiteRequirementIds',
};

function sentence(value: unknown): unknown {
  if (!record(value)) return value;
  const known = new Set(['id', 'text', 'statement', 'criterion', 'description', 'name']);
  if (Object.keys(value).some(key => !known.has(key))) return value;
  for (const key of ['text', 'statement', 'criterion', 'description', 'name']) {
    if (typeof value[key] === 'string') return typeof value.id === 'string' ? `[${value.id}] ${value[key]}` : value[key];
  }
  return value;
}

/** Adapt equivalent representations only; missing product facts still fail validation. */
export function normalizeGenerationOutput(stage: string, input: unknown): unknown {
  if (!record(input)) return input;
  for (let depth = 0; depth < 2 && record(input); depth++) {
    const keys = Object.keys(input);
    if (keys.length !== 1 || !['data', 'result', 'output'].includes(keys[0]) || !record(input[keys[0]])) break;
    input = input[keys[0]];
  }
  const walk = (value: unknown, parent = ''): unknown => {
    if (Array.isArray(value)) return value.map(item => walk(item, parent));
    if (!record(value)) return value;
    const result: RecordValue = {};
    for (const [key, item] of Object.entries(value)) {
      if (unsafe.has(key)) continue;
      // Task detail uses its own canonical acceptanceCriteria, not phase criteria.
      const target = parent === 'detail' ? detailAliases[key] ?? key : aliases[key] ?? key;
      if (!(target in result) || target === key) result[target] = walk(item, target);
    }
    for (const key of ['assumptions', 'invariants', 'constraints', 'relationships', 'selesai_bila', 'fungsional', 'non_fungsional', 'steps', 'paragraphs']) {
      if (typeof result[key] === 'string') result[key] = [result[key]];
      if (Array.isArray(result[key])) result[key] = result[key].map(sentence);
    }
    return result;
  };
  const value = walk(input) as RecordValue;
  if (stage === 'architecture') {
    if (!value.paragraphs && typeof value.architecture === 'string') {
      const text = value.architecture;
      value.paragraphs = text.replace(/```mermaid[\s\S]*?```/gi, '').trim().split(/\n\s*\n/).filter(Boolean);
      value.mermaid ??= text.match(/```mermaid\s*([\s\S]*?)```/i)?.[1];
    }
  }
  if (stage === 'database' && Array.isArray(value.tables)) {
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
      return { ...table, fields, requirementIds: table.requirementIds ?? table.requirement_ids, parentEntities: table.parentEntities ?? table.parent_entities };
    });
  }
  if (stage === 'tasks' && Array.isArray(value.tasks)) {
    value.tasks = value.tasks.map(task => record(task) ? {
      ...task,
      sub_feature: task.sub_feature ?? task.subFeature,
      deps: task.deps ?? task.dependencies,
      phase: typeof task.phase === 'string' && /^\d+$/.test(task.phase) ? Number(task.phase) : task.phase,
    } : task);
  }
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
