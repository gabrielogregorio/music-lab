// Referência de teoria do guia: a tabela de → para dos nomes de nota (solfejo ↔
// letra ↔ notação ABC) e resumos de escala, cromático, como ler a partitura e
// como ler a notação ABC irlandesa. Lê os dados puros de `theory.ts`; os textos
// vêm do i18n. Fica num <details> para não competir com o cartão de digitação.
import { useTranslate } from "../../i18n/i18n";
import { NATURAL_NOTES, SCALE_STEPS, scaleFromRoot } from "./theory";

const SECTIONS = ["scale", "chromatic", "staff", "abc"] as const;

export function TheoryReference() {
  const translate = useTranslate();
  const cMajor = scaleFromRoot(0, SCALE_STEPS.major);

  return (
    <details className="guide-theory">
      <summary>{translate("guide.theory.title")}</summary>

      <div className="guide-theory-body">
        <p className="guide-theory-intro">{translate("guide.theory.intro")}</p>

        <h3>{translate("guide.theory.table.title")}</h3>
        <div className="guide-theory-scroll">
          <table className="guide-theory-table">
            <thead>
              <tr>
                <th>{translate("guide.theory.col.solfege")}</th>
                <th>{translate("guide.theory.col.letter")}</th>
                <th>{translate("guide.theory.col.abcMid")}</th>
                <th>{translate("guide.theory.col.abcHigh")}</th>
                <th>{translate("guide.theory.col.semitone")}</th>
              </tr>
            </thead>
            <tbody>
              {NATURAL_NOTES.map((note) => (
                <tr key={note.letter}>
                  <td>{note.solfege}</td>
                  <td>{note.letter}</td>
                  <td className="mono">{note.abcMiddle}</td>
                  <td className="mono">{note.abcHigh}</td>
                  <td>{note.semitoneFromC}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="guide-theory-cmajor">
          <strong>{translate("guide.theory.cmajor")}</strong>{" "}
          {cMajor.map((note) => note.solfege).join(" · ")}
        </p>

        {SECTIONS.map((section) => (
          <section key={section} className="guide-theory-section">
            <h3>{translate(`guide.theory.${section}.title`)}</h3>
            <p>{translate(`guide.theory.${section}.body`)}</p>
          </section>
        ))}

        <div className="guide-theory-example">
          <span className="guide-theory-example-label">{translate("guide.theory.abc.example.label")}</span>
          <pre className="mono">{`X:1
T:Dó maior
M:4/4
L:1/4
K:C
C D E F | G A B c |`}</pre>
        </div>
      </div>
    </details>
  );
}
