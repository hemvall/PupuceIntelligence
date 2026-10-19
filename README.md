# Pupuce Intelligence

Atelier personnel de recherche documentaire pour l’histoire de l’art et l’archéologie. Explorer des références, conserver un corpus, annoter et préparer un oral avec un assistant connecté à Hermes.

## Architecture cible

```mermaid
flowchart TD
    UI["Interface Next.js"] <-->|"Messages, progression, résultats"| API["Backend de l’application"]
    API <-->|"API privée Hermes"| H["Hermes Agent"]
    H <-->|"Appels d’outils"| T["Outils documentaires via MCP"]
    T <-->|"Recherche et collecte"| S["Catalogues, musées, publications"]
    T --> DB["Base documentaire et fichiers"]
    API <--> DB
```

## Parcours

```mermaid
flowchart TD
    Q["Sujet et consignes"] --> R["Recherche documentaire"]
    R --> D["Documents et œuvres"]
    D --> V{"Sélection personnelle"}
    V -->|"Retenir"| C["Corpus et annotations"]
    V -->|"Préciser"| Q
    C --> P["Plan et brouillon sourcés"]
    P --> E["Export du dossier"]
```

## Direction visuelle

Structure compacte inspirée des références fournies ; langage visuel Renaissance et néoclassicisme : papier ivoire, encre, bordeaux, titres à empattements, grain et trame décorative. Texte et reproductions documentaires restent nets.

## État initial

Le README décrit l’architecture cible. Le code du premier MVP arrive sur une branche dédiée. Le périmètre effectivement disponible et ses limites sont documentés avec cette implémentation.
