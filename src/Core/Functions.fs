namespace BoardGameManager

open System
open System.IO
open System.Text.Json
open System.Text.Json.Serialization

open Types

module Functions =
    // Fester Speicherort der Spieleliste im Benutzerordner, unabhängig davon,
    // von wo die App gestartet wird.
    // Windows: C:\Users\<Name>\AppData\Roaming\BoardGame-Manager\games.json
    // Linux:   ~/.config/BoardGame-Manager/games.json
    let gameDataPath =
        Path.Combine(
            Environment.GetFolderPath Environment.SpecialFolder.ApplicationData,
            "BoardGame-Manager",
            "games.json"
        )

    // Einstellungen, damit System.Text.Json F#-Typen (Records, Listen, Option) versteht.
    // Fehlt in der Datei ein Feld (z.B. die id), ist das ein Fehler beim Laden.
    let private jsonOptions =
        let options = JsonSerializerOptions(WriteIndented = true)
        options.Converters.Add(JsonFSharpConverter())
        options

    // Liste von Games in json speichern
    let saveFile dataPath (gameList: Game list) =
        let json = JsonSerializer.Serialize({ gameList = gameList }, jsonOptions)
        // Ordner anlegen, falls es ihn noch nicht gibt
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath dataPath))
        |> ignore

        File.WriteAllText(dataPath, json)

    // Game Liste aus Json lesen (gleiches Format, das saveFile schreibt).
    // Ergebnis ist Ok mit der Liste oder Error mit einer Fehlermeldung.
    // Gibt es die Datei noch nicht, ist das kein Fehler, sondern eine leere Liste.
    let loadFile dataPath : Result<Game list, string> =
        if not (File.Exists dataPath) then
            Ok []
        else
            let problem message =
                $"Die Spieleliste ({Path.GetFullPath dataPath}) konnte nicht gelesen werden: {message}"

            let read =
                try
                    let text = File.ReadAllText dataPath
                    Ok(JsonSerializer.Deserialize<GameSaveStrukture>(text, jsonOptions).gameList)
                with ex ->
                    Error ex.Message

            // Erst lesen, dann die ids prüfen. Bei einem Fehler wird nicht weitergeprüft.
            read |> Result.bind GameFunctions.validateGameIds |> Result.mapError problem
