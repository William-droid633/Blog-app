# Guide d'administration — Herkul

Trois opérations courantes, expliquées pas à pas.

---

## 1. Changer l'adresse e-mail et le mot de passe de l'administrateur

Le compte administrateur n'est **pas** stocké dans le code : il vit dans
**Supabase** (le service d'authentification du site). On le modifie depuis le
tableau de bord Supabase, sans toucher au code.

1. Va sur <https://supabase.com> et connecte-toi au projet du site.
2. Menu de gauche → **Authentication** → **Users**.
3. Clique sur la ligne de ton utilisateur (ton e-mail actuel).
4. Pour **changer l'e-mail** : modifie le champ *Email* puis enregistre.
   (Selon la configuration, un e-mail de confirmation peut être envoyé.)
5. Pour **changer le mot de passe** : bouton **Reset password** /
   **Send password recovery**, ou « **Update password** » si l'option est
   présente, et saisis le nouveau mot de passe.

Astuce : si tu préfères tout recréer, tu peux **Add user** (créer un nouvel
administrateur) puis supprimer l'ancien.

> Rien à committer : ce changement est côté Supabase uniquement. La prochaine
> connexion sur `/admin/login` utilisera les nouveaux identifiants.

---

## 2. Changer le logo et le nom du site

### Le logo
- Le logo est le fichier **`public/logo.svg`**.
- Remplace-le par ton propre fichier en **gardant exactement le même nom**
  (`logo.svg`). Il apparaît automatiquement dans l'en-tête, le pied de page,
  l'admin et la page de connexion.
- Format conseillé : SVG (net à toute taille). Un PNG carré (512×512) marche
  aussi — renomme-le alors `logo.svg` n'est pas possible ; dans ce cas dis-le
  moi et j'adapte les références au `.png`.
- *(Optionnel, pour l'icône d'installation PWA sur mobile)* : ajoute
  `public/icon-192.png` et `public/icon-512.png`, puis remplace les entrées
  `icons` de `public/manifest.webmanifest` par ces fichiers PNG.

### Le nom
- Le nom du site est défini **une seule fois** dans **`lib/config.ts`** :
  ```ts
  export const SITE_NAME = "Herkul";
  export const SITE_DESCRIPTION = "…";
  ```
  Change `SITE_NAME` : il se répercute partout (en-tête, pied de page, titres
  d'onglet, admin…).
- Pense aussi à mettre à jour, dans **`public/manifest.webmanifest`**, les
  champs `"name"`, `"short_name"` et `"description"` (ce fichier est statique,
  il ne lit pas `config.ts`).
- L'inscription gravée sur le fronton du temple (« HERKVL·MVSEVM ») est, elle,
  fixée dans `components/museum/FacadeScene.tsx` (`inscriptionTexture("…")`) ;
  dis-le moi si tu veux que je la rende automatique à partir de `SITE_NAME`.

Ensuite : **commit + push** sur la branche, et le site se redéploie.

---

## 3. Trouver des modèles 3D gratuits et les intégrer au site

### Où trouver des modèles gratuits (et libres de droits)
- **Poly Pizza** — <https://poly.pizza> — des milliers de modèles low-poly
  CC0, parfaits pour le web (légers).
- **Sketchfab** — <https://sketchfab.com> — coche les filtres
  **Downloadable** + **Creative Commons** ; immense choix.
- **Quaternius** — <https://quaternius.com> — packs CC0.
- **Kenney** — <https://kenney.nl/assets> — assets CC0.
- **Poly Haven** — <https://polyhaven.com> — surtout textures et HDRI (utile
  pour l'éclairage), quelques modèles.

> Vérifie toujours la licence : CC0 = libre, sans attribution ; CC-BY = libre
> **avec** mention de l'auteur.

### Le bon format : `.glb`
Le site charge le **glTF binaire** (`.glb`) — c'est le « JPEG de la 3D », léger
et lisible par le navigateur.
- Si le modèle est déjà en `.glb`, parfait.
- S'il est en `.gltf`, `.fbx`, `.obj`, `.blend`… convertis-le :
  - le plus simple : ouvrir dans **Blender** (gratuit) puis
    *File → Export → glTF 2.0 (.glb)* ;
  - ou un convertisseur en ligne.
- **Allège-le** (important pour la fluidité) avec **gltf.report** ou l'outil
  `gltf-transform` : compression Draco + textures réduites. Vise < 2–3 Mo.

### L'intégrer dans le site
1. Place le fichier dans **`public/models/`**, par exemple
   `public/models/statue.glb`.
2. La bibliothèque nécessaire (`@react-three/drei`) est **déjà installée**.
   Crée un petit composant :
   ```tsx
   "use client";
   import { useGLTF } from "@react-three/drei";

   export function Statue(props: JSX.IntrinsicElements["group"]) {
     const { scene } = useGLTF("/models/statue.glb");
     return <primitive object={scene} {...props} />;
   }
   useGLTF.preload("/models/statue.glb");
   ```
3. Utilise-le **dans une scène 3D** (donc à l'intérieur du `<Canvas>` —
   par ex. dans `FacadeScene.tsx` ou `CorridorScene.tsx`), en l'enveloppant
   d'un `<Suspense>` :
   ```tsx
   <Suspense fallback={null}>
     <Statue position={[6, 0, 8]} scale={1.2} rotation={[0, Math.PI, 0]} />
   </Suspense>
   ```
   Ajuste `position` / `scale` / `rotation` pour le placer.
4. Si le modèle est compressé en **Draco**, appelle plutôt
   `useGLTF("/models/statue.glb", true)` (drei chargera le décodeur).

> En pratique, le plus délicat est l'échelle et l'orientation : commence par
> `scale={1}` puis ajuste. Si tu m'envoies un `.glb` placé dans `public/models/`,
> je peux faire l'intégration et le calage proprement pour toi.
