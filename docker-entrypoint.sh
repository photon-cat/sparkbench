#!/bin/sh
# Set up Claude Code credentials for the agent SDK
mkdir -p /home/nextjs/.claude
cat > /home/nextjs/.claude/.credentials.json <<EOF
{"primaryApiKey":"${ANTHROPIC_API_KEY}"}
EOF

exec node server.js
