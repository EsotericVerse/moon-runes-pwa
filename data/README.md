# Data Directory

Repository data is organized by **role and lifecycle**, not only by LOC number.

~~~text
data/
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

See [Repository Governance](../docs/REPOSITORY_GOVERNANCE.md) and [JSON Data Map](../docs/JSON_DATA_MAP.md).

Rules:

- `core/`: stable runtime projection; never overrides mother source.
- `registries/`: current structured authority/reference layer.
- `sources/`: governed primary/imported corpora with provenance.
- `search/`: retrieval datasets grouped by domain.
- `generated/`: reproducible derived outputs.
- `archive/`: historical versions excluded from current runtime.
- `experimental/`: research-only datasets.
- `inbox/`: newly imported JSON awaiting governance; not an authority source.
- configuration JSON remains with its owning component.
