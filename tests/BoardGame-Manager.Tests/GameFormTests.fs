// Tests für das Formular: neues Spiel anlegen und Spiel bearbeiten
module BoardGameManager.Tests.GameFormTests

open System
open Xunit
open BoardGameManager.Types
open BoardGameManager.GameFunctions
open BoardGameManager.Tests.TestData

// Formular für ein neues Spiel mit diesen Eingaben
let newForm name players =
    { emptyForm () with
        nameInput = name
        playerNumbersInput = players
    }

// Formular zum Bearbeiten eines Spiels mit geänderten Eingaben
let editForm game name players =
    { formFromGame game with
        nameInput = name
        playerNumbersInput = players
    }

// Erwartet ein Ok und gibt das Spiel zurück, sonst schlägt der Test fehl
let expectOk result =
    match result with
    | Ok game -> game
    | Error message -> failwith $"Ok erwartet, aber Fehler: {message}"

// Erwartet einen Fehler und gibt die Meldung zurück, sonst schlägt der Test fehl
let expectError result =
    match result with
    | Error message -> message
    | Ok game -> failwith $"Fehler erwartet, aber Ok: {game}"

// ----- Neues Spiel -----

[<Fact>]
let ``Leeres Formular hat keine Eingaben und bearbeitet kein Spiel`` () =
    let form = emptyForm ()
    Assert.Equal("", form.nameInput)
    Assert.Equal("", form.playerNumbersInput)
    Assert.Equal(None, form.error)
    Assert.Equal(None, form.editing)

[<Fact>]
let ``Neues Spiel mit gültigen Eingaben wird angelegt`` () =
    let game = validateGameForm games (newForm "Monopoly" "4") |> expectOk
    Assert.Equal("Monopoly", game.name)
    Assert.Equal(4, game.playerNumbers)

[<Fact>]
let ``Neues Spiel bekommt eine neue, nicht leere ID`` () =
    let game = validateGameForm games (newForm "Monopoly" "4") |> expectOk
    Assert.NotEqual(Guid.Empty, game.id)
    Assert.DoesNotContain(game.id, games |> List.map (fun g -> g.id))

[<Fact>]
let ``Leerzeichen am Anfang und Ende werden entfernt`` () =
    let game = validateGameForm games (newForm "  Monopoly " " 4 ") |> expectOk
    Assert.Equal("Monopoly", game.name)
    Assert.Equal(4, game.playerNumbers)

[<Theory>]
[<InlineData("", "3", "Bitte gib einen Spielnamen ein.")>]
[<InlineData("   ", "3", "Bitte gib einen Spielnamen ein.")>]
[<InlineData("Monopoly", "", "Die Spieleranzahl muss eine Zahl sein.")>]
[<InlineData("Monopoly", "vier", "Die Spieleranzahl muss eine Zahl sein.")>]
[<InlineData("Monopoly", "2.5", "Die Spieleranzahl muss eine Zahl sein.")>]
[<InlineData("Monopoly", "0", "Die Spieleranzahl muss mindestens 1 sein.")>]
[<InlineData("Monopoly", "-2", "Die Spieleranzahl muss mindestens 1 sein.")>]
[<InlineData("Monopoly", "101", "Die Spieleranzahl darf höchstens 100 sein.")>]
[<InlineData("Monopoly", "5000", "Die Spieleranzahl darf höchstens 100 sein.")>]
[<InlineData("Monopoly", "99999999999999999999", "Die Spieleranzahl darf höchstens 100 sein.")>]
let ``Ungültige Eingaben ergeben die passende Fehlermeldung`` (name: string, players: string, expected: string) =
    let message = validateGameForm games (newForm name players) |> expectError
    Assert.Equal(expected, message)

[<Theory>]
[<InlineData("Dixit")>]
[<InlineData("dixit")>]
[<InlineData(" DIXIT ")>]
let ``Neues Spiel mit vorhandenem Namen wird abgelehnt`` (name: string) =
    let message = validateGameForm games (newForm name "3") |> expectError
    Assert.Equal($"Das Spiel \"{name.Trim()}\" gibt es schon.", message)

// ----- Spiel bearbeiten -----

[<Fact>]
let ``Formular zum Bearbeiten ist mit den Daten des Spiels gefüllt`` () =
    let form = formFromGame dixit
    Assert.Equal("Dixit", form.nameInput)
    Assert.Equal("3", form.playerNumbersInput)
    Assert.Equal(None, form.error)
    Assert.Equal(Some dixit, form.editing)

[<Fact>]
let ``Bearbeitetes Spiel behält seine ID`` () =
    let game = validateGameForm games (editForm dixit "Dixit" "6") |> expectOk
    Assert.Equal(dixit.id, game.id)
    Assert.Equal(6, game.playerNumbers)

[<Fact>]
let ``Bearbeitetes Spiel darf seinen eigenen Namen behalten`` () =
    let game = validateGameForm games (editForm dixit "Dixit" "3") |> expectOk
    Assert.Equal("Dixit", game.name)

[<Fact>]
let ``Bearbeitetes Spiel darf umbenannt werden und behält die ID`` () =
    let game = validateGameForm games (editForm dixit "Dixit Odyssey" "3") |> expectOk
    Assert.Equal("Dixit Odyssey", game.name)
    Assert.Equal(dixit.id, game.id)

[<Fact>]
let ``Bearbeitetes Spiel darf nicht den Namen eines anderen Spiels bekommen`` () =
    let message = validateGameForm games (editForm dixit "azul" "3") |> expectError
    Assert.Equal("Das Spiel \"azul\" gibt es schon.", message)

[<Fact>]
let ``Beim Bearbeiten gelten die gleichen Prüfregeln wie beim Anlegen`` () =
    let message = validateGameForm games (editForm dixit "Dixit" "null") |> expectError
    Assert.Equal("Die Spieleranzahl muss eine Zahl sein.", message)

// ----- Ungespeicherte Eingaben erkennen (formHasChanges) -----

[<Fact>]
let ``Frisch geöffnetes Formular hat keine Änderungen`` () =
    Assert.False(formHasChanges (emptyForm ()))
    Assert.False(formHasChanges (formFromGame dixit))

[<Fact>]
let ``Eingaben im neuen Formular zählen als Änderung`` () =
    Assert.True(formHasChanges (newForm "Monopoly" ""))
    Assert.True(formHasChanges (newForm "" "4"))

[<Fact>]
let ``Geänderte Eingaben beim Bearbeiten zählen als Änderung`` () =
    Assert.True(formHasChanges (editForm dixit "Dixit Odyssey" "3"))
    Assert.True(formHasChanges (editForm dixit "Dixit" "6"))

[<Fact>]
let ``Zurückgetippte Eingaben zählen nicht als Änderung`` () =
    Assert.False(formHasChanges (editForm dixit "Dixit" "3"))

[<Fact>]
let ``Eine Fehlermeldung allein zählt nicht als Änderung`` () =
    Assert.False(
        formHasChanges
            { emptyForm () with
                error = Some "Fehler"
            }
    )

[<Fact>]
let ``Die größte erlaubte Spieleranzahl wird angenommen`` () =
    let game = validateGameForm games (newForm "Monopoly" "100") |> expectOk
    Assert.Equal(100, game.playerNumbers)
