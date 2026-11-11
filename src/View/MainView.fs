namespace BoardGameManager

module MainView =
    open Avalonia.Controls
    open Avalonia.FuncUI
    open Avalonia.FuncUI.DSL
    open Avalonia.FuncUI.Types
    open Avalonia.Layout
    open Avalonia.Media

    open BoardGameManager.Types
    open BoardGameManager.Functions
    open BoardGameManager.GameFunctions


    let init () : State = {
        gameList =
            [
                { name = "Dixit"; playerNumbers = 2 }
                {
                    name = "Flügelschlag"
                    playerNumbers = 5
                }
            ]
        choosenGame = None
        newGameView = false
        newGame = createNewPossibleGame ()
    }

    let update msg state =
        match msg with
        | ShowDetail game ->
            { state with
                choosenGame = Some game
                newGameView = false
            }
        | ShowNewGame ->
            { state with
                choosenGame = None
                newGameView = true
                newGame = createNewPossibleGame ()
            }
        // Bei jeder Eingabe merken wir uns den Text und blenden einen alten Fehler aus
        | NewGameNameChanged text ->
            { state with
                newGame =
                    { state.newGame with
                        nameInput = text
                        error = None
                    }
            }
        | NewGamePlayerNumbersChanged text ->
            { state with
                newGame =
                    { state.newGame with
                        playerNumbersInput = text
                        error = None
                    }
            }
        | CancelNewGame ->
            { state with
                newGameView = false
                newGame = createNewPossibleGame ()
            }
        | SaveNewGame ->
            match validateNewGame state.gameList state.newGame with
            | Error message ->
                { state with
                    newGame =
                        { state.newGame with
                            error = Some message
                        }
                }
            | Ok game ->
                let newGameList = List.append state.gameList [ game ]

                try
                    saveFile newGameList
                    // Formular schließen und das neue Spiel gleich anzeigen
                    { state with
                        gameList = newGameList
                        choosenGame = Some game
                        newGameView = false
                        newGame = createNewPossibleGame ()
                    }
                with ex ->
                    { state with
                        newGame =
                            { state.newGame with
                                error = Some $"Speichern hat nicht geklappt: {ex.Message}"
                            }
                    }

    let gameItemView (game: Game) =
        TextBlock.create [ TextBlock.text game.name ]

    // Formular "Neues Spiel", rechts
    let newGameView (form: newGame) dispatch : IView =
        StackPanel.create [
            StackPanel.dock Dock.Right
            StackPanel.width 300.
            StackPanel.margin 10.
            StackPanel.orientation Orientation.Vertical
            StackPanel.spacing 5.
            StackPanel.children [
                TextBlock.create [ TextBlock.fontSize 15.; TextBlock.text "Trage ein neues Spiel ein" ]
                TextBlock.create [ TextBlock.text "Spielname" ]
                TextBox.create [
                    TextBox.placeHolderText "Spielname"
                    TextBox.text form.nameInput
                    TextBox.onTextChanged (fun text -> dispatch (NewGameNameChanged text))
                ]
                TextBlock.create [ TextBlock.text "Spieleranzahl" ]
                TextBox.create [
                    TextBox.placeHolderText "Spieleranzahl"
                    TextBox.text form.playerNumbersInput
                    TextBox.onTextChanged (fun text -> dispatch (NewGamePlayerNumbersChanged text))
                ]
                // Fehlermeldung nur anzeigen, wenn es eine gibt
                match form.error with
                | None -> ()
                | Some message ->
                    TextBlock.create [
                        TextBlock.text message
                        TextBlock.foreground Brushes.OrangeRed
                        TextBlock.textWrapping TextWrapping.Wrap
                    ]
                StackPanel.create [
                    StackPanel.orientation Orientation.Horizontal
                    StackPanel.spacing 10.
                    StackPanel.children [
                        Button.create [ Button.content "Speichern"; Button.onClick (fun _ -> dispatch SaveNewGame) ]
                        Button.create [ Button.content "Abbrechen"; Button.onClick (fun _ -> dispatch CancelNewGame) ]
                    ]
                ]
            ]
        ]

    let view state dispatch : IView =
        DockPanel.create [
            DockPanel.children [
                StackPanel.create [
                    // 'Menü'-Leiste, oben
                    StackPanel.dock Dock.Top
                    StackPanel.orientation Orientation.Horizontal
                    StackPanel.spacing 10.
                    StackPanel.children [
                        TextBlock.create [ TextBlock.text "Menü" ]
                        Button.create [ Button.content "New Game"; Button.onClick (fun _ -> dispatch ShowNewGame) ]
                    ]
                ]
                // Liste der Spiele ,unter Menü, links
                ListBox.create [
                    ListBox.dock Dock.Left
                    ListBox.dataItems state.gameList
                    ListBox.itemTemplate (DataTemplateView<Game>.create gameItemView)
                    // Auswahl in der Liste passend zum ausgewählten Spiel halten.
                    // Ohne Auswahl (null) kann man danach jedes Spiel wieder anklicken.
                    ListBox.selectedItem (
                        match state.choosenGame with
                        | Some game -> box game
                        | None -> null
                    )
                    // Achtung: FuncUI richtet diese Funktion nur einmal ein. Sie darf deshalb
                    // nichts aus "state" benutzen (das wäre für immer der Stand vom Programmstart).
                    // Darum nehmen wir das angeklickte Spiel direkt und nicht seine Nummer in der Liste.
                    ListBox.onSelectedItemChanged (fun item ->
                        match item with
                        | :? Game as game -> dispatch (ShowDetail game)
                        | _ -> ())

                ]
                // Detail Infos eines Spieles, rechts -> choosenGame Some enthält ausgewähles Spiel, sonst none
                match state.choosenGame with
                | None -> ()
                | Some _ ->
                    DockPanel.create [
                        DockPanel.dock Dock.Right
                        DockPanel.children [
                            StackPanel.create [
                                StackPanel.dock Dock.Bottom
                                StackPanel.orientation Orientation.Horizontal
                                StackPanel.children [ Button.create [ Button.content "Edit" ] ]
                            ]
                            StackPanel.create [
                                StackPanel.dock Dock.Top
                                StackPanel.orientation Orientation.Vertical
                                StackPanel.children [
                                    match state.choosenGame with
                                    | None -> ()
                                    | Some game ->
                                        TextBlock.create [ TextBlock.text $"Spieleranzahl {game.playerNumbers}" ]
                                ]
                            ]
                        ]
                    ]
                // Neues Spiel Anlegen, rechts
                if state.newGameView then
                    newGameView state.newGame dispatch
            ]
        ]
