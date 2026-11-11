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

    // Liste von Games in json speichern.
    // Geschrieben wird erst in eine Hilfsdatei (.tmp), die dann die echte Datei ersetzt.
    // So bleibt die alte Liste heil, falls beim Schreiben etwas schiefgeht.
    // Der Stand vor dem Speichern bleibt als Sicherungskopie (.bak) liegen.
    let saveFile (dataPath: string) (gameList: Game list) =
        let json = JsonSerializer.Serialize({ gameList = gameList }, jsonOptions)
        // Ordner anlegen, falls es ihn noch nicht gibt
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath dataPath))
        |> ignore

        let tempPath = dataPath + ".tmp"
        File.WriteAllText(tempPath, json)

        if File.Exists dataPath then
            File.Replace(tempPath, dataPath, dataPath + ".bak")
        else
            File.Move(tempPath, dataPath)

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
                    Ok(JsonSerializer.Deserialize<GameSaveStructure>(text, jsonOptions).gameList)
                with ex ->
                    Error ex.Message

            // Erst lesen, dann ids und Inhalt prüfen. Bei einem Fehler wird nicht weitergeprüft.
            read |> Result.bind GameFunctions.validateLoadedGames |> Result.mapError problem
