# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately.

- Preferred: GitHub private vulnerability reporting through the Security tab
- Alternative: email `jose@nubisco.io` with the subject `Security: openbridge-marketplace`

Please do not open public GitHub issues for security reports before disclosure is coordinated.

## What to Include

Please provide as much detail as possible:

- Affected version or commit
- Whether the issue impacts the frontend, API server, crawler, or deployment path
- A clear description of the issue and impact
- Steps to reproduce or proof-of-concept details
- Relevant logs, requests, responses, or configuration snippets
- Any suggested mitigation if known

## Scope

In scope:

- Authentication or authorization flaws affecting review, moderation, or admin routes
- XSS, HTML injection, markdown sanitization, or unsafe rendering issues
- SQL injection, SSRF, or server-side request handling vulnerabilities
- Dependency vulnerabilities with practical impact on this project
- Sensitive data exposure through logs, responses, or analytics integration

Out of scope:

- Vulnerabilities in unsupported versions
- Issues requiring unrealistic assumptions with no practical impact
- Abuse or spam reports that do not involve a security vulnerability
- General hardening suggestions without a concrete exploit path

## Response Expectations

This is a community-visible source repository maintained by Nubisco.

- We aim to acknowledge valid reports within 7 business days
- Triage and remediation timelines depend on severity and maintainer availability
- We may ask for additional details to validate and reproduce reports
- Credit can be provided in release notes unless you prefer to remain anonymous
