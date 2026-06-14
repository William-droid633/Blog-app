# Modèles 3D (arbres, etc.)

Pour remplacer les cyprès calculés par un vrai modèle d'arbre.

## Format accepté
Le web charge du **glTF** :
- **`.glb`** (un seul fichier, **idéal**), ou
- **`.gltf` + `.bin` + dossier de textures** (plusieurs fichiers).

## « Island Tree 01 » (Poly Haven, CC0) — la marche à suivre
1. Sur la page du modèle : **Download → format `glTF`**, résolution **1K**.
2. Décompresse le ZIP. Tu obtiens `island_tree_01_1k.gltf`, un `.bin` et un
   dossier de textures.
3. Dépose **tout** (en gardant la structure interne) dans
   `public/models/island-tree-01/` — le `.gltf` doit retrouver son `.bin` et
   ses textures juste à côté.

> 💡 **Encore plus simple** si tu peux : ouvre-le dans Blender et
> *File → Export → glTF Binary (.glb)*, puis dépose un seul fichier
> `arbre.glb` ici. Dis-moi simplement son nom.

## Poids / fluidité
Le modèle sera **dupliqué ~20 fois** (un par cyprès). Garde-le **léger**
(1K, c'est parfait). S'il rame, je réduirai le nombre d'arbres ou la qualité.

## Ensuite
Quand c'est poussé, dis-moi **« arbre poussé »** : je le charge, je le place
sur tous les emplacements de cyprès, et j'ajuste l'échelle, la rotation et
l'ancrage au sol.
