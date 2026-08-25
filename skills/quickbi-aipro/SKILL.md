---
name: quickbi-aipro
description: Placeholder. Quick BI AIPro data Q&A channel — routes natural-language data questions (metrics, rankings, trends, ratios, YoY/MoM) to AIPro via the Quick BI ABI Chat open API and answers in text and tables only. Use when the user asks data questions against Quick BI datasets.
version: 0.0.1
---

# Quick BI AIPro Data Q&A

> **Status: placeholder.** The workflow below is an outline only — none of the
> steps are authored yet. Do not rely on this skill for real work.

## Scope

TODO — what this skill covers, and what it explicitly does not. Pure data Q&A
only (text and table answers); dashboard / report generation and data asset
management are out of scope for this channel.

## Prerequisites

TODO — required toolchain (Python 3.8+, zero third-party dependencies),
credentials, and workspace access.

## Steps

1. TODO — submit the user's data question as-is (one question = one submission).
2. TODO — read the SSE response in segments until the final result arrives.
3. TODO — handle server counter-questions (time range, caliber) as terminal
   states; relay the user's reply within the same session.
4. TODO — multi-turn follow-ups reusing the same session id.
5. TODO — recover from timeouts and errors via conversation id instead of
   resubmitting.

## Pitfalls

TODO — known traps to document once the workflow is authored.

## Verification

TODO — how to confirm the data Q&A flow works end to end.
