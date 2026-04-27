#!/usr/bin/env node

/**
 * Changelog Generator for MixMatch Monorepo
 * 
 * Generates changelogs from git commits using conventional commit format.
 * Supports workspace-scoped changelog grouping.
 * 
 * Usage:
 *   node scripts/generate-changelog.js              # Generate full changelog
 *   node scripts/generate-changelog.js --since v1.0.0  # Since specific tag
 *   node scripts/generate-changelog.js --workspace api # Workspace-specific
 *   node scripts/generate-changelog.js --output CHANGELOG.md # Custom output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = require('../.changelog-config.json');

// Parse command line arguments
const args = process.argv.slice(2);
const sinceTag = args.find(arg => arg.startsWith('--since'))?.split('=')[1];
const workspace = args.find(arg => arg.startsWith('--workspace'))?.split('=')[1];
const outputFile = args.find(arg => arg.startsWith('--output'))?.split('=')[1] || 'CHANGELOG.md';

// Conventional commit types
const TYPE_MAP = {
  feat: { section: '🚀 Features', semver: 'minor' },
  fix: { section: '🐛 Bug Fixes', semver: 'patch' },
  docs: { section: '📝 Documentation' },
  style: { section: '🎨 Styles' },
  refactor: { section: '♻️ Code Refactoring' },
  perf: { section: '⚡ Performance Improvements' },
  test: { section: '🧪 Tests' },
  build: { section: '🛠️ Build System' },
  ci: { section: '🚀 CI/CD' },
  chore: { section: '🔧 Chores' },
};

/**
 * Get commits from git
 */
function getCommits(since, scope) {
  const format = '%H|%s|%an|%ae|%ad';
  const sinceArg = since ? `${since}..HEAD` : 'HEAD';
  
  let command = `git log ${sinceArg} --format="${format}" --date=short`;
  
  if (scope) {
    command += ` -- ${scope}`;
  }
  
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    return output.split('\n').filter(line => line.trim()).map(line => {
      const [hash, subject, authorName, authorEmail, date] = line.split('|');
      return { hash, subject, authorName, authorEmail, date };
    });
  } catch (error) {
    console.error('Error fetching commits:', error.message);
    return [];
  }
}

/**
 * Parse conventional commit message
 */
function parseCommit(subject) {
  const match = subject.match(/^(\w+)(\(([^)]+)\))?(!)?:\s+(.+)$/);
  
  if (!match) {
    return {
      type: 'chore',
      scope: null,
      breaking: false,
      description: subject,
    };
  }
  
  const [, type, , scope, breaking, description] = match;
  
  return {
    type: TYPE_MAP[type.toLowerCase()] ? type.toLowerCase() : 'chore',
    scope: scope || null,
    breaking: breaking === '!',
    description,
  };
}

/**
 * Group commits by workspace
 */
function groupByWorkspace(commits) {
  const groups = {
    api: [],
    web: [],
    mobile: [],
    'stellar-service': [],
    packages: [],
    docs: [],
    other: [],
  };
  
  commits.forEach(commit => {
    const parsed = parseCommit(commit.subject);
    
    if (parsed.scope) {
      if (parsed.scope.startsWith('apps/')) {
        const app = parsed.scope.replace('apps/', '');
        if (groups[app]) {
          groups[app].push({ ...commit, parsed });
        }
      } else if (parsed.scope.startsWith('packages/')) {
        groups.packages.push({ ...commit, parsed });
      } else if (parsed.scope === 'docs') {
        groups.docs.push({ ...commit, parsed });
      } else {
        groups.other.push({ ...commit, parsed });
      }
    } else {
      groups.other.push({ ...commit, parsed });
    }
  });
  
  return groups;
}

/**
 * Group commits by type within workspace
 */
function groupByType(commits) {
  const groups = {};
  
  commits.forEach(commit => {
    const { type } = commit.parsed;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(commit);
  });
  
  return groups;
}

/**
 * Format commit as markdown list item
 */
function formatCommit(commit) {
  const { scope, breaking, description } = commit.parsed;
  const shortHash = commit.hash.substring(0, 7);
  const scopeText = scope ? `**${scope}:** ` : '';
  const breakingText = breaking ? '⚠️ **BREAKING CHANGE:** ' : '';
  
  return `- ${breakingText}${scopeText}${description} ([${shortHash}](${CONFIG.changelog.commitUrlFormat.replace('{{hash}}', commit.hash)}))`;
}

/**
 * Generate changelog markdown
 */
function generateChangelog(commits, targetWorkspace) {
  let markdown = CONFIG.changelog.header;
  
  const groupedByWorkspace = groupByWorkspace(commits);
  
  // If workspace specified, only show that workspace
  const workspacesToShow = targetWorkspace
    ? { [targetWorkspace]: groupedByWorkspace[targetWorkspace] || [] }
    : groupedByWorkspace;
  
  Object.entries(workspacesToShow).forEach(([workspaceName, workspaceCommits]) => {
    if (workspaceCommits.length === 0) return;
    
    if (!targetWorkspace) {
      markdown += `\n## 📦 ${workspaceName}\n\n`;
    }
    
    const groupedByType = groupByType(workspaceCommits);
    
    Object.entries(groupedByType).forEach(([type, typeCommits]) => {
      const typeInfo = TYPE_MAP[type];
      if (!typeInfo) return;
      
      markdown += `\n### ${typeInfo.section}\n\n`;
      
      typeCommits.forEach(commit => {
        markdown += formatCommit(commit) + '\n';
      });
    });
  });
  
  // Add contributors section
  const contributors = [...new Set(commits.map(c => c.authorName))];
  if (contributors.length > 0) {
    markdown += `\n## 👥 Contributors\n\n`;
    markdown += contributors.map(name => `- ${name}`).join('\n') + '\n';
  }
  
  return markdown;
}

/**
 * Main function
 */
function main() {
  console.log('📝 Generating changelog...');
  
  const commits = getCommits(sinceTag, workspace);
  
  if (commits.length === 0) {
    console.log('No commits found.');
    return;
  }
  
  console.log(`Found ${commits.length} commits`);
  
  const changelog = generateChangelog(commits, workspace);
  
  const outputPath = path.resolve(outputFile);
  fs.writeFileSync(outputPath, changelog, 'utf-8');
  
  console.log(`✅ Changelog written to ${outputPath}`);
  console.log(`📊 Total commits: ${commits.length}`);
  
  // Print summary by type
  const typeCounts = {};
  commits.forEach(commit => {
    const { type } = parseCommit(commit.subject);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  console.log('\n📈 Summary by type:');
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

main();
