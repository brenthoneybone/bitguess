import type { components } from '../generated/openapi.d.ts'

export type * from '../generated/openapi.d.ts'

export type Player = components['schemas']['Player']
export type Guess = components['schemas']['Guess']
export type CreateGuessRequest = components['schemas']['CreateGuessRequest']
export type PendingGuessConflict = components['schemas']['PendingGuessConflict']
export type Error = components['schemas']['Error']

export type Direction = components['schemas']['Direction']
export type GuessStatus = components['schemas']['GuessStatus']

export const DirectionOption: { [K in Direction]: K } = {
  UP: 'UP',
  DOWN: 'DOWN',
} as const

export const GuessStatusOption: { [K in GuessStatus]: K } = {
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  VOID: 'VOID',
} as const
