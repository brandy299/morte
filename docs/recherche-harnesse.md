# Recherche: andere Harnesse und Projekte

Stand: 2026-10-05 · Quelle: GitHub-Suche und README-Seiten. Lizenzen laut GitHub-Angabe, vor einer Übernahme jeweils in der `LICENSE`-Datei prüfen. Ideen dürfen übernommen werden, Code nur aus Apache-2.0, MIT und ähnlichen Lizenzen mit Namensnennung, nie aus AGPL (siehe `CLAUDE.md`).

Nicht erreichbar in dieser Sitzung (Netzsperre): skills.sh, opencode.ai. Was dort steht, ist hier nicht belegt.

## Harnesse und Agenten-Apps

| Projekt | Lizenz | Was es ist | Nutzen für morte |
|---|---|---|---|
| anomalyco/opencode | MIT | Quelloffener Coding-Agent (TypeScript), sehr verbreitet | Vorbild für Anzeige von Verbrauch und Kontext, Skills und Konfiguration. Wie genau, ist noch nicht geprüft |
| nexu-io/open-design | Apache-2.0 | Design-Arbeitsplatz für Agenten, Skills im `SKILL.md`-Format, Gestaltungsregeln als `DESIGN.md`, Export HTML, PDF, PPTX | Idee der portablen Designvorgaben als Markdown-Datei passt zu `Vorlagen/Designvorgaben.md`. Technik passt nicht: braucht installierte Agenten-Programme, Node 24, pnpm |
| wshobson/agents | MIT | Sammlung von Plugins und Skills für viele Agenten-Programme | Ideen für Skill-Zuschnitt, nicht verwendbar ohne Prüfung |
| shichenzhe/Tianshu | MIT | Lokaler Electron-Arbeitsplatz mit Chat, Skills, Gedächtnis, MCP | Sehr klein (0 Sterne), nur als Ideengeber für Electron-Aufbau |
| code-yeongyu/senpi | MIT | Abwandlung von pi mit Erweiterungen | Zeigt, wie pi erweitert wird. Nicht nötig |
| pi-desktop (vastsa) | LGPL-3.0 | Siehe Entscheidung 001 | Nur Ideen |

## Schulbezogen

| Projekt | Lizenz | Was es ist | Hinweis |
|---|---|---|---|
| FWU-DE/ais-chat | **AGPL-3.0** | KI-Chatbot für Schulen in Deutschland, selbst gehostet (Docker, Keycloak, PostgreSQL), Projekte nach Bundesland, Rollen für Lehrkräfte und Verwaltung | Nur Ideen, kein Code. Zeigt die Gegenrichtung (Server für die Schule). morte bleibt lokal und für eine Person |
| Kleine Lehrer-Assistenten (Streamlit, K-12) | verschieden | Meist Prototypen mit wenigen Sternen | Kein Vorbild für Qualität erkennbar |

## Skills-Sammlungen

- **anthropics/skills:** Lizenz je Ordner verschieden. `frontend-design` und `canvas-design` stehen unter Apache-2.0 (Lizenzdatei geprüft). `pdf` steht unter einer geschlossenen Anthropic-Lizenz (kein Kopieren, keine abgeleiteten Werke) und braucht Python, Tesseract und poppler. Das passt weder zur Lizenzregel noch zu "Alles in der App".
- **awesome-claude-skills (ComposioHQ), awesome-opencode:** Verzeichnisse. Lizenzen der einzelnen Skills sind einzeln zu prüfen.

## Folgerungen

1. Kein Projekt liefert fertigen Code, den wir direkt brauchen. Der Agentenkern (pi) und die eigene Schicht bleiben.
2. Übernehmbar als Idee: Designvorgaben als Markdown-Datei, Skill-Aufbau nach `SKILL.md`.
3. Offen: Wie OpenCode Verbrauch und Kontext zeigt, und was skills.sh an Skills bietet. Dafür braucht die Sitzung Zugriff auf diese Seiten.
