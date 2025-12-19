> [!NOTE]
> **[Shaart Lite achieves a 96.15% success rate on a hint-free, source-aware XBOW benchmark. &rarr;](https://github.com/KeygraphHQ/shaart/tree/main/xben-benchmark-results/README.md)**


<div align="center">

<img src="./assets/shaart-screen.png" alt="Shaart Screen" width="100%">

# Shaart is your fully autonomous AI pentester.

Shaart's job is simple: break your web app before anyone else does. <br />
The Red Team to your vibe-coding Blue team. <br />
Every Claude (coder) deserves their Shaart.

---

[Website](https://keygraph.io) • [Discord](https://discord.gg/u7DRRXrs7H)

---
</div>

## 🖥️ Boot Sequence

Experience Shaart's retro-futuristic terminal interface, inspired by classic sci-fi aesthetics:

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

*Set `SHAART_SKIP_ANIMATION=true` to skip the boot animation for instant startup.*

---

## 🎯 What is Shaart?

Shaart is an AI pentester that delivers actual exploits, not just alerts.

Shaart's goal is to break your web app before someone else does. It autonomously hunts for attack vectors in your code, then uses its built-in browser to execute real exploits, such as injection attacks, and auth bypass, to prove the vulnerability is actually exploitable.

**What Problem Does Shaart Solve?**

Thanks to tools like Claude Code and Cursor, your team ships code non-stop. But your penetration test? That happens once a year. This creates a *massive* security gap. For the other 364 days, you could be unknowingly shipping vulnerabilities to production.

Shaart closes this gap by acting as your on-demand whitebox pentester. It doesn't just find potential issues. It executes real exploits, providing concrete proof of vulnerabilities. This lets you ship with confidence, knowing every build can be secured.

> [!NOTE]
> **From Autonomous Pentesting to Automated Compliance**
>
> Shaart is a core component of the **Keygraph Security and Compliance Platform**.
>
> While Shaart automates the critical task of penetration testing for your application, our broader platform automates your entire compliance journey—from evidence collection to audit readiness. We're building the "Rippling for Cybersecurity," a single platform to manage your security posture and streamline compliance frameworks like SOC 2 and HIPAA.
>
> ➡️ **[Learn more about the Keygraph Platform](https://keygraph.io)**

## 🎬 See Shaart in Action

**Real Results**: Shaart discovered 20+ critical vulnerabilities in OWASP Juice Shop, including complete auth bypass and database exfiltration. [See full report →](sample-reports/shaart-report-juice-shop.md)

![Demo](assets/shaart-action.gif)

## ✨ What Makes Shaart Unique

### 🧠 Autonomous Exploitation, Not Just Scanning
Unlike traditional scanners that flag potential issues, Shaart **proves vulnerabilities are exploitable** by executing real attacks. It won't report a finding unless it can demonstrate actual impact—eliminating false positives and providing actionable proof-of-concepts.

### 🔬 White-Box Intelligence Meets Black-Box Validation
Shaart combines **source code analysis** (understanding your codebase deeply) with **live dynamic testing** (exploiting the running application). This dual approach finds vulnerabilities that pure scanners miss and validates findings that static analysis tools only hypothesize.

### 🤖 Fully Autonomous Multi-Agent Architecture
Launch with a single command and let Shaart's specialized AI agents handle everything:
- **Reconnaissance Agent**: Maps attack surface, analyzes tech stack, explores the application
- **Vulnerability Agents**: Hunt for injection, XSS, auth bypasses, authorization flaws, and SSRF in parallel
- **Exploitation Agents**: Execute real attacks with browser automation and command-line tools
- **Reporting Agent**: Synthesizes findings into actionable, pentester-grade reports

### 🔐 Advanced Authentication Support
Handles complex auth flows that stop most automated tools:
- **Multi-Factor Authentication (2FA/TOTP)**: Automatically generates time-based codes
- **OAuth/SSO**: Supports "Sign in with Google" and other federated auth
- **Custom Login Flows**: Configurable step-by-step authentication instructions
- **Session Management**: Maintains authentication throughout testing

### 🛠️ Battle-Tested Security Tools Integration
Enhances discovery with industry-standard tools:
- **Nmap**: Network port scanning and service detection
- **Subfinder**: Subdomain enumeration
- **WhatWeb**: Technology fingerprinting
- **Schemathesis**: OpenAPI/Swagger fuzzing

### ⚡ Parallel Processing for Speed
Don't wait hours for results. Shaart parallelizes vulnerability analysis and exploitation across all attack categories simultaneously, dramatically reducing total scan time.

### 📊 Pentester-Grade Reports
Get reports that security professionals actually use:
- **Copy-paste proof-of-concepts**: Exact commands to reproduce exploits
- **Business impact analysis**: Understand real-world consequences
- **Remediation guidance**: Specific code-level fixes
- **OWASP categorization**: Mapped to industry-standard frameworks

### 🎨 Retro-Futuristic Terminal Experience
Enjoy a unique interface inspired by classic sci-fi terminals, complete with:
- Character-by-character typewriter effects
- CRT phosphor green color scheme
- Boot sequence with system diagnostics
- Optional instant mode for CI/CD pipelines

---

## 🚀 Future Capabilities (In Development)

Shaart is actively evolving. Here's what's coming next:

### 🎯 Expanded Vulnerability Coverage
- **Business Logic Flaws**: Workflow bypass, rate limiting, price manipulation ([#8](https://github.com/doogie-bigmack/shaart/issues/8))
- **API Testing Agent**: Native REST/GraphQL vulnerability testing ([#7](https://github.com/doogie-bigmack/shaart/issues/7))
- **Additional Injection Types**: LDAP, XML/XPath, XXE ([#9](https://github.com/doogie-bigmack/shaart/issues/9))
- **File Upload Testing**: Polyglot files, MIME bypass, archive attacks ([#11](https://github.com/doogie-bigmack/shaart/issues/11))
- **Blind Exploitation**: Time-based detection, DNS exfiltration ([#10](https://github.com/doogie-bigmack/shaart/issues/10))

### 🔄 Continuous Security Management
- **GitHub Integration**: Automatic issue creation with remediation options ([#32](https://github.com/doogie-bigmack/shaart/issues/32))
  - Create GitHub issues for each vulnerability with code-level fixes
  - Track remediation progress via GitHub project boards
  - Retest workflow to verify fixes
  - Delta reporting to identify new vs. fixed vulnerabilities
- **Webhook Integrations**: Real-time alerts to Slack, SIEM, PagerDuty ([#12](https://github.com/doogie-bigmack/shaart/issues/12))
- **Multiple Report Formats**: JSON, PDF, JIRA-compatible export ([#13](https://github.com/doogie-bigmack/shaart/issues/13))

### 🧪 Testing & Quality Improvements
- **Unit Test Suite**: Comprehensive test coverage for core modules ([#16](https://github.com/doogie-bigmack/shaart/issues/16))
- **CI/CD Pipeline**: Automated linting, testing, and validation ([#17](https://github.com/doogie-bigmack/shaart/issues/17))
- **CVSS Severity Scoring**: Auto-calculate industry-standard risk scores ([#15](https://github.com/doogie-bigmack/shaart/issues/15))

### 🎯 Intelligence & Optimization
- **Tech-Stack-Aware Prompts**: Specialized attack patterns for Node.js, Python, Java, .NET ([#20](https://github.com/doogie-bigmack/shaart/issues/20))
- **In-Context Learning**: Feed past run success/failure into prompts ([#21](https://github.com/doogie-bigmack/shaart/issues/21))
- **Post-Exploitation Pivoting**: Chain vulnerabilities for deeper access ([#22](https://github.com/doogie-bigmack/shaart/issues/22))

### 🔧 Developer Experience
- **Custom Agent SDK**: Build your own vulnerability testing agents ([#19](https://github.com/doogie-bigmack/shaart/issues/19))
- **API Server Mode**: REST API for programmatic access ([#18](https://github.com/doogie-bigmack/shaart/issues/18))
- **CLI Enhancements**: New commands for listing, exporting, debugging ([#23](https://github.com/doogie-bigmack/shaart/issues/23))

*Want to influence the roadmap? [Join our Discord](https://discord.gg/u7DRRXrs7H) or comment on issues!*

---

## 📦 Product Line

Shaart is available in two editions:

| Edition | License | Best For |
|---------|---------|----------|
| **Shaart Lite** | AGPL-3.0 | Security teams, independent researchers, testing your own applications |
| **Shaart Pro** | Commercial | Enterprises requiring advanced features, CI/CD integration, and dedicated support |

> **This repository contains Shaart Lite,** which utilizes our core autonomous AI pentesting framework. **Shaart Pro** enhances this foundation with an advanced, LLM-powered data flow analysis engine (inspired by the [LLMDFA paper](https://arxiv.org/abs/2402.10754)) for enterprise-grade code analysis and deeper vulnerability detection.

> [!IMPORTANT]
> **White-box only.** Shaart Lite is designed for **white-box (source-available)** application security testing.
> It expects access to your application's source code and repository layout.

[See feature comparison](./SHAART-PRO.md)
## 📑 Table of Contents

- [Boot Sequence](#️-boot-sequence)
- [What is Shaart?](#-what-is-shaart)
- [See Shaart in Action](#-see-shaart-in-action)
- [What Makes Shaart Unique](#-what-makes-shaart-unique)
- [Future Capabilities](#-future-capabilities-in-development)
- [Product Line](#-product-line)
- [Setup & Usage Instructions](#-setup--usage-instructions)
  - [Prerequisites](#prerequisites)
  - [Authentication Setup](#authentication-setup)
  - [Quick Start with Docker](#quick-start-with-docker)
  - [Configuration (Optional)](#configuration-optional)
  - [Usage Patterns](#usage-patterns)
  - [Output and Results](#output-and-results)
- [Sample Reports & Benchmarks](#-sample-reports--benchmarks)
- [Architecture](#️-architecture)
- [Coverage and Roadmap](#-coverage-and-roadmap)
- [Disclaimers](#️-disclaimers)
- [License](#-license)
- [Community & Support](#-community--support)
- [Get in Touch](#-get-in-touch)

---

## 🚀 Setup & Usage Instructions

### Prerequisites

- **Claude Console account with credits** - Required for AI-powered analysis
- **Docker installed** - Primary deployment method

### Authentication Setup

You need either a **Claude Code OAuth token** or an **Anthropic API key** to run Shaart. Get your token from the [Anthropic Console](https://console.anthropic.com) and pass it to Docker via the `-e` flag.

### Environment Configuration (Recommended)

To prevent Claude Code from hitting token limits during long report generation, set the max output tokens environment variable:

**For local runs:**
```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000
```

**For Docker runs:**
```bash
-e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000
```

### Quick Start with Docker

#### Build the Container

```bash
docker build -t shaart:latest .
```

#### Prepare Your Repository

Shaart is designed for **web application security testing** and expects all application code to be available in a single directory structure. This works well for:

- **Monorepos** - Single repository containing all components
- **Consolidated setups** - Multiple repositories organized in a shared folder

**For monorepos:**

```bash
git clone https://github.com/your-org/your-monorepo.git repos/your-app
```

**For multi-repository applications** (e.g., separate frontend/backend):

```bash
mkdir repos/your-app
cd repos/your-app
git clone https://github.com/your-org/frontend.git
git clone https://github.com/your-org/backend.git
git clone https://github.com/your-org/api.git
```

**For existing local repositories:**

```bash
cp -r /path/to/your-existing-repo repos/your-app
```

#### Run Your First Pentest

**With Claude Console OAuth Token:**

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
      "https://your-app.com/" \
      "/app/repos/your-app" \
      --config /app/configs/example-config.yaml
```

**With Anthropic API Key:**

```bash
docker run --rm -it \
      --network host \
      --cap-add=NET_RAW \
      --cap-add=NET_ADMIN \
      -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
      -e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 \
      -v "$(pwd)/repos:/app/repos" \
      -v "$(pwd)/configs:/app/configs" \
      shaart:latest \
      "https://your-app.com/" \
      "/app/repos/your-app" \
      --config /app/configs/example-config.yaml
```

**Network Capabilities:**

- `--cap-add=NET_RAW` - Enables advanced port scanning with nmap
- `--cap-add=NET_ADMIN` - Allows network administration for security tools
- `--network host` - Provides access to target network interfaces

**Testing Local Applications:**

Docker containers cannot reach `localhost` on your host machine. Use `host.docker.internal` in place of `localhost`:

```bash
docker run --rm -it \
      --add-host=host.docker.internal:host-gateway \
      --cap-add=NET_RAW \
      --cap-add=NET_ADMIN \
      -e CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN" \
      -e CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 \
      -v "$(pwd)/repos:/app/repos" \
      -v "$(pwd)/configs:/app/configs" \
      shaart:latest \
      "http://host.docker.internal:3000" \
      "/app/repos/your-app" \
      --config /app/configs/example-config.yaml
```

### Configuration (Optional)

While you can run without a config file, creating one enables authenticated testing and customized analysis.

#### Create Configuration File

Copy and modify the example configuration:

```bash
cp configs/example-config.yaml configs/my-app-config.yaml
```

#### Basic Configuration Structure

```yaml
authentication:
  login_type: form
  login_url: "https://your-app.com/login"
  credentials:
    username: "test@example.com"
    password: "yourpassword"
    totp_secret: "LB2E2RX7XFHSTGCK"  # Optional for 2FA

  login_flow:
    - "Type $username into the email field"
    - "Type $password into the password field"
    - "Click the 'Sign In' button"

  success_condition:
    type: url_contains
    value: "/dashboard"

rules:
  avoid:
    - description: "AI should avoid testing logout functionality"
      type: path
      url_path: "/logout"

  focus:
    - description: "AI should emphasize testing API endpoints"
      type: path
      url_path: "/api"
```

#### TOTP Setup for 2FA

If your application uses two-factor authentication, simply add the TOTP secret to your config file. The AI will automatically generate the required codes during testing.

### Check Status

View progress of previous runs:

```bash
docker run --rm shaart:latest --status
```

### Output and Results

All analysis results are saved to the `deliverables/` directory:

- **Pre-reconnaissance reports** - External scan results
- **Vulnerability assessments** - Potential vulnerabilities from thorough code analysis and network mapping
- **Exploitation results** - Proof-of-concept attempts
- **Executive reports** - Business-focused security summaries

---

## 📊 Sample Reports & Benchmarks

See Shaart's capabilities in action with real penetration test results from industry-standard vulnerable applications:

### Benchmark Results

#### 🧃 **OWASP Juice Shop** • [GitHub](https://github.com/juice-shop/juice-shop)

*A notoriously insecure web application maintained by OWASP, designed to test a tool's ability to uncover a wide range of modern vulnerabilities.*

**Performance**: Identified **over 20 high-impact vulnerabilities** across targeted OWASP categories in a single automated run.

**Key Accomplishments**:

- **Achieved complete authentication bypass** and exfiltrated the entire user database via Injection attack
- **Executed a full privilege escalation** by creating a new administrator account through a registration workflow bypass
- **Identified and exploited systemic authorization flaws (IDOR)** to access and modify any user's private data and shopping cart
- **Discovered a Server-Side Request Forgery (SSRF)** vulnerability, enabling internal network reconnaissance

📄 **[View Complete Report →](sample-reports/shaart-report-juice-shop.md)**

---

#### 🔗 **c{api}tal API** • [GitHub](https://github.com/Checkmarx/capital)

*An intentionally vulnerable API from Checkmarx, designed to test a tool's ability to uncover the OWASP API Security Top 10.*

**Performance**: Identified **nearly 15 critical and high-severity vulnerabilities**, leading to full application compromise.

**Key Accomplishments**:

- **Executed a root-level Injection attack** by bypassing a denylist via command chaining in a hidden debug endpoint
- **Achieved complete authentication bypass** by discovering and targeting a legacy, unpatched v1 API endpoint
- **Escalated a regular user to full administrator privileges** by exploiting a Mass Assignment vulnerability in the user profile update function
- **Demonstrated high accuracy** by correctly confirming the application's robust XSS defenses, reporting zero false positives

📄 **[View Complete Report →](sample-reports/shaart-report-capital-api.md)**

---

#### 🚗 **OWASP crAPI** • [GitHub](https://github.com/OWASP/crAPI)

*A modern, intentionally vulnerable API from OWASP, designed to benchmark a tool's effectiveness against the OWASP API Security Top 10.*

**Performance**: Identified **over 15 critical and high-severity vulnerabilities**, achieving full application compromise.

**Key Accomplishments**:

- **Bypassed authentication using multiple advanced JWT attacks**, including Algorithm Confusion, alg:none, and weak key (kid) injection
- **Achieved full database compromise via Injection attacks**, exfiltrating user credentials from the PostgreSQL database
- **Executed a critical Server-Side Request Forgery (SSRF) attack** that successfully forwarded internal authentication tokens to an external service
- **Demonstrated high accuracy** by correctly identifying the application's robust XSS defenses, reporting zero false positives

📄 **[View Complete Report →](sample-reports/shaart-report-crapi.md)**

---

*These results demonstrate Shaart's ability to move beyond simple scanning, performing deep contextual exploitation with minimal false positives and actionable proof-of-concepts.*

---

## 🏗️ Architecture

Shaart emulates a human penetration tester's methodology using a sophisticated multi-agent architecture. It combines white-box source code analysis with black-box dynamic exploitation across four distinct phases:

```
                    ┌──────────────────────┐
                    │    Reconnaissance    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────┴───────────┐
                    │          │           │
                    ▼          ▼           ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │ Vuln Analysis   │ │ Vuln Analysis   │ │      ...        │
        │  (Injection)    │ │     (XSS)       │ │                 │
        └─────────┬───────┘ └─────────┬───────┘ └─────────┬───────┘
                  │                   │                   │
                  ▼                   ▼                   ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  Exploitation   │ │  Exploitation   │ │      ...        │
        │  (Injection)    │ │     (XSS)       │ │                 │
        └─────────┬───────┘ └─────────┬───────┘ └─────────┬───────┘
                  │                   │                   │
                  └─────────┬─────────┴───────────────────┘
                            │
                            ▼
                    ┌──────────────────────┐
                    │      Reporting       │
                    └──────────────────────┘
```

### Architectural Overview

Shaart is engineered to emulate the methodology of a human penetration tester. It leverages Anthropic's Claude Agent SDK as its core reasoning engine, but its true strength lies in the sophisticated multi-agent architecture built around it. This architecture combines the deep context of **white-box source code analysis** with the real-world validation of **black-box dynamic exploitation**, managed by an orchestrator through four distinct phases to ensure a focus on minimal false positives and intelligent context management.

---

#### **Phase 1: Reconnaissance**

The first phase builds a comprehensive map of the application's attack surface. Shaart analyzes the source code and integrates with tools like Nmap and Subfinder to understand the tech stack and infrastructure. Simultaneously, it performs live application exploration via browser automation to correlate code-level insights with real-world behavior, producing a detailed map of all entry points, API endpoints, and authentication mechanisms for the next phase.

#### **Phase 2: Vulnerability Analysis**

To maximize efficiency, this phase operates in parallel. Using the reconnaissance data, specialized agents for each OWASP category hunt for potential flaws in parallel. For vulnerabilities like Injection and SSRF, agents perform a structured data flow analysis, tracing user input to dangerous sinks. This phase produces a key deliverable: a list of **hypothesized exploitable paths** that are passed on for validation.

#### **Phase 3: Exploitation**

Continuing the parallel workflow to maintain speed, this phase is dedicated entirely to turning hypotheses into proof. Dedicated exploit agents receive the hypothesized paths and attempt to execute real-world attacks using browser automation, command-line tools, and custom scripts. This phase enforces a strict **"No Exploit, No Report"** policy: if a hypothesis cannot be successfully exploited to demonstrate impact, it is discarded as a false positive.

#### **Phase 4: Reporting**

The final phase compiles all validated findings into a professional, actionable report. An agent consolidates the reconnaissance data and the successful exploit evidence, cleaning up any noise or hallucinated artifacts. Only verified vulnerabilities are included, complete with **reproducible, copy-and-paste Proof-of-Concepts**, delivering a final pentest-grade report focused exclusively on proven risks.


## 📋 Coverage and Roadmap

For detailed information about Shaart's security testing coverage and development roadmap, see our [Coverage and Roadmap](./COVERAGE.md) documentation.

## ⚠️ Disclaimers

### Important Usage Guidelines & Disclaimers

Please review the following guidelines carefully before using Shaart (Lite). As a user, you are responsible for your actions and assume all liability.

#### **1. Potential for Mutative Effects & Environment Selection**

This is not a passive scanner. The exploitation agents are designed to **actively execute attacks** to confirm vulnerabilities. This process can have mutative effects on the target application and its data.

> [!WARNING]
> **⚠️ DO NOT run Shaart on production environments.**
>
> - It is intended exclusively for use on sandboxed, staging, or local development environments where data integrity is not a concern.
> - Potential mutative effects include, but are not limited to: creating new users, modifying or deleting data, compromising test accounts, and triggering unintended side effects from injection attacks.

#### **2. Legal & Ethical Use**

Shaart is designed for legitimate security auditing purposes only.

> [!CAUTION]
> **You must have explicit, written authorization** from the owner of the target system before running Shaart.
>
> Unauthorized scanning and exploitation of systems you do not own is illegal and can be prosecuted under laws such as the Computer Fraud and Abuse Act (CFAA). Keygraph is not responsible for any misuse of Shaart.

#### **3. LLM & Automation Caveats**

- **Verification is Required**: While significant engineering has gone into our "proof-by-exploitation" methodology to eliminate false positives, the underlying LLMs can still generate hallucinated or weakly-supported content in the final report. **Human oversight is essential** to validate the legitimacy and severity of all reported findings.
- **Comprehensiveness**: The analysis in Shaart Lite may not be exhaustive due to the inherent limitations of LLM context windows. For a more comprehensive, graph-based analysis of your entire codebase, **Shaart Pro** leverages its advanced data flow analysis engine to ensure deeper and more thorough coverage.

#### **4. Scope of Analysis**

- **Targeted Vulnerabilities**: The current version of Shaart Lite specifically targets the following classes of *exploitable* vulnerabilities:
  - Broken Authentication & Authorization
  - Injection
  - Cross-Site Scripting (XSS)
  - Server-Side Request Forgery (SSRF)
- **What Shaart Lite Does Not Cover**: This list is not exhaustive of all potential security risks. Shaart Lite's "proof-by-exploitation" model means it will not report on issues it cannot actively exploit, such as vulnerable third-party libraries or insecure configurations. These types of deep static-analysis findings are a core focus of the advanced analysis engine in **Shaart Pro**.

#### **5. Cost & Performance**

- **Time**: As of the current version, a full test run typically takes **1 to 1.5 hours** to complete.
- **Cost**: Running the full test using Anthropic's Claude 4.5 Sonnet model may incur costs of approximately **$50 USD**. Please note that costs are subject to change based on model pricing and the complexity of the target application.

#### **6. Windows Antivirus False Positives**

Windows Defender may flag files in `xben-benchmark-results/` or `deliverables/` as malware. These are false positives caused by exploit code in the reports. Add an exclusion for the Shaart directory in Windows Defender, or use Docker/WSL2.


## 📜 License

Shaart Lite is released under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

Shaart is open source (AGPL v3). This license allows you to:
- Use it freely for all internal security testing.
- Modify the code privately for internal use without sharing your changes.

The AGPL's sharing requirements primarily apply to organizations offering Shaart as a public or managed service (such as a SaaS platform). In those specific cases, any modifications made to the core software must be open-sourced.


## 👥 Community & Support

### Community Resources

- 🐛 **Report bugs** via [GitHub Issues](https://github.com/keygraph/shaart/issues)
- 💡 **Suggest features** in [Discussions](https://github.com/keygraph/shaart/discussions)
- 💬 **Join our [Discord](https://discord.gg/u7DRRXrs7H)** for real-time community support

### Stay Connected

- 🐦 **Twitter**: [@KeygraphHQ](https://twitter.com/KeygraphHQ)
- 💼 **LinkedIn**: [Keygraph](https://linkedin.com/company/keygraph)
- 🌐 **Website**: [keygraph.io](https://keygraph.io)



## 💬 Get in Touch

### Interested in Shaart Pro?

Shaart Pro is designed for organizations serious about application security. It offers enterprise-grade features, dedicated support, and seamless CI/CD integration, all powered by our most advanced LLM-based analysis engine. Find and fix complex vulnerabilities deep in your codebase before they ever reach production.

For a detailed breakdown of features, technical differences, and enterprise use cases, see our [complete comparison guide](./SHAART-PRO.md).

<p align="center">
  <a href="https://docs.google.com/forms/d/e/1FAIpQLSf-cPZcWjlfBJ3TCT8AaWpf8ztsw3FaHzJE4urr55KdlQs6cQ/viewform?usp=header" target="_blank">
    <img src="https://img.shields.io/badge/📋%20Express%20Interest%20in%20Shaart%20Pro-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Express Interest">
  </a>
</p>

**Or contact us directly:**

📧 **Email**: [shaart@keygraph.io](mailto:shaart@keygraph.io)

---

<p align="center">
  <b>Built with ❤️ by the Keygraph team</b><br>
  <i>Making application security accessible to everyone</i>
</p>
