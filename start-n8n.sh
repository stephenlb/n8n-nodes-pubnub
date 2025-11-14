#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       Starting n8n with PubNub Custom Nodes               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if n8n is installed globally
if ! command -v n8n &> /dev/null; then
    echo -e "${YELLOW}n8n not found globally. Installing...${NC}"
    npm install -g n8n
    echo -e "${GREEN}✓ n8n installed${NC}"
else
    echo -e "${GREEN}✓ n8n is already installed${NC}"
fi

echo ""
echo -e "${BLUE}Step 1: Linking PubNub nodes...${NC}"

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Link the package if not already linked
if [ ! -d ~/.n8n/custom/node_modules/n8n-nodes-pubnub ]; then
    echo "Creating custom nodes directory..."
    mkdir -p ~/.n8n/custom
    cd ~/.n8n/custom
    npm link n8n-nodes-pubnub
    cd "$(dirname "$0")"
    echo -e "${GREEN}✓ PubNub nodes linked${NC}"
else
    echo -e "${GREEN}✓ PubNub nodes already linked${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Starting n8n...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}n8n will be available at: http://localhost:5678${NC}"
echo ""
echo "To configure PubNub credentials:"
echo "  1. Go to Credentials → Add Credential"
echo "  2. Search for 'PubNub API'"
echo "  3. Enter your keys (or use demo/demo for testing)"
echo ""
echo "To use the nodes:"
echo "  - Add 'PubNub' node for operations"
echo "  - Add 'PubNub Trigger' node for real-time subscriptions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop n8n${NC}"
echo ""

# Start n8n
n8n start
