# Data Directory

Repository data is organized by **role and lifecycle**, not only by LOC number.

~~~text
data/
└─ json/
   ├─ core/
   ├─ registries/
   ├─ search/
   ├─ generated/
   ├─ archive/
   └─ experimental/
~~~

See [Repository Governance](../km/REPOSITORY_GOVERNANCE.md) and [JSON Data Map](../km/JSON_DATA_MAP.md).

Rules:

- `core/`: stable runtime projection; never overrides mother source.
- `registries/`: current structured authority/reference layer.
- `search/`: retrieval datasets grouped by domain.
- `generated/`: reproducible derived outputs.
- `archive/`: historical versions excluded from current runtime.
- `experimental/`: research-only datasets.
- configuration JSON remains with its owning component.
