# Personal Portfolio Landing Page

A fast, responsive, dark/light-mode portfolio built with plain HTML, CSS and JavaScript. No build step, no dependencies.

## Customize (5 minutes)

Search for these in `index.html` and replace with your own details:

- `Your Name` / `YN` → your name and initials
- `you@email.com`, `your-username` → your email, GitHub and LinkedIn
- Hero text, About paragraph, skills percentages, projects, and journey entries
- Photo: put `photo.jpg` in an `assets/` folder and replace the `<span>YN</span>` inside `.avatar` with `<img src="assets/photo.jpg" alt="Your Name" />`
- Résumé: add `resume.pdf` to the repo root (or remove the button)
- Typing phrases: edit the `phrases` array in `script.js`
- Colors: edit the CSS variables at the top of `style.css`
- Project "View" links: replace each `href="#"` with your real project/GitHub URL

## Deploy on GitHub Pages

1. Create a new GitHub repository (for a personal site, name it `your-username.github.io`).
2. Upload `index.html`, `style.css`, `script.js` and `README.md`, or push with git:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```
3. In the repo go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
5. After about a minute your site is live at `https://your-username.github.io/` (or `/your-repo/`).

Submit that link for your portfolio assignment and make sure the repo is public so your instructor can view it.
