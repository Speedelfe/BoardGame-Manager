// Tests für Laden und Speichern der Spieleliste.
// Alle Dateien landen in einem eigenen Ordner im Ausgabeordner der Tests
// (tests/.../bin/...), nie in der echten Spielesammlung.
module BoardGameManager.Tests.FileTests

open System
open System.IO
open Xunit
open BoardGameManager.Functions
open BoardGameManager.Tests.TestData

// Legt einen frischen, leeren Ordner an, führt den Test damit aus
// und löscht den Ordner danach wieder (auch wenn der Test fehlschlägt).
let withTestFolder (test: string -> unit) =
    let folder =
        Path.Combine(AppContext.BaseDirectory, "testdata", string (Guid.NewGuid()))

    Directory.CreateDirectory folder |> ignore

    try
        test folder
    finally
        Directory.Delete(folder, true)

// Erwartet einen Fehler beim Laden und gibt die Meldung zurück
let expectLoadError path =
    match loadFile path with
    | Error message -> message
    | Ok games -> failwith $"Fehler erwartet, aber Ok: {games}"

[<Fact>]
let ``Fehlende Datei ergibt eine leere Liste`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "gibtsnicht.json")
        Assert.Equal(Ok [], loadFile path))

[<Fact>]
let ``Gespeicherte Spiele werden genauso wieder geladen`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path games
        Assert.Equal(Ok games, loadFile path))

[<Fact>]
let ``Speichern legt einen fehlenden Ordner an`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "data", "games.json")
        saveFile path games
        Assert.True(File.Exists path))

[<Fact>]
let ``Speichern einer leeren Liste und Laden ergibt eine leere Liste`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path []
        Assert.Equal(Ok [], loadFile path))

[<Fact>]
let ``Kaputte Datei ergibt einen Fehler mit dem Dateipfad`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        File.WriteAllText(path, """{ "gameList": [ { "name": "Dixit" """)
        let message = expectLoadError path
        Assert.StartsWith("Die Spieleliste", message)
        Assert.Contains(Path.GetFullPath path, message))

[<Fact>]
let ``Spiel ohne ID ergibt einen Fehler`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        File.WriteAllText(path, """{ "gameList": [ { "name": "Dixit", "playerNumbers": 3 } ] }""")
        let message = expectLoadError path
        Assert.Contains("id", message))

[<Fact>]
let ``Ungültige ID ergibt einen Fehler`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        File.WriteAllText(path, """{ "gameList": [ { "id": "abc", "name": "Dixit", "playerNumbers": 3 } ] }""")
        expectLoadError path |> ignore)

[<Fact>]
let ``Doppelte IDs in der Datei ergeben einen Fehler`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path [ dixit; { dixit with name = "Kopie von Dixit" } ]
        let message = expectLoadError path
        Assert.Contains("gleiche ID", message))

[<Fact>]
let ``Leere ID in der Datei ergibt einen Fehler`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path [ { dixit with id = Guid.Empty } ]
        let message = expectLoadError path
        Assert.Contains("leere ID", message))

[<Fact>]
let ``Ungültige Spieleranzahl in der Datei ergibt einen Fehler`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path [ { dixit with playerNumbers = 0 } ]
        let message = expectLoadError path
        Assert.Contains("ungültige Spieleranzahl", message))

[<Fact>]
let ``Doppelter Spielname in der Datei ergibt einen Fehler`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path [ dixit; { azul with name = "dixit" } ]
        let message = expectLoadError path
        Assert.Contains("mehrfach", message))
