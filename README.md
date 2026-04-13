# Watcher

`Watcher` is now scaffolded as a three-layer TypeScript workspace:

- `packages/shared`: shared rules, types, board data and command payloads.
- `packages/server`: Colyseus authoritative room server.
- `packages/client`: React + Zustand + React Three Fiber prototype client.

## Current milestone

The first playable slice is in place:

- cube-based board tiles
- ellipsoid pieces
- server-authoritative one-tile movement
- floor, wall, and earth-wall terrain hooks

## Development

PowerShell on this machine blocks `npm.ps1`, so use `npm.cmd` for setup:

```powershell
npm.cmd install
npm.cmd run dev
```

Client: `http://localhost:5173`

Server: `ws://localhost:2567`

## Deploy

To deploy on a server:
```powershell
Set-Content -Path packages/client/.env -Value "VITE_SERVER_URL=ws://<YOUR PUBLIC IP>:2567" -Encoding utf8

npm.cmd install
npm.cmd run dev
```

## Controls

- `WASD` / arrow keys: move the active piece
- click an adjacent highlighted tile: move there
- `R`: refresh move points for the current turn

## Architecture notes

The implementation follows the design docs:

- rendering and local UX stay in the client
- the server validates every move and owns the room state
- shared movement rules live in a reusable package

