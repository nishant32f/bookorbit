# Scanner inode reuse fix

Base: f280248620feed0d60cafcaeb828e15f07d9e59b, the deployed Pluto build.

A persisted inode may identify an unrelated file after a restart or deletion.
Treat it as a move candidate only. Require matching size, modification time,
and stored content fingerprint, and require the old path to be absent.
Apply the check to scan ownership, same-library moves, cross-library transfers,
file reassignment, and watcher move detection. Keep exact-path updates intact.

Add failing regression coverage for reused inodes and preserve genuine renames.
Run scanner tests, server build/typecheck, and focused lint. Review the diff.
Build on Pluto from the existing runtime image so dependencies, migrations,
and the KOReader fixes stay unchanged. Pin the resulting image and recreate
only BookOrbit. Verify deployed behavior with an isolated reproduction and
compare production catalogue associations and book file hashes before/after.

No catalogue repair, book restoration, or production rescan is included.
