const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔥 REMOVING ALL SUPABASE DEPENDENCIES FROM APPLICATION\n');

// Step 1: Find all files importing supabase
console.log('Step 1: Finding all files importing Supabase...');
const filesWithSupabase = execSync(
  `grep -r "from '@/integrations/supabase/client'" src/ --include="*.tsx" --include="*.ts" -l`,
  { encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

console.log(`Found ${filesWithSupabase.length} files importing Supabase\n`);

// Step 2: Comment out Supabase imports and replace with placeholder
console.log('Step 2: Commenting out all Supabase usage...\n');

let filesModified = 0;

filesWithSupabase.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    // Replace import statement
    if (content.includes("from '@/integrations/supabase/client'")) {
      content = content.replace(
        /import\s+{\s*supabase\s*}\s+from\s+'@\/integrations\/supabase\/client';?/g,
        '// SUPABASE REMOVED - Using AWS API Gateway + Lambda + Aurora\n// import { supabase } from \'@/integrations/supabase/client\';'
      );
      modified = true;
    }

    // Comment out supabase.from() calls - replace with empty array returns
    if (content.match(/supabase\.from\(/)) {
      // This is complex - we'll need to handle each case
      // For now, just add a TODO comment at the top
      if (!content.includes('// TODO: Replace Supabase queries with AWS API')) {
        content = `// TODO: Replace Supabase queries with AWS API calls (apiClient from @/lib/aws-api-client)\n${content}`;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
      filesModified++;
      console.log(`✅ Modified: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err.message);
  }
});

console.log(`\n✅ Modified ${filesModified} files`);
console.log('\n⚠️  NEXT STEPS:');
console.log('1. All Supabase imports have been commented out');
console.log('2. Files with supabase.from() calls have TODO comments');
console.log('3. You need to manually replace data queries with AWS API calls');
console.log('4. Run: npm run type-check to see TypeScript errors');
console.log('5. Fix errors one by one by using apiClient from @/lib/aws-api-client');
