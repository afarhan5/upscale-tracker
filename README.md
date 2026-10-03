# My Next.js App

A starter Next.js 14 app ready to deploy on Vercel.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open in browser
# http://localhost:3000
```

---

## 📁 Project Structure

```
my-nextjs-app/
├── app/
│   ├── layout.jsx       ← Root layout (wraps all pages)
│   ├── page.jsx         ← Home page "/"
│   ├── page.module.css  ← CSS for home page
│   └── globals.css      ← Global styles
├── components/          ← Reusable React components
├── public/              ← Static files (images, icons)
├── .env.example         ← Template for env variables
├── .gitignore           ← Files to exclude from Git
├── next.config.js       ← Next.js configuration
└── package.json         ← Project dependencies
```

---

## ➕ Adding New Pages

Create a file at `app/about/page.jsx` → becomes `/about`

```jsx
export default function About() {
  return <h1>About Page</h1>
}
```

---

## 🌐 Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New Project"**
3. Click **"Import"** next to your GitHub repo
4. Click **"Deploy"** (Vercel auto-detects Next.js)
5. ✅ Your app is live at `your-app.vercel.app`

### Step 3 — Add Environment Variables (if needed)

1. Go to your project on Vercel
2. **Settings → Environment Variables**
3. Add your keys from `.env.local`
4. Click **Redeploy**

---

## 🔄 Auto-Deployments

After initial setup, every `git push` to `main` auto-deploys.

```bash
# Make changes, then:
git add .
git commit -m "update homepage"
git push
# → Vercel auto-deploys in ~30 seconds
```

---

## 🛠 Useful Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Build for production |
| `npm run start` | Run production build locally |
| `npm run lint` | Check for code errors |

---

## 🔑 Environment Variables

| Variable | Where to set |
|---|---|
| Local dev | `.env.local` file |
| Production | Vercel Dashboard → Settings → Env Vars |

> ⚠️ Never commit `.env.local` to GitHub. It's already in `.gitignore`.

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js App Router Guide](https://nextjs.org/docs/app)
