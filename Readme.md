# BoardGame-Manager

[![Letzter Commit](https://img.shields.io/github/last-commit/Speedelfe/BoardGame-Manager?style=flat-square)](https://github.com/Speedelfe/BoardGame-Manager/commits/)
[![Build](https://img.shields.io/github/actions/workflow/status/Speedelfe/BoardGame-Manager/build.yml?style=flat-square)](https://github.com/Speedelfe/BoardGame-Manager/actions/workflows/build.yml)

Eine kleine Desktop-App, um die eigene Brettspielsammlung zu verwalten.
Geschrieben in TypeScript mit [Vue](https://vuejs.org/) und [Electron](https://www.electronjs.org/).

Die ursprüngliche Fassung war in F# mit Avalonia.FuncUI geschrieben. Sie ist über die Git-Historie
weiter erreichbar.

## Was die App kann

- Spiele mit Name und Spieleranzahl anlegen, bearbeiten und löschen
- Freiwillig zu jedem Spiel: Spieldauer in Minuten (eine Zahl, von-bis oder nach oben offen), Genre und Nebengenres,
  das Regal, zuletzt gespielt und eine Beschreibung
- Regale (Schrankplätze) anlegen, umbenennen und löschen und sehen, welche Spiele darin stehen
- Alle Spiele in einer alphabetisch sortierten Liste anzeigen
- Die Sammlung automatisch in einer Datei speichern und beim Start wieder laden

## Wo die Sammlung gespeichert wird

Die Spieleliste liegt als `games.json` im Benutzerordner, egal von wo die App gestartet wird:

- Windows: `C:\Users\<Name>\AppData\Roaming\BoardGame-Manager\games.json`
- Linux: `~/.config/BoardGame-Manager/games.json`

Bei jedem Speichern bleibt der Stand davor als Sicherungskopie `games.json.bak` im selben Ordner
liegen.

Kann die Datei beim Start nicht gelesen werden, zeigt die App eine Fehlermeldung und sperrt das
Speichern, damit die Datei nicht überschrieben wird.

Ort und Format der Datei sind dieselben wie in der früheren F#-Fassung, eine vorhandene Sammlung
wird also weiter gelesen.

## Entwicklung

Benötigt wird [Node.js](https://nodejs.org/) ab Version 22.12 (am besten die aktuelle LTS-Version).

Einmalig nach dem Klonen die Pakete laden:

```
npm install
```

| Aufgabe                                  | Befehl              |
| ---------------------------------------- | ------------------- |
| Starten (Änderungen erscheinen sofort)   | `npm run dev`       |
| Starten mit Testsammlung (`.dev-data/`)  | `npm run dev:test`  |
| Tests ausführen                          | `npm test`          |
| Typen prüfen                             | `npm run typecheck` |
| Bauen                                    | `npm run build`     |
| Gebaute App starten                      | `npm start`         |
| Programm (`.exe`) erstellen              | `npm run dist`      |

`npm run dist` erstellt `dist/BoardGame-Manager.exe`. Die Datei lässt sich ohne Installation
starten und an einen beliebigen Ort kopieren.

## Aufbau

Der Code ist in Schichten aufgeteilt. Jede Schicht kennt nur die Schichten, die in dieser Liste
über ihr stehen:

- `src/domain` – die Fachlogik: Spiel, Name, Spieleranzahl, Spieldauer, Genres, Sammlung und ihre
  Regeln. Kennt weder Vue noch Dateien.
- `src/application` – die Abläufe: Spiel speichern, Spiel löschen.
- `src/infrastructure` – die Technik: Speichern als JSON-Datei und die Verbindung zwischen
  Oberfläche und Hintergrundteil.
- `src/ui` – die Oberfläche: Vue-Komponenten und der Programmablauf (`gameManager.ts`).
- `src/main` und `src/preload` – der Start von Electron: Fenster öffnen und alles zusammenstecken.
- `tests` – Tests (Vitest), aufgeteilt wie `src`.

## Lizenz

[MIT](LICENSE)
