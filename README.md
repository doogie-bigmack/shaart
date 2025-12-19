> [!NOTE]
> **Shaart: 96.15% success rate on hint-free, source-aware XBOW benchmark. [View Results →](https://github.com/KeygraphHQ/shaart/tree/main/xben-benchmark-results/README.md)**

<div align="center">

# 🎯 Shaart
## Break Your App Before Hackers Do

**Autonomous AI Penetration Testing • Real Exploits, Not Alerts**

[![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=flat&logo=discord)](https://discord.gg/u7DRRXrs7H)
[![Website](https://img.shields.io/badge/Website-keygraph.io-00D9FF?style=flat)](https://keygraph.io)

</div>

---

## 🖥️ Your Security Terminal Awaits

When you launch Shaart, you're greeted with a retro-futuristic CRT terminal experience:

```
BIGMAC-ATTACK CORP :: SECURITY TERMINAL v1.0.0
══════════════════════════════════════════════════════════════════════
> INITIALIZING SYSTEM...
> LOADING BIOS... OK
> CHECKING MEMORY... 64K OK
> MOUNTING DRIVES... OK
> BOOTING SECURITY SUBSYSTEM...
> LOADING MU/TH/UR 6000 PROTOCOLS...
> INITIALIZING AI MODULES...

███████╗██╗  ██╗ █████╗  █████╗ ██████╗ ████████╗
██╔════╝██║  ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝
███████╗███████║███████║███████║██████╔╝   ██║
╚════██║██╔══██║██╔══██║██╔══██║██╔══██╗   ██║
███████║██║  ██║██║  ██║██║  ██║██║  ██║   ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝

> SECURITY HUNTING AI AGENT FOR RECON & TESTING
> SYSTEM STATUS........................... [ACTIVE]
> AUTHORIZATION................. [REQUIRED - READ ONLY]

⚠ WARNING: DEFENSIVE SECURITY OPERATIONS ONLY
⚠ UNAUTHORIZED ACCESS PROHIBITED :: 18 U.S.C. § 1030

> AWAITING TARGET CONFIGURATION...
```

*Skip the animation in CI/CD: `SHAART_SKIP_ANIMATION=true`*

---

## 💡 The Problem: Your Security Lag is Showing

Your dev team ships code daily with Claude Code and Cursor. But security testing? That's a once-a-year event.

**364 days of vulnerability exposure** while you wait for the next penetration test.

This gap is where breaches happen. By the time you discover a critical SQL injection or auth bypass, it's been in production for months—or worse, already exploited.

## 🛡️ The Solution: Shaart

**Shaart is an autonomous AI pentester that executes real exploits against your running application.**

Not a scanner. Not a linter. An actual penetration tester that:
- Reads your source code to understand attack vectors
- Launches a browser to exploit your live application
- Proves vulnerabilities with working exploits
- Delivers pentester-quality reports with proof-of-concepts

Ship with confidence. Test every build. Close the security gap.

---

## 🔥 Why Shaart is Different

### Real Exploits, Not Theoretical Risks

Traditional scanners flag "potential" vulnerabilities. Shaart proves them.

- ❌ **Scanner**: "This endpoint might be vulnerable to SQL injection"
- ✅ **Shaart**: "SQL injection confirmed. Here's the database dump. Here's the exact command."

**No exploit = No report.** If Shaart can't prove it works, it doesn't waste your time.

### Source Code Meets Live Exploitation

**White-box analysis** tells Shaart where the vulnerabilities hide.
**Black-box exploitation** proves they're actually exploitable.

This hybrid approach finds what pure scanners miss and validates what static analysis only guesses.

### Multi-Agent Autonomous Architecture

Launch one command. Shaart's AI agents handle the rest:

```
┌─────────────────────────────────────────┐
│  1. RECONNAISSANCE                      │
│  Maps your attack surface               │
│  Tech stack, endpoints, auth flows      │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────┐           ┌─────────┐
│ 2. VULN │           │ 2. VULN │
│ AGENTS  │    ...    │ AGENTS  │
│ (PARALLEL)          │ (PARALLEL)
└────┬────┘           └────┬────┘
     │                     │
     ▼                     ▼
┌─────────┐           ┌─────────┐
│ 3. EXPLOIT          │ 3. EXPLOIT
│ AGENTS  │    ...    │ AGENTS  │
│ (PARALLEL)          │ (PARALLEL)
└────┬────┘           └────┬────┘
     │                     │
     └──────────┬──────────┘
                ▼
        ┌──────────────┐
        │ 4. REPORTING │
        │ Proven Vulns │
        │ Only         │
        └──────────────┘
```

**Parallelized for speed.** Multiple vulnerability categories tested simultaneously.

### Handles Complex Authentication

Most automated tools fail at login. Shaart doesn't.

✅ **Multi-Factor Authentication (TOTP/2FA)**: Auto-generates time-based codes
✅ **OAuth & SSO**: "Sign in with Google" and federated identity
✅ **Custom Workflows**: Step-by-step login instructions you define
✅ **Session Management**: Stays authenticated throughout the entire test

### Battle-Tested Tool Integration

Shaart augments AI reasoning with proven security tools:

- **Nmap**: Port scanning, service fingerprinting
- **Subfinder**: Subdomain discovery and enumeration
- **WhatWeb**: Technology and framework detection
- **Schemathesis**: OpenAPI/Swagger API fuzzing

### Reports Security Teams Actually Use

Stop drowning in false positives. Shaart delivers actionable findings:

- 📋 **Copy-paste proof-of-concepts**: Commands that reproduce the exploit
- 💰 **Business impact analysis**: What an attacker could actually do
- 🔧 **Code-level remediation**: Exact fixes for your tech stack
- 📊 **OWASP mapping**: Industry-standard vulnerability classification

---

## 🎯 What Shaart Tests

### Current Coverage

- **Injection Attacks**: SQL injection, command injection, NoSQL injection
- **Cross-Site Scripting (XSS)**: Reflected, stored, DOM-based
- **Authentication Bypass**: Login circumvention, session hijacking, JWT attacks
- **Authorization Failures**: Privilege escalation, IDOR, missing access controls
- **Server-Side Request Forgery (SSRF)**: Internal network access, cloud metadata exploitation

### Coming Soon

- **Business Logic Vulnerabilities** ([#8](https://github.com/doogie-bigmack/shaart/issues/8)): Workflow bypass, rate limit evasion, price manipulation
- **API Security Testing** ([#7](https://github.com/doogie-bigmack/shaart/issues/7)): REST/GraphQL native exploitation
- **Expanded Injection Coverage** ([#9](https://github.com/doogie-bigmack/shaart/issues/9)): LDAP, XML/XPath, XXE
- **File Upload Exploitation** ([#11](https://github.com/doogie-bigmack/shaart/issues/11)): Polyglot files, MIME bypass
- **Blind Exploitation** ([#10](https://github.com/doogie-bigmack/shaart/issues/10)): Time-based detection, DNS exfiltration

---

## 🔄 Continuous Vulnerability Management (Coming Soon)

**Issue #32**: GitHub integration for complete vulnerability lifecycle management

- **Auto-create GitHub issues** for each discovered vulnerability
- **Remediation guidance** with multiple code-level fix options
- **Retest workflow** to verify fixes automatically
- **Delta reporting** to track new vs. fixed vulnerabilities over time
- **Project board integration** for remediation tracking

[See full roadmap →](https://github.com/doogie-bigmack/shaart/issues/32)

---

## 🚀 Quick Start

### Prerequisites

- **Docker** (recommended deployment method)
- **Claude API access** (Console account with credits or API key)

### 1. Build Container

```bash
docker build -t shaart:latest .
```

### 2. Prepare Your Code

Shaart needs access to your application's source code:

```bash
# Clone your repository
git clone https://github.com/your-org/your-app.git repos/your-app

# Or for multi-repo apps, organize in one folder:
mkdir repos/your-app
cd repos/your-app
git clone https://github.com/your-org/frontend.git
git clone https://github.com/your-org/backend.git
```

### 3. Run Your First Test

**With OAuth Token:**

```bash
docker run --rm -it \
  --network host \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  -e CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN" \
  -e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 \
  -v "$(pwd)/repos:/app/repos" \
  shaart:latest \
  "https://your-app.com" \
  "/app/repos/your-app"
```

**With API Key:**

```bash
docker run --rm -it \
  --network host \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 \
  -v "$(pwd)/repos:/app/repos" \
  shaart:latest \
  "https://your-app.com" \
  "/app/repos/your-app"
```

**Testing localhost apps?** Use `host.docker.internal` instead of `localhost`:

```bash
docker run --rm -it \
  --add-host=host.docker.internal:host-gateway \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  -e CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN" \
  -e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 \
  -v "$(pwd)/repos:/app/repos" \
  shaart:latest \
  "http://host.docker.internal:3000" \
  "/app/repos/your-app"
```

### 4. Configure Authentication (Optional)

Create `configs/my-app.yaml`:

```yaml
authentication:
  login_type: form
  login_url: "https://your-app.com/login"
  credentials:
    username: "test@example.com"
    password: "testpassword"
    totp_secret: "BASE32SECRETHERE"  # For 2FA

  login_flow:
    - "Type $username into the email field"
    - "Type $password into the password field"
    - "Click the 'Sign In' button"

  success_condition:
    type: url_contains
    value: "/dashboard"

rules:
  focus:
    - description: "Prioritize API endpoints"
      type: path
      url_path: "/api"

  avoid:
    - description: "Skip logout testing"
      type: path
      url_path: "/logout"
```

Then run with: `--config /app/configs/my-app.yaml`

### 5. Check Results

Deliverables saved to `repos/your-app/deliverables/`:

- `code_analysis_deliverable.md` - Source code reconnaissance
- `recon_deliverable.md` - Attack surface mapping
- `*_analysis_deliverable.md` - Vulnerability hypotheses
- `*_exploitation_evidence.md` - Proven exploits with PoCs
- `comprehensive_security_assessment_report.md` - Final report

---

## 📊 Real-World Results

### OWASP Juice Shop: 20+ Critical Vulnerabilities

*The most deliberately insecure web application in existence*

**Achievements:**
- ✅ Complete authentication bypass via SQL injection
- ✅ Full database exfiltration (all users, passwords, cards)
- ✅ Admin account creation through registration workflow bypass
- ✅ Privilege escalation to administrator access
- ✅ IDOR vulnerabilities across cart and profile management
- ✅ SSRF for internal network reconnaissance

[Read full report →](sample-reports/shaart-report-juice-shop.md)

### c{api}tal API: 15 High-Severity Exploits

*Checkmarx's intentionally vulnerable API for OWASP API Top 10 testing*

**Achievements:**
- ✅ Root-level command injection via debug endpoint
- ✅ Authentication bypass using legacy v1 API endpoint
- ✅ Mass assignment to escalate user to admin
- ✅ Zero false positives (correctly identified XSS defenses)

[Read full report →](sample-reports/shaart-report-capital-api.md)

### OWASP crAPI: 15+ Critical Findings

*Modern vulnerable API designed for OWASP API Security Top 10*

**Achievements:**
- ✅ JWT attacks (Algorithm Confusion, alg:none, weak key)
- ✅ SQL injection for full database compromise
- ✅ SSRF to forward internal auth tokens externally
- ✅ High accuracy with zero XSS false positives

[Read full report →](sample-reports/shaart-report-crapi.md)

---

## ⚖️ Legal & Responsible Use

### ⚠️ Read Before Running

**Shaart executes real attacks.** This is not passive scanning.

#### ❌ Never Run On:
- Production environments
- Systems you don't own
- Applications without explicit authorization

#### ✅ Safe Environments:
- Local development setups
- Staging environments
- Sandboxed test instances
- Your own applications with proper authorization

#### Legal Requirements:
- **Written authorization required** from system owner
- Unauthorized testing violates Computer Fraud and Abuse Act (CFAA)
- User assumes all liability for misuse

### Potential Mutations:
- Creates test accounts and users
- Modifies application data
- May trigger side effects (emails, webhooks, etc.)
- Can delete or corrupt test data

**You are responsible for ensuring proper authorization and environment selection.**

---

## 🏗️ Architecture Deep Dive

Shaart emulates a human penetration tester's workflow using specialized AI agents orchestrated across four phases.

**Phase 1: Reconnaissance**
→ Source code analysis + live application exploration
→ Maps attack surface, tech stack, auth mechanisms
→ Produces comprehensive entry point inventory

**Phase 2: Vulnerability Analysis** (Parallel)
→ Specialized agents per OWASP category
→ Data flow tracing from user input to dangerous sinks
→ Generates hypothesized exploitation paths

**Phase 3: Exploitation** (Parallel)
→ Attempts real-world attacks via browser and CLI
→ **"No Exploit, No Report" policy**
→ Discards unproven hypotheses as false positives

**Phase 4: Reporting**
→ Consolidates only verified findings
→ Includes reproducible proof-of-concepts
→ Delivers pentester-grade actionable reports

[See detailed architecture →](./COVERAGE.md)

---

## 💰 Cost & Performance

**Time**: 1-1.5 hours for a typical web application
**Cost**: ~$50 USD using Claude 4.5 Sonnet (subject to change)
**Token Optimization**: Multi-model strategy (Haiku for analysis, Sonnet for exploitation)

---

## 🛣️ Development Roadmap

Track active development and request features:

- [Open Issues](https://github.com/doogie-bigmack/shaart/issues)
- [Feature Roadmap](https://github.com/doogie-bigmack/shaart/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
- [Join Discord](https://discord.gg/u7DRRXrs7H) to influence priorities

---

## 🤝 Community & Support

### Get Help

- 🐛 [Report Bugs](https://github.com/keygraph/shaart/issues)
- 💬 [Discord Community](https://discord.gg/u7DRRXrs7H)
- 💡 [Feature Requests](https://github.com/keygraph/shaart/discussions)

### Stay Updated

- 🐦 [@KeygraphHQ on Twitter](https://twitter.com/KeygraphHQ)
- 💼 [Keygraph on LinkedIn](https://linkedin.com/company/keygraph)
- 🌐 [keygraph.io](https://keygraph.io)

---

## 🏢 Enterprise?

Need enterprise features?
- Advanced data flow analysis engine
- Pre-built CI/CD integrations
- Multiple export formats (PDF, JSON, JIRA)
- Dedicated support with SLAs
- Compliance-ready audit reports

📋 [Express interest in enterprise features](https://docs.google.com/forms/d/e/1FAIpQLSf-cPZcWjlfBJ3TCT8AaWpf8ztsw3FaHzJE4urr55KdlQs6cQ/viewform?usp=header)
📧 [shaart@keygraph.io](mailto:shaart@keygraph.io)

---

## 📜 License

**Shaart**: [AGPL-3.0](LICENSE)

- ✅ Free for internal security testing
- ✅ Private modifications allowed
- ⚠️ Network service providers must open-source modifications

---

<p align="center">
  <strong>Built by Keygraph</strong><br>
  <em>Autonomous security for the AI era</em>
</p>
