# Work Smarter Digital — med spa demo

Band It demo for **[Work Smarter Digital](https://worksmarterdigital.com)** — white-label **HighLevel** CRM and marketing for **medical spas** in the DC metro region.

| Path | Purpose |
|------|---------|
| [worksmarter-medspa-discovery.md](./worksmarter-medspa-discovery.md) | **Master design doc** — four agents, signals, legal boundaries, consent-first acquisition |
| [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md) | **Consent pilot** — SMS GLOW, web agent, partner embed (no paid social ads) |
| [guest-post-publish-cat-potomac-skin-care.md](./guest-post-publish-cat-potomac-skin-care.md) | **Publish Cat** — guest posts on invited sites (design only; when client-ready) |
| [social-cat-campaign-copilot-potomac-skin-care.md](./social-cat-campaign-copilot-potomac-skin-care.md) | **Social Cat** — organic social weekly copilot (design only; when client-ready) |
| [med-spa-opportunity-signals.csv](./med-spa-opportunity-signals.csv) | Layer A — B2B signals (sell Work Smarter to spas) |
| [affluent-consumer-signals.csv](./affluent-consumer-signals.csv) | Layer B — B2C signals (C01–C17) |
| [affluent-dmv-zips.csv](./affluent-dmv-zips.csv) | Affluent zip reference table |
| [sample-med-spas-dmv.csv](./sample-med-spas-dmv.csv) | Seed universe for demo / v1 script |
| [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md) | Layer B segments, copy, HighLevel shape |
| [campaign-clients-potomac-skin-care.csv](./campaign-clients-potomac-skin-care.csv) | Ten synthetic archetypes |
| [campaign-leads-research-template.csv](./campaign-leads-research-template.csv) | Public-role research template |
| [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv) | Ten real public-role leads (angles only) |
| [campaign-leads-research-howto.md](./campaign-leads-research-howto.md) | Research method + contact rules |
| [consented-leads-template.csv](./consented-leads-template.csv) | Opt-in inbound leads for Agent 4 nurture |
| [potomac-skin-care-gold-path.csv](./potomac-skin-care-gold-path.csv) | Gold-path seed — real Potomac Skin Care row |
| `output/potomac-consent-cat-*.json` | Cat Bot roam evidence + return packet (generated) |

## Run Potomac Consent Cat (gold-path roam)

```bash
python docs/design/signal-processing/scripts/run_potomac_consent_cat_v0.py --no-synthesize
```

Requires repo `.env`: `GOOGLE_PLACES_API_KEY`, `YELP_API_KEY`. Optional: `GEMINI_API_KEY` for LLM packet (preferred); `ANTHROPIC_API_KEY` as fallback. Reddit off until API approved (`--reddit` to enable).

---

```text
[Agent 1: Spa opportunity] → [Human: buy]
    → [Agent 2: Segments] → [Agent 3: Consent machines]
        → [Human: go live] → [Opt-in leads]
            → [Agent 4: Nurture] → [HighLevel]
```

**No paid Meta / Google / LinkedIn / TikTok ads in v0 pilot.**

## Related

- [Band It outbound discovery](../band-it-outbound-discovery.md) — same scoring playbook, different vertical  
- [Agent workflow composition](../../agent-workflow-composition.md) — node types and human checkpoints  
- [signal-processing README](../README.md)
