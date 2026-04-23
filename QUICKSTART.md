# RTK Token Optimizer — Quick Start

## Where to find your tools

After installing the plugin, go to **Workflows** in AGNT. When you add a node, search for **"RTK"** or look in the tool picker.

You will see **3 tools** (all part of the same plugin):

| Tool | What it does | Icon |
|------|-------------|------|
| **Shell Command Runner** | Runs any shell command via RTK and tracks token savings | 🖥️ terminal |
| **Savings Statistics** | Shows your stats (runs, tokens saved, history) | 📊 table |
| **Savings Dashboard** | Visual HTML dashboard with charts | 📈 gauge |

---

## How to use the Dashboard

The Dashboard is a **Widget** — it returns HTML that renders visually inside AGNT.

### Step-by-step:

1. Go to **Workflows** → **Create New Workflow**
2. Click **Add Node**
3. Search for **"Savings Dashboard"** (or "RTK")
4. Drag the **Savings Dashboard** node onto the canvas
5. Add a **Trigger** node (e.g. "On Load" or "Button")
6. Connect Trigger → Dashboard
7. Run the workflow

The Dashboard will render as a **visual card** with:
- Stat cards (Total Runs, Tokens Saved, RTK Runs, Fallbacks)
- Adoption rate ring
- Savings trend sparkline
- Top commands bar chart

### Or just ask your agent:
> *"Show me my RTK dashboard"*

---

## How to track token savings

Every time you use **Shell Command Runner**, the plugin automatically saves:
- How many tokens were saved
- Which command was run
- Whether RTK or fallback was used

The data is stored locally in `~/.rtk-agnt-stats/stats.json` and persists across restarts.

---

## First test run

Ask your agent:
> *"Run git status with RTK"*

Then:
> *"Show my RTK stats"*

You will see:
- `totalRuns: 1`
- `tokensSaved: ~2400` (estimated)
- `rtkInstalled: true` (if RTK is installed) or `false` (fallback)

---

## Troubleshooting

**No icons showing?**
- Icons depend on your AGNT theme. They may appear as text labels if the icon font is not loaded.

**Dashboard shows empty?**
- The dashboard needs at least 1 run to show data. Run a command first.

**RTK not found?**
- Install RTK: `brew install rtk` or [install.sh](https://github.com/rtk-ai/rtk)
- The plugin falls back to raw output automatically.
