import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";

const [outputDirectory] = process.argv.slice(2);
const ENGINE_FILE = "libquery_engine-rhel-openssl-3.0.x.so.node";
const SCHEMA_FILE = "schema.prisma0";

if (!outputDirectory) {
  throw new Error("Usage: node scripts/verify-prisma-engine.mjs <output-directory>");
}

function findFiles(directory, predicate, matches = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      findFiles(entryPath, predicate, matches);
    } else if (predicate(entry, entryPath)) {
      matches.push(entryPath);
    }
  }

  return matches;
}

function isWithinProject(projectDirectory, filePath) {
  const projectRelativePath = relative(projectDirectory, filePath);

  return (
    projectRelativePath === "" ||
    (projectRelativePath !== ".." && !projectRelativePath.startsWith(`..${sep}`) && !isAbsolute(projectRelativePath))
  );
}

function getMappedFilePath(projectDirectory, mappedPath) {
  if (typeof mappedPath !== "string" || isAbsolute(mappedPath)) {
    return undefined;
  }

  const filePath = resolve(projectDirectory, mappedPath);

  return isWithinProject(projectDirectory, filePath) ? filePath : undefined;
}

function isPrismaBundle(filePath) {
  return filePath.endsWith(".js") && readFileSync(filePath, "utf8").includes(ENGINE_FILE);
}

function verifyPhysicalRuntime(outputDirectory) {
  const prismaBundles = findFiles(
    outputDirectory,
    (entry, entryPath) => entry.isFile() && isPrismaBundle(entryPath)
  );

  if (prismaBundles.length === 0) {
    return false;
  }

  const missingRuntimeFiles = prismaBundles.flatMap((bundlePath) => {
    const bundleDirectory = dirname(bundlePath);

    return [ENGINE_FILE, SCHEMA_FILE]
      .filter((runtimeFile) => !existsSync(join(bundleDirectory, runtimeFile)))
      .map((runtimeFile) => join(bundleDirectory, runtimeFile));
  });

  if (missingRuntimeFiles.length > 0) {
    throw new Error(
      `Prisma runtime files are missing beside their bundle(s): ${missingRuntimeFiles.join(", ")}`
    );
  }

  console.log(
    `Found Prisma runtime beside ${prismaBundles.length} bundled file(s): ${prismaBundles
      .map((bundlePath) => relative(process.cwd(), bundlePath))
      .join(", ")}`
  );

  return true;
}

function verifyVirtualRuntime(outputDirectory) {
  const configPaths = findFiles(
    outputDirectory,
    (entry) => entry.isFile() && entry.name === ".vc-config.json"
  );
  const projectDirectory = process.cwd();
  const verifiedBundles = [];
  const missingRuntimeFiles = [];

  for (const configPath of configPaths) {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const filePathMap = config.filePathMap;

    if (!filePathMap || typeof filePathMap !== "object" || Array.isArray(filePathMap)) {
      continue;
    }

    for (const [bundlePath, mappedPath] of Object.entries(filePathMap)) {
      const sourceBundlePath = getMappedFilePath(projectDirectory, mappedPath);

      if (!sourceBundlePath || !existsSync(sourceBundlePath) || !isPrismaBundle(sourceBundlePath)) {
        continue;
      }

      const runtimeDirectory = posix.dirname(bundlePath);

      for (const runtimeFile of [ENGINE_FILE, SCHEMA_FILE]) {
        const runtimeBundlePath = posix.join(runtimeDirectory, runtimeFile);
        const sourceRuntimePath = getMappedFilePath(
          projectDirectory,
          filePathMap[runtimeBundlePath]
        );

        if (!sourceRuntimePath || !existsSync(sourceRuntimePath) || !statSync(sourceRuntimePath).isFile()) {
          missingRuntimeFiles.push(`${relative(process.cwd(), configPath)} -> ${runtimeBundlePath}`);
        }
      }

      verifiedBundles.push(`${relative(process.cwd(), configPath)} -> ${bundlePath}`);
    }
  }

  if (verifiedBundles.length === 0) {
    return false;
  }

  if (missingRuntimeFiles.length > 0) {
    throw new Error(
      `Prisma runtime mappings are missing or unreadable: ${missingRuntimeFiles.join(", ")}`
    );
  }

  console.log(
    `Found Prisma runtime mappings for ${verifiedBundles.length} bundled file(s): ${verifiedBundles.join(", ")}`
  );

  return true;
}

const resolvedOutputDirectory = resolve(outputDirectory);

if (!existsSync(resolvedOutputDirectory)) {
  throw new Error(`Output directory does not exist: ${resolvedOutputDirectory}`);
}

if (!verifyPhysicalRuntime(resolvedOutputDirectory) && !verifyVirtualRuntime(resolvedOutputDirectory)) {
  throw new Error(
    `No Prisma bundle or Vercel function mapping was found below ${resolvedOutputDirectory}.`
  );
}
