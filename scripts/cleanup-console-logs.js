#!/usr/bin/env node

/**
 * Console Log Cleanup Script
 * Identifies files with console.log statements that should use the logger utility
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const consoleRegex = /console\.(log|warn|error|info|debug)\(/g;

function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDirectory(filePath, results);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(consoleRegex);

      if (matches && matches.length > 0) {
        // Check if file already imports logger
        const hasLogger = content.includes("from '@/lib/logger'") ||
                         content.includes('from "@/lib/logger"');

        results.push({
          file: filePath.replace(srcDir, 'src'),
          count: matches.length,
          hasLogger,
          lines: getLineNumbers(content, consoleRegex)
        });
      }
    }
  });

  return results;
}

function getLineNumbers(content, regex) {
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, index) => {
    if (regex.test(line)) {
      matches.push(index + 1);
    }
  });

  return matches;
}

console.log('🔍 Scanning for console.log statements...\n');

const results = scanDirectory(srcDir);

if (results.length === 0) {
  console.log('✅ No console.log statements found! Clean codebase.\n');
  process.exit(0);
}

console.log(`⚠️  Found console statements in ${results.length} files:\n`);

// Sort by count (most violations first)
results.sort((a, b) => b.count - a.count);

// Group by priority
const withLogger = results.filter(r => r.hasLogger);
const withoutLogger = results.filter(r => !r.hasLogger);

console.log('📋 HIGH PRIORITY (No logger imported):');
console.log('─────────────────────────────────────\n');
withoutLogger.slice(0, 10).forEach(r => {
  console.log(`  ${r.file}`);
  console.log(`    ${r.count} console statement(s) at lines: ${r.lines.join(', ')}`);
  console.log('    ❌ Missing logger import\n');
});

if (withoutLogger.length > 10) {
  console.log(`  ... and ${withoutLogger.length - 10} more files\n`);
}

console.log('\n📋 MEDIUM PRIORITY (Logger available):');
console.log('─────────────────────────────────────\n');
withLogger.slice(0, 5).forEach(r => {
  console.log(`  ${r.file}`);
  console.log(`    ${r.count} console statement(s) at lines: ${r.lines.join(', ')}`);
  console.log('    ✅ Logger imported - just needs refactoring\n');
});

if (withLogger.length > 5) {
  console.log(`  ... and ${withLogger.length - 5} more files\n`);
}

console.log('\n📊 SUMMARY:');
console.log('───────────');
console.log(`Total files: ${results.length}`);
console.log(`Total console statements: ${results.reduce((sum, r) => sum + r.count, 0)}`);
console.log(`Files without logger: ${withoutLogger.length}`);
console.log(`Files with logger: ${withLogger.length}`);

console.log('\n💡 RECOMMENDATIONS:');
console.log('──────────────────');
console.log('1. Start with HIGH PRIORITY files');
console.log('2. Add: import { logger } from "@/lib/logger";');
console.log('3. Replace: console.log(...) → logger.info(...)');
console.log('4. Replace: console.error(...) → logger.error(...)');
console.log('5. Run this script again to track progress\n');

// Exit with error code if console logs found (for CI)
process.exit(results.length > 0 ? 1 : 0);
