/**
 * Memory Parser
 * Parses the Memory markdown document into structured sections
 */

export type LifeDomainName =
  | 'Work'
  | 'Family'
  | 'Finances'
  | 'Relationships'
  | 'Health'
  | 'Meaning/Fun';

export const LIFE_DOMAIN_NAMES: LifeDomainName[] = [
  'Work',
  'Family',
  'Finances',
  'Relationships',
  'Health',
  'Meaning/Fun',
];

export interface LifeDomain {
  name: LifeDomainName;
  role?: string;
  currentState?: string;
  target?: string;
  goingWell?: string[];
  energyDrains?: string[];
  rawContent: string;
}

export interface MemorySection {
  id: string;
  title: string;
  content: string;
}

/**
 * Parse life domains from Memory markdown
 * Looks for ## Life Domains section and extracts ### subsections
 */
export function parseLifeDomains(memoryMarkdown: string): LifeDomain[] {
  if (!memoryMarkdown) return [];

  const domains: LifeDomain[] = [];

  // Find the Life Domains section
  const lifeDomainsSectionMatch = memoryMarkdown.match(
    /## Life Domains\s*\n([\s\S]*?)(?=\n## |\n---|\$)/
  );

  if (!lifeDomainsSectionMatch) {
    return domains;
  }

  const lifeDomainContent = lifeDomainsSectionMatch[1];

  // Extract each domain (### heading)
  for (const domainName of LIFE_DOMAIN_NAMES) {
    // Match ### Work, ### Health, etc.
    const domainRegex = new RegExp(
      `### ${domainName.replace('/', '\\/')}\\s*\\n([\\s\\S]*?)(?=\\n### |\\n## |\\n---|$)`,
      'i'
    );
    const domainMatch = lifeDomainContent.match(domainRegex);

    if (domainMatch) {
      const rawContent = domainMatch[1].trim();
      const domain = parseDomainContent(domainName, rawContent);
      domains.push(domain);
    } else {
      // Include domain with empty content so UI can show placeholder
      domains.push({
        name: domainName,
        rawContent: '',
      });
    }
  }

  return domains;
}

/**
 * Parse individual domain content into structured fields
 */
function parseDomainContent(name: LifeDomainName, content: string): LifeDomain {
  const domain: LifeDomain = {
    name,
    rawContent: content,
  };

  // Extract Role
  const roleMatch = content.match(/\*\*Role:\*\*\s*(.+)/i);
  if (roleMatch) {
    domain.role = roleMatch[1].trim();
  }

  // Extract Current State
  const currentStateMatch = content.match(/\*\*Current State:\*\*\s*(.+)/i);
  if (currentStateMatch) {
    domain.currentState = currentStateMatch[1].trim();
  }

  // Extract Target
  const targetMatch = content.match(/\*\*Target:\*\*\s*(.+)/i);
  if (targetMatch) {
    domain.target = targetMatch[1].trim();
  }

  // Extract Going Well (list)
  const goingWellMatch = content.match(
    /\*\*Going Well:\*\*\s*\n((?:- .+\n?)+)/i
  );
  if (goingWellMatch) {
    domain.goingWell = goingWellMatch[1]
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim());
  }

  // Extract Energy Drains (list)
  const energyDrainsMatch = content.match(
    /\*\*Energy Drains:\*\*\s*\n((?:- .+\n?)+)/i
  );
  if (energyDrainsMatch) {
    domain.energyDrains = energyDrainsMatch[1]
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim());
  }

  return domain;
}

/**
 * Parse Memory markdown into named sections
 * Returns all top-level ## sections
 */
export function parseMemorySections(memoryMarkdown: string): MemorySection[] {
  if (!memoryMarkdown) return [];

  const sections: MemorySection[] = [];

  // Split by ## headers
  const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g;
  let match;

  while ((match = sectionRegex.exec(memoryMarkdown)) !== null) {
    const title = match[1].trim();
    const content = match[2].trim();
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    sections.push({
      id,
      title,
      content,
    });
  }

  return sections;
}

/**
 * Get a specific section from Memory markdown
 */
export function getMemorySection(
  memoryMarkdown: string,
  sectionTitle: string
): MemorySection | null {
  const sections = parseMemorySections(memoryMarkdown);
  return (
    sections.find(
      (s) => s.title.toLowerCase() === sectionTitle.toLowerCase()
    ) || null
  );
}

/**
 * Get default Memory template
 * Used when no memory exists yet
 */
export function getDefaultMemoryTemplate(): string {
  return `## Current Season

[What's the primary focus right now?]

## Operating Rhythm

[Morning routine, weekly patterns, work schedule]

## Life Domains

### Work
- **Role:** [Current role]
- **Current State:** [Where you are]
- **Target:** [Where you're going]
- **Going Well:**
- [List items]
- **Energy Drains:**
- [List items]

### Family
[Notes about family]

### Finances
[Financial goals and current state]

### Relationships
[Key relationships and social health]

### Health
[Physical and mental wellbeing]

### Meaning/Fun
[Purpose, hobbies, what brings joy]

---

## Cross-Domain Tensions

[Where do your priorities conflict?]

## People I'm Tracking

[Key people and what to remember about them]

## Rules I Trust

[Personal rules that help you make decisions]

## AI Instructions

[How Clarity should interact with you]

## Now/Next/Later

**Now:** [This week's focus]
**Next:** [This month's horizon]
**Later:** [This quarter/year]
`;
}
