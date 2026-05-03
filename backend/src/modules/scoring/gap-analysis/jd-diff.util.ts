import { ParsedJobRequirements } from './parsed-job-requirements.inteface';

const JD_DEFAULTS: Partial<ParsedJobRequirements> = {
  seniorityLevel: 'MID' as any,
  collaborationWeight: 'MEDIUM',
  ownershipWeight: 'MEDIUM',
  innovationWeight: 'MEDIUM',
  isWeb3Role: false,
  requiredSkills: []
};

export function diffParsedRequirements(parsed: ParsedJobRequirements): {
  changed: Array<{ field: string, parsedValue: any, defaultValue: any }>,
  unchanged: string[]
} {
  const changed: Array<{ field: string, parsedValue: any, defaultValue: any }> = [];
  const unchanged: string[] = [];

  // requiredRoleType: always meaningful, always changed relative to no default
  changed.push({
    field: 'requiredRoleType',
    parsedValue: parsed.requiredRoleType,
    defaultValue: null
  });

  const checkFields: Array<keyof ParsedJobRequirements> = [
    'seniorityLevel',
    'collaborationWeight',
    'ownershipWeight',
    'innovationWeight',
    'isWeb3Role',
    'requiredSkills'
  ];

  for (const field of checkFields) {
    const defaultVal = JD_DEFAULTS[field];
    const parsedVal = parsed[field];

    if (field === 'requiredSkills') {
      const techList = parsedVal as string[];
      if (Array.isArray(techList) && techList.length > 0) {
        changed.push({ field, parsedValue: techList, defaultValue: defaultVal });
      } else {
        unchanged.push(field);
      }
    } else if (parsedVal !== defaultVal) {
      changed.push({ field, parsedValue: parsedVal, defaultValue: defaultVal });
    } else {
      unchanged.push(field);
    }
  }

  return { changed, unchanged };
}
