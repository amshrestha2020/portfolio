# Personal Portfolio Landing Page


# Ashesh Shrestha | AI & ML Portfolio

**Live site:** https://amshrestha2020.github.io/portfolio/

A professional portfolio built with plain HTML, CSS and JavaScript (no build step, no framework) for the **Machine Learning Fundamentals** course at Indiana Wesleyan University. It presents who I am, two course artifacts, and the interactive learning tools I built.

---

## Table of contents

1. [About me](#about-me)
2. [What is in the portfolio](#what-is-in-the-portfolio)
3. [Interactive labs](#interactive-labs)
4. [Controls and warning signs](#controls-and-warning-signs)
5. [Project structure](#project-structure)
6. [Run it locally](#run-it-locally)
7. [Deploy on GitHub Pages](#deploy-on-github-pages)
8. [Customize](#customize)
9. [How the simulators work](#how-the-simulators-work)
10. [Browser support and accessibility](#browser-support-and-accessibility)
11. [Troubleshooting](#troubleshooting)
12. [Limitations](#limitations)
13. [Credits](#credits)
14. [Contact](#contact)

---

## About me

I am a software engineer with 5+ years of experience building microservices, backend systems and cloud infrastructure for financial services, and an AI practitioner with an MSc in AI and an MSc in Computer Science. This portfolio shows how I learn, build and explain AI ideas clearly.

## What is in the portfolio

| Section | Description |
|---|---|
| **Home** | Introduction, résumé download, LinkedIn and GitHub links |
| **About** | Background, skills and focus areas |
| **Artifact 1: Timeline of AI** | Interactive timeline from the 1950 Turing Test to the 2024 Nobel Prizes. Filter by era, see the two AI winters, and check the source list |
| **Artifact 2: Workshop 2 learnings** | What I learned and built (see below) |
| **Skills** | Technical and AI skills |
| **Projects** | StudyPal (AI study assistant) with a live demo, plus other work |
| **Education and Journey** | Degrees and career path |
| **Contact** | Email and social links |

### Artifact 2 covers

1. Machine Learning vs Deep Learning
2. Adaptability and change leadership
3. New AI tools: Consensus, NotebookLM and flight simulators
4. An **Enterprise AI Governance Framework** deck, made with Gamma and applied with Claude

## Interactive labs

Each lab opens inside the page ("Play it here ▶") or full screen. All of them run in the browser and send no data anywhere.

| Lab | Folder | What it does |
|---|---|---|
| **Flight Simulator** | `flight-simulator/` | A 3D plane you can take off in or land. Real lift, drag, stall and ground effect, a coach that explains what is happening, keyboard and touch controls |
| **Helicopter Rotor Lab** | `rotor-lab/` | Animated airflow through the rotor and over one blade. Change blade count, length, width, speed, pitch and height, then read the before-and-after numbers and the pros and cons |
| **Chopper Rotor & Airflow Trainer** | `chopper-trainer/` | A parked helicopter. The blades turn only when rotor speed, airflow speed, airflow direction and rotor direction are all correct. Otherwise a flashing warning sign says what to fix |

The flight simulator links to the Rotor Lab, the Chopper Trainer and the kids version from its start screen.

## Controls and warning signs

### Flight Simulator

| Action | Keyboard | Touch |
|---|---|---|
| Pitch up / down | ↑ / ↓ | ▲ / ▼ |
| Bank left / right | ← / → | ◀ / ▶ |
| More / less power | W / S | PWR + / PWR − |
| Brake | B or Space | BRAKE |
| Change camera | C | 🎥 |
| Pause / restart / help | P / R / H | toolbar buttons |

Warning lamps on the left light up for: **STALL, LOW SPEED, OVERSPEED, SINK RATE, LOW ALT, HIGH ALT, STEEP BANK, NOSE HIGH, OFF RUNWAY**. A large warning also flashes on screen, the coach text explains how to recover, and the speed and altitude readouts turn amber or red outside the normal range.

Normal flying range used by the coach: about **60 to 100 kt**, altitude under **1,500 ft**.

### Chopper Rotor & Airflow Trainer

| Setting | Correct value |
|---|---|
| Rotor speed | 350 to 450 RPM |
| Airflow speed | 55 to 85 m/s |
| Airflow direction | Downward |
| Rotor direction | Counter-clockwise (seen from above) |

The helicopter stays parked. The blades turn only when all four are correct and the rotor is started. Airflow lines turn red when the airflow is wrong and run upward if the direction is reversed. Four status lamps show which setting is the problem.

### Helicopter Rotor Lab

A banner above the airflow view warns about stalled blades, a rotor spinning too fast or too slowly, falling, climbing too fast, and hovering very low.


## Project structure

```
portfolio/
├── index.html              Main portfolio page
├── style.css               Portfolio styles (dark and light theme)
├── script.js               Theme toggle, nav, timeline filter, lab embeds
├── README.md               This file
├── resume.pdf              Résumé (add your own)
├── assets/photo.jpg        Profile photo (add your own)
├── flight-simulator/       3D flight simulator
│   ├── index.html
│   ├── style.css
│   ├── main.js             Scene, controls, HUD, warnings
│   ├── flight-physics.js   Flight model
│   └── three.min.js        three.js (included locally, no CDN)
├── rotor-lab/              Helicopter rotor airflow lab
│   ├── index.html
│   ├── style.css
│   ├── rotor-physics.js    Rotor model
│   └── rotor.js            Animation and interface
├── chopper-trainer/        Parked chopper with warning signs (one file)
│   └── index.html
├── kids/                   Simple version for children (one file)
│   └── index.html
└── prompt-simulator/       Prompt practice game
    ├── index.html
    ├── style.css
    └── app.js
```

## Run it locally

Open `index.html` in a browser. To use a local server instead:

```bash
cd portfolio
python3 -m http.server 8000
```

Then visit http://localhost:8000. No installs or build steps are needed.

## Deploy on GitHub Pages

1. Create a public repository (for example `portfolio`).
2. Upload all files and folders from this project, keeping the structure above.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
5. After about a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

Using git:

```bash
git init
git add .
git commit -m "Portfolio with interactive labs"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

All links between pages point to explicit `index.html` files, so no folder listing is shown to visitors.

## Customize

- **Personal details:** edit the text in `index.html` (name, bio, skills, projects, education).
- **Email:** replace `YOUR_EMAIL` in the contact section.
- **Photo and résumé:** add `assets/photo.jpg` and `resume.pdf`.
- **Colors:** edit the CSS variables at the top of `style.css`.
- **Typing phrases in the hero:** edit the `phrases` array in `script.js`.
- **Repo links:** the "View source" buttons use `amshrestha2020/portfolio`. Change them if your repo has another name.
- **Flight limits:** warning thresholds are in `flight-simulator/main.js` (search for `115`, `50` and `1500`).
- **Chopper limits:** the correct ranges are in `chopper-trainer/index.html` (search for `350`, `450`, `55` and `85`).

## How the simulators work

**Flight simulator.** A point-mass model in SI units: lift from a lift curve that stalls at high angle of attack, drag with an induced part, engine thrust that falls with speed, gravity, ground effect near the runway, coordinated turns, and ground roll with braking. Landings are graded by sink rate (Butter, Good, Hard) and a crash is detected for very hard landings, extreme bank or nose angles. The 3D view uses three.js with a chase and a cockpit camera.

**Rotor Lab.** Blade-element and momentum theory for a hovering rotor: thrust, induced velocity, disk loading, power, figure of merit, tip Mach number, ground effect and blade stall. The blade cross-section view uses potential flow around an airfoil. The baseline is close to a light four-seat helicopter. The pros and cons are generated by comparing your design with the baseline.

**Chopper Trainer.** A simple rules model: four checks (RPM, airflow speed, airflow direction, rotor direction) decide whether the blades may turn.

## Browser support and accessibility

- Current Chrome, Edge, Firefox and Safari. The 3D flight simulator needs WebGL.
- Works on phones and tablets (touch controls in the flight simulator and kids page).
- Dark and light theme, keyboard navigation, alt text, and reduced-motion support (flashing is turned off when the visitor asks for less motion).

## Troubleshooting

| Problem | Fix |
|---|---|
| Page shows a folder listing | Open the page's `index.html` directly, or use the portfolio links, which already do |
| Flight simulator shows "WebGL not available" | Turn on hardware acceleration in the browser, or try another browser |
| Keyboard does not control the flight simulator inside the portfolio | Click inside the simulator once to give it focus, or use "Open full screen" |
| Changes do not show after upload | Wait a minute for GitHub Pages, then hard refresh (Ctrl/Cmd + Shift + R) |

## Limitations

The simulators are **educational and simplified**. They are not certified training devices, maintenance guides or real operating procedures. Real aircraft limits and rotor directions differ by model and configuration.

