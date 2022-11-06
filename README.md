# BoardGame-Manager

[![Last commit](https://img.shields.io/github/last-commit/Speedelfe/BoardGame-Manager?style=flat-square)](https://github.com/Speedelfe/BoardGame-Manager/commits/)
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/Speedelfe/BoardGame-Manager/Build?style=flat-square)](https://github.com/Speedelfe/BoardGame-Manager/actions/workflows/build.yml)

## Development

It is highly recommended to use VScode and the provided devcontainer for development.

To build the project, use `dotnet build`.
To run the project use the configured launch settings in VScode and click the green arrow in the
debug tab or press F5.
Alternativly you could use `dotnet run --project src/` in the terminal. This method has no debugging
capabilities.

To test the application in the devcontainer visit `http://localhost:6080` in your browser or use
another VNC client to connect to `localhost:5901`. The default password is `vscode`.
