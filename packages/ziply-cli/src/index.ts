#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { augmentZipWithFile, createZip, listEntries } from "ziply";

async function main(argv: string[]): Promise<void> {
  const [command, ...args] = argv;

  if (command === "add") {
    await addCommand(args);
    return;
  }

  if (command === "create") {
    await createCommand(args);
    return;
  }

  if (command === "list") {
    await listCommand(args);
    return;
  }

  usage();
  process.exitCode = command ? 1 : 0;
}

async function addCommand(args: string[]): Promise<void> {
  const outputIndex = args.indexOf("-o");
  const onDuplicate = args.includes("--replace") ? "replace" : "append";
  const positional = outputIndex === -1 ? args : [...args.slice(0, outputIndex), ...args.slice(outputIndex + 2)];
  const [zipPath, entryName, contentPath] = positional;
  const outputPath = outputIndex === -1 ? zipPath : args[outputIndex + 1];

  if (!zipPath || !entryName || !contentPath || !outputPath) {
    usage();
    process.exitCode = 1;
    return;
  }

  const zip = await readFile(zipPath);
  const content = await readFile(contentPath);
  const updated = await augmentZipWithFile(new Uint8Array(zip), entryName, new Uint8Array(content), {
    onDuplicate
  });

  await writeFile(outputPath, updated as Uint8Array);
}

async function createCommand(args: string[]): Promise<void> {
  const outputIndex = args.indexOf("-o");
  const outputPath = outputIndex === -1 ? "archive.zip" : args[outputIndex + 1];
  const filePaths = outputIndex === -1 ? args : [...args.slice(0, outputIndex), ...args.slice(outputIndex + 2)];

  if (!outputPath || filePaths.length === 0) {
    usage();
    process.exitCode = 1;
    return;
  }

  const entries = await Promise.all(
    filePaths.map(async (path) => ({
      name: basename(path),
      data: new Uint8Array(await readFile(path))
    }))
  );

  await writeFile(outputPath, createZip(entries));
}

async function listCommand(args: string[]): Promise<void> {
  const [zipPath] = args;

  if (!zipPath) {
    usage();
    process.exitCode = 1;
    return;
  }

  const zip = new Uint8Array(await readFile(zipPath));
  const entries = await listEntries(zip);

  for (const entry of entries) {
    console.log(`${entry.uncompressedSize}\t${entry.name}`);
  }
}

function usage(): void {
  console.log(`ziply

Commands:
  ziply add <archive.zip> <entry-name> <content-file> [-o output.zip] [--replace]
  ziply create <file...> -o <archive.zip>
  ziply list <archive.zip>`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
