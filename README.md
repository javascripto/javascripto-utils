# javascripto-utils

[![Run Tests](https://github.com/javascripto/javascripto-utils/actions/workflows/test.yml/badge.svg)](https://github.com/javascripto/javascripto-utils/actions/workflows/test.yml)

Colecao de utilitarios pequenos em TypeScript para formatacao, parsing, mascaras de input e helpers gerais.

## O que voce encontra aqui

- `formatters`: CPF, CNPJ, CEP, telefone, moeda, numeros, datas e strings
- `masks`: mascaras para inputs HTML, separadas por dominio
- `utils`: helpers genericos como `wait`, `safeAwait`, `memoize`, `Duration` e validadores de documentos
- `constants`: regex e constantes compartilhadas

## Contratos padronizados

As APIs publicas seguem um contrato mais previsivel:

- formatadores e parseadores de texto recebem `string | null | undefined`
- formatadores numericos recebem `number | null | undefined`
- funcoes de formatacao retornam `string`
- parseadores retornam um valor deterministico e seguro, sem lancar erro para entradas vazias
- entradas `null` e `undefined` retornam string vazia em formatadores de texto e `0` em `parseCurrency`

## Exports centralizados

Voce pode importar pela raiz de `src` ou por modulo.

```ts
import { formatCPF, phoneMask, Duration } from './src';
```

```ts
import { formatCPF, parseCPF } from './src/formatters';
import { phoneMask, currencyBRLMask } from './src/masks';
import { Duration, wait } from './src/utils';
import { DIGITS_ONLY_REGEX } from './src/constants';
```

## Exemplos

### Formatters

```ts
import {
  formatCarPlate,
  formatCEP,
  formatCNPJ,
  formatCPF,
  formatCurrencyBRL,
  formatPhone,
  parseCurrency,
} from './src';

formatCPF('12345678901');
// '123.456.789-01'

formatCNPJ('12345678000195');
// '12.345.678/0001-95'

formatCNPJ('12ABC34501DE35');
// '12.ABC.345/01DE-35'

formatCEP('12345678');
// '12345-678'

formatPhone('11987654321');
// '(11) 98765-4321'

formatCarPlate('aaa0a00');
// 'AAA0A00'

formatCurrencyBRL(1234.567);
// 'R$ 1.234,56'

parseCurrency('R$ 1.234,56');
// 1234.56
```

### Masks

```ts
import {
  carPlateMask,
  cnpjMask,
  cpfMask,
  currencyBRLMask,
  dateBRMask,
  percentageMask,
  phoneMask,
} from './src/masks';

<input onChange={phoneMask} />
<input onChange={cpfMask} />
<input onChange={cnpjMask} />
<input onChange={dateBRMask} />
<input onChange={currencyBRLMask} />
<input onChange={percentageMask} />
<input onChange={carPlateMask} />
```

Mascaras disponiveis hoje:

- `upperCaseMask`
- `phoneMask`
- `dateBRMask`
- `dateISO8601Mask`
- `rgMask`
- `cpfMask`
- `cnpjMask`
- `carPlateMask`
- `numberMask`
- `percentageMask`
- `currencyBRLMask`
- `currencyUSDMask`
- `currencyBTCMask`

### Utils

```ts
import { CNPJ, Duration, safeAwait, suggestEmail, wait } from './src';

CNPJ.isValid('12.ABC.345/01DE-35');
// true

CNPJ.create('12.ABC.345/01DE-35');
// '12ABC34501DE35'

CNPJ.generate();
// CNPJ alfanumerico valido para testes

const duration = Duration.fromTimeString('01:02:03');
duration.inSeconds;
// 3723

duration.toTimeString();
// '01:02:03'

await wait(250);

const [result, error] = await safeAwait(Promise.resolve('ok'));

suggestEmail('user@gmil.com');
// 'user@gmail.com'
```

## Estrutura

```text
src/
  constants/
  formatters/
  masks/
  utils/
  index.ts
  types.ts
```

Organizacao de `masks/`:

```text
src/masks/
  create-mask.ts
  create-number-mask.ts
  date.ts
  documents.ts
  number-and-currency.ts
  phone.ts
  upper-case.ts
```

## Desenvolvimento

```bash
npm install
npm start
npm test
npm run test:watch
npm run coverage
npm run benchmark:promise-pool
```

## Testes

O projeto usa duas abordagens de teste:

- **Unitários**: para `formatters`, `utils` e o núcleo das máscaras (Vitest).
- **DOM / integração**: com `@testing-library/*` e `@testing-library/user-event` para mascaras sensíveis a cursor, backspace e setas direcionais.

Arquivos de máscara mais sensíveis são testados em ambiente `jsdom`, simulando uso real em elementos `input`.

Gerar cobertura (relatório LCOV + resumo):

```bash
npm run coverage
# ou diretamente
npx vitest run --coverage
```

## Observações

- o repositorio hoje esta configurado como pacote TypeScript interno
- ainda nao ha empacotamento publico definido para distribuicao
- o demo local pode ser executado com Parcel via `npm start`

## Promise Pool (concorrência controlada)

Executores de tarefas assíncronas com um limite de concorrência: no máximo `N`
tarefas rodam ao mesmo tempo, e as próximas são agendadas conforme as anteriores
terminam. A fonte de tarefas pode ser um array, `Iterable` ou `AsyncIterable`,
permitindo consumir produtores grandes sob demanda. São três funções, todas
sobre o mesmo núcleo:

| Função | Retorno | Use quando |
|---|---|---|
| `runPromisePoolAndReturn` | `{ results, errors }` | quer todos os resultados no fim, indexados (tipo `Promise.allSettled` com limite de concorrência) |
| `runPromisePoolStream` | `AsyncGenerator` | quer processar cada resultado conforme conclui, com backpressure (`bufferLimit`) |
| `runPromisePoolCore` (alias `runPromisePool`) | `void` | quer controle total e não quer guardar resultados em memória — você persiste cada item nos callbacks |

```ts
import { runPromisePoolAndReturn } from './src';

const tasks = ids.map(id => async () => fetch(`/api/${id}`).then(r => r.json()));

const { results, errors } = await runPromisePoolAndReturn({
  tasks,
  concurrencyLimit: 10,
});
// results[i] = valor da tarefa i (ou undefined se falhou); errors[i] = erro (ou undefined)
```

Todas suportam timeout por tarefa (`taskExecutionTimeout`), cancelamento
externo (`signal`), retries (`retryCount`, `retryDelay`, `shouldRetry`), parada
antecipada (`stopWhen`) e políticas de erro (`failFast`,
`abortOnFailFast`, `errorsCountLimit` + `abortOnErrorsLimit`), além de callbacks
de progresso (`onTaskStart`, `onTaskComplete`, `onRunningTaskChange`).

**Guia completo** (diferenças, todas as opções, semântica de erro/cancelamento e
exemplos): [src/utils/run-promise-pool.md](src/utils/run-promise-pool.md#L1).
