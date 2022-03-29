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


module MainView =
    let init () = ()

    let update msg state = state

    let view state dispatch : IView =
        DockPanel.create [
            DockPanel.children [
                TextBlock.create [
                    TextBlock.text "Hello Boardgame!"
                ]
            ]
        ]
