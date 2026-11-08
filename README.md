# phthreads

**18+ only.** A plugin for [playhound](https://github.com/whatmekota/playhound) that finds the [EroScripts](https://discuss.eroscripts.com) thread each video in your library came from. Then it can bring the thread's tags over to your videos, and tell you when a thread's scripts changed since you got them.

Needs playhound **2.1.1** or newer (the first with the `library-edit` permission). Older versions refuse to install it.

## Install

In playhound: **Settings → Plugins**. Add `whatmekota/phthreads` under **Get plugins** and click **Install**, or download `phthreads-<version>.zip` from [Releases](https://github.com/whatmekota/phthreads/releases) and drop it on that page. It asks for:

- **Read your library**: video names and the thread links their scripts carry.
- **Change your videos' tags and source links**: a matched video gets its thread as its source link; tags change only when you click to add them.
- **Connect to servers through playhound**: the forum, through playhound's own forum connection.
- **Show its own page**: the **Threads** button in the left nav.

Sign in to EroScripts in playhound's EroScripts view first: the plugin uses that session and never sees your login.

## Using it

- **Find threads** goes through the videos not looked up yet. A video whose script already links its thread costs one request; the rest are searched by name.
- A clear match is taken on its own (**Matched**). When it isn't sure, the video lands in **To pick** with the likely threads: click **This one**, or paste the thread's link. **Not this thread** undoes a wrong match.
- **Add their tags** adds the matched threads' tags to your videos (never device tags like `the-handy` or `osr2`, nor `len-*` lengths: playhound has its own length tags). Tags you already have stay.
- **Check for updates** looks at the matched threads again and lists videos whose thread has new, removed or re-uploaded scripts. **Seen** clears the note.
- **Stop** stops a run at any time; what was found is kept, and the next run carries on where it stopped.

### Going easy on the forum

Requests go one at a time, at least 1.2 s apart, so a big library takes a while (roughly half an hour for 700 videos). If the forum asks to slow down, the plugin waits 30 s and tries again; the third time it stops and says so.

## Privacy

- It talks only to EroScripts, through playhound.
- It stores which thread each video matched and which videos were looked up, in playhound's plugin storage. Removing the plugin removes them.

## Build

    npm install
    npm run build          # dist/index.js and phthreads.zip
    npm run build:public   # release/phthreads-<version>.zip and release/manifest.json
    npm test
