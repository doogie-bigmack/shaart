# Shaart Scan - Restart Instructions

## Quick Start

Run this command in a new terminal:

```bash
cd /Users/damon.mcdougald/development/shaart && \
export CLAUDE_CODE_OAUTH_TOKEN="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" && \
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 && \
npx zx ./shaart.mjs "https://staging.bigmac-attack.com/" "/Users/damon.mcdougald/development/powder_finder" --config configs/powder-finder-staging.yaml
```

## Previous Run Summary (Dec 16, 2025)

### Vulnerabilities Identified
- **1 Critical XSS vulnerability**
- **1 Low-severity SSRF vulnerability**
- **Critical secret exposure** (hardcoded credentials/keys)
- **54 network-accessible endpoints** mapped

### Previous Attempts
- Attempt 1: 278 turns, 28m 54s, $5.92 - Failed (32K token limit)
- Attempt 2: 270 turns, 24m 20s, $5.97 - Failed (32K token limit)

### Key Change
`CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000` (max setting) to allow comprehensive report generation.

## Config File
`configs/powder-finder-staging.yaml`
