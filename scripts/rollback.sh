#!/bin/bash
# Emergency Rollback Script
# Use this to quickly revert to a previous stable version

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  EMERGENCY ROLLBACK PROCEDURE${NC}"
echo "=================================="
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository. Cannot perform rollback.${NC}"
    exit 1
fi

# Show current branch and commit
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo -e "Current Branch: ${BLUE}$CURRENT_BRANCH${NC}"
echo -e "Current Commit: ${BLUE}$CURRENT_COMMIT${NC}"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes!${NC}"
    echo ""
    git status --short
    echo ""
    read -p "Do you want to stash these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash push -m "Rollback stash $(date +%Y-%m-%d_%H-%M-%S)"
        echo -e "${GREEN}✓ Changes stashed${NC}"
    else
        echo -e "${RED}❌ Rollback cancelled. Commit or stash changes first.${NC}"
        exit 1
    fi
fi

# Show recent commits
echo ""
echo "Recent Commits:"
echo "==============="
git log --oneline --decorate --graph -10
echo ""

# Prompt for rollback target
echo -e "${YELLOW}Rollback Options:${NC}"
echo "1. Rollback to previous commit (HEAD~1)"
echo "2. Rollback to specific commit"
echo "3. Rollback to specific tag"
echo "4. Cancel"
echo ""
read -p "Select option (1-4): " -n 1 -r
echo

case $REPLY in
    1)
        TARGET="HEAD~1"
        ;;
    2)
        read -p "Enter commit hash: " TARGET
        ;;
    3)
        echo "Available tags:"
        git tag -l | tail -10
        read -p "Enter tag name: " TARGET
        ;;
    4)
        echo "Rollback cancelled"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Verify target exists
if ! git rev-parse --verify "$TARGET" > /dev/null 2>&1; then
    echo -e "${RED}❌ Invalid target: $TARGET${NC}"
    exit 1
fi

TARGET_COMMIT=$(git rev-parse --short "$TARGET")
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will revert your code to commit ${TARGET_COMMIT}${NC}"
echo ""

# Show what will change
echo "Changes that will be reverted:"
git log --oneline "$TARGET_COMMIT"..HEAD
echo ""

# Final confirmation
read -p "Are you ABSOLUTELY SURE you want to rollback? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Create backup branch
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
echo ""
echo -e "${BLUE}Creating backup branch: $BACKUP_BRANCH${NC}"
git branch "$BACKUP_BRANCH"
echo -e "${GREEN}✓ Backup created${NC}"

# Perform rollback
echo ""
echo -e "${BLUE}Performing rollback...${NC}"
git reset --hard "$TARGET"
echo -e "${GREEN}✓ Rollback complete${NC}"

# Show new state
echo ""
echo "New State:"
echo "=========="
echo -e "Current Commit: ${BLUE}$(git rev-parse --short HEAD)${NC}"
echo -e "Backup Branch: ${BLUE}$BACKUP_BRANCH${NC}"
echo ""

# Reinstall dependencies
echo -e "${BLUE}Reinstalling dependencies...${NC}"
npm install > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Run post-rollback checks
echo ""
echo -e "${BLUE}Running post-rollback verification...${NC}"
npm run type-check > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Type check passed${NC}"
else
    echo -e "${RED}⚠️  Type check failed - manual intervention may be needed${NC}"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}✓ Rollback Complete${NC}"
echo "=================================="
echo ""
echo "Next Steps:"
echo "1. Test the application thoroughly"
echo "2. If issues persist, check $BACKUP_BRANCH for recent changes"
echo "3. To restore the backup: git reset --hard $BACKUP_BRANCH"
echo ""
echo -e "${YELLOW}Note: This rollback is local only. Push changes carefully!${NC}"
