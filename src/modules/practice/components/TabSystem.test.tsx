import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { TabSystem, rhythmGlyph } from './TabSystem';
import { buildSystems } from '../music/layout';
import { prepareSong } from '../music/song';
import type { SongJSON } from '../music/song';

const SONG: SongJSON = {
  id: 'tab-fixture',
  title: 'Fixture',
  instrument: 'tin-whistle',
  whistleKey: 'D',
  tempo: 100,
  timeSignature: [4, 4],
  notes: [
    { note: 'D5', beats: 1 },
    { note: 'D6', beats: 1 },
    { note: 'C4', beats: 1 },
    { note: 'rest', beats: 1 },
  ],
};

const HOLES_PER_COLUMN = 6;

function renderFirstSystem(currentIndex: number, holdProgress = 0) {
  const prepared = prepareSong(SONG);
  const { systems } = buildSystems(prepared.notes, 4);
  return render(
    <svg>
      <TabSystem
        system={systems[0]}
        index={0}
        currentIndex={currentIndex}
        status="good"
        direction={null}
        holdProgress={holdProgress}
        whistleKey="D"
        octaveAgnostic={false}
      />
    </svg>,
  );
}

describe('rhythmGlyph', () => {
  it('desenha semínima para um tempo', () => {
    expect(rhythmGlyph(1)).toBe('♩');
  });

  it('desenha colcheia para meio tempo', () => {
    expect(rhythmGlyph(0.5)).toBe('♪');
  });

  it('desenha mínima para dois tempos', () => {
    expect(rhythmGlyph(2)).toBe('\u{1D15E}');
  });

  it('a fronteira de 1,5 tempo já é semínima pontuada', () => {
    expect(rhythmGlyph(1.5)).toBe('♩.');
  });

  it('a fronteira de 0,75 tempo já é colcheia pontuada', () => {
    expect(rhythmGlyph(0.75)).toBe('♪.');
  });

  it('logo abaixo de 0,75 tempo ainda é colcheia simples', () => {
    expect(rhythmGlyph(0.74)).toBe('♪');
  });
});

describe('TabSystem', () => {
  it('desenha uma coluna de seis furos por nota tocável', () => {
    const { container } = renderFirstSystem(-1);
    const playableNotes = SONG.notes.filter((note) => note.note !== 'rest').length;
    expect(container.querySelectorAll('circle')).toHaveLength(playableNotes * HOLES_PER_COLUMN);
  });

  it('marca a segunda oitava com o "+" das apostilas de whistle', () => {
    const { container } = renderFirstSystem(-1);
    const marks = Array.from(container.querySelectorAll('.tab-overblow')).map(
      (mark) => mark.textContent,
    );
    expect(marks).toEqual(['+', '✕']);
  });

  it('não desenha furos para a pausa', () => {
    const { container } = renderFirstSystem(-1);
    expect(container.querySelectorAll('.staff-rest')).toHaveLength(1);
  });

  it('preenche a barra de duração conforme a sustentação da nota atual', () => {
    const { container } = renderFirstSystem(0, 0.5);
    const track = container.querySelector('.tab-duration-track')!;
    const fill = container.querySelector('.tab-duration-fill')!;
    expect(Number(fill.getAttribute('width'))).toBeCloseTo(
      Number(track.getAttribute('width')) / 2,
    );
  });
});
