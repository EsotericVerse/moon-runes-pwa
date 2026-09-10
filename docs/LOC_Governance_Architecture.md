# LOC Governance Architecture

**Status:** Current public information architecture  
**Updated:** 2026-09-11

`governance.html` is the public governance entry page for LOC. It is intentionally a web overview, not a rulebook. Detailed governance rules remain in dedicated documents and machine-readable policies.

## Public page structure

The governance page has four primary sections:

### 1. 原則 / Principles

Public-facing governance stance.

- 去神格化：LunaRunes may retain rune, lot-drawing and oracle-poem forms, but LOC does not require supernatural assumptions or divine authority.
- 中立：the system does not decide which religion, worldview, life choice or interpretation is the single correct answer.
- 不道德綁架：analysis must not promote majority opinion, social expectation, moral pressure or emotional pressure into an answer the user must obey.
- 分析不等於命令：LOC may analyze language, semantics, context, relations and possibilities; the final judgment remains with the user.

### 2. 版權 / Copyright · Copyleft

The public page gives a concise summary only. Detailed licensing and derivative-use policy is maintained in [`../COPYLEFT.md`](../COPYLEFT.md).

Core direction:

- LOC and LunaRunes are published in a Copyleft / share-alike spirit where the author has the right to grant those freedoms.
- Research, use, quotation and derivative work are allowed subject to the applicable licensing conditions.
- Attribution, provenance and the relationship to upstream LOC / LunaRunes must not be erased.
- A derivative or fork does not automatically become upstream Canon.
- Third-party, private or separately restricted material is not automatically relicensed.
- Consulting, system architecture, governance design and case-specific implementation are separate commercial service scopes.

### 3. 理念 / Zhengde Style Governance Philosophy

`政德風` is Lucas Oscar Wang 政德's broader personal integrated IP style. Governance is one aspect of it, not its full definition.

The governance philosophy is summarized as:

> **校準 + 治理**

First identify semantic position, scope, responsibility and boundary; then decide what should be retained, corrected, separated, superseded or preserved as history.

The goal is governed change rather than permanent fixation: change should retain provenance, context, boundaries and the ability to be reviewed again.

### 4. 文件 / Documents

The public governance page stays concise. Detailed material belongs in extension documents.

Primary references:

- [`../COPYLEFT.md`](../COPYLEFT.md) — copyright, licensing, attribution and derivative use.
- [`LOC_Canon_1.0.docx`](LOC_Canon_1.0.docx) — current LOC Canon document.
- [`../README.md`](../README.md) — repository and public project entry point.
- `LOC_Governance_Architecture.md` — this document; records the governance page's current information architecture.

Additional machine-readable rights, provenance, registry and lifecycle policies may remain under `data/json/` and related technical directories. They extend the governance model but should not turn the public page into a long specification.

## Information architecture rule

```text
Governance (Nav1)
  ├─ 原則
  ├─ 版權
  ├─ 理念
  └─ 文件
```

`Governance` is a first-level navigation domain. The four sections above are its second-level public navigation.

## Separation of responsibilities

```text
Web page          → understand and navigate
Policy document   → licensing / legal / governance detail
Canon             → current authoritative model definition
Registry / JSON   → structured and machine-readable governance data
History / Archive → evolution and preserved prior states
```

The public page should therefore remain readable and concise. Detailed implementation, lifecycle, repository, data and machine-governance rules should be linked as documents rather than expanded inline.
