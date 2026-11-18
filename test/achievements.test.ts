import type { PluginContext } from '../src/types.ts'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ACHIEVEMENTS, createTrophies, standing } from '../src/achievements.ts'

describe('achievements', () => {
  it('are well formed', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const a of ACHIEVEMENTS) {
      assert.match(a.id, /^[a-z0-9-]+$/)
      assert.ok(a.icon && a.title && !a.description.endsWith('.'), a.id)
    }
    // standing() counts exactly the counted ones, and with everything done earns exactly the rest.
    const counted = ACHIEVEMENTS.filter(a => a.target).map(a => a.id).sort()
    const all = standing({ matched: 1, tagged: 1, updates: 1 })
    assert.deepEqual(Object.keys(all.progress).sort(), counted)
    assert.deepEqual(all.earned.sort(), ids.filter(id => !counted.includes(id)).sort())
  })

  it('count matches and tagged videos, up to each target', () => {
    const s = standing({ matched: 120, tagged: 3, updates: 0 })
    assert.deepEqual(s.progress, { 'matched-25': 25, 'matched-100': 100, 'matched-250': 120, 'tagged-25': 3 })
    assert.deepEqual(s.earned, ['first-match'])
    assert.deepEqual(standing({ matched: 0, tagged: 0, updates: 0 }).earned, [])
  })

  it('hand over only what changed', () => {
    const calls: string[] = []
    const api: PluginContext['achievements'] = {
      define: () => calls.push('define'),
      unlock: (id) => {
        calls.push(`unlock ${id}`)
        return true
      },
      progress: (id, n) => void calls.push(`${id} ${n}`),
      unlocked: () => ({}),
    }
    const t = createTrophies(api)
    t.sync({ matched: 2, tagged: 0, updates: 0 })
    t.sync({ matched: 2, tagged: 0, updates: 1 })
    assert.deepEqual(calls, ['define', 'matched-25 2', 'matched-100 2', 'matched-250 2', 'tagged-25 0', 'unlock first-match', 'unlock spotted-update'])
  })
})
