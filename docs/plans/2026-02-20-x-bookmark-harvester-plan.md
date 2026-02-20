# X Bookmark Harvester Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scrape all X bookmarks via GraphQL API intercept and store complete raw data in SQLite, searchable by agents.

**Architecture:** Single Bun script using `agent-browser` to intercept X's GraphQL Bookmarks XHR responses in-browser. Stores raw JSON blobs + parsed columns in SQLite via `bun:sqlite`. Incremental dedup on `tweet_id`.

**Tech Stack:** Bun, `bun:sqlite`, `agent-browser` CLI, X GraphQL API (intercepted)

---

### Task 1: DB Schema + Initialization

**Files:**
- Create: `~/Documents/tmp/x-bookmarks.ts`

**Step 1: Create the script with DB initialization**

```typescript
#!/usr/bin/env bun

import { Database } from "bun:sqlite"

const DB_PATH = `${process.env.HOME}/Documents/tmp/x-bookmarks.db`
const PROFILE = `${process.env.HOME}/.agent-browser-x`

function initDb(): Database {
    const db = new Database(DB_PATH, { create: true, strict: true })
    db.run("PRAGMA journal_mode = WAL")
    db.run("PRAGMA foreign_keys = ON")

    db.run(`
        CREATE TABLE IF NOT EXISTS raw_pages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cursor      TEXT,
            response    TEXT NOT NULL,
            fetched_at  TEXT NOT NULL
        )
    `)

    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            tweet_id        TEXT PRIMARY KEY,
            url             TEXT NOT NULL,
            raw_json        TEXT NOT NULL,
            user_id         TEXT NOT NULL,
            user_name       TEXT NOT NULL,
            user_handle     TEXT NOT NULL,
            user_verified   INTEGER NOT NULL DEFAULT 0,
            user_followers  INTEGER,
            user_bio        TEXT,
            user_avatar_url TEXT,
            full_text       TEXT NOT NULL,
            lang            TEXT,
            source          TEXT,
            created_at      TEXT,
            conversation_id TEXT,
            in_reply_to     TEXT,
            is_quote        INTEGER NOT NULL DEFAULT 0,
            is_retweet      INTEGER NOT NULL DEFAULT 0,
            replies         INTEGER,
            retweets        INTEGER,
            likes           INTEGER,
            bookmarks_count INTEGER,
            quotes          INTEGER,
            views           INTEGER,
            hashtags        TEXT,
            urls            TEXT,
            user_mentions   TEXT,
            media           TEXT,
            scraped_at      TEXT NOT NULL,
            has_note_tweet  INTEGER NOT NULL DEFAULT 0,
            has_quoted      INTEGER NOT NULL DEFAULT 0,
            has_media       INTEGER NOT NULL DEFAULT 0,
            quoted_tweet_id TEXT
        )
    `)

    db.run("CREATE INDEX IF NOT EXISTS idx_bookmarks_user_handle ON bookmarks(user_handle)")
    db.run("CREATE INDEX IF NOT EXISTS idx_bookmarks_lang ON bookmarks(lang)")
    db.run("CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at)")

    db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
            tweet_id, user_name, user_handle, full_text, user_bio,
            content=bookmarks, content_rowid=rowid
        )
    `)

    // Triggers to keep FTS in sync
    db.run(`
        CREATE TRIGGER IF NOT EXISTS bookmarks_ai AFTER INSERT ON bookmarks BEGIN
            INSERT INTO bookmarks_fts(rowid, tweet_id, user_name, user_handle, full_text, user_bio)
            VALUES (new.rowid, new.tweet_id, new.user_name, new.user_handle, new.full_text, new.user_bio);
        END
    `)

    db.run(`
        CREATE TRIGGER IF NOT EXISTS bookmarks_ad AFTER DELETE ON bookmarks BEGIN
            INSERT INTO bookmarks_fts(bookmarks_fts, rowid, tweet_id, user_name, user_handle, full_text, user_bio)
            VALUES ('delete', old.rowid, old.tweet_id, old.user_name, old.user_handle, old.full_text, old.user_bio);
        END
    `)

    db.run(`
        CREATE TRIGGER IF NOT EXISTS bookmarks_au AFTER UPDATE ON bookmarks BEGIN
            INSERT INTO bookmarks_fts(bookmarks_fts, rowid, tweet_id, user_name, user_handle, full_text, user_bio)
            VALUES ('delete', old.rowid, old.tweet_id, old.user_name, old.user_handle, old.full_text, old.user_bio);
            INSERT INTO bookmarks_fts(rowid, tweet_id, user_name, user_handle, full_text, user_bio)
            VALUES (new.rowid, new.tweet_id, new.user_name, new.user_handle, new.full_text, new.user_bio);
        END
    `)

    return db
}
```

**Step 2: Test DB creation**

Run: `bun ~/Documents/tmp/x-bookmarks.ts`
Expected: Script exits cleanly. `~/Documents/tmp/x-bookmarks.db` is created.
Verify: `sqlite3 ~/Documents/tmp/x-bookmarks.db ".tables"` shows `bookmarks`, `raw_pages`, `bookmarks_fts`.

**Step 3: Commit**

This is a standalone script so no git repo. Just verify the file runs.

---

### Task 2: Tweet Parser

**Files:**
- Modify: `~/Documents/tmp/x-bookmarks.ts`

**Step 1: Add the ParsedBookmark type and parseTweet function**

This is the core logic — takes a raw API entry and extracts every field into a flat object for SQLite insertion.

```typescript
type ParsedBookmark = {
    tweet_id: string
    url: string
    raw_json: string
    user_id: string
    user_name: string
    user_handle: string
    user_verified: number
    user_followers: number | null
    user_bio: string | null
    user_avatar_url: string | null
    full_text: string
    lang: string | null
    source: string | null
    created_at: string | null
    conversation_id: string | null
    in_reply_to: string | null
    is_quote: number
    is_retweet: number
    replies: number | null
    retweets: number | null
    likes: number | null
    bookmarks_count: number | null
    quotes: number | null
    views: number | null
    hashtags: string | null
    urls: string | null
    user_mentions: string | null
    media: string | null
    scraped_at: string
    has_note_tweet: number
    has_quoted: number
    has_media: number
    quoted_tweet_id: string | null
}

function parseTweet(entry: any): ParsedBookmark | null {
    // Entries can be tweets or cursors
    const itemContent = entry?.content?.itemContent
    if (!itemContent) return null

    const tweetResult = itemContent.tweet_results?.result
    if (!tweetResult) return null

    // Handle tweet with visibility results wrapper
    const tweet = tweetResult.__typename === "TweetWithVisibilityResults"
        ? tweetResult.tweet
        : tweetResult

    if (!tweet?.legacy) return null

    const legacy = tweet.legacy
    const user = tweet.core?.user_results?.result
    const userLegacy = user?.legacy

    // Note tweets have full text in a separate field
    const noteText = tweet.note_tweet?.note_tweet_results?.result?.text
    const fullText = noteText || legacy.full_text || ""

    // Clean HTML from source field: "<a href=\"...\">Twitter Web App</a>" -> "Twitter Web App"
    const sourceMatch = tweet.source?.match(/>([^<]+)</)
    const source = sourceMatch ? sourceMatch[1] : tweet.source

    // Extract entities
    const entities = legacy.entities || {}
    const extEntities = legacy.extended_entities || {}

    const hashtags = entities.hashtags?.length
        ? JSON.stringify(entities.hashtags.map((h: any) => h.text))
        : null

    const urls = entities.urls?.length
        ? JSON.stringify(entities.urls.map((u: any) => ({
            url: u.url,
            expanded: u.expanded_url,
            display: u.display_url,
        })))
        : null

    const mentions = entities.user_mentions?.length
        ? JSON.stringify(entities.user_mentions.map((m: any) => ({
            handle: m.screen_name,
            id: m.id_str,
            name: m.name,
        })))
        : null

    const mediaItems = extEntities.media || entities.media
    const media = mediaItems?.length
        ? JSON.stringify(mediaItems.map((m: any) => ({
            type: m.type,
            url: m.media_url_https,
            expanded_url: m.expanded_url,
            sizes: m.sizes,
            video_info: m.video_info ? {
                duration: m.video_info.duration_millis,
                variants: m.video_info.variants?.filter((v: any) => v.content_type === "video/mp4"),
            } : undefined,
        })))
        : null

    const quotedResult = tweet.quoted_status_result?.result
    const quotedId = quotedResult?.rest_id || quotedResult?.tweet?.rest_id || null

    return {
        tweet_id: tweet.rest_id,
        url: `https://x.com/${userLegacy?.screen_name || "i"}/status/${tweet.rest_id}`,
        raw_json: JSON.stringify(tweetResult),
        user_id: user?.rest_id || legacy.user_id_str || "",
        user_name: userLegacy?.name || "",
        user_handle: userLegacy?.screen_name || "",
        user_verified: user?.is_blue_verified ? 1 : 0,
        user_followers: userLegacy?.followers_count ?? null,
        user_bio: user?.profile_bio?.description || userLegacy?.description || null,
        user_avatar_url: userLegacy?.profile_image_url_https || null,
        full_text: fullText,
        lang: legacy.lang || null,
        source,
        created_at: legacy.created_at || null,
        conversation_id: legacy.conversation_id_str || null,
        in_reply_to: legacy.in_reply_to_status_id_str || null,
        is_quote: legacy.is_quote_status ? 1 : 0,
        is_retweet: legacy.retweeted_status_result ? 1 : 0,
        replies: legacy.reply_count ?? null,
        retweets: legacy.retweet_count ?? null,
        likes: legacy.favorite_count ?? null,
        bookmarks_count: legacy.bookmark_count ?? null,
        quotes: legacy.quote_count ?? null,
        views: tweet.views?.count ? parseInt(tweet.views.count, 10) : null,
        hashtags,
        urls,
        user_mentions: mentions,
        media,
        scraped_at: new Date().toISOString(),
        has_note_tweet: noteText ? 1 : 0,
        has_quoted: quotedId ? 1 : 0,
        has_media: mediaItems?.length ? 1 : 0,
        quoted_tweet_id: quotedId,
    }
}
```

**Step 2: Add parseApiResponse to extract entries + cursor from a full API response**

```typescript
type PageResult = {
    bookmarks: ParsedBookmark[]
    bottomCursor: string | null
}

function parseApiResponse(responseText: string): PageResult {
    const data = JSON.parse(responseText)
    const timeline = data.data?.bookmark_timeline_v2?.timeline
    if (!timeline) return { bookmarks: [], bottomCursor: null }

    const entries = timeline.instructions?.[0]?.entries || []

    const bookmarks: ParsedBookmark[] = []
    let bottomCursor: string | null = null

    for (const entry of entries) {
        // Cursor entries
        if (entry.entryId?.startsWith("cursor-bottom-")) {
            bottomCursor = entry.content?.value || null
            continue
        }
        if (entry.entryId?.startsWith("cursor-top-")) continue

        const parsed = parseTweet(entry)
        if (parsed) bookmarks.push(parsed)
    }

    return { bookmarks, bottomCursor }
}
```

**Step 3: Test the parser against the live captured data**

Add a temporary test block at the bottom of the script:

```typescript
// --- Temporary test: parse captured API response ---
if (process.argv[2] === "--test-parser") {
    const db = initDb()
    // We'll paste a sample entry from the browser capture
    console.log("Parser loaded. DB initialized.")
    console.log("Tables:", db.query("SELECT name FROM sqlite_master WHERE type='table'").all())
    db.close()
    process.exit(0)
}
```

Run: `bun ~/Documents/tmp/x-bookmarks.ts --test-parser`
Expected: Prints table names including `bookmarks`, `raw_pages`, `bookmarks_fts`.

---

### Task 3: DB Insert Logic

**Files:**
- Modify: `~/Documents/tmp/x-bookmarks.ts`

**Step 1: Add insertBookmarks function using a prepared statement + transaction**

```typescript
function insertBookmarks(db: Database, bookmarks: ParsedBookmark[]): number {
    const existingQuery = db.query<{ tweet_id: string }, [string]>(
        "SELECT tweet_id FROM bookmarks WHERE tweet_id = ?1"
    )

    const insertStmt = db.query(`
        INSERT OR IGNORE INTO bookmarks (
            tweet_id, url, raw_json, user_id, user_name, user_handle,
            user_verified, user_followers, user_bio, user_avatar_url,
            full_text, lang, source, created_at, conversation_id, in_reply_to,
            is_quote, is_retweet, replies, retweets, likes, bookmarks_count,
            quotes, views, hashtags, urls, user_mentions, media,
            scraped_at, has_note_tweet, has_quoted, has_media, quoted_tweet_id
        ) VALUES (
            $tweet_id, $url, $raw_json, $user_id, $user_name, $user_handle,
            $user_verified, $user_followers, $user_bio, $user_avatar_url,
            $full_text, $lang, $source, $created_at, $conversation_id, $in_reply_to,
            $is_quote, $is_retweet, $replies, $retweets, $likes, $bookmarks_count,
            $quotes, $views, $hashtags, $urls, $user_mentions, $media,
            $scraped_at, $has_note_tweet, $has_quoted, $has_media, $quoted_tweet_id
        )
    `)

    let inserted = 0

    const runInsert = db.transaction(function(items: ParsedBookmark[]) {
        for (const bk of items) {
            const existing = existingQuery.get(bk.tweet_id)
            if (existing) continue

            insertStmt.run(bk)
            inserted++
        }
        return inserted
    })

    runInsert(bookmarks)
    return inserted
}

function insertRawPage(db: Database, cursor: string | null, response: string): void {
    db.query("INSERT INTO raw_pages (cursor, response, fetched_at) VALUES ($cursor, $response, $fetched_at)")
        .run({ cursor, response, fetched_at: new Date().toISOString() })
}
```

---

### Task 4: Browser Pipeline — Intercept + Navigate + Capture

**Files:**
- Modify: `~/Documents/tmp/x-bookmarks.ts`

**Step 1: Add agent-browser shell helper**

```typescript
async function browser(...args: string[]): Promise<string> {
    const proc = Bun.spawn(["agent-browser", "--profile", PROFILE, ...args], {
        stdout: "pipe",
        stderr: "pipe",
    })
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    await proc.exited

    if (proc.exitCode !== 0 && !stderr.includes("\u26A0")) {
        throw new Error(`agent-browser ${args[0]} failed: ${stderr.trim()}`)
    }
    return stdout.trim()
}
```

**Step 2: Add the XHR interceptor injection JS (as a string constant)**

```typescript
const INTERCEPTOR_JS = `
window.__bkCaptures = [];
window.__bkResponses = [];
var _open = XMLHttpRequest.prototype.open;
var _send = XMLHttpRequest.prototype.send;
var _setH = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.open = function(m, u) {
  this._m = m; this._u = u; this._h = {};
  return _open.apply(this, arguments);
};
XMLHttpRequest.prototype.setRequestHeader = function(n, v) {
  this._h[n] = v;
  return _setH.apply(this, arguments);
};
XMLHttpRequest.prototype.send = function(body) {
  var x = this;
  if (x._u && x._u.indexOf('/Bookmarks') >= 0) {
    x.addEventListener('load', function() {
      if (x.status === 200 && x.responseText) {
        window.__bkCaptures.push({
          url: x._u,
          status: x.status,
          size: x.responseText.length,
          ts: Date.now()
        });
        window.__bkResponses.push(x.responseText);
      }
    });
  }
  return _send.apply(this, arguments);
};
'ok';
`
```

**Step 3: Add the scrape pipeline**

```typescript
async function scrape(db: Database): Promise<void> {
    console.error("Opening X home page...")
    await browser("open", "https://x.com/home")
    await browser("wait", "3000")

    console.error("Installing XHR interceptor...")
    const interceptResult = await browser("eval", INTERCEPTOR_JS)
    if (!interceptResult.includes("ok")) {
        throw new Error("Failed to install interceptor: " + interceptResult)
    }

    console.error("Navigating to bookmarks via SPA click...")
    await browser("click", "a[href='/i/bookmarks']")
    await browser("wait", "5000")

    // Drain captured responses
    let totalInserted = 0
    let pageNum = 0
    let consecutiveEmpty = 0

    while (consecutiveEmpty < 3) {
        // Collect any captured responses
        const countStr = await browser("eval", "window.__bkResponses.length")
        const count = parseInt(JSON.parse(countStr), 10)

        if (count > pageNum) {
            // Process new pages
            for (let i = pageNum; i < count; i++) {
                const responseText = await browser("eval",
                    `window.__bkResponses[${i}]`
                )
                // agent-browser double-quotes the string
                const raw = responseText.startsWith('"')
                    ? JSON.parse(responseText)
                    : responseText

                const { bookmarks, bottomCursor } = parseApiResponse(raw)

                insertRawPage(db, bottomCursor, raw)
                const inserted = insertBookmarks(db, bookmarks)
                totalInserted += inserted

                pageNum++
                console.error(`Page ${pageNum}: ${bookmarks.length} tweets, ${inserted} new (${totalInserted} total)`)

                if (bookmarks.length === 0) {
                    consecutiveEmpty++
                } else {
                    consecutiveEmpty = 0
                }
            }
        } else {
            // No new page yet, scroll to trigger pagination
            await browser("scroll", "down", "5000")
            await browser("wait", "2500")
        }
    }

    console.error(`\nDone. Inserted ${totalInserted} bookmarks across ${pageNum} pages.`)
}
```

**Step 4: Test the intercept pipeline**

Run: `bun ~/Documents/tmp/x-bookmarks.ts`
Expected: Script opens browser, navigates to bookmarks, starts capturing and inserting.

---

### Task 5: CLI Commands — Stats + FTS Query

**Files:**
- Modify: `~/Documents/tmp/x-bookmarks.ts`

**Step 1: Add stats command**

```typescript
function showStats(db: Database): void {
    const total = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM bookmarks").get()
    const pages = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM raw_pages").get()
    const authors = db.query<{ count: number }, []>("SELECT COUNT(DISTINCT user_handle) as count FROM bookmarks").get()
    const withMedia = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM bookmarks WHERE has_media = 1").get()
    const withQuotes = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM bookmarks WHERE has_quoted = 1").get()
    const withNotes = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM bookmarks WHERE has_note_tweet = 1").get()
    const langs = db.query<{ lang: string; count: number }, []>(
        "SELECT lang, COUNT(*) as count FROM bookmarks GROUP BY lang ORDER BY count DESC LIMIT 5"
    ).all()
    const topAuthors = db.query<{ user_handle: string; count: number }, []>(
        "SELECT user_handle, COUNT(*) as count FROM bookmarks GROUP BY user_handle ORDER BY count DESC LIMIT 10"
    ).all()

    console.log(`Bookmarks:  ${total?.count || 0}`)
    console.log(`Raw pages:  ${pages?.count || 0}`)
    console.log(`Authors:    ${authors?.count || 0}`)
    console.log(`With media: ${withMedia?.count || 0}`)
    console.log(`With quotes:${withQuotes?.count || 0}`)
    console.log(`Long-form:  ${withNotes?.count || 0}`)
    console.log(`\nTop languages:`)
    for (const l of langs) console.log(`  ${l.lang || "(none)"}: ${l.count}`)
    console.log(`\nTop authors:`)
    for (const a of topAuthors) console.log(`  @${a.user_handle}: ${a.count}`)
}
```

**Step 2: Add FTS query command**

```typescript
function searchBookmarks(db: Database, query: string): void {
    const results = db.query<{
        tweet_id: string
        user_handle: string
        user_name: string
        full_text: string
        created_at: string
        url: string
    }, [string]>(`
        SELECT b.tweet_id, b.user_handle, b.user_name, b.full_text, b.created_at, b.url
        FROM bookmarks_fts f
        JOIN bookmarks b ON b.rowid = f.rowid
        WHERE bookmarks_fts MATCH ?1
        ORDER BY b.created_at DESC
        LIMIT 20
    `).all(query)

    console.log(`Found ${results.length} results for "${query}":\n`)
    for (const r of results) {
        const preview = r.full_text.replace(/\n/g, " ").slice(0, 120)
        console.log(`@${r.user_handle} (${r.created_at || "?"})`)
        console.log(`  ${preview}...`)
        console.log(`  ${r.url}\n`)
    }
}
```

**Step 3: Add main function with CLI routing**

```typescript
async function main(): Promise<void> {
    const args = process.argv.slice(2)
    const db = initDb()

    if (args[0] === "--stats") {
        showStats(db)
    } else if (args[0] === "--query" && args[1]) {
        searchBookmarks(db, args[1])
    } else if (args[0] === "--test-parser") {
        console.log("DB initialized. Tables:")
        console.log(db.query("SELECT name FROM sqlite_master WHERE type='table'").all())
    } else {
        await scrape(db)
    }

    db.close()
}

main().catch(function(err) {
    console.error("Error:", err.message || err)
    process.exit(1)
})
```

**Step 4: Test all three commands**

Run: `bun ~/Documents/tmp/x-bookmarks.ts --stats`
Expected: Shows counts (0 initially).

Run: `bun ~/Documents/tmp/x-bookmarks.ts`
Expected: Full scrape pipeline runs.

Run: `bun ~/Documents/tmp/x-bookmarks.ts --stats`
Expected: Shows populated counts.

Run: `bun ~/Documents/tmp/x-bookmarks.ts --query "AI"`
Expected: Shows matching bookmarks.
