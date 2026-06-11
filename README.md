# Herkul — Blog personnel

Blog complet construit avec **Next.js 14** (App Router, TypeScript), **Supabase**
(base de données, authentification, stockage d'images), **Tiptap** (éditeur
visuel niveau WordPress) et déployé sur **Cloudflare Pages** via
`@cloudflare/next-on-pages`.

## Fonctionnalités

- **Public** : page d'accueil avec les articles publiés (du plus récent au plus
  ancien), page article avec contenu riche (images, vidéos YouTube, tableaux…),
  100 % responsive à partir de 320 px.
- **Admin** (`/admin`, protégé par mot de passe) : tableau de bord, création /
  modification / suppression / publication d'articles, éditeur Tiptap complet
  (polices, tailles, couleurs, surlignage, alignement, listes, liens, images,
  YouTube, citations, tableaux…), auto-save toutes les 30 secondes, notes
  privées par article, compression automatique des images en WebP avant envoi.

## Le logo

Le header affiche `/logo.svg`. **Placez votre fichier de logo dans
`public/logo.svg`** (SVG avec fond transparent). Tant que le fichier est
absent, l'image ne s'affiche pas — c'est normal, le reste du site fonctionne.

## Démarrage local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs Supabase
npm run dev                  # http://localhost:3000
```

## Variables d'environnement

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (⚠️ secrète, jamais côté navigateur) |

## Base de données

Tout le SQL nécessaire (table `posts`, trigger `updated_at`, politiques RLS et
politiques du bucket Storage `images`) se trouve dans
[`supabase/schema.sql`](supabase/schema.sql) : copiez/collez son contenu dans
**Supabase → SQL Editor → Run** après avoir créé le bucket public `images`
dans **Storage**.

## Déploiement sur Cloudflare Pages

1. Pousser ce dépôt sur GitHub.
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** →
   sélectionner le dépôt.
3. Configuration du build :
   - Framework preset : **Next.js**
   - Build command : `npx @cloudflare/next-on-pages`
   - Build output directory : `.vercel/output/static`
4. Dans **Settings → Environment variables**, ajouter les trois variables
   ci-dessus (Production **et** Preview).
5. **Save and Deploy** → Cloudflare fournit une URL en `.pages.dev`.

Le fichier [`wrangler.toml`](wrangler.toml) active le flag `nodejs_compat`
requis par Next.js sur Cloudflare.

### Tester le build Cloudflare en local

```bash
npm run pages:build   # build next-on-pages
npm run preview       # sert le site comme sur Cloudflare
```

## Structure

```
app/                  pages publiques + admin (App Router)
components/           Header, ArticleCard, TiptapEditor, ImageUpload,
                      AdminLayout, PostForm
lib/                  clients Supabase, slugify, compression d'image,
                      extensions Tiptap custom (taille de police, image
                      redimensionnable)
middleware.ts         protection des routes /admin/*
supabase/schema.sql   schéma complet de la base
wrangler.toml         configuration Cloudflare Pages
```
