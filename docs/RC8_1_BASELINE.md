# LOC RC8.1 Stable Baseline

**Status:** Release Candidate 8.1 baseline frozen  
**Freeze date:** 2026-09-30 (Asia/Taipei)  
**Baseline parent:** `26a35dc6f70279760bc912128811dffc0a2239ad`

RC8.1 is a stabilization candidate built on the RC8 Current architecture baseline. It does not reopen the SSOT, routing, permission, or retired-architecture decisions fixed in RC8.

## RC8.1 changes

- Scope Theme identity is isolated by Scope.
  - LOC keeps automatic day/night behavior in Asia/Taipei.
  - Author Scope uses the Link theme.
  - LunaRunes uses the Mineral theme.
- Light-theme identity is more distinct:
  - Link moves to violet/lavender.
  - Mineral moves to a moonlit metallic-gold range.
  - Order remains white.
- Culture source presentation is consolidated toward broad source categories:
  - Facebook
  - Threads
  - IG
  - Twitter(X)
  - YouTube
  - Others
- Reels are treated as IG rather than a separate multimedia Culture category.
- Separate Culture multimedia classification is removed from the Current personal Culture surface.
- Statistics source grouping uses the same broad categories.
- Personal Scope source groups can expose raw-source detail; LOC aggregate statistics remain overview-only.
- Separate media-type statistics are removed where source statistics already cover the same provenance.
- Meta Tag statistics exclude structural/configuration labels that would distort content ranking:
  - 正位
  - 半正位
  - 半逆位
  - 逆位
  - 男聲
  - 女聲
  - 合唱
- Media Meta Tag weighting currently uses global tag frequency as a prototype for keyword-weight testing.
- The current client prototype retains only the top 100 ranked media IDs per tag in transient query memory.

## Verification / acceptance

Before this freeze, the Current main deployment at `26a35dc6f70279760bc912128811dffc0a2239ad` completed successfully for:

- GitHub Pages build
- GitHub Pages deployment
- Cloudflare Pages deployment

The author also confirmed the new Scope Theme colors on-device and accepted the current Theme result.

Existing management-menu behavior had already passed prior manual inspection and is not an RC8.1 blocker.

## Deferred from RC8.1

Keyword-weight performance is not considered fully validated yet. The current implementation is retained as a test surface, but keyword performance is not an RC8.1 release gate.

The proposed Neon cache table `silver.cache_uid100` is **not present in production Neon** and is explicitly deferred for later testing. RC8.1 does not depend on it.

No persistent ranking snapshot, materialized ranking cache, JSON authority, or duplicate corpus authority is introduced by this freeze.

## RC8 invariants retained

All RC8 invariants in `docs/RC8_BASELINE.md` remain in force unless this document explicitly narrows a UI/statistical presentation behavior. In particular:

- Neon remains the Current SSOT.
- JSON / legacy JS / static snapshots do not become Current authority or fallback.
- Retired LOC1–8 runtime architecture does not return.
- Galaxy UID identity remains canonical.
- Multimedia remains governed as media/relationship data rather than fabricated empty text.
- Asia/Taipei remains the time-zone baseline.

## Next stage

RC8.1 is the Current stabilization reference. Further keyword/cache experiments, deeper management refinements, Game completion, and remaining product completion work continue after this freeze toward RC9.
