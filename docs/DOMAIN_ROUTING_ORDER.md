# Domain Routing Order

**Status:** Current
**Updated:** 2026-09-17

Routing and page composition follow this precedence:

`Domain → Scope → Directory / Path → Feature → Page Composition`

Known governed domains are authoritative. Directory/path rules cannot override the Scope established by a governed domain. Path-only Scope inference is compatibility fallback only when no governed host is available.
