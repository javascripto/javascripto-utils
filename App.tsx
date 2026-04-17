import { useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { parseCNPJ, parseCPF, parsePhone, parseRG } from './src';
import { parseCarPlate } from './src/formatters/format-car-plate';
import {
  type ChangeEvent,
  carPlateMask,
  cnpjMask,
  cpfMask,
  currencyBRLMask,
  currencyBTCMask,
  currencyUSDMask,
  dateBRMask,
  dateISO8601Mask,
  numberMask,
  parseCurrencyBRLMask,
  parseCurrencyBTCMask,
  parseCurrencyUSDMask,
  parseDateBR,
  parseISO8601Date,
  parseNumberMask,
  parsePercentageMask,
  percentageMask,
  phoneMask,
  rgMask,
  upperCaseMask,
} from './src/masks';

// Use parsers exported from masks module. Map mask names to parser functions.
const PARSER_MAP: Record<string, (s: string) => string> = {
  currencyBRLMask: parseCurrencyBRLMask,
  currencyUSDMask: parseCurrencyUSDMask,
  currencyBTCMask: parseCurrencyBTCMask,
  percentageMask: parsePercentageMask,
  numberMask: parseNumberMask,
  upperCaseMask: s => s.toLowerCase(),
  dateISO8601Mask: parseISO8601Date,
  dateBRMask: parseDateBR,
  phoneMask: parsePhone,
  rgMask: parseRG,
  cpfMask: parseCPF,
  cnpjMask: parseCNPJ,
  carPlateMask: parseCarPlate,
};

function renderInputWithMask(
  mask: (event: ChangeEvent<HTMLInputElement>) => void,
  maskName: string,
  parser: (s: string) => string,
) {
  return (
    <InputWithMask
      mask={mask}
      maskName={maskName}
      parser={parser}
      key={maskName}
    />
  );
}

function InputWithMask({
  mask,
  maskName,
  parser,
}: {
  mask: (event: ChangeEvent<HTMLInputElement>) => void;
  maskName: string;
  parser: (s: string) => string;
}) {
  const [raw, setRaw] = useState('');

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    mask(e);
    // after mask applied, read the current formatted value
    const formatted = e.target.value;
    setRaw(parser(formatted));
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="text"
        onChange={handleChange}
        placeholder={maskName}
        style={{
          fontSize: 14,
          borderRadius: 4,
          padding: '8px 12px',
          border: '1px solid #ccc',
        }}
      />
      <div style={{ fontSize: 12, color: '#666', minWidth: 120 }}>
        {raw === '' ? <i>raw</i> : raw}
      </div>
    </div>
  );
}

export function App() {
  return (
    <div
      style={{
        gap: '8px',
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #eee',
        margin: 'auto',
        padding: 16,
        borderRadius: 4,
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ fontSize: 16, margin: '0 0 8px' }}>Input Masks</h1>
      {[
        { upperCaseMask, dateISO8601Mask, dateBRMask },
        { phoneMask, rgMask, cpfMask, cnpjMask, carPlateMask },
        { currencyBRLMask, currencyUSDMask, currencyBTCMask },
        { numberMask, percentageMask },
      ]
        .flatMap(group =>
          Object.entries(group)
            .map(([key, mask]) => {
              const parser = PARSER_MAP[key] || (s => s);
              return renderInputWithMask(mask, key, parser);
            })
            .concat(
              <hr
                style={{
                  margin: '8px 0',
                  border: 'none',
                  borderTop: '1px solid #eee',
                }}
              />,
            ),
        )
        .map((item, index) => (
          <Fragment key={String(index)}>{item}</Fragment>
        ))}
    </div>
  );
}
