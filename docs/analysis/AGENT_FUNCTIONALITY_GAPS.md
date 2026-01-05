# Análisis: Gaps para Funcionalidad 100% con Agentes de IA

**Fecha**: 2026-01-05 (Actualizado)
**Versión analizada**: Cortex v0.5.5 (`@ecuabyte/*` scope)
**Autor**: Análisis automatizado

---

## Resumen Ejecutivo

Cortex **NO es solo una base de datos**. Ya tiene implementadas las 5 primitivas core, búsqueda semántica con embeddings, un servidor MCP con 7 herramientas, CLI, y extensión VS Code con AI Scanner. El proyecto ha avanzado significativamente desde el análisis inicial.

### Estado Actual vs. Funcionalidad Completa

| Componente | Estado Anterior | Estado Actual (v0.5.5) |
|------------|-----------------|------------------------|
| Storage (SQLite + FTS5) | ✅ 100% | ✅ 100% |
| 5 Primitivas Core | ✅ 100% | ✅ 100% |
| MCP Server | ✅ Básico | ✅ 7 tools (incl. scan) |
| **Búsqueda Semántica** | ❌ Solo keywords | ✅ **IMPLEMENTADO** (Ollama/OpenAI) |
| **Hybrid Routing** | ❌ No existía | ✅ **IMPLEMENTADO** (40% semantic) |
| **Project Scanner** | ❌ No existía | ✅ **IMPLEMENTADO** |
| Token Management | ⚠️ Básico | ⚠️ Básico (length/4) |
| Agent Feedback Loop | ❌ 0% | ❌ 0% |
| Session Awareness | ❌ 0% | ❌ 0% |
| Observabilidad | ❌ 0% | ❌ 0% |

---

## ✅ Gaps RESUELTOS (desde análisis anterior)

### Gap #1: Búsqueda Semántica con Embeddings - ✅ RESUELTO

**Implementación actual** (`packages/core/src/embeddings.ts`):

```typescript
// Soporta Ollama (local) y OpenAI (cloud fallback)
export class OllamaEmbeddings implements IEmbeddingProvider {
  readonly model: string;      // nomic-embed-text, bge-m3, etc.
  readonly dimensions: number; // 768, 1024, etc.

  async embed(text: string): Promise<number[]>;
  async embedBatch(texts: string[]): Promise<number[][]>;
  async isAvailable(): Promise<boolean>;
}

// Búsqueda semántica en storage
async searchSemantic(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult[]>
```

**Routing híbrido** (`packages/core/src/router.ts`):

```typescript
const DEFAULT_WEIGHTS: ScoringWeights = {
  recency: 0.15,
  tagMatch: 0.15,
  typePriority: 0.1,
  keywordDensity: 0.2,
  semantic: 0.4,  // ← 40% peso a similitud semántica
};
```

### Gap #2 (parcial): Project Scanner - ✅ RESUELTO

**Implementación actual** (`packages/core/src/scanner.ts`):
- Escanea README, ARCHITECTURE, docs
- Extrae TODOs/FIXMEs de código
- Parsea package.json, docker-compose, tsconfig
- Nueva MCP tool: `cortex_scan`

---

## ❌ Gaps PENDIENTES

### Gap #1: Feedback Loop del Agente (CRÍTICO)

**Problema**: El agente no puede indicar si el contexto fue útil. Sin feedback, el sistema no aprende.

**Solución Requerida**:

```typescript
// Nueva MCP tool: cortex_feedback
{
  name: 'cortex_feedback',
  description: 'Provide feedback on context relevance to improve future routing',
  inputSchema: {
    properties: {
      memoryIds: { type: 'array', items: { type: 'number' } },
      wasHelpful: { type: 'boolean' },
      taskCompleted: { type: 'boolean' },
      notes: { type: 'string' }
    }
  }
}
```

**Implementación propuesta** (`packages/core/src/feedback.ts`):

```typescript
interface FeedbackEntry {
  memoryId: number;
  taskHash: string;
  wasHelpful: boolean;
  relevanceScore: number;
  timestamp: string;
}

class ContextFeedback {
  async recordFeedback(entry: FeedbackEntry): Promise<void>;
  async getMemoryEffectiveness(memoryId: number): Promise<number>;
  async boostMemory(memoryId: number, amount: number): Promise<void>;
}
```

**Prioridad**: 🔴 **CRÍTICA** - Diferenciador clave vs competencia

---

### Gap #2: Session Awareness (IMPORTANTE)

**Problema**: Cada llamada MCP es stateless. No hay tracking de conversación.

**Comparación con competencia**:
- **Windsurf Cascade**: Mantiene contexto de sesión automáticamente
- **Mem0**: Session-based memory storage
- **Zep**: Session management con summarization

**Solución Requerida**:

```typescript
// Nueva MCP tool: cortex_session
{
  name: 'cortex_session',
  inputSchema: {
    properties: {
      action: { enum: ['start', 'update', 'end', 'get'] },
      sessionId: { type: 'string' },
      currentTask: { type: 'string' },
      usedMemoryIds: { type: 'array' }
    }
  }
}
```

**Prioridad**: 🟡 **IMPORTANTE** - Necesario para competir con Mem0/Zep

---

### Gap #3: Observabilidad y Métricas (MEDIO)

**Problema**: No hay visibilidad de:
- Uso de memorias
- Efectividad del routing
- Queries más comunes
- Performance

**Solución Requerida**:

```typescript
// Nueva MCP tool: cortex_metrics
{
  name: 'cortex_metrics',
  inputSchema: {
    properties: {
      type: { enum: ['usage', 'performance', 'top-memories', 'health'] }
    }
  }
}
```

**Prioridad**: 🟢 **MEDIA** - Importante para enterprise

---

### Gap #4: Token Management Real (BAJO)

**Problema**: Estimación actual es `Math.ceil(content.length / 4)`.

**Estado**: Los context windows modernos (200K+ tokens) hacen esto menos crítico. Claude, Cursor, y Windsurf manejan esto internamente.

**Prioridad**: 🟢 **BAJA** - Nice to have

---

## Matriz de Prioridades Actualizada

| Gap | Impacto | Esfuerzo | Prioridad | Diferenciador |
|-----|---------|----------|-----------|---------------|
| Feedback Loop | 🔴 Alto | 🟡 Medio | **P0** | ⭐ Único en el mercado |
| Session Management | 🟡 Medio | 🟡 Medio | **P1** | Paridad con Mem0/Zep |
| Observabilidad | 🟢 Medio | 🟢 Bajo | **P2** | Enterprise readiness |
| Token Management | 🟢 Bajo | 🟢 Bajo | **P3** | Nice to have |

---

## Roadmap de Implementación Actualizado

### Sprint 1: Feedback Loop (1-2 semanas)
1. [ ] Crear tabla `feedback` en SQLite
2. [ ] Implementar `ContextFeedback` class
3. [ ] Agregar `cortex_feedback` MCP tool
4. [ ] Integrar feedback scores en routing

### Sprint 2: Session Management (1-2 semanas)
1. [ ] Crear `SessionManager` class
2. [ ] Agregar `cortex_session` MCP tool
3. [ ] Tracking de memorias usadas por sesión
4. [ ] Auto-cleanup de sesiones inactivas

### Sprint 3: Observabilidad (1 semana)
1. [ ] Implementar `Telemetry` class
2. [ ] Agregar tracking a operaciones
3. [ ] Crear `cortex_metrics` MCP tool
4. [ ] CLI command `cortex stats --detailed`

---

## Conclusión

Cortex v0.5.5 ya resolvió el gap más crítico (búsqueda semántica). Los gaps restantes son:

1. **Feedback Loop** - El más importante para diferenciarse
2. **Session Management** - Necesario para paridad competitiva
3. **Observabilidad** - Para enterprise readiness

El enfoque debería estar en **feedback loop** ya que ningún competidor (Mem0, Zep, Letta) lo ofrece de manera integrada con MCP.
