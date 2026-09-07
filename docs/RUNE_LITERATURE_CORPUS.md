# Rune Literature Corpus

## Purpose

This registry records literature and creative text associated with the 66 Luna Runes.

It is **not** the canonical rune-definition store. Canonical rune meanings remain governed by `LunaRune64.xlsx` and the generated canonical rune data.

## Scope

Each of the 66 runes has its own literature slot in:

`data/json/registries/RUNE_LITERATURE_REGISTRY.json`

Supported material includes:

- prose
- poetry
- lyrics
- fiction excerpts
- quotations / short statements
- notes
- historical text
- other authored creative text

## Entry requirements

Every recorded item should preserve as much source provenance as is actually known:

- `entry_id`
- `text`
- `form`
- `date`
- `source_platform`
- `source_ref`
- `source_title`
- `tags`
- `relation_note`
- `status`

Unknown metadata stays blank. Do not infer missing dates, authorship, or source references.

## Governance

1. Literature does not overwrite Canon definitions.
2. Model-generated text is not stored as historical user literature unless explicitly approved as a new authored work.
3. One text may relate to multiple runes, but each rune relationship should state why.
4. Search treats rune literature as **text content**. Rune identity remains metadata, not a separate search silo.
5. Source platform remains searchable independently (Facebook, Threads, Suno, Instagram, LOC internal data).

## Search behavior

Once entries are populated, Unified Search can retrieve them through ordinary text search. Results preserve:

- rune number / rune name
- original literature text
- source
- date
- form
- tags
- relation note

This allows later analysis of how a rune's literary expression changes over time without changing its canonical definition.
