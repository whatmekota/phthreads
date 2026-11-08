// The forum, politely: through playhound's own forum proxy (localhost:7071,
// signed in as the app is), one request at a time, at least GAP_MS apart,
// and a long pause when the forum says it has had enough.

import type { PluginContext } from './types'
import type { ThreadFile } from './match'
import { scriptFilesIn } from './match'

const PROXY = 'http://localhost:7071'
/** Between two requests, at least. */
const GAP_MS = 1200
/** After the forum answers 429 (too many requests). */
const BACKOFF_MS = 30_000

export interface SearchHit {
  id: number
  slug: string
  title: string
  tags: string[]
}

export interface Thread {
  id: number
  slug: string
  title: string
  tags: string[]
  files: ThreadFile[]
}

export class ForumError extends Error {
  constructor(message: string, readonly kind: 'signed-out' | 'unreachable' | 'busy' | 'other') {
    super(message)
  }
}

const tagNames = (tags: unknown): string[] =>
  Array.isArray(tags) ? tags.map(t => (typeof t === 'string' ? t : (t as { name?: string })?.name ?? '')).filter(Boolean) : []

export function createForum(ctx: PluginContext) {
  let last = 0
  let chain: Promise<unknown> = Promise.resolve()

  async function get(path: string, tries = 3): Promise<any> {
    const wait = last + GAP_MS - Date.now()
    if (wait > 0)
      await new Promise(r => setTimeout(r, wait))
    last = Date.now()
    let res: Response
    try {
      res = await ctx.net.fetch(`${PROXY}${path}`, { headers: { Accept: 'application/json' } })
    }
    catch {
      throw new ForumError('playhound\'s forum connection is not running', 'unreachable')
    }
    if (res.status === 429 && tries > 1) {
      await new Promise(r => setTimeout(r, BACKOFF_MS))
      return get(path, tries - 1)
    }
    if (res.status === 429)
      throw new ForumError('The forum asked to slow down; try again in a few minutes', 'busy')
    if (res.status === 403)
      throw new ForumError('The forum treats playhound as signed out: sign in in the EroScripts view', 'signed-out')
    if (res.status === 502 || res.status === 504)
      throw new ForumError('Could not reach the forum', 'unreachable')
    if (!res.ok)
      throw new ForumError(`The forum answered ${res.status}`, 'other')
    return res.json()
  }

  /** One at a time, in the order asked: concurrent callers wait their turn. */
  function queued<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn)
    chain = run.catch(() => {})
    return run
  }

  return {
    search(q: string): Promise<SearchHit[]> {
      return queued(async () => {
        const data = await get(`/search.json?q=${encodeURIComponent(q)}`)
        return (data?.topics ?? []).map((t: any) => ({ id: t.id, slug: t.slug, title: t.title ?? t.fancy_title ?? '', tags: tagNames(t.tags) }))
      })
    },
    thread(id: number): Promise<Thread> {
      return queued(async () => {
        const data = await get(`/t/${id}.json`)
        const first = data?.post_stream?.posts?.[0]
        return {
          id: data.id,
          slug: data.slug,
          title: data.title ?? '',
          tags: tagNames(data.tags),
          files: first ? scriptFilesIn(String(first.cooked ?? ''), first.attachments ?? []) : [],
        }
      })
    },
  }
}
