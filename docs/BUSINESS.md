# Cortex - Business Model

> Revenue strategy and market positioning for Cortex.

## Value Proposition

**For individual developers**: Stop repeating context to AI tools. Cortex remembers your project decisions, patterns, and conventions across all sessions.

**For teams**: Share institutional knowledge. New team members get context instantly. Decisions persist beyond chat history.

**For enterprises**: Keep sensitive code context local. Audit trail of AI interactions. Compliance-friendly architecture.

## Market Validation

### Competitor Traction

| Company | Funding | Traction | Valuation |
|---------|---------|----------|-----------|
| [Mem0](https://mem0.ai) | [$24M Series A](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps/) | 41K GitHub stars, 14M downloads | Est. $100-200M |
| [Letta](https://letta.com) | [$10M Seed](https://techcrunch.com/2024/09/23/letta-one-of-uc-berkeleys-most-anticipated-ai-startups-has-just-come-out-of-stealth/) | MemGPT creators, Felicis-backed | Est. $40-60M |

**Validation**: Investors are betting $34M+ on AI memory solutions. Market is early.

### MCP Ecosystem Growth

- [10,000+ MCP servers published](https://thenewstack.io/ai-engineering-trends-in-2025-agents-mcp-and-vibe-coding/) as of 2025
- [Linux Foundation adopted MCP](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation) (Dec 2025)
- AWS chose Mem0 as [exclusive memory provider for Agent SDK](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps/)

**Opportunity**: MCP is becoming the standard. Tools that integrate well will win.

## Positioning

### vs Mem0 (Main Competitor)

| Factor | Cortex | Mem0 |
|--------|--------|------|
| **Deployment** | Local-first | Cloud-only |
| **Privacy** | Data on your machine | Data on their servers |
| **Pricing** | Transparent tiers | Usage-based (can spike) |
| **Offline** | Works offline | Requires internet |
| **Target** | Privacy-conscious devs | Enterprise API users |

**Our niche**: Developers who want memory but won't send code to cloud.

### Target Customer Profile

**Ideal Customer**:
- Solo developer or small team (1-5)
- Privacy-conscious (finance, healthcare, government contractors)
- Uses VS Code + Claude/Copilot
- Tired of repeating context

**Not ideal**:
- Large enterprises (yet) - need more features
- Teams requiring real-time collaboration - not our focus initially

## Revenue Model

### Pricing Tiers

Based on [MCP monetization patterns](https://cline.bot/blog/building-the-mcp-economy-lessons-from-21st-dev-and-the-future-of-plugin-monetization) and [21st.dev model](https://jowwii.medium.com/how-to-monetize-your-mcp-server-proven-architecture-business-models-that-work-c0470dd74da4):

| Tier | Price | Target | Features |
|------|-------|--------|----------|
| **Free** | $0 | Hobbyists | 1 project, 500 memories, local only |
| **Pro** | $19/mo | Indie devs | Unlimited projects, cloud sync, analytics |
| **Team** | $49/user/mo | Small teams | Shared context, admin, priority support |
| **Enterprise** | Custom | Large orgs | On-prem, SSO, audit logs, SLA |

### Revenue Projections

**Conservative scenario** (1% of addressable market):

| Milestone | Users | Pro | Team | MRR | ARR |
|-----------|-------|-----|------|-----|-----|
| Month 6 | 1,000 | 25 | 0 | $475 | $5,700 |
| Month 12 | 5,000 | 100 | 10 | $2,390 | $28,680 |
| Month 24 | 20,000 | 500 | 50 | $12,000 | $144,000 |

**Assumptions**:
- 5% free-to-paid conversion (industry avg 2-5%)
- $19 average revenue per user
- 10% monthly churn on free, 5% on paid

### Cost Structure

| Item | Monthly | Notes |
|------|---------|-------|
| VS Code Marketplace | $0 | Free to publish |
| npm registry | $0 | Free for public packages |
| GitHub | $0 | Free for open source |
| Domain (getcortex.dev) | ~$2 | Annual divided |
| Vercel (docs site) | $0-20 | Free tier usually enough |
| **Total** | **~$20** | Extremely lean |

**Unit Economics**:
- CAC: ~$0 (organic through VS Code Marketplace)
- LTV (Pro): $19 × 12 months avg = $228
- LTV:CAC ratio: Excellent (organic acquisition)

## Go-to-Market Strategy

### Phase 1: Developer Awareness (Current)

1. **VS Code Marketplace** - [Already published](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode)
2. **GitHub** - Open source core, attract contributors
3. **Dev.to / Hashnode** - Technical content about context management
4. **Twitter/X** - Build in public, engage AI dev community

### Phase 2: Community Building (Q1 2025)

1. **Discord community** - Direct feedback, support
2. **YouTube tutorials** - Setup guides, use cases
3. **Podcast appearances** - AI tooling podcasts
4. **Conference talks** - Local meetups, virtual conferences

### Phase 3: Paid Acquisition (Q2 2025)

Only after product-market fit:
1. **Google Ads** - "AI memory", "context for coding"
2. **GitHub Sponsors** - Visibility to relevant devs
3. **Newsletter sponsorships** - TLDR, Bytes, etc.

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mem0 dominates with cloud | Medium | High | Double down on local-first |
| IDE vendors build native | Medium | High | MCP standard = portable |
| Low conversion to paid | High | Medium | Strong free tier builds brand |
| Enterprise sales cycle | Medium | Medium | Focus on self-serve first |

## Key Metrics to Track

### Acquisition
- VS Code Marketplace installs (weekly)
- GitHub stars and forks
- npm downloads (@cortex/*)

### Activation
- % who create first memory within 7 days
- % who connect MCP to Claude/Copilot

### Retention
- Weekly active developers
- Memories created per user

### Revenue
- Free to Pro conversion rate
- Monthly churn by tier
- Net Revenue Retention (NRR)

## Exit Scenarios

### Acquisition Targets

Potential acquirers interested in AI context/memory:
- **Microsoft/GitHub** - Integrate into Copilot
- **Anthropic** - Native Claude memory layer
- **JetBrains** - IDE-native context
- **Sourcegraph** - Code intelligence expansion

### Valuation Benchmarks

Based on recent AI tooling acquisitions:
- [Base44 → Wix: $80M](https://www.fastcompany.com/91447642/how-close-is-the-first-solopreneur-unicorn) (6 months post-launch)
- AI SaaS multiples: 10-20x ARR

**Scenarios**:
- $1M ARR → $10-20M valuation
- $5M ARR → $50-100M valuation

## Investment Considerations

### Bootstrap vs Raise

**Current strategy**: Bootstrap

**Reasons**:
1. Low capital requirements (~$20/month)
2. Organic growth via VS Code Marketplace
3. Retain equity and control
4. No investor pressure for hypergrowth

**Would consider raising if**:
- Clear product-market fit ($10K+ MRR)
- Need to outpace Mem0 market capture
- Enterprise features require sales team

### Funding Landscape

If raising becomes relevant:
- **Seed**: $500K-2M for developer tools
- **Relevant investors**: Felicis (backed Letta), a16z (invested in dev tools), YC
- **Pitch angle**: "Local-first alternative to Mem0 for privacy-conscious developers"

## References

### Market Data
- [Mem0 Series A - TechCrunch](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps/)
- [MCP Market Projections](https://medium.com/predict/why-building-an-mcp-server-is-2025s-hottest-tech-opportunity-80049cb73ee5)
- [Linux Foundation MCP Announcement](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)

### Monetization Strategies
- [MCP Server Monetization](https://cline.bot/blog/building-the-mcp-economy-lessons-from-21st-dev-and-the-future-of-plugin-monetization)
- [21st.dev Case Study](https://jowwii.medium.com/how-to-monetize-your-mcp-server-proven-architecture-business-models-that-work-c0470dd74da4)

### Solopreneur Benchmarks
- [Micro-SaaS Success Stories](https://javascript.plainenglish.io/the-micro-saas-boom-how-solo-developers-are-building-50k-month-businesses-41782848571f)
- [Solo Founder Unicorn Potential](https://www.fastcompany.com/91447642/how-close-is-the-first-solopreneur-unicorn)
