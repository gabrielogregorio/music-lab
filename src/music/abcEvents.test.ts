import { describe, expect, it } from "vitest";
import { parseMeter, parseTempo, parseUnitLength, readAbcTune } from "./abcEvents";

const HEADER = "X:1\nT:Teste\nM:4/4\nL:1/8\nK:D\n";

function beatsOf(abc: string): number[] {
  return readAbcTune(abc).events.map((event) => event.beats);
}

function namesOf(abc: string): string[] {
  return readAbcTune(abc).events.map((event) =>
    event.pitch ? `${event.pitch.letter}${event.pitch.accidental}/${event.pitch.octave}` : "rest",
  );
}

describe("parseMeter", () => {
  it("lê a fração escrita", () => {
    expect(parseMeter("6/8")).toEqual([6, 8]);
  });

  it("traduz o apelido C para 4/4", () => {
    expect(parseMeter("C")).toEqual([4, 4]);
  });

  it("traduz o apelido C| para 2/2", () => {
    expect(parseMeter("C|")).toEqual([2, 2]);
  });

  it("devolve null quando o campo não é um compasso", () => {
    expect(parseMeter("livre")).toBeNull();
  });
});

describe("parseUnitLength", () => {
  it("usa o L: escrito", () => {
    expect(parseUnitLength("1/4", [4, 4])).toBe(0.25);
  });

  it("sem L:, compasso longo assume 1/8", () => {
    expect(parseUnitLength(undefined, [4, 4])).toBe(1 / 8);
  });

  it("sem L:, compasso menor que 3/4 assume 1/16", () => {
    expect(parseUnitLength(undefined, [2, 4])).toBe(1 / 16);
  });
});

describe("parseTempo", () => {
  it("lê o número puro", () => {
    expect(parseTempo("120")).toBe(120);
  });

  it("lê a forma com pulso", () => {
    expect(parseTempo("1/4=96")).toBe(96);
  });

  it("devolve null sem campo", () => {
    expect(parseTempo(undefined)).toBeNull();
  });
});

describe("readAbcTune", () => {
  it("converte a unidade L:1/8 em meio tempo", () => {
    expect(beatsOf(`${HEADER}A`)).toEqual([0.5]);
  });

  it("multiplica a duração escrita", () => {
    expect(beatsOf(`${HEADER}A4`)).toEqual([2]);
  });

  it("lê fração de duração", () => {
    expect(beatsOf(`${HEADER}A/2`)).toEqual([0.25]);
  });

  it("lê a barra sozinha como metade", () => {
    expect(beatsOf(`${HEADER}A/`)).toEqual([0.25]);
  });

  it("aplica a armadura na nota sem acidente", () => {
    expect(namesOf(`${HEADER}F`)).toEqual(["F1/4"]);
  });

  it("mantém o acidente explícito até a barra de compasso", () => {
    expect(namesOf(`${HEADER}=F F|F`)).toEqual(["F0/4", "F0/4", "F1/4"]);
  });

  it("põe a minúscula uma oitava acima da maiúscula", () => {
    expect(namesOf(`${HEADER}D d`)).toEqual(["D0/4", "D0/5"]);
  });

  it("desce uma oitava a cada vírgula", () => {
    expect(namesOf(`${HEADER}D,`)).toEqual(["D0/3"]);
  });

  it("guarda a pausa como evento sem altura", () => {
    expect(namesOf(`${HEADER}A z2`)).toEqual(["A0/4", "rest"]);
  });

  it("dá 1,5x à primeira nota do ritmo pontuado", () => {
    expect(beatsOf(`${HEADER}A>B`)).toEqual([0.75, 0.25]);
  });

  it("inverte o pontuado com o sinal <", () => {
    expect(beatsOf(`${HEADER}A<B`)).toEqual([0.25, 0.75]);
  });

  it("encolhe a quiáltera de três para o tempo de duas", () => {
    expect(beatsOf(`${HEADER}(3ABc`)).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  it("soma as notas ligadas numa só", () => {
    expect(beatsOf(`${HEADER}A2-A2`)).toEqual([2]);
  });

  it("soma a ligadura que atravessa a barra de compasso", () => {
    expect(beatsOf(`${HEADER}A4-|A4`)).toEqual([4]);
  });

  it("não junta notas de alturas diferentes ligadas por engano", () => {
    expect(beatsOf(`${HEADER}A2-B2`)).toEqual([1, 1]);
  });

  it("guarda só a nota do topo de um acorde", () => {
    expect(namesOf(`${HEADER}[CEG]2`)).toEqual(["G0/4"]);
  });

  it("ignora apojaturas", () => {
    expect(namesOf(`${HEADER}{g}A`)).toEqual(["A0/4"]);
  });

  it("ignora cifra e decoração", () => {
    expect(namesOf(`${HEADER}"Am"!trill!A`)).toEqual(["A0/4"]);
  });

  it("toca duas vezes o trecho entre repetições", () => {
    expect(namesOf(`${HEADER}|:AB:|`)).toEqual(["A0/4", "B0/4", "A0/4", "B0/4"]);
  });

  it("toca o final 1 na primeira passada e o final 2 na segunda", () => {
    expect(namesOf(`${HEADER}|:A|1B:|2c||`)).toEqual(["A0/4", "B0/4", "A0/4", "C1/5"]);
  });

  it("toca a anacruse antes da repetição uma única vez", () => {
    expect(namesOf(`${HEADER}G|:A:|`)).toEqual(["G0/4", "A0/4", "A0/4"]);
  });

  it("lê o compasso do cabeçalho", () => {
    expect(readAbcTune(`${HEADER}A`).timeSignature).toEqual([4, 4]);
  });

  it("lê o andamento do cabeçalho", () => {
    expect(readAbcTune("X:1\nM:4/4\nL:1/8\nQ:1/4=96\nK:D\nA").tempoBpm).toBe(96);
  });
});
