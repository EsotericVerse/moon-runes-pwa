# Services

Deployable machine/edge services belong here.

Target layout:

```text
services/
  api/
  cloudflare/
```

Do not create new top-level feature-specific API directories. Existing `card_api/` and `loc8_api/` are legacy migration targets and remain in place until their runtime consumers are audited.