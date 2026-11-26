import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { posterOf } from '../src/forum.ts'

describe('the thread starter', () => {
  it('reads who started a thread, from its details or its first post', () => {
    assert.equal(posterOf({ details: { created_by: { username: 'Scripter' } } }), 'Scripter')
    assert.equal(posterOf({ post_stream: { posts: [{ username: ' FirstPoster ' }, { username: 'replier' }] } }), 'FirstPoster')
  })

  it('gives null when the thread names nobody', () => {
    assert.equal(posterOf({}), null)
    assert.equal(posterOf({ details: { created_by: { username: '  ' } } }), null)
    assert.equal(posterOf(null), null)
  })
})
