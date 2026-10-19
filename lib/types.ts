export type Source = {
  id: string;
  title: string;
  creator: string;
  date: string;
  kind: "Œuvre" | "Ouvrage" | "Portail" | "Cours" | "Article";
  institution: string;
  url: string;
  description: string;
  image?: string;
  imageUrl?: string;
  rights?: string;
  inventory?: string;
  access:
    | "Notice consultée"
    | "Texte importé"
    | "Portail de recherche"
    | "Page consultée"
    | "Passage consulté";
  retrievedAt: string;
  text?: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
export type Project = {
  id: string;
  title: string;
  subtitle: string;
  selected: string[];
  notes: string;
  messages: Message[];
  sessionId: string;
  activeRun?: string;
  activeRunMessageId?: string;
};
export type Workspace = {
  version: 1;
  projects: Project[];
  sources: Source[];
  activeProject: string;
  theme: "light" | "dark";
};
