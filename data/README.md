# Data Directory

Repository data is organized by **role and lifecycle**, not only by LOC number.

~~~text
data/
├─ lunarunes/
│  └─ source/
│     └─ LunaRune66.xlsx
├─ source/
│  └─ all.xlsx
└─ json/
   ├─ core/
   ├─ registries/
   ├─ sources/
   ├─ search/
   ├─ generated/
   ├─ archive/
   ├─ experimental/
   └─ inbox/
~~~

Repository and data governance are maintained in [`governance.html`](../governance.html).

Rules:

- `lunarunes/source/`: LunaRunes mother/source workbooks; source authority is preserved here rather than at repository root.
- `source/`: retained source workbooks or imported source assets awaiting narrower domain classification; `all.xlsx` is preserved here until its authority/supersession status is explicitly resolved.
- `core/`: stable runtime projection; never overrides mother source.
- `registries/`: current structured authority/reference layer.
- `sources/`: governed primary/imported corpora with provenance.
- `search/`: retrieval datasets grouped by domain.
- `generated/`: reproducible derived outputs.
- `archive/`: historical versions excluded from current runtime.
- `experimental/`: research-only datasets.
- `inbox/`: newly imported JSON awaiting governance; not an authority source.
- configuration JSON remains with its owning component.
