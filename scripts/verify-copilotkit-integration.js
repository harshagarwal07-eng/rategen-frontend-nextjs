#!/usr/bin/env node

/**
 * CopilotKit v1.50 Integration Verification Script
 *
 * Checks if all required files and configurations are in place.
 * Run: node scripts/verify-copilotkit-integration.js
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  // API Routes
  { path: 'src/app/api/copilotkit/route.ts', desc: 'CopilotRuntime endpoint' },
  { path: 'src/app/api/travel-agent-ag-ui/route.ts', desc: 'AG-UI proxy' },

  // AG-UI Implementation
  { path: 'src/lib/utils/ag-ui-formatter.ts', desc: 'AG-UI event formatter' },
  { path: 'src/lib/utils/ag-ui-stream-adapter.ts', desc: 'AG-UI stream adapter' },

  // Hooks
  { path: 'src/lib/hooks/use-copilot-travel-agent.ts', desc: 'useAgent integration' },
  { path: 'src/lib/hooks/use-copilot-itinerary.ts', desc: 'Itinerary actions + readable' },

  // Provider
  { path: 'src/components/providers.tsx', desc: 'CopilotKit provider' },

  // Documentation
  { path: 'COPILOTKIT_V1.50_COMPLETE_GUIDE.md', desc: 'Complete guide' },
  { path: 'COPILOTKIT_TEST_CASES.md', desc: 'Test cases' },
  { path: 'COPILOTKIT_QUICK_START.md', desc: 'Quick start guide' },
];

const REQUIRED_IMPORTS = [
  {
    file: 'src/lib/hooks/use-copilot-travel-agent.ts',
    imports: ['import { useAgent } from "@copilotkit/react-core/v2"'],
    desc: 'useAgent v2 import'
  },
  {
    file: 'src/lib/hooks/use-copilot-itinerary.ts',
    imports: ['import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core"'],
    desc: 'CopilotKit core imports'
  },
  {
    file: 'src/components/providers.tsx',
    imports: ['import { CopilotKit } from "@copilotkit/react-core"'],
    desc: 'CopilotKit provider import'
  },
  {
    file: 'src/app/api/copilotkit/route.ts',
    imports: [
      'import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime"'
    ],
    desc: 'CopilotRuntime imports'
  },
];

const REQUIRED_CONFIGS = [
  {
    file: 'src/app/api/copilotkit/route.ts',
    checks: [
      { pattern: /remoteEndpoints:\s*\[/, desc: 'remoteEndpoints configured' },
      { pattern: /url:\s*["']\/api\/travel-agent-ag-ui["']/, desc: 'AG-UI proxy URL' },
      { pattern: /name:\s*["']travel-agent["']/, desc: 'Agent name' },
    ]
  },
  {
    file: 'src/lib/hooks/use-copilot-travel-agent.ts',
    checks: [
      { pattern: /useAgent\(\{/, desc: 'useAgent called' },
      { pattern: /agentId:\s*["']travel-agent["']/, desc: 'Agent ID matches' },
    ]
  },
  {
    file: 'src/components/providers.tsx',
    checks: [
      { pattern: /<CopilotKit/, desc: 'CopilotKit component used' },
      { pattern: /runtimeUrl=["']\/api\/copilotkit["']/, desc: 'Runtime URL configured' },
    ]
  },
];

const PACKAGE_DEPENDENCIES = [
  '@copilotkit/react-core',
  '@copilotkit/runtime',
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${message}`, 'bold');
  log('='.repeat(message.length), 'bold');
}

// Check if file exists
function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`${description}: ${filePath}`);
    return true;
  } else {
    logError(`${description}: ${filePath} (NOT FOUND)`);
    return false;
  }
}

// Check if file contains specific imports
function checkImports(filePath, imports, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    logError(`Cannot check imports in ${filePath} (file not found)`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  let allFound = true;

  imports.forEach(importStatement => {
    if (content.includes(importStatement)) {
      logSuccess(`${description}: Found in ${filePath}`);
    } else {
      logError(`${description}: Missing in ${filePath}`);
      logInfo(`  Expected: ${importStatement}`);
      allFound = false;
    }
  });

  return allFound;
}

// Check configuration patterns
function checkConfigs(filePath, checks) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    logError(`Cannot check config in ${filePath} (file not found)`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  let allFound = true;

  checks.forEach(({ pattern, desc }) => {
    if (pattern.test(content)) {
      logSuccess(`${desc}: Found in ${filePath}`);
    } else {
      logError(`${desc}: Missing in ${filePath}`);
      allFound = false;
    }
  });

  return allFound;
}

// Check package.json dependencies
function checkDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  let allFound = true;

  PACKAGE_DEPENDENCIES.forEach(dep => {
    if (allDeps[dep]) {
      logSuccess(`${dep}: ${allDeps[dep]}`);
    } else {
      logError(`${dep}: NOT INSTALLED`);
      logInfo(`  Run: pnpm add ${dep}`);
      allFound = false;
    }
  });

  return allFound;
}

// Main verification
async function verify() {
  log('\n🔍 CopilotKit v1.50 Integration Verification\n', 'bold');

  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Check required files
  logHeader('1. Required Files');
  REQUIRED_FILES.forEach(({ path, desc }) => {
    totalChecks++;
    if (checkFileExists(path, desc)) passedChecks++;
  });

  // 2. Check imports
  logHeader('2. Required Imports');
  REQUIRED_IMPORTS.forEach(({ file, imports, desc }) => {
    totalChecks++;
    if (checkImports(file, imports, desc)) passedChecks++;
  });

  // 3. Check configurations
  logHeader('3. Configuration Checks');
  REQUIRED_CONFIGS.forEach(({ file, checks }) => {
    checks.forEach(() => totalChecks++);
    if (checkConfigs(file, checks)) passedChecks += checks.length;
  });

  // 4. Check package dependencies
  logHeader('4. Package Dependencies');
  PACKAGE_DEPENDENCIES.forEach(() => totalChecks++);
  if (checkDependencies()) passedChecks += PACKAGE_DEPENDENCIES.length;

  // Summary
  logHeader('Summary');
  log(`Total Checks: ${totalChecks}`, 'blue');
  log(`Passed: ${passedChecks}`, 'green');
  log(`Failed: ${totalChecks - passedChecks}`, 'red');

  const percentage = Math.round((passedChecks / totalChecks) * 100);
  log(`Success Rate: ${percentage}%\n`, percentage === 100 ? 'green' : 'yellow');

  if (percentage === 100) {
    logSuccess('🎉 All checks passed! CopilotKit integration is complete.');
    logInfo('\nNext Steps:');
    logInfo('1. Start backend: cd backend && pnpm dev');
    logInfo('2. Start frontend: pnpm dev');
    logInfo('3. Open: http://localhost:3000/playground/new');
    logInfo('4. Follow: COPILOTKIT_QUICK_START.md');
  } else {
    logWarning('⚠️  Some checks failed. Please fix the issues above.');
    logInfo('\nFor help:');
    logInfo('- See COPILOTKIT_V1.50_COMPLETE_GUIDE.md');
    logInfo('- Check console errors in browser DevTools');
  }

  process.exit(percentage === 100 ? 0 : 1);
}

// Run verification
verify().catch(err => {
  logError(`Verification failed: ${err.message}`);
  process.exit(1);
});
