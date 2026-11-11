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
    let changedAzul =
        { azul with
            name = "Azul Sommerpavillon"
            playerNumbers = 2
        }

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

// ----- Sortieren (sortByName) -----

// Spiele nur mit Namen, für die Sortier-Tests
let gamesNamed (gameNames: string list) =
    gameNames
    |> List.map (fun name ->
        {
            id = Guid.NewGuid()
            name = name
            playerNumbers = 2
        })

[<Fact>]
let ``Spiele werden alphabetisch sortiert`` () =
    Assert.Equal<string list>([ "Azul"; "Dixit"; "Flügelschlag" ], names (sortByName [ fluegelschlag; dixit; azul ]))

[<Fact>]
let ``Beim Sortieren ist Groß- und Kleinschreibung egal`` () =
    let result = sortByName (gamesNamed [ "dixit"; "Azul"; "carcassonne"; "Brass" ])
    Assert.Equal<string list>([ "Azul"; "Brass"; "carcassonne"; "dixit" ], names result)

[<Fact>]
let ``Umlaute werden wie im Wörterbuch einsortiert`` () =
    // Ä zählt wie A, Ü wie U. Danach wird Buchstabe für Buchstabe verglichen:
    // "Ärger" (Ä-r) vor "Azul" (A-z), und "Überleben" (Ü-b-e) vor "Ubongo" (U-b-o).
    let result =
        sortByName (gamesNamed [ "Zug um Zug"; "Azul"; "Ubongo"; "Ärger"; "Überleben" ])

    Assert.Equal<string list>([ "Ärger"; "Azul"; "Überleben"; "Ubongo"; "Zug um Zug" ], names result)

[<Fact>]
let ``Sortieren ändert die ursprüngliche Liste nicht`` () =
    let original = [ fluegelschlag; dixit; azul ]
    sortByName original |> ignore
    Assert.Equal<string list>([ "Flügelschlag"; "Dixit"; "Azul" ], names original)

[<Fact>]
let ``Leere Liste sortieren ergibt eine leere Liste`` () = Assert.Empty(sortByName [])

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

// ----- Inhalt prüfen (validateGameContents) -----

[<Fact>]
let ``Liste mit gültigen Spielen ist in Ordnung`` () =
    Assert.Equal(Ok games, validateGameContents games)

[<Theory>]
[<InlineData("")>]
[<InlineData("   ")>]
let ``Spiel ohne Namen wird erkannt`` (name: string) =
    let result = validateGameContents [ dixit; { azul with name = name } ]
    Assert.Equal(Error $"Diese Spiele haben keinen Namen (ID): {azul.id}", result)

[<Theory>]
[<InlineData(0)>]
[<InlineData(-3)>]
[<InlineData(101)>]
let ``Spiel mit ungültiger Spieleranzahl wird erkannt`` (players: int) =
    let result = validateGameContents [ dixit; { azul with playerNumbers = players } ]
    Assert.Equal(Error $"Diese Spiele haben eine ungültige Spieleranzahl: \"Azul\" ({players})", result)

[<Theory>]
[<InlineData("Dixit")>]
[<InlineData("dixit")>]
[<InlineData(" DIXIT ")>]
let ``Doppelter Spielname wird erkannt`` (name: string) =
    let result =
        validateGameContents [ dixit; azul; { fluegelschlag with name = name } ]

    Assert.Equal(Error "Diese Spielnamen gibt es mehrfach: \"Dixit\"", result)

[<Fact>]
let ``Geladene Liste: IDs werden vor dem Inhalt geprüft`` () =
    let result =
        validateLoadedGames
            [
                { dixit with
                    id = Guid.Empty
                    name = ""
                }
            ]

    match result with
    | Error message -> Assert.Contains("leere ID", message)
    | Ok _ -> failwith "Fehler erwartet"

[<Fact>]
let ``Geladene Liste: gültige Spiele sind in Ordnung`` () =
    Assert.Equal(Ok games, validateLoadedGames games)
