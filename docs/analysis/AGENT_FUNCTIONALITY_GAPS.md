# Análisis: Gaps para Funcionalidad 100% con Agentes de IA

**Fecha**: 2026-01-04
**Versión analizada**: Cortex v0.3.0
**Autor**: Análisis automatizado

---

## Resumen Ejecutivo

Cortex **NO es solo una base de datos**. Ya tiene implementadas las 5 primitivas core (store, get, route, guard, fuse), un servidor MCP funcional, CLI, y extensión VS Code. Sin embargo, para ser **100% funcional con agentes de IA**, hay gaps críticos que necesitan ser abordados.

### Estado Actual vs. Funcionalidad Completa

| Componente | Implementado | Para 100% Funcional |
|------------|-------------|---------------------|
| Storage (SQLite + FTS5) | ✅ 100% | ✅ Completo |
| 5 Primitivas Core | ✅ 100% | ✅ Completo |
| MCP Server | ✅ 100% | 🔶 Falta proactividad |
| Búsqueda | ✅ Keyword-based | ❌ Falta semántica |
| Token Management | ⚠️ Básico | ❌ Falta integración real |
| Agent Feedback Loop | ❌ 0% | ❌ Crítico |
| Session Awareness | ❌ 0% | ❌ Necesario |
| Observabilidad | ❌ 0% | ❌ Importante |

---

## Gap #1: Búsqueda Semántica con Embeddings (CRÍTICO)

### Problema Actual
El `ContextRouter` (línea 95-127 en `router.ts`) usa FTS5 para búsqueda por keywords:

```typescript
// Actual: búsqueda por palabras clave
const searchQuery = keywords.join(' ');
const candidates = await this.store.search(searchQuery, {...});
```

**Limitación**: Si el agente busca "authentication" pero la memoria dice "login system with OAuth", no habrá match semántico.

### Solución Requerida
Implementar embeddings con `sqlite-vec` (ya en roadmap):

```typescript
// Propuesto: búsqueda semántica
interface SemanticRouteOptions extends RouteOptions {
  embedding?: Float32Array;  // Embedding del task
  semanticWeight?: number;   // Peso vs keyword matching
}

async routeSemantic(options: SemanticRouteOptions): Promise<ScoredMemory[]> {
  // 1. Generar embedding del task
  const taskEmbedding = options.embedding ?? await this.embed(options.task);

  // 2. Buscar por similitud vectorial
  const semanticResults = await this.store.vectorSearch(taskEmbedding, {
    limit: options.limit * 3
  });

  // 3. Combinar con FTS5 para hybrid search
  const ftsResults = await this.store.search(keywords, {...});

  // 4. Fusionar y re-rankear
  return this.hybridRank(semanticResults, ftsResults, options);
}
```

### Archivos a Modificar
- `packages/core/src/storage.ts` - Agregar tabla de vectores y `vectorSearch()`
- `packages/core/src/router.ts` - Implementar `routeSemantic()` y hybrid ranking
- `packages/core/src/embedder.ts` - **NUEVO**: Clase para generar embeddings

### Prioridad: **CRÍTICA** - Sin esto, el routing es fundamentalmente limitado

---

## Gap #2: Feedback Loop del Agente (CRÍTICO)

### Problema Actual
El agente usa `cortex_context` para obtener contexto, pero:
- No hay forma de indicar si el contexto fue útil
- El sistema no aprende de las interacciones
- No hay métricas de relevancia real

### Solución Requerida
Nueva herramienta MCP `cortex_feedback`:

```typescript
// Nueva tool MCP
{
  name: 'cortex_feedback',
  description: 'Provide feedback on context relevance to improve future routing',
  inputSchema: {
    type: 'object',
    properties: {
      memoryId: { type: 'number', description: 'ID of the memory used' },
      wasHelpful: { type: 'boolean', description: 'Was this context helpful?' },
      taskCompleted: { type: 'boolean', description: 'Was the task completed successfully?' },
      relevanceScore: { type: 'number', description: 'Relevance 1-5' }
    }
  }
}
```

### Implementación en Core

```typescript
// packages/core/src/feedback.ts
interface FeedbackEntry {
  memoryId: number;
  taskHash: string;       // Hash del task description
  wasHelpful: boolean;
  relevanceScore: number;
  timestamp: string;
}

class ContextFeedback {
  async recordFeedback(entry: FeedbackEntry): Promise<void>;
  async getMemoryEffectiveness(memoryId: number): Promise<number>;
  async adjustWeights(memoryId: number, boost: number): Promise<void>;
}
```

### Prioridad: **CRÍTICA** - Sin feedback, el sistema no puede mejorar

---

## Gap #3: Session Awareness (IMPORTANTE)

### Problema Actual
Cada llamada MCP es stateless. El agente no puede:
- Indicar "esta es la misma sesión de trabajo"
- Obtener contexto de la conversación actual
- Evitar repetir los mismos contextos

### Solución Requerida

```typescript
// Nueva herramienta MCP
{
  name: 'cortex_session',
  description: 'Manage context session for multi-turn conversations',
  inputSchema: {
    properties: {
      action: { enum: ['start', 'update', 'end'] },
      sessionId: { type: 'string' },
      currentTask: { type: 'string' },
      usedMemoryIds: { type: 'array', items: { type: 'number' } }
    }
  }
}
```

### Implementación en Core

```typescript
// packages/core/src/session.ts
interface AgentSession {
  id: string;
  startedAt: string;
  currentTask: string;
  usedMemoryIds: Set<number>;  // Evitar repetir
  contextBudget: number;       // Tokens restantes
}

class SessionManager {
  private sessions: Map<string, AgentSession>;

  start(task: string): string;
  update(sessionId: string, usedIds: number[]): void;
  getUnusedContext(sessionId: string, options: RouteOptions): Promise<Memory[]>;
  end(sessionId: string): void;
}
```

### Prioridad: **IMPORTANTE** - Mejora significativamente la experiencia multi-turn

---

## Gap #4: Token Management Real (IMPORTANTE)

### Problema Actual
El `ContextFuser` tiene `maxTokens` pero no hay:
- Estimación real de tokens (solo aproximación por caracteres)
- Integración con el límite de contexto del modelo
- Compresión inteligente cuando excede

Código actual en `fuser.ts`:
```typescript
// Aproximación básica
const estimatedTokens = Math.ceil(content.length / 4);
```

### Solución Requerida

```typescript
// packages/core/src/tokenizer.ts
import { encoding_for_model } from 'tiktoken';

class TokenEstimator {
  private encoder: Tiktoken;

  constructor(model: 'gpt-4' | 'claude-3' | 'claude-opus') {
    this.encoder = encoding_for_model(model);
  }

  count(text: string): number {
    return this.encoder.encode(text).length;
  }

  truncateToLimit(text: string, maxTokens: number): string;
  compressContext(memories: Memory[], maxTokens: number): Memory[];
}
```

### Prioridad: **IMPORTANTE** - Evita context overflow

---

## Gap #5: Proactive Context Injection (MEDIO)

### Problema Actual
El agente debe llamar explícitamente a `cortex_context`. No hay:
- Inyección automática de contexto relevante
- Triggers basados en patrones de conversación
- Pre-carga de contexto para tareas comunes

### Solución Propuesta
Implementar un "Context Observer" en el MCP server:

```typescript
// packages/mcp-server/src/observer.ts
class ContextObserver {
  // Analiza el prompt del agente y sugiere contexto
  async analyzePrompt(prompt: string): Promise<Memory[] | null> {
    const patterns = this.detectPatterns(prompt);
    if (patterns.length > 0) {
      return await this.router.route({ task: prompt, limit: 3 });
    }
    return null;
  }

  private detectPatterns(prompt: string): string[] {
    // Detectar: "implement", "fix bug", "add feature", etc.
  }
}
```

### MCP Resources (auto-injected)

```typescript
// Exponer como MCP Resource en lugar de Tool
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [{
    uri: 'cortex://context/auto',
    name: 'Auto-injected context',
    description: 'Automatically selected context for current conversation'
  }]
}));
```

### Prioridad: **MEDIA** - Nice to have, mejora UX

---

## Gap #6: Observabilidad y Métricas (MEDIO)

### Problema Actual
No hay forma de saber:
- Cuántas veces se usa cada memoria
- Qué queries son más comunes
- Efectividad del routing
- Performance del sistema

### Solución Requerida

```typescript
// packages/core/src/telemetry.ts
interface UsageMetrics {
  memoryId: number;
  accessCount: number;
  lastAccessed: string;
  averageRelevanceScore: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

interface SystemMetrics {
  totalQueries: number;
  avgQueryLatency: number;
  cacheHitRate: number;
  topKeywords: string[];
}

class Telemetry {
  track(event: 'search' | 'add' | 'route' | 'feedback', data: object): void;
  getMemoryMetrics(memoryId: number): UsageMetrics;
  getSystemMetrics(): SystemMetrics;
}
```

### Nueva Tool MCP

```typescript
{
  name: 'cortex_metrics',
  description: 'Get usage metrics and system health',
  inputSchema: {
    properties: {
      type: { enum: ['memory', 'system', 'top-used'] }
    }
  }
}
```

### Prioridad: **MEDIA** - Importante para optimización

---

## Gap #7: Multi-Agent Coordination (BAJO)

### Problema Actual
Si múltiples agentes trabajan en el mismo proyecto:
- No hay locks para evitar conflictos
- No hay awareness de lo que otros agentes están haciendo
- No hay compartición de contexto de sesión

### Solución Futura

```typescript
// packages/core/src/coordination.ts
class AgentCoordinator {
  async acquireLock(agentId: string, memoryId: number): Promise<boolean>;
  async releaseLock(agentId: string, memoryId: number): void;
  async broadcastContext(agentId: string, context: Memory): void;
  async getActiveAgents(): Promise<string[]>;
}
```

### Prioridad: **BAJA** - Escenario avanzado

---

## Roadmap de Implementación Sugerido

### Sprint 1: Fundamentos Semánticos (2-3 semanas)
1. [ ] Integrar `sqlite-vec` para almacenar embeddings
2. [ ] Crear `Embedder` class con soporte para modelos locales
3. [ ] Implementar `vectorSearch()` en MemoryStore
4. [ ] Actualizar `ContextRouter` con hybrid search

### Sprint 2: Feedback & Sessions (2 semanas)
1. [ ] Implementar `ContextFeedback` class
2. [ ] Agregar `cortex_feedback` MCP tool
3. [ ] Crear `SessionManager` para tracking de sesiones
4. [ ] Agregar `cortex_session` MCP tool

### Sprint 3: Token Management (1 semana)
1. [ ] Integrar tokenizer real (tiktoken o similar)
2. [ ] Actualizar `ContextFuser` con conteo preciso
3. [ ] Implementar compresión inteligente de contexto

### Sprint 4: Observabilidad (1 semana)
1. [ ] Implementar `Telemetry` class
2. [ ] Agregar tracking a todas las operaciones
3. [ ] Crear `cortex_metrics` MCP tool
4. [ ] Dashboard básico en CLI

---

## Conclusión

Cortex tiene una **base sólida** (no es "solo una DB"), pero para ser 100% funcional con agentes necesita:

| Gap | Impacto | Esfuerzo | Prioridad |
|-----|---------|----------|-----------|
| Búsqueda Semántica | 🔴 Alto | 🔴 Alto | P0 |
| Feedback Loop | 🔴 Alto | 🟡 Medio | P0 |
| Session Awareness | 🟡 Medio | 🟡 Medio | P1 |
| Token Management | 🟡 Medio | 🟢 Bajo | P1 |
| Proactive Injection | 🟢 Bajo | 🟡 Medio | P2 |
| Observabilidad | 🟢 Bajo | 🟢 Bajo | P2 |
| Multi-Agent | 🟢 Bajo | 🔴 Alto | P3 |

**El gap más crítico es la búsqueda semántica** - sin embeddings, el sistema depende de keyword matching que es fundamentalmente limitado para entender la intención del agente.

---

## Próximos Pasos Recomendados

1. **Inmediato**: Abrir issues para cada gap crítico (P0)
2. **Corto plazo**: Implementar embeddings con sqlite-vec
3. **Medio plazo**: Agregar feedback loop y session management
4. **Largo plazo**: Observabilidad y optimizaciones avanzadas
