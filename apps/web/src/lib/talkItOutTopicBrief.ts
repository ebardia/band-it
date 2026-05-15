export type TopicBriefResearchMode = 'internal' | 'general' | 'mixed'

export interface TalkItOutTopicBrief {
  summary: string
  researchMode: TopicBriefResearchMode
  keyTerms: string[]
  whatSuccessLooksLike: string
  likelyPerspectives: string[]
  commonTensions: string[]
  questionsToSurface: string[]
  factsToVerifyInRoom: string[]
  publicContext?: string
  internalContext?: string
  webSources?: { title: string; uri: string }[]
}

export function parseTopicBriefJson(raw: string | null | undefined): TalkItOutTopicBrief | null {
  if (!raw?.trim()) return null
  try {
    return JSON.parse(raw) as TalkItOutTopicBrief
  } catch {
    return null
  }
}

export function researchModeLabel(mode: TopicBriefResearchMode): string {
  switch (mode) {
    case 'internal':
      return 'Band context'
    case 'general':
      return 'Public research'
    case 'mixed':
      return 'Band + public research'
  }
}
