import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fileChanges, likeness, rank, scriptFilesIn, searchQueries, threadTags, topicIdOf, words } from '../src/match.ts'

describe('matching', () => {
  it('reads the words of a name, quality tags and filler aside', () => {
    assert.deepEqual(words('[Croove] Navia (Genshin Impact) 1080p.mp4'), ['croove', 'navia', 'genshin', 'impact'])
    assert.deepEqual(words('rem(oni)_hj_HQ.funscript'), ['rem', 'oni', 'hj'])
  })

  it('searches with a few words, then the longest few', () => {
    assert.deepEqual(searchQueries('[Croove] Navia (Genshin Impact).mp4'), ['croove navia genshin impact', 'genshin croove impact'])
    assert.deepEqual(searchQueries('clip.mp4'), ['clip'])
    assert.deepEqual(searchQueries('1080p.mp4'), [])
  })

  it('likes a thread that has the video\'s words, less with a lot else in it', () => {
    const v = '[Croove] Navia (Genshin Impact)'
    assert.ok(likeness(v, '[Croove] Navia (Genshin Impact)') > 0.95)
    assert.ok(likeness(v, '[Croove] Navia (Genshin Impact) plus a lot of other words here') < likeness(v, '[Croove] Navia (Genshin Impact)'))
    assert.ok(likeness(v, '[Croove] Mori Calliope') < 0.3)
    assert.equal(likeness('', 'x'), 0)
  })

  it('takes a clear winner, and asks when two are close', () => {
    const t = (id: number, title: string) => ({ id, slug: `t${id}`, title, tags: [] })
    const clear = rank('[Croove] Navia (Genshin Impact)', [t(1, '[Croove] Navia (Genshin Impact)'), t(2, '[Croove] Mori Calliope'), t(3, 'Something unrelated')])
    assert.equal(clear.sure?.id, 1)
    assert.deepEqual(clear.candidates.map(c => c.id), [1])
    const close = rank('Navia', [t(1, 'Navia part 1'), t(2, 'Navia part 2')])
    assert.equal(close.sure, null)
    assert.equal(close.candidates.length, 2)
  })

  it('finds the thread id in a forum link', () => {
    assert.equal(topicIdOf('https://discuss.eroscripts.com/t/some-slug/12345'), 12345)
    assert.equal(topicIdOf('https://discuss.eroscripts.com/t/some-slug/12345/7'), 12345)
    assert.equal(topicIdOf('https://discuss.eroscripts.com/t/12345'), 12345)
    assert.equal(topicIdOf('https://example.com/t/x/1'), null)
    assert.equal(topicIdOf(null), null)
  })

  it('brings tags over without devices or length buckets', () => {
    assert.deepEqual(threadTags(['the-handy', 'Animation', 'osr2', 'len-10-25', { name: 'pov' }, 'animation', 3]), ['animation', 'pov'])
  })

  it('lists a post\'s script files, and what changed in them', () => {
    const cooked = '<p><a class="attachment" href="/uploads/short-url/abc.funscript">Clip.funscript</a> <a href="https://pixeldrain.com/u/x">video</a> <a href="/uploads/short-url/def.funscript">Clip.roll.funscript</a></p>'
    const files = scriptFilesIn(cooked, [{ url: '/uploads/x.funscript', original_filename: 'Clip.funscript' }, { url: '/uploads/y.funscript', original_filename: 'Clip.twist.funscript' }])
    assert.deepEqual(files.map(f => f.name), ['Clip.funscript', 'Clip.roll.funscript', 'Clip.twist.funscript'])
    const now = [{ name: 'Clip.funscript', url: '/uploads/short-url/NEW.funscript' }, { name: 'Clip.twist.funscript', url: '/uploads/y.funscript' }, { name: 'Clip.pitch.funscript', url: '/p' }]
    assert.deepEqual(fileChanges(files, now), { added: ['Clip.pitch.funscript'], removed: ['Clip.roll.funscript'], replaced: ['Clip.funscript'] })
    assert.deepEqual(fileChanges(files, files), { added: [], removed: [], replaced: [] })
  })
})
