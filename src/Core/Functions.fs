namespace BoardGameManager

open System.IO
open System.Text.Json
open System.Text.Json.Serialization

open Types

module Functions =
    let gameDataPath = "./data/games.json"

    // Einstellungen, damit System.Text.Json F#-Typen (Records, Listen, Option) versteht
    let private jsonOptions =
        let options = JsonSerializerOptions(WriteIndented = true)
        options.Converters.Add(JsonFSharpConverter())
        options

    let createGameFromJson (json: GameJson) =
        {
            name = json.name
            playerNumbers = json.playerNumbers
            playTime = json.playTime
            lastPlayed = json.lastPlayed
            genre = json.genre
            secondaryGenre = json.secondaryGenre
            shelf = json.shelf
            description = json.description
        }

    // Game Liste aus Json lesen (gleiches Format, das saveFile schreibt).
    // Ergebnis ist Ok mit der Liste oder Error mit einer Fehlermeldung.
    // Gibt es die Datei noch nicht, ist das kein Fehler, sondern eine leere Liste.
    let loadFile dataPath : Result<Game list, string> =
        if not (File.Exists dataPath) then
            Ok []
        else
            try
                let text = File.ReadAllText dataPath
                let saved = JsonSerializer.Deserialize<GameSaveStrukture>(text, jsonOptions)
                Ok saved.gameList
            with ex ->
                Error $"Die Spieleliste ({Path.GetFullPath dataPath}) konnte nicht gelesen werden: {ex.Message}"

    // Liste von Games in json speichern
    let saveFile (gameList: Game list) =
        let json = JsonSerializer.Serialize({ gameList = gameList }, jsonOptions)
        // Ordner "data" anlegen, falls es ihn noch nicht gibt
        Directory.CreateDirectory(Path.GetDirectoryName gameDataPath) |> ignore
        File.WriteAllText(gameDataPath, json)
