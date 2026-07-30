/**
 * O desenho do teclado. As teclas brancas são uma fileira de larguras iguais; as
 * pretas ficam por cima, posicionadas na fronteira entre duas brancas (o padrão
 * físico do piano). A geometria sai da lista de teclas - o componente só a lê.
 */
import type { PianoKey } from '../music/keys';

interface PianoProps {
  keys: PianoKey[];
  /** MIDI que está soando agora (destaca a tecla), ou null. */
  activeMidi: number | null;
  onPress: (midi: number) => void;
}

/** Rótulo só nos Dós, para o olho se localizar sem poluir o teclado. */
function keyLabel(key: PianoKey): string | null {
  return key.name.startsWith('C') && !key.name.startsWith('C#') ? key.name : null;
}

export function Piano({ keys, activeMidi, onPress }: PianoProps) {
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);
  const whiteWidthPct = 100 / Math.max(1, whiteKeys.length);

  const whitesBefore = (midi: number) => whiteKeys.filter((key) => key.midi < midi).length;

  return (
    <div className="kb-piano" role="group" aria-label="teclado">
      <div className="kb-whites">
        {whiteKeys.map((key) => (
          <button
            type="button"
            key={key.midi}
            className={`kb-white ${key.midi === activeMidi ? 'active' : ''}`}
            onPointerDown={() => onPress(key.midi)}
            aria-label={key.name}
          >
            {keyLabel(key) && <span className="kb-key-label">{keyLabel(key)}</span>}
          </button>
        ))}
      </div>
      <div className="kb-blacks" aria-hidden="true">
        {blackKeys.map((key) => (
          <button
            type="button"
            key={key.midi}
            className={`kb-black ${key.midi === activeMidi ? 'active' : ''}`}
            style={{ left: `${whitesBefore(key.midi) * whiteWidthPct}%`, width: `${whiteWidthPct * 0.62}%` }}
            onPointerDown={() => onPress(key.midi)}
            aria-label={key.name}
            tabIndex={-1}
          />
        ))}
      </div>
    </div>
  );
}
