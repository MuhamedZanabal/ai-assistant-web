#!/bin/bash

# AI Assistant Web - GitHub Deployment Script
# This script creates a GitHub repository and pushes the project for automatic deployment

set -e

REPO_NAME="ai-assistant-web"
REPO_DESCRIPTION="AI Assistant Web - Next.js 14 SSR Application with OpenAI Integration"
PRIVATE_REPO=false  # Set to true for private repository

echo "🚀 AI Assistant Web - GitHub Deployment"
echo "======================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git repository not initialized. Please run this script from the project root."
    exit 1
fi

# Get GitHub username
echo "Please enter your GitHub username (or press Enter to skip repository creation):"
read -r GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "Skipping repository creation. You can create it manually at https://github.com/new"
else
    # Check for GitHub CLI or use API
    if command -v gh &> /dev/null; then
        echo "📦 Creating repository using GitHub CLI..."
        if [ "$PRIVATE_REPO" = true ]; then
            gh repo create "$REPO_NAME" --private --description "$REPO_DESCRIPTION" --source=. --remote=origin
        else
            gh repo create "$REPO_NAME" --public --description "$REPO_DESCRIPTION" --source=. --remote=origin
        fi
    else
        echo "📦 Creating repository using GitHub API..."
        echo "Note: You may be prompted for a personal access token"

        # Create repository using GitHub API
        RESPONSE=$(curl -s -X POST \
            -H "Authorization: token ${GITHUB_TOKEN:-}" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/user/repos \
            -d "{
                \"name\": \"$REPO_NAME\",
                \"description\": \"$REPO_DESCRIPTION\",
                \"private\": $PRIVATE_REPO,
                \"auto_init\": false
            }" 2>&1)

        if echo "$RESPONSE" | grep -q "id"; then
            echo "✅ Repository created successfully"
        else
            echo "⚠️  Repository creation response:"
            echo "$RESPONSE"
            echo ""
            echo "If repository already exists, you can skip this step."
        fi

        # Add remote origin
        echo "Adding remote origin..."
        git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git" 2>/dev/null || \
            git remote set-url origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
    fi
fi

# Rename branch to main
echo "Ensancing branch is named 'main'..."
git branch -M main

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
echo "======================================="
git push -u origin main

echo ""
echo "✅ Deployment Complete!"
echo "======================================="
echo ""
echo "Next steps:"
echo "1. 🌐 Connect to Netlify or Vercel:"
echo "   - Netlify: https://app.netlify.com/start"
echo "   - Vercel: https://vercel.com/new"
echo ""
echo "2. 📋 Configure environment variables in your deployment platform:"
echo "   - OPENAI_API_KEY"
echo "   - DATABASE_URL"
echo "   - JWT_SECRET (optional, for authentication)"
echo ""
echo "3. 🔗 The deployment platform will automatically detect Next.js"
echo "   and trigger a deployment when you push changes."
echo ""
echo "Repository URL: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
