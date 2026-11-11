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

    // Game Liste aus Json lesen
    let loadFile dataPath =
        match File.Exists dataPath with
        | false -> []
        | true ->
            File.ReadAllText dataPath
            |> fun text -> JsonSerializer.Deserialize<GameJson list>(text, jsonOptions)

    // Liste von Games in json speichern
    let saveFile (gameList: Game list) =
        let json = JsonSerializer.Serialize({ gameList = gameList }, jsonOptions)
        // Ordner "data" anlegen, falls es ihn noch nicht gibt
        Directory.CreateDirectory(Path.GetDirectoryName gameDataPath) |> ignore
        File.WriteAllText(gameDataPath, json)
