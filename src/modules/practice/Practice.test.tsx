import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Practice } from './Practice';
import { I18nProvider } from '../../i18n/i18n';
import { REPERTOIRE, findScore } from './music/repertoire';

// O motor de áudio é um sistema externo: aqui interessa o fluxo da tela, não o
// microfone. Sem o mock, o jsdom não tem getUserMedia nem AudioContext.
vi.mock('./hooks/useMic', () => ({
  useMic: () => ({
    active: false,
    error: null,
    start: vi.fn(),
    onFrame: () => () => {},
  }),
}));

function renderPractice() {
  return render(
    <I18nProvider>
      <Practice />
    </I18nProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  // O provider deriva o idioma do navegador; no jsdom isso cairia em inglês.
  localStorage.setItem('music-lab:lang', 'pt');
});

describe('Practice', () => {
  it('lista o repertório de whistle junto com os exercícios', async () => {
    renderPractice();
    expect(await screen.findByText('Inisheer')).toBeInTheDocument();
  });

  it('mostra todas as músicas do repertório na biblioteca', () => {
    renderPractice();
    REPERTOIRE.forEach((score) => {
      expect(screen.getByText(score.title)).toBeInTheDocument();
    });
  });

  it('filtra a biblioteca pelo texto buscado', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.type(screen.getByRole('searchbox'), 'greens');
    expect(screen.getByText('Greensleeves')).toBeInTheDocument();
    expect(screen.queryByText('Inisheer')).not.toBeInTheDocument();
  });

  it('começa mostrando partitura e tablatura juntas', () => {
    const { container } = renderPractice();
    expect(container.querySelector('.staff-system')).toBeInTheDocument();
    expect(container.querySelector('.tab-system')).toBeInTheDocument();
  });

  it('esconde a tablatura no modo só partitura', async () => {
    const user = userEvent.setup();
    const { container } = renderPractice();
    await user.click(screen.getByRole('button', { name: 'Partitura' }));
    expect(container.querySelector('.staff-system')).toBeInTheDocument();
    expect(container.querySelector('.tab-system')).not.toBeInTheDocument();
  });

  it('esconde a partitura no modo só tablatura', async () => {
    const user = userEvent.setup();
    const { container } = renderPractice();
    await user.click(screen.getByRole('button', { name: 'Tablatura' }));
    expect(container.querySelector('.tab-system')).toBeInTheDocument();
    expect(container.querySelector('.staff-system')).not.toBeInTheDocument();
  });

  it('trocar de whistle transpõe a música e a ficha passa a citar a nova afinação', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByText('Inisheer'));
    await user.selectOptions(screen.getByLabelText('Sua whistle'), 'C');
    expect(screen.getByText(/whistle em C/)).toBeInTheDocument();
  });

  it('guarda a whistle escolhida entre sessões', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPractice();
    await user.selectOptions(screen.getByLabelText('Sua whistle'), 'Bb');
    unmount();
    renderPractice();
    expect(screen.getByLabelText<HTMLSelectElement>('Sua whistle').value).toBe('Bb');
  });

  it('vem com a oitava de leitura ligada por padrão', () => {
    renderPractice();
    expect(screen.getByRole('button', { name: /8.*leitura/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('desliga a oitava de leitura ao clicar e sobe as notas na pauta', async () => {
    const user = userEvent.setup();
    const { container } = renderPractice();
    await user.click(screen.getByText('Scarborough Fair'));
    const lowestY = () => {
      const heads = Array.from(container.querySelectorAll('.staff-system ellipse'));
      return Math.max(...heads.map((head) => Number(head.getAttribute('cy'))));
    };
    const reading = lowestY();
    await user.click(screen.getByRole('button', { name: /8.*leitura/ }));
    // sem a leitura, a melodia sobe: cabeças de nota ficam mais ALTAS (cy menor).
    expect(lowestY()).toBeLessThan(reading);
  });

  it('mostra a procedência da melodia do repertório, com link para a fonte do ritmo', async () => {
    const user = userEvent.setup();
    const score = findScore('sally-gardens')!;
    renderPractice();
    await user.click(screen.getByText(score.title));
    expect(screen.getByText(/Tablatura de 6 furos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: score.source.referenceName! })).toHaveAttribute(
      'href',
      score.source.referenceUrl,
    );
  });
});
