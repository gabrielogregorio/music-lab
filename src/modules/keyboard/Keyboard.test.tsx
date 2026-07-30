import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// O motor de áudio depende de AudioContext, que não existe no jsdom: mockado
// para o teste olhar o comportamento (renderizar teclas, tocar, apertar), não o som.
const engineCalls = {
  play: vi.fn(),
  press: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
};
vi.mock('./audio/engine', () => ({
  KeyboardEngine: class {
    play = (...args: unknown[]) => engineCalls.play(...args);
    press = (...args: unknown[]) => engineCalls.press(...args);
    stop = (...args: unknown[]) => engineCalls.stop(...args);
    dispose = (...args: unknown[]) => engineCalls.dispose(...args);
    elapsed = () => null;
  },
}));

import { I18nProvider } from '../../i18n/i18n';
import { Keyboard } from './Keyboard';

function renderKeyboard() {
  return render(
    <I18nProvider>
      <Keyboard />
    </I18nProvider>,
  );
}

describe('Keyboard', () => {
  beforeEach(() => {
    localStorage.clear();
    engineCalls.play.mockClear();
    engineCalls.press.mockClear();
    engineCalls.stop.mockClear();
  });

  it('desenha as teclas do piano encaixadas na música escolhida', () => {
    const { container } = renderKeyboard();
    expect(container.querySelectorAll('.kb-white').length).toBeGreaterThan(0);
    // Primeira música (escala de Ré) fica no registro agudo; o Dó5 aparece.
    expect(screen.getByLabelText('C5')).toBeInTheDocument();
  });

  it('apertar uma tecla toca a nota daquela altura', () => {
    renderKeyboard();
    fireEvent.pointerDown(screen.getByLabelText('C5'));
    expect(engineCalls.press).toHaveBeenCalledWith('piano', 72);
  });

  it('tocar dispara o motor com a linha do tempo da música e o som escolhido', () => {
    renderKeyboard();
    fireEvent.click(screen.getByRole('button', { name: /Tocar|Play/ }));
    expect(engineCalls.play).toHaveBeenCalledTimes(1);
    const [timeline, instrument] = engineCalls.play.mock.calls[0];
    expect(timeline.notes.length).toBeGreaterThan(0);
    expect(timeline.totalSec).toBeGreaterThan(0);
    expect(instrument).toBe('piano');
  });

  it('parar depois de tocar solta o motor', () => {
    renderKeyboard();
    fireEvent.click(screen.getByRole('button', { name: /Tocar|Play/ }));
    fireEvent.click(screen.getByRole('button', { name: /Parar|Stop/ }));
    expect(engineCalls.stop).toHaveBeenCalled();
  });

  it('trocar o som muda o instrumento que a tecla toca', () => {
    renderKeyboard();
    const soundSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(soundSelect, { target: { value: 'flute' } });
    fireEvent.pointerDown(screen.getByLabelText('C5'));
    expect(engineCalls.press).toHaveBeenCalledWith('flute', 72);
  });

  it('trocar de música volta ao andamento sugerido dela', () => {
    const { container } = renderKeyboard();
    // Escala de Ré vem a 80 BPM; Brilha Brilha vem a 96.
    expect(container.querySelector('.kb-tempo strong')?.textContent).toBe('80');
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'twinkle-twinkle' } });
    expect(container.querySelector('.kb-tempo strong')?.textContent).toBe('96');
  });

  it('o botão de oitava desce a faixa do teclado', () => {
    renderKeyboard();
    // A escala de Ré encaixa o teclado a partir do Dó5; o Dó4 ainda não aparece.
    expect(screen.queryByLabelText('C4')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Uma oitava abaixo|Down an octave/ }));
    expect(screen.getByLabelText('C4')).toBeInTheDocument();
  });

  it('aumentar a quantidade de teclas mostra mais teclas', () => {
    const { container } = renderKeyboard();
    const before = container.querySelectorAll('.kb-white').length;
    const keysSlider = screen.getAllByRole('slider').find((slider) => slider.getAttribute('max') === '49');
    fireEvent.change(keysSlider!, { target: { value: '49' } });
    expect(container.querySelectorAll('.kb-white').length).toBeGreaterThan(before);
  });

  it('o modo notas caindo começa desligado e liga pelo interruptor', () => {
    const { container } = renderKeyboard();
    expect(container.querySelector('.kb-falling')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /Notas caindo|Falling notes/ }));
    expect(container.querySelector('.kb-falling')).not.toBeNull();
  });
});
