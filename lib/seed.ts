import { withDossier, DOSSIER_ID } from "./dossier";
import type { Workspace, Source } from "./types";
const retrievedAt = "2026-10-19";
export const portals: Source[] = [
  {
    id: "gallica",
    title: "Gallica · Bibliothèque numérique",
    creator: "Bibliothèque nationale de France",
    date: "",
    kind: "Portail",
    institution: "BnF",
    url: "https://gallica.bnf.fr/",
    description:
      "Livres numérisés, périodiques, estampes et manuscrits. Ouvrir le portail pour explorer les documents et leurs éditions.",
    access: "Portail de recherche",
    retrievedAt,
  },
  {
    id: "persee",
    title: "Persée · Publications scientifiques",
    creator: "Persée",
    date: "",
    kind: "Portail",
    institution: "Persée",
    url: "https://www.persee.fr/",
    description:
      "Explorer les revues, ouvrages et actes de colloques en histoire, histoire de l’art et archéologie.",
    access: "Portail de recherche",
    retrievedAt,
  },
  {
    id: "agorha",
    title: "Agorha · Ressources en histoire de l’art",
    creator: "Institut national d’histoire de l’art",
    date: "",
    kind: "Portail",
    institution: "INHA",
    url: "https://agorha.inha.fr/",
    description:
      "Consulter des notices d’œuvres, des références bibliographiques et des bases de recherche spécialisées.",
    access: "Portail de recherche",
    retrievedAt,
  },
];
const artworks: Source[] = [
  {
    id: "met-436105",
    title: "The Death of Socrates",
    creator: "Jacques Louis David",
    date: "1787",
    kind: "Œuvre",
    institution: "The Metropolitan Museum of Art",
    url: "https://www.metmuseum.org/art/collection/search/436105",
    image: "/art/socrates.jpg",
    imageUrl:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-13139-001.jpg",
    rights: "CC0 · Met Open Access",
    inventory: "31.45",
    description:
      "Notice d’œuvre issue de l’API officielle du Met. Consulter la notice d’origine pour les informations et les analyses de l’œuvre.",
    access: "Notice consultée",
    retrievedAt,
  },
  {
    id: "met-437372",
    title: "Madonna and Child Enthroned with Saints",
    creator: "Raphael (Raffaello Sanzio or Santi)",
    date: "ca. 1504",
    kind: "Œuvre",
    institution: "The Metropolitan Museum of Art",
    url: "https://www.metmuseum.org/art/collection/search/437372",
    image: "/art/raphael.jpg",
    imageUrl:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-43051-001.jpg",
    rights: "CC0 · Met Open Access",
    inventory: "16.30ab",
    description:
      "Notice d’œuvre issue de l’API officielle du Met. Une ressource de départ pour explorer la Renaissance italienne ; sa pertinence pour votre sujet reste à établir.",
    access: "Notice consultée",
    retrievedAt,
  },
  {
    id: "met-437326",
    title: "Blind Orion Searching for the Rising Sun",
    creator: "Nicolas Poussin",
    date: "1658",
    kind: "Œuvre",
    institution: "The Metropolitan Museum of Art",
    url: "https://www.metmuseum.org/art/collection/search/437326",
    image: "/art/orion.jpg",
    imageUrl: "https://images.metmuseum.org/CRDImages/ep/original/DP148490.jpg",
    rights: "CC0 · Met Open Access",
    inventory: "24.45.1",
    description:
      "Notice d’œuvre issue de l’API officielle du Met. Une piste autour de la réception des récits antiques au XVIIe siècle ; à examiner avant de l’intégrer au corpus.",
    access: "Notice consultée",
    retrievedAt,
  },
];
export function initialWorkspace(): Workspace {
  return withDossier({
    version: 1,
    activeProject: DOSSIER_ID,
    theme: "light",
    sources: [...artworks, ...portals],
    projects: [
      {
        id: "achille",
        title: "L’Antiquité réinventée",
        subtitle: "Dossier de départ · Histoire de l’art",
        selected: [],
        notes: "",
        messages: [],
        sessionId: "pupuce-" + crypto.randomUUID(),
      },
    ],
  });
}
