# BoardGame-Manager

[![Letzter Commit](https://img.shields.io/github/last-commit/Speedelfe/BoardGame-Manager?style=flat-square)](https://github.com/Speedelfe/BoardGame-Manager/commits/)
[![Build](https://img.shields.io/github/actions/workflow/status/Speedelfe/BoardGame-Manager/build.yml?style=flat-square)](https://github.com/Speedelfe/BoardGame-Manager/actions/workflows/build.yml)

Eine kleine Desktop-App, um die eigene Brettspielsammlung zu verwalten.
Geschrieben in F# mit [Avalonia.FuncUI](https://github.com/fsprojects/Avalonia.FuncUI).

## Was die App kann

- Spiele mit Name und Spieleranzahl anlegen, bearbeiten und löschen
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

## Entwicklung

Benötigt wird das [.NET SDK 10](https://dotnet.microsoft.com/download). Empfohlen ist VS Code mit
der Erweiterung Ionide. Alternativ gibt es einen fertigen Devcontainer.

Einmalig nach dem Klonen die Werkzeuge (Paket, Fantomas) einrichten:

```
dotnet tool restore
```

| Aufgabe            | Befehl                          |
| ------------------ | ------------------------------- |
| Bauen              | `dotnet build`                  |
| Starten            | `dotnet run --project src/`     |
| Tests ausführen    | `dotnet test`                   |
| Code formatieren   | `dotnet fantomas src tests`     |

Zum Starten mit Debugger in VS Code F5 drücken.

### Devcontainer

Im Devcontainer läuft die App auf einem virtuellen Bildschirm. Zum Ansehen im Browser
`http://localhost:6080` öffnen oder mit einem VNC-Programm zu `localhost:5901` verbinden.
Das Standardpasswort ist `vscode`.

## Aufbau

- `src/Core` – Datentypen und Logik (Prüfen der Eingaben, Laden und Speichern)
- `src/View` – Oberfläche und Programmablauf
- `tests` – Tests für die Logik (xUnit)

## Lizenz

[MIT](LICENSE)
