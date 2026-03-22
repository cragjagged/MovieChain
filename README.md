# Movie Chain

A self-hosted film-watching game where each movie must share a credited person with the previous one — but you can't reuse the same credit type back-to-back.

Connects to [TMDB](https://www.themoviedb.org/) for film and credit data, and optionally [Emby](https://emby.media/) to track what you've already watched.

---

## How to play

1. Pick a starting movie
2. For each new addition, choose a person who worked on both it and the previous film
3. The credit type (Actor, Director, Writer, etc.) must be different from the one used on the previous link
4. Films you've already watched are blocked — keep it fresh
5. Series films must be added in order — no skipping ahead to a sequel if you haven't watched the earlier entries

---

## Getting started

You'll need a free [TMDB API key](https://www.themoviedb.org/settings/api) regardless of how you install. An [Emby](https://emby.media/) server is optional — it enables watch tracking.

### Windows installer (easiest)

1. Download `MovieChain-Setup-x.x.x.exe` from the [latest release](https://github.com/cragjagged/MovieChain/releases/latest)
2. Run it and follow the prompts — it installs Movie Chain as a Windows service
3. Open `http://localhost:7879` in your browser (or whichever port you chose in the Advanced Options step)

Movie Chain will start automatically on boot and update itself in the background. The installer requires Windows 10 64-bit or later.

An **Advanced Options** page in the installer lets you change the port (default `7879`), the install directory, and the data directory (default `C:\ProgramData\MovieChain`) if needed.

### Docker

```bash
docker compose up -d
```

Then open [http://localhost:7879](http://localhost:7879). To use a different port, update `docker-compose.yml`:

```yaml
environment:
  PORT: "8080"
ports:
  - "8080:8080"
```

### Linux / macOS

Docker is the easiest path on Linux and macOS — see above. If you'd rather run it directly, you'll need [Node.js 22+](https://nodejs.org/).

#### Clone and build

```bash
git clone https://github.com/cragjagged/MovieChain.git
cd MovieChain
npm run serve    # builds the app and starts the server at http://localhost:7879
```

#### Run as a service

**Linux (systemd)** — create `/etc/systemd/system/movie-chain.service`:

```ini
[Unit]
Description=Movie Chain
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/MovieChain
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now movie-chain
```

**macOS / cross-platform** — use [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

### Windows (manual / power user)

The installer above handles all of this automatically — use this if you prefer full control. You'll need [Node.js 22+](https://nodejs.org/) and [NSSM](https://nssm.cc/download) if you want to run as a service.

#### Clone and start

```powershell
git clone https://github.com/cragjagged/MovieChain.git
cd MovieChain
npm run serve    # builds the app and starts the server at http://localhost:7879
```

#### Run as a Windows service (NSSM)

Run the following in an elevated PowerShell prompt, adjusting the path to wherever you cloned the repo:

```powershell
$app = "C:\MovieChain"
$node = (Get-Command node).Source

$data = "C:\ProgramData\MovieChain"   # change if you want data elsewhere

nssm install MovieChain $node
nssm set MovieChain AppParameters "$app\server\index.js"
nssm set MovieChain AppDirectory $app
nssm set MovieChain AppEnvironmentExtra "MC_DATA_DIR=$data" "PORT=7879"
nssm set MovieChain Start SERVICE_AUTO_START
nssm set MovieChain DisplayName "Movie Chain"

New-Item -ItemType Directory -Force $data | Out-Null
Start-Service MovieChain
```

Movie Chain will now start automatically on boot. Logs are written to the console — use `nssm set MovieChain AppStdout <path>` if you need persistent log files.

---

## First-time setup

On first launch you'll be walked through three steps:

1. **TMDB key** — paste your API key or Bearer token
2. **Emby** — optional; enter your server address, API key, and pick which user's watch history to use
3. Done — start your first chain

You can update any of these settings later from the **Settings** screen.

---

## Auto-update

Movie Chain can update itself automatically. Go to the **System** screen to configure it:

- **Channel** — *Stable* tracks releases; *Development* tracks the latest commits on the develop branch (not available for Windows installer installs)
- **Check interval** — how often to look for updates (default: 24 hours)

When an update is found, a banner appears at the top of the screen. You can install it immediately or dismiss the banner and come back to it later — a dot on the System nav item will remind you it's waiting.

---

## Credit types

Each link in your chain is categorised by credit type:

**Actor · Actress · Director · Writer · Producer · Composer · Cinematographer · Editor**

There's also a free-form **Other** option if you want to make a custom connection.

If you use Emby, all cast members are treated as Actor. Connecting via TMDB data will distinguish Actor and Actress.
