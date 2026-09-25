# Data Directory

The data directory stores frozen source workbooks, provenance records and migration evidence. It is not a website runtime data store.

~~~text
data/
├─ lunarunes/
│  └─ source/
│     └─ LunaRune66.xlsx
├─ source/
│  └─ all.xlsx
└─ records/
   └─ rune-readings/
~~~

The website reads canonical content from Neon through the Next.js static-export runtime clients. Do not add data/json, runtime JSON snapshots, copied projections, or local JSON caches.

Rules:

- lunarunes/source/: frozen LunaRunes mother/source workbooks.
- source/: retained source workbooks awaiting narrower governance.
- records/: explicit repository records and audit notes, not website canonical content.
- Neon silver tables are the canonical runtime content layer.
- Neon link tables store scope membership and statistics/search inclusion by ID; they do not copy content.
- Package/tool configuration files remain with their owning component when a tool requires them.
