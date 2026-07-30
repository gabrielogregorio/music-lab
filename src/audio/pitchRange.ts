// Faixa de detecção de pitch COMPARTILHADA pelo Afinador e pelo Treino.
//
// Os dois "ouvem" o microfone e precisam concordar no que é uma nota tocável.
// O Treino sempre usou uma faixa larga e agnóstica de instrumento (~55 Hz a
// ~2100 Hz) e por isso pega qualquer som; o Afinador estreitava a faixa por
// instrumento (defesa contra erro de oitava) e, com isso, simplesmente NÃO
// registrava o que caísse fora - inclusive você tocando desafinado. A decisão do
// dono do repo: focar no SOM, não no instrumento. Então a faixa vira uma só,
// larga, aqui, e os dois módulos leem daqui.
//
// 55 Hz ≈ Lá1 (abaixo do dó grave de um violão); 2100 Hz ≈ Dó7. Cobre voz e
// praticamente todo instrumento melódico - basta soar dentro disso para aparecer
// a nota mais próxima e o quanto está desviada.

export const MIN_PITCH_HZ = 55;
export const MAX_PITCH_HZ = 2100;

export interface PitchRange {
  minHz: number;
  maxHz: number;
}

export const PITCH_RANGE: PitchRange = { minHz: MIN_PITCH_HZ, maxHz: MAX_PITCH_HZ };
