"use client";
import { useState, useEffect } from "react";
import { dossierSections, dossierSources } from "@/lib/dossier";
import type { Source } from "@/lib/types";
export function Dossier({
  inspect,
  prepare,
  notes,
}: {
  inspect: (s: Source) => void;
  prepare: (s: string) => void;
  notes: () => void;
}) {
  return (
    <article className="study-dossier">
      <figure className="study-plate">
        <a href="/art/fallen-angel.jpg" target="_blank" rel="noreferrer">
          <img
            src="/art/fallen-angel.jpg"
            alt="Cabanel, L’Ange déchu : un ange aux ailes sombres, replié au premier plan, le bras devant le visage ; des anges dans le ciel à l’arrière-plan."
          />
        </a>
        <figcaption>
          <span>
            Alexandre Cabanel, <i>L’Ange déchu</i>, 1847.
            <br />
            Huile sur toile · 121 × 189,7 cm · Musée Fabre · inv. 889.2.1
          </span>
          <button
            className="text-button"
            onClick={() => inspect(dossierSources[0])}
          >
            Notice et image ↗
          </button>
        </figcaption>
      </figure>
      <div className="plate-credit">
        Photo :{" "}
        <a
          href="https://commons.wikimedia.org/wiki/File:Cabanel-L%27ange_d%C3%A9chu.JPG"
          target="_blank"
          rel="noreferrer"
        >
          Rvalette / Wikimedia Commons
        </a>{" "}
        ·{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/3.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA 3.0
        </a>{" "}
        · fichier non modifié
      </div>
      <div className="dossier-intro">
        <h2>La beauté après la chute</h2>
        <p>
          Une œuvre, ses modèles et ses réceptions. Ce dossier préparé distingue
          les documents consultés, les interprétations proposées et les
          références encore à lire.
        </p>
        <button className="text-button" onClick={notes}>
          Ouvrir la version modifiable →
        </button>
      </div>
      <nav className="dossier-index" aria-label="Sommaire du dossier">
        {dossierSections.map((s, i) => (
          <a key={s.id} href={"#study-" + s.id}>
            <span>0{i + 1}</span>
            {s.title}
          </a>
        ))}
        <a href="#study-sources">
          <span>08</span>Sources et accès
        </a>
      </nav>
      {dossierSections.map((s, i) => (
        <section className="study-section" id={"study-" + s.id} key={s.id}>
          <div className="study-number">0{i + 1}</div>
          <div>
            <h2>{s.title}</h2>
            <p className="study-provenance">{s.status}</p>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <div className="study-refs">
              Références :{" "}
              {s.sources.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    const source = dossierSources.find((s) => s.id === id);
                    if (source) inspect(source);
                    else
                      window.open(
                        "https://www.metmuseum.org/art/collection/search/436105",
                        "_blank",
                        "noopener,noreferrer",
                      );
                  }}
                >
                  {id === "met-436105"
                    ? "David · The Met"
                    : dossierSources.find((s) => s.id === id)?.title}
                </button>
              ))}
            </div>
          </div>
        </section>
      ))}
      <section id="study-sources" className="study-bibliography">
        <h2>Sources et accès</h2>
        <p>
          Consultation : 19 octobre 2026. Les résumés ci-dessus ne sont pas des
          extraits des documents.
        </p>
        {dossierSources.map((s, i) => (
          <div className="bibliography-entry" key={s.id}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <button onClick={() => inspect(s)}>{s.title} ↗</button>
              <p>
                {s.creator} · {s.date} · {s.institution}
              </p>
              <p>{s.description}</p>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.access} · ouvrir la source
              </a>
            </div>
          </div>
        ))}
      </section>
      <div className="dossier-next">
        <h3>Travailler à partir de ce corpus</h3>
        <p>
          Les références sont déjà sélectionnées. L’assistant reçoit vos notes
          et les notices ; le livre de 2010 ne lui est pas transmis en texte
          intégral.
        </p>
        <button
          className="secondary"
          onClick={() =>
            prepare(
              "À partir du corpus sélectionné et de mes notes, critique la problématique de mon oral sur L’Ange déchu. Pour chaque proposition, indique la source et le passage disponibles. Sépare faits, interprétations et points non vérifiés. Ne prétends pas avoir lu le catalogue de 2010.",
            )
          }
        >
          Préparer une demande à l’assistant →
        </button>
      </div>
    </article>
  );
}
const steps = [
  {
    title: "Commencer par l’œuvre",
    text: "Ouvrez « Notice et image ». Vérifiez le musée, la date et l’inventaire. L’image entière s’ouvre en grand en cliquant dessus.",
    action: "Voir la notice",
  },
  {
    title: "Construire le corpus",
    text: "Dans « Ma sélection », retirez les documents inutiles. Le livre de 2010 est une référence à consulter : son texte intégral n’a pas été lu.",
    action: "Voir la sélection",
  },
  {
    title: "Poser une question précise",
    text: "La demande sera placée dans le champ de saisie. Relisez-la, puis envoyez-la. Les réponses nécessitent un service Hermes connecté ; le dossier exemple reste consultable sans lui.",
    action: "Préparer ma question",
  },
  {
    title: "Garder son propre travail",
    text: "Les notes sont modifiables et enregistrées dans ce navigateur. « Mon document » permet de rédiger, d’ajouter des images et d’exporter en Word ou PDF. Les réglages sauvegardent l’ensemble en JSON.",
    action: "Ouvrir mon document",
  },
];
export function Guide({ act }: { act: (step: number) => void }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("pupuce-guide-seen")) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);
  function closeGuide() {
    setOpen(false);
    try {
      localStorage.setItem("pupuce-guide-seen", "1");
    } catch {
      /* The guide remains usable when storage is unavailable. */
    }
  }
  return (
    <div className="study-guide">
      <button
        className="guide-toggle"
        aria-expanded={open}
        onClick={() => (open ? closeGuide() : setOpen(true))}
      >
        {open ? "Fermer le guide" : "Prendre en main l’assistant"}{" "}
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="guide-body">
          <h3>{steps[step].title}</h3>
          <p>{steps[step].text}</p>
          <div>
            <button className="secondary" onClick={() => act(step)}>
              {steps[step].action}
            </button>
            <button
              className="text-button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Précédent
            </button>
            <button
              className="text-button"
              onClick={() => (step === 3 ? closeGuide() : setStep(step + 1))}
            >
              {step === 3 ? "Terminer" : "Suivant →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
