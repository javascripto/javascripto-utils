import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import type { ChangeEvent } from './create-mask';

export type MaskFn = (event: ChangeEvent<HTMLInputElement>) => void;

export function MaskedInput({
  label,
  mask,
}: {
  label: string;
  mask: MaskFn;
}): ReactElement {
  return (
    <input
      aria-label={label}
      onChange={mask}
    />
  );
}

export function renderMaskedInput(label: string, mask: MaskFn) {
  render(
    <MaskedInput
      label={label}
      mask={mask}
    />,
  );
  return screen.getByLabelText(label) as HTMLInputElement;
}

export async function typeAndCollectSnapshots(
  input: HTMLInputElement,
  text: string,
) {
  const user = userEvent.setup();
  const snapshots: string[] = [];

  for (const char of text) {
    await user.type(input, char);
    snapshots.push(input.value);
  }

  return { user, snapshots };
}

export function cleanupDom() {
  cleanup();
}
