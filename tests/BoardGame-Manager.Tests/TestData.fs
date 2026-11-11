// Beispielspiele, die alle Tests benutzen können
module BoardGameManager.Tests.TestData

open System
open BoardGameManager.Types

// Feste ids, damit man sie in Tests und Fehlermeldungen wiedererkennt
let dixit =
    {
        id = Guid.Parse "11111111-1111-1111-1111-111111111111"
        name = "Dixit"
        playerNumbers = 3
    }

let azul =
    {
        id = Guid.Parse "22222222-2222-2222-2222-222222222222"
        name = "Azul"
        playerNumbers = 4
    }

let fluegelschlag =
    {
        id = Guid.Parse "33333333-3333-3333-3333-333333333333"
        name = "Flügelschlag"
        playerNumbers = 5
    }

let games = [ dixit; azul; fluegelschlag ]

// Nur die Namen einer Liste, damit Vergleiche gut lesbar sind
let names (gameList: Game list) = gameList |> List.map (fun game -> game.name)
