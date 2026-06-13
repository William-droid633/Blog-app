# Textures externes (Poly Haven, etc.)

Dépose ici tes textures pour qu'elles soient utilisées dans la scène 3D.
Tout fichier sous `public/` est servi automatiquement (chemin `/textures/...`).

## Convention

**Un dossier par surface.** Dans chaque dossier, dépose **3 fichiers** :

| Fichier  | Rôle                                   |
| -------- | -------------------------------------- |
| `diff`   | la couleur (Albedo / Diffuse)          |
| `nor_gl` | le relief (Normal — version **GL**)    |
| `rough`  | le mat / brillant (Roughness)          |

Extensions acceptées : `.jpg`, `.webp` ou `.png` (JPG/WebP recommandés).
Exemple : `public/textures/sol-exterieur/diff.jpg`, `nor_gl.jpg`, `rough.jpg`.

> Le plus simple est de **renommer** les fichiers Poly Haven en
> `diff` / `nor_gl` / `rough`. Si tu préfères garder leurs noms d'origine,
> garde-les tels quels et préviens-moi : je m'adapterai.

## Réglages conseillés (équilibre beauté / fluidité)

- **Résolution : 1K ou 2K** (évite 4K/8K, trop lourd pour le web)
- **Format : JPG ou WebP**
- Toujours la normale **« GL »** (pas « DirectX »)

## Dossiers

| Dossier          | Surface dans la scène                                          |
| ---------------- | -------------------------------------------------------------- |
| `sol-exterieur/` | Le sol sableux du parvis, devant le temple                     |
| `murs-facade/`   | Les murs derrière et à côté des colonnes (le « quadrillage »)  |
| `escaliers/`     | Le grand escalier d'accès                                      |

> Tu veux le **même** rendu sur les murs et les escaliers ? Mets les mêmes
> fichiers dans les deux dossiers, ou remplis seulement `murs-facade/` et
> dis-moi de l'appliquer aussi aux escaliers.

## Ensuite

Quand les fichiers sont poussés, **préviens-moi** : je les branche sur les
matériaux (avec **repli automatique** sur les textures actuelles si un fichier
manque, pour ne jamais casser le rendu), je vérifie, je commit et je pousse.
