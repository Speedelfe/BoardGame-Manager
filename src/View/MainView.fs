namespace BoardGameManager

open Elmish
open Avalonia.FuncUI
open Avalonia.FuncUI.DSL
open Avalonia.FuncUI.Elmish
open Avalonia.FuncUI.Hosts
open Avalonia.FuncUI.Types
open Avalonia
open Avalonia.Controls
open Avalonia.Controls.ApplicationLifetimes
open Avalonia.Diagnostics
open Avalonia.Layout

open BoardGameManager.Types

module MainView =
    let init () : State =
        { gameList =
            [ { name = "Dixit"
                playerNumbers = 2
                playTime = 60
                lastPlayed = None
                genre = GameGenre.Strategy
                secondaryGenre = None
                shelf = ""
                description = None } ] }

    let update msg state = state

    let gameItemView (game: Game) =
        TextBlock.create [
            TextBlock.text game.name
        ]

    let view state dispatch : IView =
        DockPanel.create [
            DockPanel.children [
                ListBox.create [
                    ListBox.dataItems state.gameList
                    ListBox.itemTemplate (DataTemplateView<Game>.create gameItemView)
                ]
            ]
        ]
