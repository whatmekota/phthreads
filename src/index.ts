import type { Candidate, ThreadFile } from './match'
import type { Thread } from './forum'
import type { LibraryVideo, PluginContext } from './types'
import { createForum, ForumError } from './forum'
import { fileChanges, rank, searchQueries, threadTags, threadUrl, topicIdOf } from './match'
import { CSS } from './style'

/**
 * Threads: finds the EroScripts thread each library video came from.
 *
 * A video whose script (or saved info) already links its thread is matched
 * for free. The rest are searched for only when asked, one request at a time
 * and slowly, and every answer is kept, so nothing is asked twice. A clear
 * match is taken; a close call shows the candidates to pick from. A matched
 * video can take the thread's tags, and the thread can be checked later for
 * changed script files.
 */

interface Match {
  id: number
  slug: string
  title: string
  tags: string[]
  /** The thread's script files when it was matched (or last checked and seen). */
  files: ThreadFile[]
  how: 'link' | 'search' | 'picked' | 'pasted'
  at: number
  /** What changed since `files`, from the last check. */
  changes?: { added: string[], removed: string[], replaced: string[], at: number }
}

interface Looked {
  at: number
  candidates: Candidate[]
}

type Filter = 'all' | 'matched' | 'pick' | 'none' | 'new'

const GLOBE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3.5h10v7H8l-3 2.5v-2.5H3Z"/><path d="M6 6.5h4M6 8.5h2.5"/></svg>'
/** Rows drawn at once; the filter and the search narrow a big library down. */
const MAX_ROWS = 300

export default function activate(ctx: PluginContext) {
  ctx.ui.style(CSS)
  const forum = createForum(ctx)
  /** playhound before 2.2 has no library.tag / setSource / info. */
  const canTag = () => typeof ctx.library.tag === 'function'

  let videos: LibraryVideo[] = []
  let matches: Record<string, Match> = {}
  let looked: Record<string, Looked> = {}
  let busy: { label: string, done: number, total: number } | null = null
  let stopAsked = false
  let lastError: string | null = null
  let redraw: (() => void) | null = null

  const loaded = (async () => {
    try {
      matches = (await ctx.storage.get<Record<string, Match>>('matches')) ?? {}
      looked = (await ctx.storage.get<Record<string, Looked>>('looked')) ?? {}
    }
    catch (err) {
      ctx.log('could not read saved data', err)
    }
  })()

  async function refreshLibrary() {
    try {
      videos = await ctx.library.list()
    }
    catch (err) {
      ctx.log('could not read the library', err)
      videos = []
    }
    redraw?.()
  }
  ctx.library.onChange(() => void refreshLibrary())

  const save = () => Promise.all([ctx.storage.set('matches', matches), ctx.storage.set('looked', looked)]).catch(() => {})

  function statusOf(v: LibraryVideo): Filter {
    if (matches[v.id])
      return 'matched'
    const l = looked[v.id]
    if (!l)
      return 'new'
    return l.candidates.length ? 'pick' : 'none'
  }

  async function setMatch(v: LibraryVideo, t: Thread, how: Match['how']) {
    matches[v.id] = { id: t.id, slug: t.slug, title: t.title, tags: t.tags, files: t.files, how, at: Date.now() }
    delete looked[v.id]
    await save()
    // Kept with the video too, so playhound shows where it came from and the
    // next look is free. Older playhound has no setSource: skip it.
    try {
      await ctx.library.setSource?.(v.id, threadUrl(t))
    }
    catch {}
  }

  /** Match one video: its own link first, else a search. Throws ForumError. */
  async function find(v: LibraryVideo) {
    const info = ctx.library.info ? await ctx.library.info(v.id).catch(() => null) : null
    const linked = topicIdOf(info?.sourceUrl ?? v.sourceUrl)
    if (linked) {
      await setMatch(v, await forum.thread(linked), 'link')
      return
    }
    let hits: Awaited<ReturnType<typeof forum.search>> = []
    for (const q of searchQueries(v.title)) {
      hits = await forum.search(q)
      if (hits.length)
        break
    }
    const { candidates, sure } = rank(v.title, hits)
    if (sure) {
      await setMatch(v, await forum.thread(sure.id), 'search')
      return
    }
    looked[v.id] = { at: Date.now(), candidates }
    await save()
  }

  /** Work through videos one by one, stoppable, reporting as it goes. */
  async function run(label: string, list: LibraryVideo[], each: (v: LibraryVideo) => Promise<void>) {
    if (busy || !list.length)
      return
    stopAsked = false
    lastError = null
    busy = { label, done: 0, total: list.length }
    redraw?.()
    for (const v of list) {
      if (stopAsked)
        break
      try {
        await each(v)
      }
      catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        // Signed out, the forum gone or asking to slow down: the rest would fail the same way.
        if (err instanceof ForumError && err.kind !== 'other')
          break
      }
      busy.done++
      redraw?.()
    }
    busy = null
    redraw?.()
  }

  async function checkUpdates(list: LibraryVideo[]) {
    await run('Checking threads', list, async (v) => {
      const m = matches[v.id]
      if (!m)
        return
      const t = await forum.thread(m.id)
      const c = fileChanges(m.files, t.files)
      m.title = t.title
      m.tags = t.tags
      m.changes = c.added.length || c.removed.length || c.replaced.length ? { ...c, at: Date.now() } : undefined
      await save()
    })
  }

  async function applyTags(list: LibraryVideo[]) {
    if (!canTag())
      return
    let n = 0
    for (const v of list) {
      const m = matches[v.id]
      const add = m ? threadTags(m.tags).filter(t => !v.tags?.includes(t)) : []
      if (add.length) {
        await ctx.library.tag(v.id, { add })
        n++
      }
    }
    await refreshLibrary()
    ctx.ui.toast(n ? `Tags added to ${n} video${n === 1 ? '' : 's'}` : 'They already have the thread\'s tags')
  }

  ctx.ui.page({
    title: 'Threads',
    icon: GLOBE,
    mount(el) {
      const root = document.createElement('div')
      root.className = 'pht'
      el.append(root)
      let filter: Filter = 'all'
      let query = ''
      let shown: LibraryVideo[] = []

      root.innerHTML = `
        <div class="pht-head">
          <div class="pht-title">
            <b>EroScripts threads</b>
            <span class="pht-sub">Finds the thread each video came from: its tags, and whether a script changed since. One request at a time, only when you ask.</span>
          </div>
          <div class="pht-actions">
            <button type="button" class="pht-btn pht-primary" data-act="find"></button>
            <button type="button" class="pht-btn" data-act="check"></button>
            <button type="button" class="pht-btn" data-act="tags"></button>
            <button type="button" class="pht-btn" data-act="stop" hidden>Stop</button>
          </div>
        </div>
        <div class="pht-bar">
          <input class="pht-search" type="search" placeholder="Filter by name" aria-label="Filter by name">
          <div class="pht-tabs" role="tablist"></div>
        </div>
        <div class="pht-status" aria-live="polite"></div>
        <ul class="pht-list"></ul>`
      const $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T
      const btn = (a: string) => $<HTMLButtonElement>(`[data-act="${a}"]`)
      const tabs = $<HTMLDivElement>('.pht-tabs')
      const list = $<HTMLUListElement>('.pht-list')
      const status = $<HTMLDivElement>('.pht-status')

      function link(href: string, text: string) {
        const a = document.createElement('a')
        a.href = href
        a.target = '_blank'
        a.rel = 'noreferrer'
        a.textContent = text
        return a
      }
      function chip(text: string, cls = 'pht-chip') {
        const s = document.createElement('span')
        s.className = cls
        s.textContent = text
        return s
      }
      function small(text: string, onClick: () => void, cls = 'pht-small') {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = cls
        b.textContent = text
        b.disabled = !!busy
        b.addEventListener('click', onClick)
        return b
      }

      function row(v: LibraryVideo): HTMLLIElement {
        const li = document.createElement('li')
        li.className = 'pht-row'
        const top = document.createElement('div')
        top.className = 'pht-top'
        const name = document.createElement('span')
        name.className = 'pht-name'
        name.textContent = v.title
        name.title = v.path
        top.append(name)
        const m = matches[v.id]
        const l = looked[v.id]
        const body = document.createElement('div')
        body.className = 'pht-body'
        if (m) {
          top.append(chip(m.how === 'link' ? 'linked' : 'matched', 'pht-pill is-ok'))
          if (m.changes)
            top.append(chip('updated', 'pht-pill is-warn'))
          const line = document.createElement('div')
          line.className = 'pht-thread'
          line.append(link(threadUrl(m), m.title))
          body.append(line)
          const tags = threadTags(m.tags)
          if (tags.length) {
            const row = document.createElement('div')
            row.className = 'pht-tags'
            for (const t of tags)
              row.append(chip(t, v.tags?.includes(t) ? 'pht-chip is-have' : 'pht-chip'))
            body.append(row)
          }
          if (m.changes) {
            const c = m.changes
            const parts = [
              c.added.length ? `new: ${c.added.join(', ')}` : '',
              c.replaced.length ? `re-uploaded: ${c.replaced.join(', ')}` : '',
              c.removed.length ? `gone: ${c.removed.join(', ')}` : '',
            ].filter(Boolean)
            body.append(chip(`Script files changed since it was matched. ${parts.join('; ')}`, 'pht-note'))
          }
          const acts = document.createElement('div')
          acts.className = 'pht-row-acts'
          if (canTag() && tags.some(t => !v.tags?.includes(t)))
            acts.append(small('Add its tags', () => void applyTags([v])))
          if (m.changes) {
            acts.append(small('Seen', () => {
              void forum.thread(m.id).then((t) => {
                m.files = t.files
                m.changes = undefined
                return save()
              }).then(() => redraw?.()).catch(() => {})
            }))
          }
          acts.append(small('Not this thread', () => {
            delete matches[v.id]
            void save().then(() => redraw?.())
          }, 'pht-small is-quiet'))
          body.append(acts)
        }
        else if (l && l.candidates.length) {
          top.append(chip('pick one', 'pht-pill is-warn'))
          for (const c of l.candidates) {
            const line = document.createElement('div')
            line.className = 'pht-cand'
            line.append(link(threadUrl(c), c.title), chip(`${Math.round(c.score * 100)}%`, 'pht-score'))
            line.append(small('This one', () => void run('Matching', [v], async () => setMatch(v, await forum.thread(c.id), 'picked'))))
            body.append(line)
          }
          body.append(pasteBox(v))
        }
        else if (l) {
          top.append(chip('not found', 'pht-pill'))
          body.append(pasteBox(v))
        }
        else {
          const acts = document.createElement('div')
          acts.className = 'pht-row-acts'
          acts.append(small('Find', () => void run('Finding threads', [v], find)))
          body.append(acts)
        }
        li.append(top, body)
        return li
      }

      /** Paste a thread's link by hand when search did not find it. */
      function pasteBox(v: LibraryVideo) {
        const wrap = document.createElement('div')
        wrap.className = 'pht-paste'
        const input = document.createElement('input')
        input.placeholder = 'Paste the thread\'s link'
        input.setAttribute('aria-label', 'Thread link')
        const go = () => {
          const id = topicIdOf(input.value.trim())
          if (!id) {
            input.classList.add('is-bad')
            return
          }
          void run('Matching', [v], async () => setMatch(v, await forum.thread(id), 'pasted'))
        }
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter')
            go()
        })
        wrap.append(input, small('Use it', go), small('Search again', () => {
          delete looked[v.id]
          void run('Finding threads', [v], find)
        }, 'pht-small is-quiet'))
        return wrap
      }

      function render() {
        const counts: Record<Filter, number> = { all: videos.length, matched: 0, pick: 0, none: 0, new: 0 }
        for (const v of videos)
          counts[statusOf(v)]++
        const q = query.trim().toLowerCase()
        const filtered = videos.filter(v => (filter === 'all' || statusOf(v) === filter) && (!q || v.title.toLowerCase().includes(q)))
        shown = filtered
        const LABELS: [Filter, string][] = [['all', 'All'], ['matched', 'Matched'], ['pick', 'To pick'], ['none', 'Not found'], ['new', 'Not looked up']]
        tabs.replaceChildren(...LABELS.map(([f, label]) => {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'pht-tab'
          b.setAttribute('aria-pressed', String(filter === f))
          b.textContent = `${label} ${counts[f]}`
          b.addEventListener('click', () => {
            filter = f
            render()
          })
          return b
        }))

        const toFind = filtered.filter(v => statusOf(v) === 'new')
        const matched = filtered.filter(v => matches[v.id])
        const find = btn('find')
        find.textContent = toFind.length ? `Find threads for ${toFind.length}` : 'Find threads'
        find.disabled = !!busy || !toFind.length
        const check = btn('check')
        check.textContent = 'Check for updates'
        check.disabled = !!busy || !matched.length
        const tags = btn('tags')
        tags.textContent = 'Add their tags'
        tags.hidden = !canTag()
        tags.disabled = !!busy || !matched.some(v => threadTags(matches[v.id].tags).some(t => !v.tags?.includes(t)))
        btn('stop').hidden = !busy

        status.textContent = busy
          ? `${busy.label}: ${busy.done} of ${busy.total}${stopAsked ? ' (stopping)' : ''}`
          : lastError ?? (videos.length ? '' : 'The library is empty, or not open yet.')
        status.classList.toggle('is-bad', !busy && !!lastError)

        list.replaceChildren(...filtered.slice(0, MAX_ROWS).map(row))
        if (filtered.length > MAX_ROWS) {
          const more = document.createElement('li')
          more.className = 'pht-more'
          more.textContent = `${filtered.length - MAX_ROWS} more: narrow it down with the filter.`
          list.append(more)
        }
      }
      redraw = render

      root.addEventListener('click', (e) => {
        const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act
        if (act === 'find')
          void run('Finding threads', shown.filter(v => statusOf(v) === 'new'), find)
        else if (act === 'check')
          void checkUpdates(shown.filter(v => matches[v.id]))
        else if (act === 'tags')
          void applyTags(shown.filter(v => matches[v.id]))
        else if (act === 'stop') {
          stopAsked = true
          render()
        }
      })
      $<HTMLInputElement>('.pht-search').addEventListener('input', (e) => {
        query = (e.target as HTMLInputElement).value
        render()
      })

      render()
      void loaded.then(refreshLibrary)
      return () => {
        redraw = null
        root.remove()
      }
    },
  })

  ctx.commands.register({
    id: 'open',
    title: 'Find EroScripts threads for the library',
    hint: 'Tags and script updates from the threads videos came from',
    icon: GLOBE,
    run: () => ctx.ui.openPage(),
  })
}
