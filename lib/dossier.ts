import type { Source, Workspace, Project } from "./types";
export const DOSSIER_ID = "cabanel-1847";
const base = { retrievedAt: "2026-10-19", access: "Notice consultée" as const };
export const dossierSources: Source[] = [
  {
    ...base,
    id: "cabanel-fabre",
    title: "L’Ange déchu",
    creator: "Alexandre Cabanel",
    date: "1847",
    kind: "Œuvre",
    institution: "Musée Fabre, Montpellier",
    url: "https://www.museefabre.fr/lange-dechu",
    inventory: "889.2.1",
    image: "/art/fallen-angel.jpg",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/42/Cabanel-L%27ange_d%C3%A9chu.JPG",
    rights:
      "Photographie Rvalette, CC BY-SA 3.0 ; œuvre dans le domaine public",
    description:
      "Huile sur toile, 121 × 189,7 cm. Don Barthélémy Cabanel, 1889. Notice du musée conservateur consultée. Dimensions retenues d’après le musée, différentes de celles figurant sur Wikimedia Commons.",
  },
  {
    ...base,
    id: "cabanel-esquisse",
    title: "L’Ange déchu — esquisse",
    creator: "Alexandre Cabanel ; notice : Maud Grillet",
    date: "1847 ; notice du 23 octobre 2025",
    kind: "Œuvre",
    institution: "Bibliothèque-musée Inguimbertine, Carpentras / POP",
    url: "https://pop.culture.gouv.fr/notice/joconde/M0949000704",
    inventory: "887.3.12",
    description:
      "Huile sur toile, 25,2 × 37,4 cm. Étude pour le deuxième envoi de Rome. Il s’agit d’un autre objet que le tableau du musée Fabre. Notice Joconde M0949000704 ; image à consulter sur le site, droits non établis pour une redistribution.",
  },
  {
    ...base,
    id: "cabanel-catalogue",
    title: "Alexandre Cabanel, la tradition du beau",
    creator: "Catalogue d’exposition du musée Fabre",
    date: "2010",
    kind: "Ouvrage",
    institution: "Somogy / Musée Fabre",
    url: "https://www.museefabre.fr/index.php/en/node/188",
    description:
      "Catalogue, 464 pages. ISBN 978-2-7572-0356-9. Référence et description éditoriale consultées ; livre non lu et pages concernant L’Ange déchu non vérifiées. À consulter en bibliothèque avant de le citer pour une analyse précise.",
  },
  {
    ...base,
    id: "cabanel-exposition",
    title: "Alexandre Cabanel, la tradition du beau — exposition",
    creator: "Musée Fabre",
    date: "10 juillet – 5 décembre 2010",
    kind: "Article",
    institution: "Musée Fabre",
    url: "https://www.museefabre.fr/index.php/node/901",
    access: "Page consultée",
    description:
      "Page de présentation de la rétrospective de 2010. Documente la remise en perspective de la carrière de Cabanel. Une page d’exposition ne remplace pas les essais du catalogue.",
  },
  {
    ...base,
    id: "milton-livre1",
    title: "Paradise Lost, livre I",
    creator: "John Milton",
    date: "1667 ; édition en douze livres, 1674",
    kind: "Ouvrage",
    institution: "The John Milton Reading Room, Dartmouth College",
    url: "https://milton.host.dartmouth.edu/reading_room/pl/book_1/text.shtml",
    access: "Passage consulté",
    description:
      "Texte anglais en ligne. Passages étudiés : livre I, vers 44–58 (chute, douleur et orgueil), 94–126 (refus de se soumettre et désespoir). Le rapprochement avec Cabanel est signalé par le musée Fabre ; ces vers ne prouvent pas à eux seuls une illustration littérale.",
  },
  {
    ...base,
    id: "torse-belvedere",
    title: "Torse du Belvédère",
    creator: "Apollonios d’Athènes",
    date: "Ier siècle avant J.-C.",
    kind: "Œuvre",
    institution: "Musées du Vatican, musée Pio-Clementino",
    url: "https://www.museivaticani.va/content/museivaticani/fr/collezioni/musei/museo-pio-clementino/sala-delle-muse/torso-del-belvedere.html",
    description:
      "Sculpture antique signée par Apollonios. Notice des Musées du Vatican consultée. Comparaison de la torsion et de la masse du torse ; le musée Fabre mentionne cet héritage pour Cabanel. La notice du Vatican ne traite pas de Cabanel.",
  },
  {
    ...base,
    id: "cabanel-reception",
    title: "Au musée Fabre, « L’Ange déchu », icône des réseaux sociaux",
    creator: "En Commun, rédaction municipale",
    date: "16 janvier 2025",
    kind: "Article",
    institution: "Ville et Métropole de Montpellier",
    url: "https://encommun.montpellier.fr/articles/2025-01-16-au-musee-fabre-lange-dechu-icone-des-reseaux-sociaux",
    access: "Page consultée",
    description:
      "Article sur la circulation du tableau sur Instagram et TikTok, avec témoignages de visiteurs et du directeur du musée. Source de réception contemporaine, non article scientifique. Les propos rapportés ne démontrent pas les intentions de Cabanel en 1847.",
  },
];
export const dossierSections = [
  {
    id: "lire",
    title: "Regarder avant d’interpréter",
    status: "Analyse proposée à partir de la reproduction",
    sources: ["cabanel-fabre"],
    paragraphs: [
      "Le corps occupe presque toute la largeur du premier plan. Les jambes repliées, le bras devant le visage et l’aile ramènent le regard vers une figure refermée sur elle-même. Le format horizontal laisse pourtant une ouverture vers le ciel : l’espace du personnage et celui des anges lointains ne semblent plus communiquer.",
      "La main et l’avant-bras masquent une partie du visage ; l’œil reste visible. Cette différence entre ce qui se montre et ce qui se dérobe permet de construire une lecture de la retenue, plutôt que de résumer le tableau à une expression de colère. La larme est un détail à observer sur l’image agrandie ; son sens émotionnel reste une interprétation.",
      "Proposition de lecture : le contraste entre la puissance physique et l’immobilité rend la défaite sensible. La beauté du corps ne disparaît pas avec la chute. On peut donc interroger la proximité que le tableau installe entre le spectateur et une figure moralement condamnée. Ce sont des arguments visuels à défendre, pas des intentions prouvées de l’artiste.",
    ],
  },
  {
    id: "contexte",
    title: "1847 : une formation académique, un sujet tendu",
    status: "Repères documentés",
    sources: ["cabanel-fabre", "cabanel-esquisse"],
    paragraphs: [
      "Cabanel réalise ce tableau pendant son séjour à la Villa Médicis, pour son deuxième envoi de Rome. Le musée Fabre évoque un accueil défavorable de l’Académie et rattache sa figure à l’Antiquité ainsi qu’à Michel-Ange et Raphaël. Il cite également une lettre à Alfred Bruyas qui oppose la détresse de Satan à la joie des anges du ciel.",
      "Attention au vocabulaire : l’œuvre date du XIXe siècle. Ses références à la Renaissance ne font pas d’elle une peinture de la Renaissance. Pour l’oral, distinguer la date de production, le cadre académique et les modèles plus anciens mobilisés par le peintre.",
    ],
  },
  {
    id: "milton",
    title: "Lire Milton sans transformer le tableau en illustration",
    status: "Texte primaire · passages repérés",
    sources: ["milton-livre1", "cabanel-fabre"],
    paragraphs: [
      "Au livre I, vers 44–58, Satan est précipité hors du ciel et éprouve à la fois la perte du bonheur et une fierté obstinée. Aux vers 94–126, son discours affirme le refus de céder ; le narrateur rappelle ensuite son désespoir. La parole du personnage et le jugement du narrateur ne se confondent pas.",
      "Pour comparer texte et peinture, partir d’une tension commune : défaite subie et résistance intérieure. Puis marquer les écarts. Milton fait entendre une voix et décrit un monde infernal ; Cabanel concentre l’attention sur un corps silencieux. Ne pas attribuer au peintre une citation exacte du poème sans preuve supplémentaire.",
      "Travail à poursuivre : choisir une traduction française, noter le nom du traducteur, l’éditeur, l’année et les pages. Les vers permettent de retrouver le passage, mais la pagination dépend de l’édition. Aucune traduction française n’a été utilisée pour les paraphrases de ce dossier.",
    ],
  },
  {
    id: "comparer",
    title: "Trois rapprochements, trois usages différents",
    status: "Comparaisons à argumenter",
    sources: ["cabanel-esquisse", "torse-belvedere", "met-436105"],
    paragraphs: [
      "L’esquisse de Carpentras : comparer deux états d’un projet. La notice POP identifie une esquisse de 25,2 × 37,4 cm, inventaire 887.3.12. Ne pas lui attribuer le cartel du tableau de Montpellier. Examiner les différences de composition seulement après avoir ouvert les deux reproductions côte à côte.",
      "Le Torse du Belvédère : travailler la construction anatomique et la torsion. La notice du Vatican situe la sculpture au Ier siècle avant J.-C. ; le rapprochement avec Cabanel vient du musée Fabre. Séparer ces deux références évite de faire dire à la notice antique ce qu’elle ne dit pas.",
      "La Mort de Socrate de David, 1787 : comparaison proposée pour l’oral, sans lien d’influence établi ici. Mettre en regard un corps dressé, entouré de témoins, et la figure isolée de Cabanel. Question : comment une attitude corporelle peut-elle rendre visible une position morale ? Cette comparaison sert un argument, pas une généalogie prouvée.",
    ],
  },
  {
    id: "reception",
    title: "De la rétrospective aux images partagées",
    status: "Histoire de la réception · limites des sources",
    sources: ["cabanel-exposition", "cabanel-catalogue", "cabanel-reception"],
    paragraphs: [
      "La rétrospective du musée Fabre en 2010 et son catalogue replacent le tableau dans une carrière plus large. Le catalogue constitue une prochaine lecture importante, mais sa notice éditoriale ne donne pas accès aux arguments ni aux pages des essais : ils ne sont donc pas cités comme s’ils avaient été lus.",
      "L’article municipal En Commun du 16 janvier 2025 documente une popularité sur les réseaux sociaux et rapporte des réactions de visiteurs. Il peut alimenter une conclusion sur les usages actuels de l’image. Il ne constitue ni une étude statistique indépendante ni une preuve de la réception de 1847.",
      "Les pages du musée et le magazine de la collectivité appartiennent à un environnement institutionnel proche. Leur multiplication ne vaut pas multiplication de sources indépendantes. Une prochaine recherche devrait ajouter une étude universitaire et une critique d’époque précisément datée.",
    ],
  },
  {
    id: "oral",
    title: "Préparer un oral de dix minutes",
    status: "Plan de travail modifiable",
    sources: ["cabanel-fabre", "milton-livre1", "cabanel-reception"],
    paragraphs: [
      "Problématique proposée : comment Cabanel transforme-t-il une figure de la défaite en objet d’attention et d’empathie ? Introduction (1 minute) : présenter le cartel, montrer l’œuvre entière et annoncer cette tension sans raconter toute la vie du peintre.",
      "I — Construire une présence (3 minutes). Décrire cadrage, posture, regard et séparation des plans. Montrer deux détails, puis revenir à l’image entière. II — Faire dialoguer les modèles (3 minutes). Distinguer héritage antique, formation académique et rapprochement avec Milton, en citant les vers étudiés.",
      "III — Déplacer le regard (2 minutes). Passer de l’accueil académique rapporté par le musée à une réception actuelle documentée en 2025, sans supposer une continuité. Conclusion (1 minute) : répondre à la problématique et nommer une limite de la recherche, notamment les critiques originales et le catalogue encore à consulter.",
      "Questions à préparer : pourquoi parler de Satan ? Qu’est-ce qui relève de l’observation ou de l’interprétation ? Quelle source prouve le lien avec Milton ? Pourquoi comparer David et Cabanel ? Répondre en nommant le document qui soutient chaque argument, ou en reconnaissant qu’il s’agit d’une proposition personnelle.",
    ],
  },
  {
    id: "suite",
    title: "Ce qui reste à vérifier",
    status: "Recherche ouverte",
    sources: ["cabanel-catalogue", "cabanel-fabre"],
    paragraphs: [
      "Consulter le catalogue de 2010 et relever les auteurs des essais, les pages et les références primaires. Retrouver l’édition ou la cote de la lettre à Bruyas citée par le musée. Chercher les rapports d’envoi de Rome et une critique d’époque avant de généraliser sur « le scandale » ou « le refus du Salon ».",
      "Ne pas confondre conformité documentaire et vérité automatique : une notice peut être corrigée, deux sites peuvent reprendre la même information et une référence bibliographique peut exister sans avoir été lue. Ce dossier est un exemple préparé, pas le résultat d’une recherche autonome d’Hermes.",
    ],
  },
];
export function dossierMarkdown() {
  return (
    "# L’Ange déchu — dossier de travail\n\n" +
    dossierSections
      .map(
        (s) =>
          "## " +
          s.title +
          "\n" +
          s.status +
          "\n\n" +
          s.paragraphs.join("\n\n") +
          "\n\nSources : " +
          s.sources.join(", "),
      )
      .join("\n\n") +
    "\n\n## Références\n\n" +
    dossierSources
      .map(
        (s) =>
          `[${s.id}] ${s.creator}. ${s.title}. ${s.date}. ${s.institution}. ${s.url}\n${s.description}\nAccès : ${s.access}. Consulté le ${s.retrievedAt}.`,
      )
      .join("\n\n") +
    "\n\n[met-436105] Jacques Louis David, The Death of Socrates, 1787. The Metropolitan Museum of Art, inv. 31.45. https://www.metmuseum.org/art/collection/search/436105\n"
  );
}
export function dossierProject(): Project {
  return {
    id: DOSSIER_ID,
    title: "L’Ange déchu",
    subtitle: "Alexandre Cabanel · 1847 · Dossier exemple",
    selected: dossierSources.map((s) => s.id).concat("met-436105"),
    notes: dossierMarkdown(),
    messages: [],
    sessionId: "pupuce-" + crypto.randomUUID(),
  };
}
export function withDossier(w: Workspace): Workspace {
  return {
    ...w,
    sources: [
      ...w.sources,
      ...dossierSources.filter(
        (s) => !w.sources.some((old) => old.id === s.id),
      ),
    ],
    projects: w.projects.some((p) => p.id === DOSSIER_ID)
      ? w.projects
      : [dossierProject(), ...w.projects],
  };
}
