namespace BoardGameManager

open FSharp.Json
open System.IO

open Types

module Functions =
    let gameDataPath = "./data/games.json"

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
            |> Json.deserialize<GameJson list>

    // Liste von Games in json speichern
    let saveFile (gameList: Game list) =
        let json = { gameList = gameList } |> Json.serialize
        File.WriteAllText(gameDataPath, json)
