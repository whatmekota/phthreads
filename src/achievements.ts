// The plugin's own achievements (plugin API 7), in Stats → Achievements
// under its name. Each is worked out from what is saved: the matches, and a
// few counts kept for this. They're synced at start, so matches made before
// 0.2.0 count too, and again after each change.

import type { PluginAchievement, PluginContext } from './types'

export const ACHIEVEMENTS: PluginAchievement[] = [
  { id: 'first-match', title: 'Found it', description: 'Match a video to its EroScripts thread', icon: '🔗', tier: 1 },
  { id: 'matched-25', title: 'Thread puller', description: 'Match 25 videos to their threads', icon: '🧵', target: 25, tier: 1 },
  { id: 'matched-100', title: 'Archivist', description: 'Match 100 videos to their threads', icon: '🗂️', target: 100, tier: 2 },
  { id: 'matched-250', title: 'Forum historian', description: 'Match 250 videos to their threads', icon: '📚', target: 250, tier: 3 },
  { id: 'tagged-25', title: 'Well tagged', description: 'Add the thread\'s tags to 25 videos', icon: '🏷️', target: 25, tier: 2 },
  { id: 'spotted-update', title: 'Fresh off the forum', description: 'Find a thread whose scripts changed since you got them', icon: '🔔', tier: 1 },
]

/** What the achievements are worked out from. */
export interface Standing {
  /** Videos matched to a thread now. */
  matched: number
  /** Different videos that took tags from their thread. */
  tagged: number
  /** Checks that found a thread's scripts changed. */
  updates: number
}

const targetOf = new Map(ACHIEVEMENTS.filter(a => a.target).map(a => [a.id, a.target!]))

/** The count for each counted achievement (at most its target), and the others that are earned. */
export function standing(s: Standing): { progress: Record<string, number>, earned: string[] } {
  const counts: Record<string, number> = {
    'matched-25': s.matched,
    'matched-100': s.matched,
    'matched-250': s.matched,
    'tagged-25': s.tagged,
  }
  const progress: Record<string, number> = {}
  for (const [id, n] of Object.entries(counts))
    progress[id] = Math.min(n, targetOf.get(id) ?? n)
  const done: Record<string, boolean> = {
    'first-match': s.matched > 0,
    'spotted-update': s.updates > 0,
  }
  return { progress, earned: Object.keys(done).filter(id => done[id]) }
}

/**
 * Declares the achievements, and sync() hands over only what changed since
 * it last did. A failure is logged, never thrown: achievements must not get
 * in the way of the plugin.
 */
export function createTrophies(api: PluginContext['achievements'] | undefined, log: (...args: unknown[]) => void = () => {}) {
  if (!api)
    return { sync: (_s: Standing) => {} }
  try {
    api.define(ACHIEVEMENTS)
  }
  catch (err) {
    log('declaring the achievements failed', err)
  }
  const sent = new Map<string, number>()
  return {
    sync(s: Standing) {
      const now = standing(s)
      try {
        for (const [id, n] of Object.entries(now.progress)) {
          if (sent.get(id) !== n) {
            sent.set(id, n)
            api.progress(id, n)
          }
        }
        for (const id of now.earned) {
          if (!sent.has(id)) {
            sent.set(id, 1)
            api.unlock(id)
          }
        }
      }
      catch (err) {
        log('updating the achievements failed', err)
      }
    },
  }
}
