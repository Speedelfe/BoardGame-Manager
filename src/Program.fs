namespace BoardGameManager

open Elmish
open Avalonia
open Avalonia.Controls.ApplicationLifetimes
open Avalonia.FuncUI.Elmish
open Avalonia.FuncUI.Hosts
open Avalonia.Styling
open Avalonia.Themes.Fluent

type MainWindow() as this =
    inherit HostWindow()

    do
        base.Title <- "Boardgame Manager"
        base.Width <- 900.0
        base.Height <- 500.0

        Program.mkSimple MainView.init MainView.update MainView.view
        |> Program.withHost this
#if DEBUG
        |> Program.withConsoleTrace
#endif
        |> Program.run

type App() =
    inherit Application()

    override this.Initialize() =
        this.Styles.Add(FluentTheme())
        this.RequestedThemeVariant <- ThemeVariant.Dark

    override this.OnFrameworkInitializationCompleted() =
        match this.ApplicationLifetime with
        | :? IClassicDesktopStyleApplicationLifetime as desktopLifetime -> desktopLifetime.MainWindow <- MainWindow()
        | _ -> ()

module Program =
    [<EntryPoint>]
    let main (args: string[]) =
        AppBuilder
            .Configure<App>()
            .UsePlatformDetect()
            .StartWithClassicDesktopLifetime(args)
