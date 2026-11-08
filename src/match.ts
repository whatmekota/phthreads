// Matching library videos to forum threads: what to search for, how alike a
// thread's title is, when a match is clear enough to take without asking,
// which tags to bring over, and what changed in a thread's script files.
// No DOM, no network: tested on its own.

/** Words in a file name or a thread title that say nothing about which video it is. */
const NOISE = new Set([
  'mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', 'wmv', 'funscript', 'funscripts', 'script', 'scripts',
  '480p', '720p', '1080p', '1440p', '2160p', '4k', '8k', '60fps', '30fps', 'hq', 'uhd', 'fhd', 'hd',
  'free', 'request', 'requested', 'multi', 'axis', 'version', 'ver', 'the', 'and', 'with', 'of', 'a', 'an',
])

/** The words of a name, lower case, quality tags and filler left out. */
export function words(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(w => w.length >= 2 && !NOISE.has(w))
}

/**
 * What to search the forum for. Discourse wants every word of a search to be
 * there, so a long file name finds nothing: the first try is up to six words,
 * the fallback the three longest.
 */
export function searchQueries(title: string): string[] {
  const all = [...new Set(words(title))]
  if (!all.length)
    return []
  const first = all.slice(0, 6).join(' ')
  const longest = [...all].sort((a, b) => b.length - a.length).slice(0, 3).join(' ')
  return first === longest ? [first] : [first, longest]
}

/**
 * How alike a video's name and a thread's title are, 0 to 1: the share of the
 * video's words the title has, a little less when the title has many more.
 */
export function likeness(video: string, thread: string): number {
  const v = new Set(words(video))
  const t = new Set(words(thread))
  if (!v.size || !t.size)
    return 0
  let shared = 0
  for (const w of v) {
    if (t.has(w))
      shared++
  }
  const cover = shared / v.size
  const extra = Math.max(0, t.size - shared) / t.size
  return cover * (1 - 0.35 * extra)
}

export interface Candidate {
  id: number
  slug: string
  title: string
  tags: string[]
  score: number
}

/** Above this, and clearly ahead of the next, a match is taken without asking. */
export const SURE = 0.6
const LEAD = 0.15
/** Below this a thread is not worth showing as a candidate. */
export const WORTH = 0.25

/** The candidates worth showing, best first, and whether the best is clear enough to take. */
export function rank(video: string, threads: Omit<Candidate, 'score'>[]): { candidates: Candidate[], sure: Candidate | null } {
  const candidates = threads
    .map(t => ({ ...t, score: likeness(video, t.title) }))
    .filter(c => c.score >= WORTH)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  const [best, next] = candidates
  const sure = best && best.score >= SURE && (!next || best.score - next.score >= LEAD) ? best : null
  return { candidates, sure }
}

/** The thread id in a forum link (https://discuss.eroscripts.com/t/some-slug/12345/7), or null. */
export function topicIdOf(url: string | null | undefined): number | null {
  const m = /^https?:\/\/discuss\.eroscripts\.com\/t\/(?:[^/?#]+\/)?(\d+)/i.exec(String(url ?? ''))
  return m ? Number(m[1]) : null
}

export function threadUrl(t: { id: number, slug: string }): string {
  return `https://discuss.eroscripts.com/t/${t.slug || 'topic'}/${t.id}`
}

/** Forum tags that name a device, or a length bucket: not about the video. */
const DEVICE_TAGS = new Set([
  'handy', 'the-handy', 'thehandy', 'handy-2', 'the-handy-2', 'the-handy-2-pro', 'osr', 'osr2', 'osr2+', 'osr2-plus',
  'sr6', 'sr1', 'ssr1', 'tcode', 't-code', 'keon', 'kiiroo', 'kiiroo-keon', 'launch', 'fleshlight-launch', 'autoblow',
  'lovense', 'vorze',
])

/** A thread's tags as library tags: lower case, no device or length tags. */
export function threadTags(tags: unknown[]): string[] {
  const out: string[] = []
  for (const raw of tags) {
    const name = typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? (raw as { name?: unknown }).name : null
    if (typeof name !== 'string')
      continue
    const t = name.trim().toLowerCase()
    if (t && !DEVICE_TAGS.has(t) && !/^len-/.test(t) && !out.includes(t))
      out.push(t)
  }
  return out
}

export interface ThreadFile {
  name: string
  url: string
}

/** What changed in a thread's script files since they were noted: new names, gone names, and re-uploads under the same name. */
export function fileChanges(before: ThreadFile[], now: ThreadFile[]): { added: string[], removed: string[], replaced: string[] } {
  const was = new Map(before.map(f => [f.name.toLowerCase(), f.url]))
  const is = new Map(now.map(f => [f.name.toLowerCase(), f.url]))
  const added = now.filter(f => !was.has(f.name.toLowerCase())).map(f => f.name)
  const removed = before.filter(f => !is.has(f.name.toLowerCase())).map(f => f.name)
  const replaced = now.filter(f => was.has(f.name.toLowerCase()) && was.get(f.name.toLowerCase()) !== f.url).map(f => f.name)
  return { added, removed, replaced }
}

/** The script files a thread's first post links or attaches, by name. */
export function scriptFilesIn(cooked: string, attachments: { url: string, original_filename: string }[] = []): ThreadFile[] {
  const out: ThreadFile[] = []
  const seen = new Set<string>()
  const add = (name: string, url: string) => {
    const key = name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push({ name, url })
    }
  }
  for (const m of cooked.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].replace(/&amp;/g, '&')
    const text = m[2].replace(/<[^>]+>/g, '').trim()
    if (!/\.funscript(?:\?|$)/i.test(href) && !/\.funscript$/i.test(text))
      continue
    const name = /\.funscript$/i.test(text) ? text : decodeURIComponent(href.split('/').pop()!.split('?')[0])
    add(name, href)
  }
  for (const a of attachments) {
    if (/\.funscript$/i.test(a.original_filename))
      add(a.original_filename, a.url)
  }
  return out
}
