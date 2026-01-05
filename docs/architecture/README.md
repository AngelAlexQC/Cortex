# Cortex Documentation

**The Universal Context Layer for AI**

---

## Overview

Cortex is an open platform for how AI systems store, retrieve, and share context. It defines the missing layer between AI models and the tools they use.

```
┌─ AI Applications (Claude, Copilot, Cursor)
├─ Tool Layer (MCP)     ← "How AI DOES things"
├─ Context Layer (Cortex) ← "How AI KNOWS things"
└─ Model Layer (GPT, Claude, Llama)
```

---

## Core Primitives

| Primitive | Description | Documentation |
|-----------|-------------|---------------|
| `ctx/store` | Persist context | [store.md](./primitives/store.md) |
| `ctx/get` | Retrieve context | [get.md](./primitives/get.md) |
| `ctx/route` | Intelligent routing | [route.md](./primitives/route.md) |
| `ctx/guard` | Privacy filtering | [guard.md](./primitives/guard.md) |
| `ctx/fuse` | Combine sources | [fuse.md](./primitives/fuse.md) |

---

## Specification

| Document | Description |
|----------|-------------|
| [SPEC.md](./SPEC.md) | Formal protocol specification v1.0-draft |
| [primitives/](./primitives/) | Detailed primitive documentation |

---

## Principles

1. **Local-First** — Works offline, data never leaves unless you want
2. **User-Owned** — You own your context, not the platforms
3. **Privacy-by-Design** — `ctx/guard` is a primitive, not a plugin
4. **Interoperable** — MCP-native, A2A compatible, works with any AI
5. **Open Standard** — No vendor lock-in, ever

---

## Future Primitives (Reserved)

| Primitive | Purpose | Status |
|-----------|---------|--------|
| `ctx/sync` | Multi-device sync | Planned |
| `ctx/federate` | Cross-org sharing | Planned |
| `ctx/attest` | Verification | Planned |
| `ctx/expire` | Lifecycle | Planned |
| `ctx/observe` | Notifications | Planned |

---

## Implementations

- **Reference Implementation**: [Cortex](https://github.com/EcuaByte-lat/Cortex)
- **MCP Server**: `@cortex/mcp-server`
- **VS Code Extension**: [Cortex](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode)

---

## Contributing

See the [main CONTRIBUTING.md](../../CONTRIBUTING.md) for how to contribute to the protocol specification.
