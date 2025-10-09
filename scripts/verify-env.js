#!/usr/bin/env node
/**
 * Environment Variable Verification Script
 * Ensures all required environment variables are set before deployment
 */

const fs = require('fs');
const path = require('path');

// Required environment variables for production
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID'
];

// Optional but recommended environment variables
const RECOMMENDED_ENV_VARS = [
  'VITE_SITE_URL'
];

// Sensitive variables that should never be committed
const SENSITIVE_PATTERNS = [
  /service_role/i,
  /_key$/i,
  /secret/i,
  /password/i,
  /token/i
];

let errors = 0;
let warnings = 0;

console.log('🔐 Environment Variable Verification\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found');
  errors++;
} else {
  console.log('✅ .env file exists');
}

// Load environment variables from .env file
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  // Check required variables
  console.log('\n📋 Required Variables:');
  REQUIRED_ENV_VARS.forEach(varName => {
    if (envVars[varName] && envVars[varName].length > 0) {
      console.log(`  ✅ ${varName} is set`);
    } else {
      console.error(`  ❌ ${varName} is missing or empty`);
      errors++;
    }
  });

  // Check recommended variables
  console.log('\n💡 Recommended Variables:');
  RECOMMENDED_ENV_VARS.forEach(varName => {
    if (envVars[varName] && envVars[varName].length > 0) {
      console.log(`  ✅ ${varName} is set`);
    } else {
      console.warn(`  ⚠️  ${varName} is not set (recommended but optional)`);
      warnings++;
    }
  });

  // Check for sensitive data exposure
  console.log('\n🔒 Security Check:');
  let sensitiveFound = false;
  Object.keys(envVars).forEach(key => {
    SENSITIVE_PATTERNS.forEach(pattern => {
      if (pattern.test(key)) {
        console.warn(`  ⚠️  Sensitive variable detected: ${key}`);
        console.warn(`     Ensure this is NOT committed to version control`);
        sensitiveFound = true;
        warnings++;
      }
    });
  });
  if (!sensitiveFound) {
    console.log('  ✅ No obvious sensitive variables in .env');
  }

  // Validate Supabase URL format
  if (envVars.VITE_SUPABASE_URL) {
    const url = envVars.VITE_SUPABASE_URL;
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      console.error('  ❌ VITE_SUPABASE_URL format appears invalid');
      errors++;
    } else {
      console.log('  ✅ Supabase URL format is valid');
    }
  }

  // Validate project ID matches URL
  if (envVars.VITE_SUPABASE_URL && envVars.VITE_SUPABASE_PROJECT_ID) {
    const urlProjectId = envVars.VITE_SUPABASE_URL.split('//')[1]?.split('.')[0];
    if (urlProjectId !== envVars.VITE_SUPABASE_PROJECT_ID) {
      console.warn('  ⚠️  Project ID does not match URL');
      warnings++;
    } else {
      console.log('  ✅ Project ID matches URL');
    }
  }
}

// Check .env.example exists
const envExamplePath = path.join(process.cwd(), '.env.example');
if (!fs.existsSync(envExamplePath)) {
  console.warn('\n⚠️  .env.example file not found (recommended for documentation)');
  warnings++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Verification Summary');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
  console.log('✅ All environment variables are properly configured!');
  process.exit(0);
} else if (errors === 0) {
  console.log(`⚠️  ${warnings} warning(s) found`);
  console.log('Environment is acceptable but could be improved');
  process.exit(0);
} else {
  console.error(`❌ ${errors} error(s) and ${warnings} warning(s) found`);
  console.error('Fix errors before proceeding');
  process.exit(1);
}
