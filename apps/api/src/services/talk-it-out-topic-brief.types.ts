export type TopicBriefResearchMode = 'internal' | 'general' | 'mixed'

export interface TopicBriefWebSource {
  title: string
  uri: string
}

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
  webSources?: TopicBriefWebSource[]
}

export function parseTopicBriefJson(raw: string | null | undefined): TalkItOutTopicBrief | null {
  if (!raw?.trim()) return null
  try {
    return JSON.parse(raw) as TalkItOutTopicBrief
  } catch {
    return null
  }
}
