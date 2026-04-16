# javascripto-utils

[![Run Tests](https://github.com/javascripto/javascripto-utils/actions/workflows/test.yml/badge.svg)](https://github.com/javascripto/javascripto-utils/actions/workflows/test.yml)

Colecao de utilitarios pequenos em TypeScript para formatacao, parsing, mascaras de input e helpers gerais.

## O que voce encontra aqui

- `formatters`: CPF, CNPJ, CEP, telefone, moeda, numeros, datas e strings
- `masks`: mascaras para inputs HTML, separadas por dominio
- `utils`: helpers genericos como `wait`, `safeAwait`, `memoize` e `Duration`
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
import { Duration, safeAwait, suggestEmail, wait } from './src';

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
```

## Testes

O projeto usa duas abordagens de teste:

- testes unitarios para `formatters`, `utils` e para o nucleo estrutural das mascaras
- testes com Testing Library e `user-event` para mascaras sensiveis a cursor, backspace e setas direcionais

Arquivos de mascara mais sensiveis sao testados em ambiente `jsdom`, simulando uso real em input HTML.

## Observacoes

- o repositorio hoje esta configurado como pacote TypeScript interno
- ainda nao ha empacotamento publico definido para distribuicao
- o demo local pode ser executado com Parcel via `npm start`
