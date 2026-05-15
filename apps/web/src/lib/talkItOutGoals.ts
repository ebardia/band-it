export const TALK_IT_OUT_GOALS = [
  { value: 'DECISION', label: 'Reach a decision' },
  { value: 'EXPLORE', label: 'Explore options' },
  { value: 'RESOLVE', label: 'Resolve a conflict' },
  { value: 'IDEATE', label: 'Generate ideas' },
  { value: 'ALIGN', label: 'Align on direction' },
  { value: 'UNDERSTAND', label: 'Build shared understanding' },
] as const

export type TalkItOutGoalValue = (typeof TALK_IT_OUT_GOALS)[number]['value']

export function talkItOutGoalLabel(goal: string): string {
  return TALK_IT_OUT_GOALS.find((g) => g.value === goal)?.label ?? goal
}

export function talkItOutStatusLabel(status: string): string {
  switch (status) {
    case 'SETUP':
      return 'Setup'
    case 'ACTIVE':
      return 'Active'
    case 'CLOSED':
      return 'Closed'
    default:
      return status
  }
}
