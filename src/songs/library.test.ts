import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSongLibrary } from './library';

const SONGS_KEY = 'perfect-partituras.songs';

describe('useSongLibrary (ponto global das músicas)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('traz os exercícios e o repertório mesmo sem música do usuário', () => {
    const { result } = renderHook(() => useSongLibrary('D'));
    expect(result.current.allSongs.length).toBeGreaterThan(0);
    expect(result.current.sections.some((section) => section.key === 'basics')).toBe(true);
  });

  it('a mesma digitação soa em outra altura quando muda a whistle', () => {
    const inD = renderHook(() => useSongLibrary('D'));
    const inC = renderHook(() => useSongLibrary('C'));
    const firstRepertoireId = inD.result.current.sections.find((s) => s.key === 'irish')?.songs[0]?.id;
    expect(firstRepertoireId).toBeTruthy();
    const noteInD = inD.result.current.allSongs.find((s) => s.id === firstRepertoireId)?.notes[0]?.note;
    const noteInC = inC.result.current.allSongs.find((s) => s.id === firstRepertoireId)?.notes[0]?.note;
    expect(noteInD).not.toEqual(noteInC);
  });

  it('salva a música do usuário e a expõe na seção "mine", persistindo no storage', () => {
    const { result } = renderHook(() => useSongLibrary('D'));
    act(() => {
      result.current.upsertSong({
        id: 'minha-1',
        title: 'Minha música',
        instrument: 'tin-whistle',
        tempo: 100,
        notes: [{ note: 'D5', beats: 1 }],
      });
    });
    expect(result.current.isUserSong('minha-1')).toBe(true);
    expect(result.current.sections.find((s) => s.key === 'mine')?.songs.map((s) => s.id)).toContain('minha-1');
    expect(JSON.parse(localStorage.getItem(SONGS_KEY)!)).toHaveLength(1);
  });

  it('música do usuário com o mesmo id sobrescreve a que vem com o app, sem duplicar', () => {
    const { result } = renderHook(() => useSongLibrary('D'));
    const appSong = result.current.sections.find((section) => section.key === 'basics')!.songs[0];
    act(() => {
      result.current.upsertSong({ ...appSong, title: 'Meu override' });
    });
    // Saiu da seção de exercícios e entrou em "mine" com o novo título.
    const basicsIds = result.current.sections.find((s) => s.key === 'basics')?.songs.map((s) => s.id) ?? [];
    expect(basicsIds).not.toContain(appSong.id);
    const mine = result.current.sections.find((s) => s.key === 'mine')!.songs;
    expect(mine.find((s) => s.id === appSong.id)?.title).toBe('Meu override');
    // E o id aparece uma única vez na lista achatada (sem fantasma da versão do app).
    expect(result.current.allSongs.filter((s) => s.id === appSong.id)).toHaveLength(1);
  });

  it('remove a música do usuário da biblioteca e do storage', () => {
    const { result } = renderHook(() => useSongLibrary('D'));
    act(() => {
      result.current.upsertSong({
        id: 'minha-2',
        title: 'Some',
        instrument: 'tin-whistle',
        tempo: 100,
        notes: [{ note: 'E5', beats: 1 }],
      });
    });
    act(() => {
      result.current.removeSong('minha-2');
    });
    expect(result.current.isUserSong('minha-2')).toBe(false);
    expect(JSON.parse(localStorage.getItem(SONGS_KEY)!)).toHaveLength(0);
  });
});
