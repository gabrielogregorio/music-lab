import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Practice } from './Practice';
import { I18nProvider } from '../../i18n/i18n';
import { REPERTOIRE, findScore } from './music/repertoire';

// O motor de áudio é um sistema externo: aqui interessa o fluxo da tela, não o
// microfone. Sem o mock, o jsdom não tem getUserMedia nem AudioContext. Os spies
// são estáveis entre renders para dar para asserir QUEM chamou o quê.
const micSpies = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));

vi.mock('./hooks/useMic', () => ({
  useMic: () => ({
    active: false,
    error: null,
    start: micSpies.start,
    stop: micSpies.stop,
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
  micSpies.start.mockClear();
  micSpies.stop.mockClear();
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

  it('libera o microfone ao parar - parar a prática não pode deixar a captura aberta', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: /Tocar/ }));
    expect(micSpies.stop).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Parar/ }));
    expect(micSpies.stop).toHaveBeenCalledTimes(1);
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

describe('Practice - modo Leitura', () => {
  const openReading = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('tab', { name: 'Leitura' }));

  it('começa no Treino, com o microfone à disposição', () => {
    renderPractice();
    expect(screen.getByRole('tab', { name: 'Treino' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Tocar/ })).toBeInTheDocument();
  });

  it('na Leitura some o que é do microfone: tocar, dedilhado e ponteiro', async () => {
    const user = userEvent.setup();
    const { container } = renderPractice();
    await openReading(user);
    expect(screen.queryByRole('button', { name: /Tocar/ })).not.toBeInTheDocument();
    expect(container.querySelector('.whistle-diagram')).not.toBeInTheDocument();
    expect(container.querySelector('.pitch-meter')).not.toBeInTheDocument();
  });

  it('na Leitura some o ajuste de afinação, e o andamento fica', async () => {
    const user = userEvent.setup();
    renderPractice();
    await openReading(user);
    expect(screen.queryByText(/Tolerância/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ignorar oitava/)).not.toBeInTheDocument();
    expect(screen.getByText(/Andamento/)).toBeInTheDocument();
  });

  it('na Leitura a peça abre inteira, não paginada de dois sistemas', async () => {
    const user = userEvent.setup();
    const { container } = renderPractice();
    await user.click(screen.getByText('Scarborough Fair'));
    const paginated = container.querySelectorAll('.staff-system').length;
    await openReading(user);
    const whole = container.querySelectorAll('.staff-system').length;
    expect(whole).toBeGreaterThan(paginated);
  });

  it('na Leitura ainda dá para escolher partitura, tablatura ou as duas', async () => {
    const user = userEvent.setup();
    const { container } = renderPractice();
    await openReading(user);
    await user.click(screen.getByRole('button', { name: 'Tablatura' }));
    expect(container.querySelector('.tab-system')).toBeInTheDocument();
    expect(container.querySelector('.staff-system')).not.toBeInTheDocument();
  });

  it('ir para a Leitura no meio da prática solta o microfone', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: /Tocar/ }));
    await openReading(user);
    expect(micSpies.stop).toHaveBeenCalled();
  });

  it('voltar para o Treino devolve o botão de tocar', async () => {
    const user = userEvent.setup();
    renderPractice();
    await openReading(user);
    await user.click(screen.getByRole('tab', { name: 'Treino' }));
    expect(screen.getByRole('button', { name: /Tocar/ })).toBeInTheDocument();
  });

  it('guarda o modo entre sessões', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPractice();
    await openReading(user);
    unmount();
    renderPractice();
    expect(screen.getByRole('tab', { name: 'Leitura' })).toHaveAttribute('aria-selected', 'true');
  });
});
