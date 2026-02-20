# X Bookmark Harvester Design

**Date:** 2026-02-20
**Location:** `~/Documents/tmp/x-bookmarks.ts`
**Database:** `~/Documents/tmp/x-bookmarks.db`

## Goal

Scrape all X bookmarks via the GraphQL API and store the complete raw data in SQLite. Designed as a research corpus for agents — full-text searchable, incrementally updatable, with zero data loss.

## Approach: API Intercept via agent-browser

Use `agent-browser` (with the `~/.agent-browser-x` authenticated profile) to intercept X's GraphQL Bookmarks endpoint. The trick: install an XHR interceptor on `/home`, then SPA-navigate to `/i/bookmarks` via link click (not `location.href`), preserving the interceptor across the route transition.

### Why API over DOM scraping

The API response contains the complete tweet object graph: full text (including `note_tweet` for long-form), user profiles with bios/followers, `extended_entities` with media variants, `quoted_status_result`, entity indices for hashtags/mentions/URLs, conversation IDs, language codes, source app. DOM scraping captures ~20% of this.

### API Details

- **Endpoint:** `GET https://x.com/i/api/graphql/toTC7lB_mQm5fuBE5yyEJw/Bookmarks`
- **Transport:** XHR (not fetch)
- **Auth:** Cookies (automatic in browser context) + `x-csrf-token` header
- **Pagination:** Cursor-based, 20 entries per page
- **Response size:** ~180KB per page (22 entries including 2 cursor entries)
- **Query ID:** `toTC7lB_mQm5fuBE5yyEJw` (rotates with X deployments — script should handle discovery)

## SQLite Schema

```sql
CREATE TABLE raw_pages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cursor      TEXT,
    response    TEXT NOT NULL,
    fetched_at  TEXT NOT NULL
);

CREATE TABLE bookmarks (
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
    bookmarks       INTEGER,
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
);

CREATE INDEX idx_bookmarks_handle ON bookmarks(handle);
CREATE INDEX idx_bookmarks_lang ON bookmarks(lang);
CREATE INDEX idx_bookmarks_created ON bookmarks(created_at);

CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
    tweet_id, user_name, user_handle, full_text, user_bio,
    content=bookmarks, content_rowid=rowid
);
```

### Schema Rationale

- **`raw_json`**: Complete `tweet_results.result` blob per bookmark. Never lose data.
- **`raw_pages`**: Complete API response per page. Insurance against parsing bugs.
- **Parsed columns**: Indexes for querying. Derived from `raw_json`.
- **JSON array columns** (`hashtags`, `urls`, `user_mentions`, `media`): Stored as JSON strings. SQLite's `json_extract` can query them.
- **FTS5**: Full-text search across tweet text, author names, and bios.

## Pipeline

### Phase 1: Scrape (scroll + capture)

1. Open `agent-browser` to `https://x.com/home`
2. Install XHR interceptor that captures `/Bookmarks` responses
3. SPA-click the Bookmarks nav link
4. Capture initial page response (20 bookmarks)
5. Scroll to trigger pagination, capture each subsequent page
6. After each capture: parse entries, dedup by `tweet_id`, insert into SQLite
7. Stop when cursor entry is absent or no new entries appear

### Phase 2: Incremental updates (re-runs)

On subsequent runs, scrape from the top and stop when we hit a `tweet_id` that already exists in the DB. New bookmarks appear at the top of the feed.

## CLI

```bash
bun ~/Documents/tmp/x-bookmarks.ts              # Scrape new bookmarks
bun ~/Documents/tmp/x-bookmarks.ts --stats       # Print DB stats
bun ~/Documents/tmp/x-bookmarks.ts --query "AI"  # FTS search
```

## Known Constraints

- **Query ID rotation**: X changes GraphQL query IDs with deployments. The script captures the ID from the intercepted request URL, so this is self-healing.
- **Single browser**: `agent-browser` runs one tab. Parallelism not possible without multiple profiles.
- **Rate limits**: X may rate-limit rapid pagination. Script should respect natural scroll timing (~2s between pages).
- **~7 minutes for 1,448 bookmarks**: 73 pages at ~6s each (scroll + wait + capture).
