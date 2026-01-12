/**
 * Framework Definitions
 * Structured thinking exercises for clarity on decisions
 */

export interface FrameworkStage {
  id: string;
  question: string | null; // null for synthesis stages
  followUpPrompt: string;
  extractionPrompt?: string;
}

export interface FrameworkDefinition {
  id: string;
  name: string;
  description: string;
  source: string;
  estimatedMinutes: number;
  frequency: 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'as_needed';
  stages: FrameworkStage[];
}

/**
 * Regret Minimization Framework (Jeff Bezos)
 * Quick decision-making tool - imagine yourself at 80 looking back
 */
export const regretMinimization: FrameworkDefinition = {
  id: 'regret-minimization',
  name: 'Regret Minimization',
  description: 'Make decisions by imagining your 80-year-old self looking back.',
  source: 'Jeff Bezos',
  estimatedMinutes: 20,
  frequency: 'as_needed',
  stages: [
    {
      id: 'decision',
      question: "What decision are you wrestling with right now?",
      followUpPrompt:
        "Acknowledge the difficulty briefly, then ask what makes this decision hard. What are the stakes?",
    },
    {
      id: 'eighty_year_old',
      question:
        "Imagine yourself at 80, looking back on your life. Which choice would you regret NOT taking?",
      followUpPrompt:
        "Probe why that choice feels important. What does it represent? What fear or hope does it connect to?",
    },
    {
      id: 'fear_vs_regret',
      question:
        "What are you more afraid of - the risk of trying, or the regret of not trying?",
      followUpPrompt:
        "Help them sit with this tension. Don't rush to solve. Acknowledge both sides.",
    },
    {
      id: 'synthesis',
      question: null,
      followUpPrompt:
        "Synthesize what you've heard. What clarity emerged? Don't give advice - reflect their own wisdom back. End with one question for them to sit with.",
    },
  ],
};

/**
 * CEO Energy Management (Tony Schwartz / High Performance)
 * Weekly audit of where energy goes
 */
export const ceoEnergy: FrameworkDefinition = {
  id: 'ceo-energy',
  name: 'CEO Energy Audit',
  description: 'Audit where your energy goes and reclaim what drains you.',
  source: 'Tony Schwartz',
  estimatedMinutes: 30,
  frequency: 'weekly',
  stages: [
    {
      id: 'energy_high',
      question: "What gave you energy this week? What moments made you feel alive?",
      followUpPrompt:
        "Ask for specifics. What exactly about that moment energized them? Was it the people, the task, the autonomy?",
    },
    {
      id: 'energy_drain',
      question: "What drained you? What did you dread or procrastinate on?",
      followUpPrompt:
        "Probe gently. Is this a one-time thing or a pattern? What makes it draining - the task itself or something else?",
    },
    {
      id: 'delegation',
      question: "What could you stop doing, delegate, or do less of?",
      followUpPrompt:
        "Challenge them if they say 'nothing'. There's always something. What would happen if they dropped it?",
    },
    {
      id: 'protection',
      question: "What high-energy activity do you want to protect or do more of?",
      followUpPrompt:
        "Get specific. When will they do it? What would make it happen? What gets in the way?",
    },
    {
      id: 'synthesis',
      question: null,
      followUpPrompt:
        "Summarize the energy audit. Highlight the contrast between energizers and drains. Suggest one concrete change for next week.",
    },
  ],
};

/**
 * Annual Review (Year Compass style)
 * Comprehensive yearly reflection and planning
 */
export const annualReview: FrameworkDefinition = {
  id: 'annual-review',
  name: 'Annual Review',
  description: 'Reflect on the past year and set intentions for the next.',
  source: 'Year Compass',
  estimatedMinutes: 60,
  frequency: 'yearly',
  stages: [
    {
      id: 'highlights',
      question: "What were the highlights of your year? Moments you want to remember.",
      followUpPrompt:
        "Ask for 3-5 specific moments. What made them memorable? Who was there?",
    },
    {
      id: 'challenges',
      question: "What was hard this year? What challenged you most?",
      followUpPrompt:
        "Acknowledge the difficulty. What did they learn from it? How did they grow?",
    },
    {
      id: 'surprises',
      question: "What surprised you about yourself this year?",
      followUpPrompt:
        "Probe deeper. Was the surprise pleasant or uncomfortable? What does it reveal?",
    },
    {
      id: 'unfinished',
      question: "What feels unfinished or incomplete?",
      followUpPrompt:
        "Ask if it still matters. Should they carry it forward or let it go?",
    },
    {
      id: 'word',
      question: "If you had to describe your year in one word, what would it be?",
      followUpPrompt:
        "Why that word? What would you want next year's word to be?",
    },
    {
      id: 'intentions',
      question: "What are your intentions for the year ahead?",
      followUpPrompt:
        "Focus on who they want to be, not what they want to achieve. What matters most?",
    },
    {
      id: 'synthesis',
      question: null,
      followUpPrompt:
        "Create a brief summary of the past year and their intentions. Highlight themes and growth. End with an encouraging but honest reflection.",
    },
  ],
};

/**
 * All available frameworks
 */
export const FRAMEWORKS: FrameworkDefinition[] = [
  regretMinimization,
  ceoEnergy,
  annualReview,
];

/**
 * Get a framework by ID
 */
export function getFrameworkById(id: string): FrameworkDefinition | undefined {
  return FRAMEWORKS.find((f) => f.id === id);
}

/**
 * Get total number of stages (excluding synthesis) for progress display
 */
export function getFrameworkQuestionCount(framework: FrameworkDefinition): number {
  return framework.stages.filter((s) => s.question !== null).length;
}
