// Seniority indicators — role must have at least one of these
const SENIORITY = [
  'chief', 'coo', 'cto', 'cpo', 'cxo',
  'vp', 'vice president',
  'head of', 'head,',
  'director', 'sr. director', 'senior director',
  'general manager', 'gm,', 'gm ',
  'principal',
  'lead,', 'lead ', ' lead',
  'manager', 'senior manager', 'sr. manager',
];

// Function/role keywords — role must contain at least one of these
const FUNCTIONS = [
  'operations', 'ops',
  'strategy',
  'chief of staff',
  'program',
  'transformation',
  'go-to-market', 'gtm',
  'revenue',
  'business development',
  'partnerships',
  'product',
  'planning',
  'enablement',
  'chief of staff',
];

export function matchesRole(title) {
  const t = title.toLowerCase();

  // Direct strong matches — always include regardless of seniority
  const DIRECT = [
    'chief of staff', 'chief operating', 'coo', 'cxo',
    'head of operations', 'head of business', 'head of strategy',
    'head of revenue', 'head of product', 'head of partnerships',
    'vp of operations', 'vp, operations', 'vp operations',
    'vp of product', 'vp, strategy',
    'director of operations', 'director, operations',
    'director of business', 'director, business',
    'director of strategy', 'director, strategy',
    'director of product', 'director, product',
    'general manager',
    'business operations', 'product operations',
    'revenue operations', 'sales operations', 'gtm operations',
    'go-to-market operations',
    'technical program manager', 'technical program lead',
    'program manager', 'program lead',
    'strategy & operations', 'strategy and operations',
    'operations lead', 'ops lead',
  ];

  if (DIRECT.some(k => t.includes(k))) return true;

  // Seniority + function combo catch-all
  const hasSeniority = SENIORITY.some(s => t.includes(s));
  const hasFunction = FUNCTIONS.some(f => t.includes(f));
  return hasSeniority && hasFunction;
}
