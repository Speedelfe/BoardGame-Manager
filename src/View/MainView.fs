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
            [ { name = "Dixit" }
              { name = "Flügelschlag" } ] }

    let update msg state = state

    let gameItemView (game: Game) =
        TextBlock.create [
            TextBlock.text game.name
        ]

    let view state dispatch : IView =
        DockPanel.create [
            DockPanel.children [
                StackPanel.create [
                    StackPanel.dock Dock.Top
                    StackPanel.orientation Orientation.Horizontal
                    StackPanel.spacing 10.
                    StackPanel.children [
                        TextBlock.create [
                            TextBlock.text "Menü"
                        ]
                        TextBlock.create [
                            TextBlock.text "Option"
                        ]
                    ]
                ]
                ListBox.create [
                    ListBox.dock Dock.Left
                    ListBox.dataItems state.gameList
                    ListBox.itemTemplate (DataTemplateView<Game>.create gameItemView)
                ]
                StackPanel.create [
                    StackPanel.dock Dock.Right
                    StackPanel.orientation Orientation.Vertical
                    StackPanel.children [
                        TextBlock.create [
                            TextBlock.text "Game Details"
                        ]
                    ]
                ]
            ]
        ]
