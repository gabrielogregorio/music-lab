/**
 * A "folha" do Treino, com COMPASSO e QUEBRA DE LINHA: mostra duas linhas por
 * vez e, ao chegar perto do fim da 2ª, a próxima página abre à esquerda pela
 * metade; quando a nota atual entra nela, expande e assume a tela. Só CSS
 * transitions animam isso (sem dependência de animação).
 *
 * Este componente só cuida da paginação - quem desenha cada linha é o
 * `renderSystem`. É o que deixa partitura e tablatura virarem a página juntas,
 * no mesmo compasso, em vez de cada uma com o seu relógio.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { System } from '../music/layout';

const SYS_PER_PAGE = 2;
const ANIM_MS = 460;
const SPLIT_AT = 0.7; // fração da linha de baixo já tocada antes de abrir o corte

type Phase = 'single' | 'split' | 'expand';

/** clip-path da página de cima: escondida, meia tela, ou tela cheia. */
export function overlayClipForPhase(phase: Phase): string {
  if (phase === 'expand') return 'inset(0 0 0 0)';
  if (phase === 'split') return 'inset(0 50% 0 0)';
  return 'inset(0 100% 0 0)';
}

interface ScoreBookProps {
  systems: System[];
  /** índice da nota → índice do sistema onde ela está. */
  sysOfNote: number[];
  /** índice da nota → posição relativa (0..1) dentro do sistema. */
  posOfNote: number[];
  currentIndex: number;
  renderSystem: (system: System, index: number) => ReactNode;
}

export function ScoreBook({ systems, sysOfNote, posOfNote, currentIndex, renderSystem }: ScoreBookProps) {
  const pageCount = Math.max(1, Math.ceil(systems.length / SYS_PER_PAGE));

  const [page, setPage] = useState(0);
  const [phase, setPhase] = useState<Phase>('single');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const currentSystem = currentIndex < 0 ? 0 : sysOfNote[currentIndex] ?? 0;

  // Segue a nota atual: abre a próxima página (split) perto do fim e expande
  // quando entramos nela.
  useEffect(() => {
    clearTimeout(timer.current);
    const targetPage = Math.floor(currentSystem / SYS_PER_PAGE);
    if (targetPage === page) {
      const lastSystemOfPage = page * SYS_PER_PAGE + (SYS_PER_PAGE - 1);
      const hasNext = page + 1 < pageCount;
      const nearEnd = currentSystem === lastSystemOfPage && (posOfNote[currentIndex] ?? 0) >= SPLIT_AT;
      setPhase(hasNext && nearEnd ? 'split' : 'single');
    } else if (targetPage === page + 1 && page + 1 < pageCount) {
      setPhase('expand');
      timer.current = setTimeout(() => {
        setPage(page + 1);
        setPhase('single');
      }, ANIM_MS);
    } else {
      setPage(targetPage);
      setPhase('single');
    }
    return () => clearTimeout(timer.current);
  }, [currentSystem, currentIndex, page, pageCount, posOfNote]);

  // Nova música com menos páginas: volta ao início. É um ajuste de estado ao
  // mudar o número de páginas, então roda na renderização (não num efeito).
  if (page > pageCount - 1) {
    setPage(0);
    setPhase('single');
  }

  const systemsOfPage = (pageIndex: number) =>
    systems.slice(pageIndex * SYS_PER_PAGE, pageIndex * SYS_PER_PAGE + SYS_PER_PAGE);
  const hasNext = page + 1 < pageCount;
  // Split screen por MÁSCARA: as páginas ficam em tamanho real; a próxima fica
  // por cima (z-index maior) e é revelada por um clip-path que cresce da
  // esquerda - escondida → metade da tela → tela cheia. Nada encolhe.
  const overlayClip = overlayClipForPhase(phase);

  return (
    <div className="staff-frame">
      <div className="staff-book">
        <div key="cur" className="staff-page">
          {systemsOfPage(page).map((system, slot) => (
            <div key={page * SYS_PER_PAGE + slot} className="score-line">
              {renderSystem(system, page * SYS_PER_PAGE + slot)}
            </div>
          ))}
        </div>
        {hasNext && (
          // key por página: no commit essa overlay DESMONTA (não re-anima);
          // a nova (próxima página) monta já escondida.
          <div key={`ovl-${page + 1}`} className="staff-page overlay" style={{ clipPath: overlayClip }} aria-hidden>
            {systemsOfPage(page + 1).map((system, slot) => (
              <div key={(page + 1) * SYS_PER_PAGE + slot} className="score-line">
                {renderSystem(system, (page + 1) * SYS_PER_PAGE + slot)}
              </div>
            ))}
          </div>
        )}
        {/* linha divisória: só existe durante o corte; some no commit */}
        {hasNext && phase !== 'single' && (
          <div className="staff-seam" style={{ left: phase === 'expand' ? '100%' : '50%' }} aria-hidden />
        )}
      </div>
    </div>
  );
}
