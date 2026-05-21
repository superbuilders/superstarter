// Admin allowlist for the ingest and generation pages (PRD §3.1).
// Lowercase email strings only; the admin gate compares case-insensitively
// after lowercasing the session email. To grant admin access, add the
// user's Google account email here and ship a deploy.
const adminEmails: ReadonlyArray<string> = ["leonardiwata@gmail.com"]

export { adminEmails }
