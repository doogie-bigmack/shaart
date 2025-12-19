# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an AI-powered penetration testing agent designed for defensive security analysis. The tool automates vulnerability assessment by combining external reconnaissance tools with AI-powered code analysis to identify security weaknesses in web applications and their source code.

## Important Disclaimers

**DO NOT run Shaart on production environments.** This is an active exploitation tool that can have mutative effects including:
- Creating new users and accounts
- Modifying or deleting data
- Triggering unintended side effects from injection attacks

**Authorization Required**: You must have explicit written permission from the system owner before running Shaart. Unauthorized testing is illegal.

**Cost & Time**: A full test run typically takes 1-1.5 hours and costs approximately $50 USD using Claude Sonnet.

**Human Oversight Required**: LLMs can hallucinate findings. Always verify reported vulnerabilities before acting on them.

## Commands

### Installation & Setup
```bash
npm install
```

### Docker Deployment (Recommended)

Build the container:
```bash
docker build -t shaart:latest .
```

Run with OAuth token:
```bash
docker run --rm -it \
  --network host \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  -e CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN" \
  -e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 \
  -v "$(pwd)/repos:/app/repos" \
  -v "$(pwd)/configs:/app/configs" \
  shaart:latest \
  "https://target-app.com/" \
  "/app/repos/target-app" \
  --config /app/configs/my-config.yaml
```

Run with API key:
```bash
docker run --rm -it \
  --network host \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 \
  -v "$(pwd)/repos:/app/repos" \
  shaart:latest \
  "https://target-app.com/" "/app/repos/target-app"
```

Testing local applications (use `host.docker.internal` instead of `localhost`):
```bash
docker run --rm -it \
  --add-host=host.docker.internal:host-gateway \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  -e CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN" \
  shaart:latest \
  "http://host.docker.internal:3000" "/app/repos/my-app"
```

**Network capabilities explained:**
- `--cap-add=NET_RAW` - Required for nmap port scanning
- `--cap-add=NET_ADMIN` - Allows network administration for security tools
- `--network host` - Provides access to target network interfaces

### Running the Penetration Testing Agent
```bash
./shaart.mjs <WEB_URL> <REPO_PATH> --config <CONFIG_FILE>
```

Example:
```bash
./shaart.mjs "https://example.com" "/path/to/local/repo"
./shaart.mjs "https://juice-shop.herokuapp.com" "/home/user/juice-shop" --config juice-shop-config.yaml
```

### Alternative Execution
```bash
npm start <WEB_URL> <REPO_PATH> --config <CONFIG_FILE>
```

### Configuration Validation
```bash
# Configuration validation is built into the main script
./shaart.mjs --help  # Shows usage and validates config on execution
```

### Generate TOTP for Authentication
TOTP generation is now handled automatically via the `generate_totp` MCP tool during authentication flows.

### Development Commands
```bash
# No linting or testing commands available in this project
# Development is done by running the agent in pipeline-testing mode
./shaart.mjs <commands> --pipeline-testing
```

### Session Management Commands
```bash
# Setup session without running
./shaart.mjs --setup-only <WEB_URL> <REPO_PATH> --config <CONFIG_FILE>

# Check session status (shows progress, timing, costs)
./shaart.mjs --status

# List all available agents by phase
./shaart.mjs --list-agents

# Show help
./shaart.mjs --help
```

### Execution Commands
```bash
# Run all remaining agents to completion
./shaart.mjs --run-all [--pipeline-testing]

# Run a specific agent
./shaart.mjs --run-agent <agent-name> [--pipeline-testing]

# Run a range of agents
./shaart.mjs --run-agents <start-agent>:<end-agent> [--pipeline-testing]

# Run a specific phase
./shaart.mjs --run-phase <phase-name> [--pipeline-testing]

# Pipeline testing mode (minimal prompts for fast testing)
./shaart.mjs <command> --pipeline-testing
```

### Rollback & Recovery Commands
```bash
# Rollback to specific checkpoint
./shaart.mjs --rollback-to <agent-name>

# Rollback and re-execute specific agent
./shaart.mjs --rerun <agent-name> [--pipeline-testing]
```

### Session Cleanup Commands
```bash
# Delete all sessions (with confirmation)
./shaart.mjs --cleanup

# Delete specific session by ID
./shaart.mjs --cleanup <session-id>
```

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code OAuth authentication | Yes (or API key) |
| `ANTHROPIC_API_KEY` | Anthropic API key authentication | Alternative to OAuth |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens per request (recommend: 64000) | No |
| `PENTEST_MAX_RETRIES` | Number of AI retry attempts (default: 3) | No |
| `SHAART_DOCKER` | Set automatically in Docker container | Auto |
| `SHAART_SKIP_ANIMATION` | Skip Nostromo boot sequence animation (set to 'true' for instant startup) | No |
| `DEBUG` | Enable debug logging | No |

## Architecture & Components

### Main Entry Point
- `shaart.mjs` - Main orchestration script that coordinates the entire penetration testing workflow

### Core Modules
- `src/config-parser.js` - Handles YAML configuration parsing, validation, and distribution to agents
- `src/error-handling.js` - Comprehensive error handling with retry logic and categorized error types
- `src/tool-checker.js` - Validates availability of external security tools before execution
- `src/session-manager.js` - Manages persistent session state and agent lifecycle
- `src/checkpoint-manager.js` - Git-based checkpointing system for rollback capabilities
- Pipeline orchestration is built into the main `shaart.mjs` script
- `src/queue-validation.js` - Validates deliverables and agent prerequisites

### MCP Server (Helper Tools)
The `mcp-server/` directory provides an in-process MCP server with tools available to all agents:

- **`save_deliverable`** - Saves agent outputs (findings, queues, reports) to the target repository's `deliverables/` directory
- **`generate_totp`** - Generates time-based OTP codes for 2FA authentication during testing

The MCP server is created in `src/ai/claude-executor.js` and passed to the Claude Agent SDK. It stores the target directory globally for deliverable persistence.

### Five-Phase Testing Workflow

1. **Pre-Reconnaissance** (`pre-recon`) - External tool scans (nmap, subfinder, whatweb) + source code analysis
2. **Reconnaissance** (`recon`) - Analysis of initial findings and attack surface mapping  
3. **Vulnerability Analysis** (5 agents)
   - `injection-vuln` - SQL injection, command injection
   - `xss-vuln` - Cross-site scripting 
   - `auth-vuln` - Authentication bypasses
   - `authz-vuln` - Authorization flaws
   - `ssrf-vuln` - Server-side request forgery
4. **Exploitation** (5 agents)
   - `injection-exploit` - Exploit injection vulnerabilities
   - `xss-exploit` - Exploit XSS vulnerabilities  
   - `auth-exploit` - Exploit authentication issues
   - `authz-exploit` - Exploit authorization flaws
   - `ssrf-exploit` - Exploit SSRF vulnerabilities
5. **Reporting** (`report`) - Executive-level security report generation

### Configuration System
The agent supports YAML configuration files with JSON Schema validation:
- `configs/config-schema.json` - JSON Schema for configuration validation
- `configs/example-config.yaml` - Template configuration file
- `configs/juice-shop-config.yaml` - Example configuration for OWASP Juice Shop
- `configs/keygraph-config.yaml` - Configuration for Keygraph applications
- `configs/chatwoot-config.yaml` - Configuration for Chatwoot applications
- `configs/metabase-config.yaml` - Configuration for Metabase applications
- `configs/cal-com-config.yaml` - Configuration for Cal.com applications

Configuration includes:
- Authentication settings (form, SSO, API, basic auth)
- Multi-factor authentication with TOTP support
- Custom login flow instructions
- Application-specific testing parameters

### Prompt Templates
The `prompts/` directory contains specialized prompt templates for each testing phase:
- `pre-recon-code.txt` - Initial code analysis prompts
- `recon.txt` - Reconnaissance analysis prompts  
- `vuln-*.txt` - Vulnerability assessment prompts (injection, XSS, auth, authz, SSRF)
- `exploit-*.txt` - Exploitation attempt prompts
- `report-executive.txt` - Executive report generation prompts

### Claude Agent SDK Integration
The agent uses the `@anthropic-ai/claude-agent-sdk` with maximum autonomy configuration:
- `maxTurns: 10_000` - Allows extensive autonomous analysis
- `permissionMode: 'bypassPermissions'` - Full system access for thorough testing
- Playwright MCP integration for web browser automation
- Working directory set to target local repository
- Configuration context injection for authenticated testing

### Authentication & Login Resources
- `prompts/shared/login-instructions.txt` - Login flow template for all agents
- TOTP token generation via MCP `generate_totp` tool
- Support for multi-factor authentication workflows
- Configurable authentication mechanisms (form, SSO, API, basic)

### Output & Deliverables
All analysis results are saved to the `deliverables/` directory within the target local repository, including:
- Pre-reconnaissance reports with external scan results
- Vulnerability assessment findings
- Exploitation attempt results
- Executive-level security reports with business impact analysis

### External Tool Dependencies
The agent integrates with external security tools (all included in Docker image):

| Tool | Purpose | Docker Capability Required |
|------|---------|---------------------------|
| `nmap` | Network port scanning, service detection | `NET_RAW` |
| `subfinder` | Subdomain enumeration and discovery | None |
| `whatweb` | Web technology fingerprinting | None |
| `schemathesis` | OpenAPI/Swagger API fuzzing | None |

Tools are validated for availability before execution using `src/tool-checker.js`. Missing tools trigger warnings but don't block execution. Use `--pipeline-testing` mode to skip external tool execution during development.

### Git-Based Checkpointing System
The agent implements a sophisticated checkpoint system using git:
- Every agent creates a git checkpoint before execution
- Rollback to any previous agent state using `--rollback-to` or `--rerun`
- Failed agents don't affect completed work
- Rolled-back agents marked in audit system with status: "rolled-back"
- Reconciliation automatically syncs Shaart store with audit logs after rollback
- Fail-fast safety prevents accidental re-execution of completed agents

### Unified Audit & Metrics System
The agent implements a crash-safe, self-healing audit system (v3.0) with the following guarantees:

**Architecture:**
- **audit-logs/**: Centralized metrics and forensic logs (source of truth)
  - `{hostname}_{sessionId}/session.json` - Comprehensive metrics with attempt-level detail
  - `{hostname}_{sessionId}/prompts/` - Exact prompts used for reproducibility
  - `{hostname}_{sessionId}/agents/` - Turn-by-turn execution logs
- **.shaart-store.json**: Minimal orchestration state (completedAgents, checkpoints) - can be safely deleted to reset

**Session State Reconciliation:**
- On every CLI command, Shaart reconciles `.shaart-store.json` with `audit-logs/`
- Audit logs are the source of truth; the store file follows
- If store is corrupted, delete it and Shaart will rebuild from audit logs

**Crash Safety:**
- Append-only logging with immediate flush (survives kill -9)
- Atomic writes for session.json (no partial writes)
- Event-based logging (tool_start, tool_end, llm_response) closes data loss windows

**Self-Healing:**
- Automatic reconciliation before every CLI command
- Recovers from crashes during rollback
- Audit logs are source of truth; Shaart store follows

**Forensic Completeness:**
- All retry attempts logged with errors, costs, durations
- Rolled-back agents preserved with status: "rolled-back"
- Partial cost capture for failed attempts
- Complete event trail for debugging

**Concurrency Safety:**
- SessionMutex prevents race conditions during parallel agent execution
- Safe parallel execution of vulnerability and exploitation phases

**Metrics & Reporting:**
- Export metrics to CSV with `./scripts/export-metrics.js`
- Phase-level and agent-level timing/cost aggregations
- Validation results integrated with metrics

For detailed design, see `docs/unified-audit-system-design.md`.

## Development Notes

### Key Design Patterns
- **Configuration-Driven Architecture**: YAML configs with JSON Schema validation
- **Modular Error Handling**: Categorized error types with retry logic
- **Pure Functions**: Most functionality is implemented as pure functions for testability
- **SDK-First Approach**: Heavy reliance on Claude Agent SDK for autonomous AI operations
- **Progressive Analysis**: Each phase builds on previous phase results
- **Local Repository Setup**: Target applications are accessed directly from user-provided local directories

### Error Handling Strategy
The application uses a comprehensive error handling system with:
- Categorized error types (PentestError, ConfigError, NetworkError, etc.)
- Automatic retry logic for transient failures
- Graceful degradation when external tools are unavailable
- Detailed error logging and user-friendly error messages

### Testing Mode
The agent includes a testing mode that skips external tool execution for faster development cycles.

### Security Focus
This is explicitly designed as a **defensive security tool** for:
- Vulnerability assessment
- Security analysis  
- Penetration testing
- Security report generation

The tool should only be used on systems you own or have explicit permission to test.

## File Structure

```
shaart.mjs                      # Main orchestration script
package.json                     # Node.js dependencies
.shaart-store.json              # Orchestration state (minimal)
src/                             # Core modules
├── audit/                       # Unified audit system (v3.0)
│   ├── index.js                 # Public API
│   ├── audit-session.js         # Main facade (logger + metrics + mutex)
│   ├── logger.js                # Append-only crash-safe logging
│   ├── metrics-tracker.js       # Timing, cost, attempt tracking
│   └── utils.js                 # Path generation, atomic writes
├── config-parser.js             # Configuration handling
├── error-handling.js            # Error management
├── tool-checker.js              # Tool validation
├── session-manager.js           # Session state + reconciliation
├── checkpoint-manager.js        # Git-based checkpointing + rollback
├── queue-validation.js          # Deliverable validation
├── ai/
│   └── claude-executor.js       # Claude Agent SDK integration
└── utils/
mcp-server/                      # In-process MCP server for agents
├── src/
│   ├── index.js                 # Server factory
│   ├── tools/                   # save_deliverable, generate_totp
│   └── validation/              # Queue and TOTP validators
audit-logs/                      # Centralized audit data (v3.0)
└── {hostname}_{sessionId}/
    ├── session.json             # Comprehensive metrics
    ├── prompts/                 # Prompt snapshots
    │   └── {agent}.md
    └── agents/                  # Agent execution logs
        └── {timestamp}_{agent}_attempt-{N}.log
configs/                         # Configuration files
├── config-schema.json           # JSON Schema validation
├── example-config.yaml          # Template configuration
├── juice-shop-config.yaml       # Juice Shop example
├── keygraph-config.yaml         # Keygraph configuration
├── chatwoot-config.yaml         # Chatwoot configuration
├── metabase-config.yaml         # Metabase configuration
└── cal-com-config.yaml          # Cal.com configuration
prompts/                         # AI prompt templates
├── shared/                      # Shared content for all prompts
│   ├── _target.txt              # Target URL template
│   ├── _rules.txt               # Rules template
│   ├── _vuln-scope.txt          # Vulnerability scope template
│   ├── _exploit-scope.txt       # Exploitation scope template
│   └── login-instructions.txt   # Login flow template
├── pre-recon-code.txt           # Code analysis
├── recon.txt                    # Reconnaissance
├── vuln-*.txt                   # Vulnerability assessment
├── exploit-*.txt                # Exploitation
└── report-executive.txt         # Executive reporting
scripts/                         # Utility scripts
└── export-metrics.js            # Export metrics to CSV
deliverables/                    # Output directory (in target repo)
docs/                            # Documentation
├── unified-audit-system-design.md
└── migration-guide.md
```

## Troubleshooting

### Common Issues
- **"Agent already completed"**: Use `--rerun <agent>` for explicit re-execution
- **"Missing prerequisites"**: Check `--status` and run prerequisite agents first  
- **"No sessions found"**: Create a session with `--setup-only` first
- **"Repository not found"**: Ensure target local directory exists and is accessible
- **"Too many test sessions"**: Use `--cleanup` to remove old sessions and free disk space

### External Tool Dependencies
Missing tools can be skipped using `--pipeline-testing` mode during development:
- `nmap` - Network scanning
- `subfinder` - Subdomain discovery
- `whatweb` - Web technology detection

### Diagnostic & Utility Scripts
```bash
# Export metrics to CSV
./scripts/export-metrics.js --session-id <id> --output metrics.csv
```

Note: For recovery from corrupted state, simply delete `.shaart-store.json` or edit JSON files directly.
