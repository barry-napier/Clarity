/**
 * Markdown converters for Drive sync
 * Converts entities to human-readable markdown files
 */

import type {
  Capture,
  Checkin,
  Chat,
  Memory,
  Northstar,
  FrameworkSession,
  Review,
} from '../db/schema';

/**
 * Convert Memory entity to markdown
 * Memory is already markdown, just return content
 */
export function memoryToMarkdown(memory: Memory): string {
  return memory.content || '# Memory\n\nNo content yet.';
}

/**
 * Convert Northstar entity to markdown
 * Northstar is already markdown, just return content
 */
export function northstarToMarkdown(northstar: Northstar): string {
  return northstar.content || '# North Star\n\nNo content yet.';
}

/**
 * Convert Checkin to markdown
 */
export function checkinToMarkdown(checkin: Checkin): string {
  const date = new Date(checkin.createdAt);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = checkin.timeOfDay === 'morning' ? 'Morning' : 'Evening';

  let md = `# ${timeStr} Check-in\n\n`;
  md += `**Date:** ${dateStr}\n`;
  md += `**Status:** ${checkin.status}\n\n`;
  md += `---\n\n`;

  for (const entry of checkin.entries) {
    const typeLabel = {
      energy: 'Energy Level',
      wins: 'Wins',
      friction: 'Friction',
      priority: 'Priority',
    }[entry.type];

    md += `## ${typeLabel}\n\n`;
    md += `**Q:** ${entry.question}\n\n`;
    md += `**A:** ${entry.response}\n\n`;

    if (entry.followUp && entry.followUpResponse) {
      md += `**Follow-up:** ${entry.followUp}\n\n`;
      md += `**Response:** ${entry.followUpResponse}\n\n`;
    }
  }

  return md;
}

/**
 * Convert Capture to markdown
 */
export function captureToMarkdown(capture: Capture): string {
  const date = new Date(capture.createdAt);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const status = capture.status === 'done' ? '[x]' : '[ ]';
  return `- ${status} ${capture.content} *(${timeStr})*`;
}

/**
 * Convert multiple captures (same day) to markdown
 */
export function capturesToMarkdown(captures: Capture[], date: string): string {
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# Captures\n\n`;
  md += `**Date:** ${dateStr}\n\n`;
  md += `---\n\n`;

  const newCaptures = captures.filter((c) => c.status === 'new');
  const doneCaptures = captures.filter((c) => c.status === 'done');

  if (newCaptures.length > 0) {
    md += `## Inbox\n\n`;
    for (const capture of newCaptures) {
      md += captureToMarkdown(capture) + '\n';
    }
    md += '\n';
  }

  if (doneCaptures.length > 0) {
    md += `## Done\n\n`;
    for (const capture of doneCaptures) {
      md += captureToMarkdown(capture) + '\n';
    }
    md += '\n';
  }

  return md;
}

/**
 * Convert Chat to markdown
 */
export function chatToMarkdown(chat: Chat): string {
  const date = new Date(chat.createdAt);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# Chat Session\n\n`;
  md += `**Date:** ${dateStr}\n\n`;
  md += `---\n\n`;

  for (const msg of chat.messages) {
    if (msg.role === 'system') continue;

    const role = msg.role === 'user' ? '**You:**' : '**Clarity:**';
    const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    md += `${role} *(${time})*\n\n`;
    md += `${msg.content}\n\n`;
  }

  return md;
}

/**
 * Convert Review to markdown
 */
export function reviewToMarkdown(review: Review): string {
  const startDate = new Date(review.periodStart);
  const endDate = new Date(review.periodEnd);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weekNum = getISOWeekNumber(startDate);

  let md = `# Week ${weekNum} Review\n\n`;
  md += `**Period:** ${formatDate(startDate)} - ${formatDate(endDate)}\n`;
  md += `**Status:** ${review.status}\n\n`;
  md += `---\n\n`;

  if (review.content) {
    md += `## Summary\n\n`;
    md += `${review.content}\n\n`;
  }

  if (review.insights && review.insights.length > 0) {
    md += `## Key Insights\n\n`;
    for (const insight of review.insights) {
      md += `- ${insight}\n`;
    }
    md += '\n';
  }

  return md;
}

/**
 * Convert FrameworkSession to markdown
 */
export function frameworkSessionToMarkdown(session: FrameworkSession): string {
  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const frameworkNames: Record<string, string> = {
    'regret-minimization': 'Regret Minimization Framework',
    'ceo-energy': 'CEO Energy Audit',
    'annual-review': 'Annual Review',
  };

  const name = frameworkNames[session.frameworkType] || session.frameworkType;

  let md = `# ${name}\n\n`;
  md += `**Date:** ${dateStr}\n`;
  md += `**Status:** ${session.status}\n\n`;
  md += `---\n\n`;

  for (const entry of session.entries) {
    md += `## Stage ${entry.stage + 1}\n\n`;
    md += `**Q:** ${entry.question}\n\n`;
    md += `**A:** ${entry.response}\n\n`;
  }

  if (session.insights) {
    md += `---\n\n`;
    md += `## Insights\n\n`;
    md += `${session.insights}\n`;
  }

  return md;
}

/**
 * Get ISO week number
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get filename for an entity
 */
export function getMarkdownFilename(
  entityType: string,
  entity: Capture | Checkin | Chat | Memory | Northstar | FrameworkSession | Review
): { folder: string; filename: string } {
  switch (entityType) {
    case 'memory':
      return { folder: '', filename: 'memory.md' };

    case 'northstar':
      return { folder: '', filename: 'northstar.md' };

    case 'checkin': {
      const checkin = entity as Checkin;
      return {
        folder: 'checkins',
        filename: `${checkin.date}-${checkin.timeOfDay}.md`,
      };
    }

    case 'capture': {
      const capture = entity as Capture;
      return { folder: 'captures', filename: `${capture.date}.md` };
    }

    case 'chat': {
      const chat = entity as Chat;
      return { folder: 'chats', filename: `${chat.date}.md` };
    }

    case 'review': {
      const review = entity as Review;
      const weekNum = getISOWeekNumber(new Date(review.periodStart));
      const year = new Date(review.periodStart).getFullYear();
      return { folder: 'reviews', filename: `${year}-W${String(weekNum).padStart(2, '0')}.md` };
    }

    case 'frameworkSession': {
      const session = entity as FrameworkSession;
      const date = new Date(session.startedAt).toISOString().split('T')[0];
      return {
        folder: 'frameworks',
        filename: `${session.frameworkType}-${date}.md`,
      };
    }

    default:
      return { folder: '', filename: `${entityType}-${entity.id}.md` };
  }
}

/**
 * Convert any entity to markdown
 */
export function entityToMarkdown(
  entityType: string,
  entity: Capture | Checkin | Chat | Memory | Northstar | FrameworkSession | Review
): string {
  switch (entityType) {
    case 'memory':
      return memoryToMarkdown(entity as Memory);
    case 'northstar':
      return northstarToMarkdown(entity as Northstar);
    case 'checkin':
      return checkinToMarkdown(entity as Checkin);
    case 'capture':
      return captureToMarkdown(entity as Capture);
    case 'chat':
      return chatToMarkdown(entity as Chat);
    case 'review':
      return reviewToMarkdown(entity as Review);
    case 'frameworkSession':
      return frameworkSessionToMarkdown(entity as FrameworkSession);
    default:
      return JSON.stringify(entity, null, 2);
  }
}
