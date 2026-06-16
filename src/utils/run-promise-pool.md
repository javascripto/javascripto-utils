# Promise Pool — guia das funções

Veja também: [README.md](../../README.md#L1)

Atualizado: 2026-06-15

Executores de tarefas assíncronas com **concorrência controlada**. Em vez de
disparar `Promise.all` (que executa tudo de uma vez) ou rodar em série (lento),
um *pool* mantém no máximo `N` tarefas rodando ao mesmo tempo e vai agendando as
próximas conforme as anteriores terminam. A fonte de tarefas pode ser um array,
um `Iterable` ou um `AsyncIterable`, então o núcleo e o stream conseguem consumir
produtores grandes sob demanda.

Há três funções, todas construídas sobre o mesmo núcleo:

| Função | Retorno | Resultados | Ordem | Memória | Backpressure |
|---|---|---|---|---|---|
| `runPromisePoolCore` (alias `runPromisePool`) | `Promise<void>` | só via callbacks | — | O(1)¹ | via `waitForSpace` |
| `runPromisePoolAndReturn` | `Promise<{ results, errors }>` | arrays | `sorted` (entrada) ou `completion` | O(n) | não |
| `runPromisePoolStream` | `AsyncGenerator<CompletedResult>` | um a um (yield) | conclusão | O(buffer) | via `bufferLimit` |

¹ O núcleo não acumula resultados; o consumo de memória depende do que você faz
nos callbacks.

> **Imports**: reexportadas pelos barrels — importe da raiz `./src`, do módulo
> `./src/utils`, ou pelo caminho do arquivo:
> ```ts
> import {
>   runPromisePool,
>   runPromisePoolAndReturn,
>   runPromisePoolStream,
> } from './src';
> ```

---

## Qual usar?

- **Quero todos os resultados no fim, indexados** (tipo um `Promise.allSettled`
  com limite de concorrência) → **`runPromisePoolAndReturn`**.
- **Quero processar cada resultado conforme ele chega** (pipeline, gravar em
  stream, lidar com produtor muito grande/infinito, aplicar backpressure) →
  **`runPromisePoolStream`**.
- **Quero controle máximo e não quero guardar resultados em memória** (persistir
  cada item você mesmo, milhões de tarefas, construir sua própria abstração) →
  **`runPromisePoolCore`**.

Regra prática: comece pelo `runPromisePoolAndReturn`. Migre para `Stream` quando
precisar consumir incrementalmente ou usar um `AsyncIterable` grande, e para o
`Core` quando precisar de controle fino ou evitar arrays de tamanho O(n).

---

## Tipos

```ts
// Cada tarefa é uma função que recebe um AbortSignal opcional e devolve uma Promise.
type Task<T = unknown> = (signal?: AbortSignal) => Promise<T>;

// A fonte pode ser síncrona ou assíncrona.
type TaskIterable<T = unknown> = Iterable<Task<T>> | AsyncIterable<Task<T>>;

type RetryContext<E = Error> = {
  error: E;
  attempt: number; // 1 = primeira falha, antes do primeiro retry
  index: number;
};

// Resultado de uma tarefa concluída: sucesso OU erro (união discriminada por `ok`).
type CompletedResult<T, E = Error> =
  | { index: number; ok: true; result: T; error?: undefined }
  | { index: number; ok: false; result?: undefined; error: E };
```

Use o campo **`ok`** para discriminar (`if (item.ok) { /* result */ } else { /* error */ }`).
É confiável inclusive quando a tarefa rejeita com um valor *falsy* (`throw 0`)
ou com `undefined` — o que `if (item.error)` não distingue.

A tarefa **recebe um `AbortSignal`** e pode optar por cancelamento cooperativo —
checando `signal.aborted` ou ouvindo o evento `abort` para interromper o
trabalho (ex.: passar o signal para o `fetch`). Uma tarefa que **lança de forma
síncrona** (em vez de retornar uma promise rejeitada) é tratada como qualquer
outra falha — não derruba o pool.

---

## Como usar

### 1) `runPromisePoolAndReturn` — coleta tudo e retorna

```ts
import { runPromisePoolAndReturn } from './src/utils/run-promise-pool-and-return';

const tasks = ids.map(id => async () => fetch(`/api/${id}`).then(r => r.json()));

const { results, errors } = await runPromisePoolAndReturn({
  tasks,
  concurrencyLimit: 10,
});

// results[i] = valor da tarefa i (ou undefined se ela falhou)
// errors[i]  = erro da tarefa i (ou undefined se ela teve sucesso)
```

Ordenação:

```ts
// 'sorted' (padrão): results/errors alinhados pelo índice de entrada.
//   results.length === tasks.length; posições de falha ficam undefined.
//   Para fontes sem length/size conhecido, o tamanho cresce até o maior índice
//   executado.
// 'completion': empurrados na ordem em que terminaram; sem buracos, mas
//   sem correspondência posicional com a entrada.
const { results } = await runPromisePoolAndReturn({
  tasks,
  concurrencyLimit: 10,
  ordering: 'completion',
});
```

### 2) `runPromisePoolStream` — consome conforme conclui

```ts
import { runPromisePoolStream } from './src/utils/run-promise-pool-stream';

for await (const item of runPromisePoolStream({
  tasks,
  concurrencyLimit: 10,
  bufferLimit: 50, // pausa o agendamento se 50 itens ainda não foram consumidos
  onBufferLimitReached: () => console.log('buffer cheio, aplicando backpressure'),
})) {
  if (item.ok) await persist(item.index, item.result); // consuma no seu ritmo
  else console.error(`tarefa ${item.index} falhou`, item.error);
}
```

Cancelar o stream: basta sair do `for await` (`break`/`return`/throw). O gerador
aborta o runner interno; tarefas ativas que observam o `AbortSignal` recebem
`AbortError`.

### 3) `runPromisePoolCore` — controle total, sem coletar resultados

```ts
import { runPromisePool } from './src/utils/run-promise-pool';

let ok = 0;
let failed = 0;

await runPromisePool({
  tasks,
  concurrencyLimit: 50,
  onTaskComplete: item => {
    if (item.ok) ok++;
    else failed++;
    // persista AQUI (DB, arquivo, fila...) — nada é guardado em memória
  },
  onRunningTaskChange: running => updateProgressBar(running),
});
```

---

## Opções

Todas as funções compartilham o mesmo conjunto de opções de controle (o `Core`
expõe ainda `waitForSpace`; o `Stream` expõe `bufferLimit`).

| Opção | Tipo | Padrão | Descrição |
|---|---|---|---|
| `tasks` | `TaskIterable<T>` | — (obrigatório) | Array, `Iterable` ou `AsyncIterable` de funções que retornam `Promise`. |
| `concurrencyLimit` | `number` | `300` | Máximo de tarefas simultâneas. Valores não inteiros são truncados (`2.9 → 2`); `< 1` ou não finito lança `RangeError`. |
| `ordering` | `'sorted' \| 'completion'` | `'sorted'` | **Só `runPromisePoolAndReturn`.** Ordena por índice de entrada ou por conclusão. |
| `bufferLimit` | `number` | — | **Só `runPromisePoolStream`.** Pausa o agendamento enquanto houver `bufferLimit` itens não consumidos. |
| `onBufferLimitReached` | `() => void` | — | **Só `Stream`.** Chamado quando o buffer enche. |
| `taskExecutionTimeout` | `number` (ms) | — (sem timeout) | Timeout por tarefa; ao estourar, a tarefa rejeita com `PromiseTimeoutError`. |
| `retryCount` | `number` | `0` | Tentativas extras após uma falha. Deve ser inteiro não negativo. |
| `retryDelay` | `number \| (ctx) => number` | `0` | Delay em ms antes de cada retry. `ctx.attempt` é a falha que será tentada de novo. |
| `shouldRetry` | `(ctx) => boolean` | — | Predicado para decidir se um erro deve ser tentado novamente. Se lançar, não há retry. |
| `signal` | `AbortSignal` | — | Cancelamento externo (veja abaixo). |
| `failFast` | `boolean` | `false` | Para de agendar no 1º erro final e rejeita com `FailFastError`. Não aborta tarefas em execução por padrão. |
| `abortOnFailFast` | `boolean` | `false` | Se `true`, aborta tarefas em execução quando `failFast` é acionado. |
| `errorsCountLimit` | `number` | `Infinity` | Ao atingir N erros, rejeita com `ErrorsCountLimitReachedError`. |
| `abortOnErrorsLimit` | `boolean` | `false` | Se `true`, aborta as tarefas em execução ao atingir `errorsCountLimit`. |
| `stopWhen` | `(r: CompletedResult) => boolean` | — | Predicado avaliado a cada conclusão; veja abaixo. |
| `waitForSpace` | `() => Promise<void>` | — | **Só Core.** Aguarda antes de iniciar cada tarefa (backpressure manual). |
| `onTaskStart` | `(index: number) => void` | — | Chamado quando uma tarefa inicia. |
| `onTaskComplete` | `(r: CompletedResult) => void` | — | Chamado quando uma tarefa termina (sucesso ou erro). |
| `onRunningTaskChange` | `(running: number) => void` | — | Chamado quando o nº de tarefas ativas muda. |

> Os callbacks de notificação (`onTaskStart`, `onTaskComplete`,
> `onRunningTaskChange`) são **isolados**: se lançarem, o erro é ignorado e o
> pool continua. Um `stopWhen` que lança é tratado como `false`.

---

## Erros e cancelamento

Existem **quatro** mecanismos para interromper/cancelar um pool. Eles diferem em
*quando* param de agendar, *se* abortam tarefas já em execução e *como*
sinalizam o término.

| Mecanismo | Para de agendar | Aborta tarefas em execução | Como termina |
|---|---|---|---|
| `failFast` | sim, no 1º erro final | só se `abortOnFailFast: true` | rejeita `FailFastError` após as ativas terminarem |
| `errorsCountLimit` | sim, ao atingir o limite | só se `abortOnErrorsLimit: true` | rejeita `ErrorsCountLimitReachedError` |
| `stopWhen` | sim, quando o predicado dá `true` | **sim** (chama `abort()`) | resolve normalmente; as abortadas viram `AbortError` |
| `signal` (externo) | sim, ao abortar | **sim** | resolve; as abortadas viram `AbortError` |

### `failFast`

```ts
await runPromisePool({ tasks, concurrencyLimit: 10, failFast: true });
// rejeita com FailFastError assim que qualquer tarefa falhar
```

`failFast` controla **agendamento**. Por padrão, tarefas que já estão rodando
**não** são abortadas — elas terminam, e só então a `Promise` rejeita com
`FailFastError`. Isso garante que, quando o pool rejeita, nada continua rodando
"solto" (sem `unhandledRejection`). Se você quer abortar o que está em execução,
use `abortOnFailFast: true`.

```ts
await runPromisePool({
  tasks,
  failFast: true,
  abortOnFailFast: true,
});
```

### Retries

```ts
await runPromisePoolAndReturn({
  tasks,
  retryCount: 3,
  retryDelay: ({ attempt }) => attempt * 250,
  shouldRetry: ({ error }) =>
    error instanceof Error && error.message.includes('temporário'),
});
```

Retries acontecem **antes** de o resultado final ser reportado. Portanto:

- `onTaskComplete` recebe apenas o sucesso final ou o erro final.
- `failFast` e `errorsCountLimit` contam apenas erros finais, depois que os
  retries acabam ou `shouldRetry` retorna `false`.
- `taskExecutionTimeout` vale por tentativa, não pelo conjunto de retries.
- ⚠️ `taskExecutionTimeout` **não cancela** a tentativa que estourou: o
  `timeoutPromise` rejeita o wrapper, mas a invocação anterior da task continua
  rodando enquanto a próxima tentativa é disparada. Combine retries com timeout
  apenas em tasks **idempotentes** (ou faça a task observar o `signal` para se
  interromper sozinha).
- `AbortSignal` também cancela a espera de `retryDelay`.

### `errorsCountLimit` + `abortOnErrorsLimit`

```ts
// Tolera até 4 erros; no 5º, rejeita — e aborta o que estiver rodando.
await runPromisePool({
  tasks,
  concurrencyLimit: 10,
  errorsCountLimit: 5,
  abortOnErrorsLimit: true,
});
```

### `stopWhen` — parar com base no resultado

```ts
// Para assim que encontrar o primeiro resultado "match".
await runPromisePool({
  tasks,
  concurrencyLimit: 10,
  stopWhen: ({ result }) => result?.found === true,
});
```

Quando o predicado retorna `true`, o pool para de agendar **e chama
`AbortController.abort()`**: as tarefas irmãs em execução que observam o
`AbortSignal` são canceladas e reportadas como `AbortError` via `onTaskComplete`
(e, no `runPromisePoolAndReturn`, aparecem em `errors`).

### `signal` — cancelamento externo

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000); // cancela após 5s

await runPromisePool({ tasks, concurrencyLimit: 10, signal: controller.signal });
```

O `signal` é repassado a cada tarefa e ao `taskExecutionTimeout`. Ao abortar, as
tarefas que observam o signal rejeitam com `AbortError`.

### `taskExecutionTimeout` — timeout por tarefa

```ts
await runPromisePoolAndReturn({ tasks, concurrencyLimit: 10, taskExecutionTimeout: 3000 });
// tarefas que passarem de 3s rejeitam com PromiseTimeoutError
```

### Classes de erro

- `FailFastError`, `ErrorsCountLimitReachedError` — de
  [run-promise-pool.ts](run-promise-pool.ts#L1).
- `PromiseTimeoutError`, `AbortError` — de
  [timeout-promise.ts](timeout-promise.ts#L1).

---

## Limitações conhecidas

- **Slots ambíguos em `ordering: 'sorted'`**: tarefas que resolvem para
  `undefined` e rejeições com valor *falsy* (ex.: `throw 0`) **são** registradas
  corretamente — sucessos em `results`, erros em `errors`. Mas, no array
  `sorted`, um `results[i] === undefined` com `errors[i] === undefined` é
  ambíguo: pode ser uma tarefa que resolveu `undefined` ou uma que não chegou a
  completar (ex.: agendamento interrompido por `stopWhen`/`signal`). Use
  `ordering: 'completion'` ou os callbacks se precisar desambiguar.
- **Tamanho desconhecido**: quando `tasks` é um `Iterable`/`AsyncIterable` sem
  `length` ou `size`, `runPromisePoolAndReturn` não consegue pré-alocar slots
  para tarefas que nunca foram puxadas do produtor. Em `ordering: 'sorted'`, os
  arrays crescem até o maior índice executado.

---

## Benchmarks

```bash
npm run benchmark:promise-pool
```

Variáveis opcionais:

```bash
PROMISE_POOL_BENCH_TASKS=10000 \
PROMISE_POOL_BENCH_DELAY_MS=1 \
PROMISE_POOL_BENCH_CONCURRENCY=10,50,300 \
npm run benchmark:promise-pool
```

O script compara `and-return` com array, core com `AsyncIterable` e stream com
`AsyncIterable` para diferentes limites de concorrência.

---

## Ideias futuras (não implementadas)

Notas de design ainda em aberto, mantidas como referência:

- Flags `collectResults` / `collectErrors` no `Core` para coleta opcional.
- Exemplos de persistência incremental (arquivo / SQLite / Redis) consumindo o
  `Stream` ou os callbacks do `Core`.
- Métricas internas para telemetria (ativas, concluídas, erros).

---

## Links

- Núcleo (executor de baixo nível): [run-promise-pool.ts](run-promise-pool.ts#L1) — `runPromisePoolCore` / alias `runPromisePool`
- Wrapper alto-nível (results/errors): [run-promise-pool-and-return.ts](run-promise-pool-and-return.ts#L1)
- Stream: [run-promise-pool-stream.ts](run-promise-pool-stream.ts#L1)
- Timeout util: [timeout-promise.ts](timeout-promise.ts#L1)
