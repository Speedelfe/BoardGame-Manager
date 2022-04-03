namespace BoardGameManager

// open FSharp.Json

// open Types

// module Functions =
//     let gameDataPath = "./data/games.json"

//     let ceateGameFromJson (json: GameJson) =
//     {
//         name = json.name
//         playerNumbers = json.playerNumbers
//         playTime = json.playTime
//         lastPlayed = json.lastPlayed
//         genre = json.genre
//         secondaryGenre = json.secondaryGenre
//         shelf = json.shelf
//         description = json.description
//     }

//     let loadFile dataPath =
//         match File.Exists dataPath with
//         | false -> []
//         | true ->
//             File.ReadAllText dataPath
//             |> Json.deserialize<GameJson list>
