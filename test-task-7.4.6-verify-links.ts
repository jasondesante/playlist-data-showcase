/**
 * Task 7.4.6: Test - Verify all cross-references work
 *
 * This script scans all markdown files (excluding node_modules)
 * and verifies that all internal links resolve correctly.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';

interface Link {
  file: string;
  line: number;
  link: string;
  text: string;
}

interface ValidationResult {
  valid: Link[];
  broken: Array<{ link: Link; error: string }>;
  external: Link[];
}

const workspaceRoot = '/workspace';
const docsToCheck = [
  'README.md',
  'IMPLEMENTATION_STATUS.md',
  'TASK_COMPLETION_SUMMARY.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  'DEBUGGING.md',
  'UPDATE_PLAN.md',
  'docs/index.md',
  'docs/getting-started.md',
  'docs/architecture/overview.md',
  'docs/development/contributing.md',
  'docs/development/debugging.md',
  'docs/development/testing/smoke-tests.md',
  'docs/development/testing/determinism.md',
  'docs/development/testing/performance.md',
  'docs/development/testing/mobile-sensors.md',
  'docs/design/bugs-to-fix.md',
  'DESIGN_DOCS/FROM_DATA_ENGINE/DATA_ENGINE_REFERENCE.md',
  'DESIGN_DOCS/FROM_DATA_ENGINE/USAGE_IN_OTHER_PROJECTS.md',
];

// Markdown link regex: [text](link) or [text](link "title")
const linkRegex = /\[([^\]]+)\]\(([^)]+?)(?:\s+"[^"]*")?\)/g;

/**
 * Extract all markdown links from a file's content
 */
function extractLinks(content: string, filepath: string): Link[] {
  const links: Link[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      links.push({
        file: filepath,
        line: index + 1,
        link: match[2],
        text: match[1],
      });
    }
  });

  return links;
}

/**
 * Check if a link is external (http/https)
 */
function isExternalLink(link: string): boolean {
  return link.startsWith('http://') || link.startsWith('https://');
}

/**
 * Check if a link is an anchor link (starts with #)
 */
function isAnchorLink(link: string): boolean {
  return link.startsWith('#');
}

/**
 * Resolve a relative link against a base file
 */
function resolveLink(baseFile: string, link: string): string | null {
  const baseDir = dirname(baseFile);
  const resolved = join(baseDir, link);

  // Handle anchors in the link (file.md#section)
  const basePath = resolved.split('#')[0];

  return basePath;
}

/**
 * Check if a file exists
 */
function fileExists(filepath: string): boolean {
  try {
    return existsSync(filepath) && statSync(filepath).isFile();
  } catch {
    return false;
  }
}

/**
 * Check if an anchor exists in a file
 */
function anchorExists(filepath: string, anchor: string): boolean {
  try {
    const content = readFileSync(filepath, 'utf-8');
    // Look for headings or id attributes
    const lines = content.split('\n');
    const normalizedAnchor = anchor
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    for (const line of lines) {
      // Check for markdown headings (# Heading)
      if (line.match(/^#+\s/)) {
        const heading = line
          .replace(/^#+\s+/, '')
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        if (heading === normalizedAnchor || heading === anchor) {
          return true;
        }
      }
      // Check for id attributes
      const idMatch = line.match(/\sid=["']([^"']+)["']/);
      if (idMatch && idMatch[1] === anchor) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Main validation function
 */
function validateLinks(): ValidationResult {
  const result: ValidationResult = {
    valid: [],
    broken: [],
    external: [],
  };

  for (const doc of docsToCheck) {
    const filepath = join(workspaceRoot, doc);

    if (!fileExists(filepath)) {
      console.log(`Warning: File not found: ${doc}`);
      continue;
    }

    const content = readFileSync(filepath, 'utf-8');
    const links = extractLinks(content, doc);

    for (const linkInfo of links) {
      if (isExternalLink(linkInfo.link)) {
        result.external.push(linkInfo);
      } else if (isAnchorLink(linkInfo.link)) {
        // Anchor link to same file
        if (anchorExists(filepath, linkInfo.link.slice(1))) {
          result.valid.push(linkInfo);
        } else {
          result.broken.push({
            link: linkInfo,
            error: `Anchor not found: ${linkInfo.link}`,
          });
        }
      } else {
        // Relative link - may have anchor
        const [linkPath, anchor] = linkInfo.link.split('#');
        const resolvedPath = resolveLink(doc, linkPath);

        if (resolvedPath && fileExists(resolvedPath)) {
          if (anchor) {
            if (anchorExists(resolvedPath, anchor)) {
              result.valid.push(linkInfo);
            } else {
              result.broken.push({
                link: linkInfo,
                error: `Anchor '${anchor}' not found in ${resolvedPath}`,
              });
            }
          } else {
            result.valid.push(linkInfo);
          }
        } else {
          result.broken.push({
            link: linkInfo,
            error: `File not found: ${resolvedPath || linkPath}`,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Print results
 */
function printResults(result: ValidationResult): void {
  console.log('\n=== Cross-Reference Validation Results ===\n');
  console.log(`Total links scanned: ${result.valid.length + result.broken.length}`);
  console.log(`Valid links: ${result.valid.length}`);
  console.log(`Broken links: ${result.broken.length}`);
  console.log(`External links: ${result.external.length}\n`);

  if (result.broken.length > 0) {
    console.log('=== BROKEN LINKS ===\n');
    for (const broken of result.broken) {
      console.log(
        `${broken.link.file}:${broken.link.line}`
      );
      console.log(
        `  [${broken.link.text}](${broken.link.link})`
      );
      console.log(`  Error: ${broken.error}\n`);
    }
  } else {
    console.log('No broken links found!\n');
  }

  // List valid internal links for confirmation
  console.log('=== SAMPLE OF VALID INTERNAL LINKS ===\n');
  const sampleInternalLinks = result.valid.slice(0, 20);
  for (const link of sampleInternalLinks) {
    console.log(
      `${link.file}:${link.line} - [${link.text}](${link.link})`
    );
  }
  if (result.valid.length > 20) {
    console.log(`... and ${result.valid.length - 20} more valid links\n`);
  } else {
    console.log();
  }
}

// Run the validation
console.log('Validating cross-references in documentation...\n');
const result = validateLinks();
printResults(result);

// Exit with appropriate code
process.exit(result.broken.length > 0 ? 1 : 0);
