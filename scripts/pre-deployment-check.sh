#!/bin/bash
# Pre-Deployment Verification Script
# Run this before any production deployment

set -e

echo "🚀 Starting Pre-Deployment Checks..."
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print status
print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check if required environment variables exist
echo ""
echo "📋 Checking Environment Variables..."
node scripts/verify-env.js
print_check $? "Environment variables verified"

# 2. Check Node version
echo ""
echo "🔧 Checking Node.js version..."
REQUIRED_NODE_VERSION=18
CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$CURRENT_NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]; then
    print_check 0 "Node.js version ($CURRENT_NODE_VERSION) is compatible"
else
    print_check 1 "Node.js version ($CURRENT_NODE_VERSION) is below required ($REQUIRED_NODE_VERSION)"
fi

# 3. Check dependencies
echo ""
echo "📦 Checking Dependencies..."
if [ -f "package.json" ]; then
    npm audit --audit-level=high > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_check 0 "No high-severity vulnerabilities found"
    else
        print_warning "High-severity vulnerabilities detected - review npm audit"
    fi
else
    print_check 1 "package.json not found"
fi

# 4. Run TypeScript type check
echo ""
echo "🔍 Running TypeScript Type Check..."
npm run type-check > /dev/null 2>&1
print_check $? "TypeScript compilation successful"

# 5. Run linting
echo ""
echo "✨ Running ESLint..."
npm run lint > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_check 0 "No linting errors found"
else
    print_warning "Linting warnings/errors found - review output"
fi

# 6. Check for critical files
echo ""
echo "📄 Checking Critical Files..."
CRITICAL_FILES=(
    "src/main.tsx"
    "src/App.tsx"
    "src/integrations/supabase/client.ts"
    "index.html"
    "vite.config.ts"
    "tailwind.config.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_check 0 "$file exists"
    else
        print_check 1 "$file is missing"
    fi
done

# 7. Build test
echo ""
echo "🏗️  Running Production Build Test..."
npm run build > /dev/null 2>&1
print_check $? "Production build successful"

# 8. Check Supabase functions
echo ""
echo "⚡ Checking Supabase Functions..."
FUNCTION_COUNT=$(find supabase/functions -type d -mindepth 1 -maxdepth 1 | wc -l)
echo "   Found $FUNCTION_COUNT edge functions"

# Check each function has an index.ts
for func_dir in supabase/functions/*/; do
    if [ -f "${func_dir}index.ts" ]; then
        print_check 0 "$(basename $func_dir) has index.ts"
    else
        print_check 1 "$(basename $func_dir) missing index.ts"
    fi
done

# 9. Database migration check
echo ""
echo "🗄️  Checking Database Migrations..."
if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    echo "   Found $MIGRATION_COUNT migration files"
    print_check 0 "Migration directory exists"
else
    print_warning "No migration directory found"
fi

# 10. Check for console.log statements (warning only)
echo ""
echo "🔍 Checking for Debug Statements..."
CONSOLE_LOGS=$(grep -r "console.log" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    print_warning "Found $CONSOLE_LOGS console.log statements - consider removing for production"
else
    print_check 0 "No console.log statements found"
fi

# Summary
echo ""
echo "=================================="
echo "📊 Pre-Deployment Check Summary"
echo "=================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Ready for deployment 🚀"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "Review warnings before deploying"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo "Fix errors before deploying"
    exit 1
fi
