// Tests für die Spieleliste: hinzufügen, ersetzen, löschen und ids prüfen
module BoardGameManager.Tests.GameListTests

open System
open Xunit
open BoardGameManager.Types
open BoardGameManager.GameFunctions
open BoardGameManager.Tests.TestData

// ----- Hinzufügen und Ersetzen (applyForm) -----

[<Fact>]
let ``Neues Spiel wird hinten an die Liste angehängt`` () =
    let monopoly =
        {
            id = Guid.NewGuid()
            name = "Monopoly"
            playerNumbers = 4
        }

    let result = applyForm games monopoly
    Assert.Equal<string list>([ "Dixit"; "Azul"; "Flügelschlag"; "Monopoly" ], names result)

[<Fact>]
let ``Bearbeitetes Spiel ersetzt das alte an derselben Stelle`` () =
    let changedAzul = { azul with name = "Azul Sommerpavillon"; playerNumbers = 2 }
    let result = applyForm games changedAzul
    Assert.Equal<string list>([ "Dixit"; "Azul Sommerpavillon"; "Flügelschlag" ], names result)
    Assert.Equal(2, result.[1].playerNumbers)

[<Fact>]
let ``Ersetzen ändert die Anzahl der Spiele nicht`` () =
    let result = applyForm games { dixit with playerNumbers = 8 }
    Assert.Equal(games.Length, result.Length)

// ----- Löschen (removeGame) -----

[<Fact>]
let ``Gelöschtes Spiel ist nicht mehr in der Liste`` () =
    let result = removeGame games azul
    Assert.Equal<string list>([ "Dixit"; "Flügelschlag" ], names result)

[<Fact>]
let ``Löschen findet das Spiel über die ID, auch wenn es umbenannt wurde`` () =
    let result = removeGame games { azul with name = "Anderer Name" }
    Assert.Equal<string list>([ "Dixit"; "Flügelschlag" ], names result)

[<Fact>]
let ``Löschen eines unbekannten Spiels ändert nichts`` () =
    let unknown =
        {
            id = Guid.NewGuid()
            name = "Azul"
            playerNumbers = 4
        }

    Assert.Equal<string list>(names games, names (removeGame games unknown))

// ----- ids prüfen (validateGameIds) -----

[<Fact>]
let ``Liste mit eindeutigen IDs ist in Ordnung`` () =
    Assert.Equal(Ok games, validateGameIds games)

[<Fact>]
let ``Leere Liste ist in Ordnung`` () = Assert.Equal(Ok [], validateGameIds [])

[<Fact>]
let ``Spiel mit leerer ID wird erkannt`` () =
    let result = validateGameIds [ dixit; { azul with id = Guid.Empty } ]
    Assert.Equal(Error "Diese Spiele haben eine leere ID: \"Azul\"", result)

[<Fact>]
let ``Spiele mit gleicher ID werden erkannt`` () =
    let copy = { dixit with name = "Kopie von Dixit" }

    match validateGameIds [ dixit; azul; copy ] with
    | Ok _ -> failwith "Fehler erwartet"
    | Error message ->
        Assert.StartsWith("Diese Spiele haben die gleiche ID:", message)
        Assert.Contains("\"Dixit\"", message)
        Assert.Contains("\"Kopie von Dixit\"", message)
        Assert.Contains(string dixit.id, message)
        Assert.DoesNotContain("Azul", message)
