const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { ScannerService } = require("/app/dist/modules/scanner/scanner.service.js");
const { FileEventProcessorService } = require("/app/dist/modules/scanner/file-event-processor.service.js");
const { computeFileHash } = require("/app/dist/modules/scanner/lib/hash.js");

(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bookorbit-inode-proof-"));
  try {
    const oldPath = path.join(directory, "AI.epub");
    const newPath = path.join(directory, "Guitar.epub");
    await fs.writeFile(oldPath, "original book");
    const oldStat = await fs.stat(oldPath, { bigint: true });
    const fileHash = await computeFileHash(oldPath);
    await fs.rename(oldPath, newPath);
    const stored = { id: 249, bookId: 249, absolutePath: oldPath, sizeBytes: Number(oldStat.size), mtime: oldStat.mtime, fileHash };
    const writes = [];
    const repository = {
      updateBookFolderPath: async (...args) => writes.push(["path", ...args]),
      updateBookStatus: async (...args) => writes.push(["status", ...args]),
      updateBookFile: async (...args) => writes.push(["file", ...args]),
      markBooksAsPresent: async (...args) => writes.push(["present", ...args]),
      findBookFileWithContextByIno: async () => ({
        file: stored,
        libraryId: 2,
        bookStatus: "missing",
        folderPath: oldPath,
        libraryFolderPath: directory,
      }),
      findBooksByFolderPath: async () => [],
      findLibrarySettings: async () => null,
    };
    const scanner = Object.create(ScannerService.prototype);
    scanner.scannerRepo = repository;
    scanner.scanGateway = { emitBookRestored() {} };
    scanner.bufferBooksRestoredNotification = () => {};
    scanner.logger = { log() {} };
    const candidate = {
      folderPath: newPath,
      files: [{ absolutePath: newPath, ino: 404n, sizeBytes: Number(oldStat.size), mtime: oldStat.mtime, role: "content" }],
    };
    const runScan = () =>
      scanner.tryReuseMovedBookInLibrary(
        candidate,
        2,
        new Map([[oldPath, { id: 249, status: "missing", folderPath: oldPath }]]),
        new Map([[oldPath, stored]]),
        new Map([[404n, stored]]),
        { addedCount: 0, updatedCount: 0, missingCount: 0 },
        new Set([newPath]),
      );
    const genuine = await runScan();
    assert.equal(genuine.id, 249, "A genuine rename must preserve book identity");
    const watcher = new FileEventProcessorService(repository);
    const renamedEvent = await watcher.detectMovedFile(newPath, await fs.stat(newPath, { bigint: true }), 2);
    assert.deepEqual(renamedEvent, { type: "book-moved", libraryId: 2, bookIds: [249] }, "Watcher must preserve genuine rename identity");
    writes.length = 0;
    await fs.writeFile(newPath, "another ebook");
    await fs.utimes(newPath, oldStat.atime, oldStat.mtime);
    assert.equal(await runScan(), null, "A reused inode must not assign an unrelated file to the old book");
    assert.equal(writes.length, 0, "Rejected inode candidates must not write records");
    const event = await watcher.detectMovedFile(newPath, await fs.stat(newPath, { bigint: true }), 2);
    assert.deepEqual(event, { type: "noop" }, "Watcher must reject unrelated content");
    assert.equal(writes.length, 0);
    console.log(
      JSON.stringify({
        genuineRenamePreserved: true,
        reusedInodeRejected: true,
        watcherRejected: true,
        watcherRenamePreserved: true,
        productionWrites: 0,
      }),
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
