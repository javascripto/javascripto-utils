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
  percentageMask,
  phoneMask,
  rgMask,
  upperCaseMask,
} from './src/masks';

function renderInputWithMask(
  mask: (event: ChangeEvent<HTMLInputElement>) => void,
  maskName: string,
) {
  return (
    <input
      type="text"
      onChange={mask}
      placeholder={maskName}
      style={{
        fontSize: 14,
        borderRadius: 4,
        padding: '8px 12px',
        border: '1px solid #ccc',
      }}
    />
  );
}

export function App() {
  return (
    <div
      style={{
        gap: '8px',
        width: '200px',
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
      ].flatMap(group =>
        Object.entries(group)
          .map(([key, mask]) => renderInputWithMask(mask, key))
          .concat(
            <hr
              style={{
                margin: '8px 0',
                border: 'none',
                borderTop: '1px solid #eee',
              }}
            />,
          ),
      )}
    </div>
  );
}
