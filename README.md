# Site PHB70

Site vitrine statique de PHB70 — mobilier sur-mesure pour l'hôtellerie et la restauration.
HTML, CSS et JavaScript écrits à la main. **Aucune étape de build, aucune dépendance.**

## Travailler en local

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>. C'est tout : il n'y a rien à installer ni à compiler.

## Structure

```
index.html              Accueil : hero, méthode en 4 étapes, chiffres, réalisations, réseau
savoir-faire.html       Philippe Boccara, les équipes, le pôle Luxembourg
realisations.html       Galerie filtrable (hôtellerie / restauration) + lightbox
sur-mesure.html         Pièces d'exception, ateliers, résidences
contact.html            Formulaire + les 4 bureaux
mentions-legales.html   Mentions légales

assets/css/style.css    Tout le CSS : variables de design puis composants
assets/js/main.js       Nav mobile, révélation au scroll, filtres, lightbox, formulaire
assets/js/intro.js      L'introduction plein écran de l'accueil
assets/fonts/           Cormorant Garamond + Inter, auto-hébergées (208 Ko)
assets/img/intro/       Les visuels de l'introduction — planche, logo détouré, tracés
assets/img/full/        Images grand format (héros, lightbox) — 1200 à 1920 px
assets/img/thumb/       Vignettes de galerie — 760 px
assets/img/raw/         Originaux téléchargés depuis l'ancien site (non versionnés)

_redirects              Redirections des anciennes URL WordPress (Netlify)
vercel.json             Les mêmes redirections (Vercel)
```

## Modifier le site

**Changer un texte** — ouvrir le fichier `.html` concerné et éditer directement. Aucune
compilation n'est nécessaire, il suffit de recharger la page.

**Changer une couleur, une police, un espacement** — tout est centralisé en haut de
`assets/css/style.css`, dans le bloc `:root`. Changer `--accent` y modifie le laiton
partout dans le site.

> **Attention — l'en-tête et le pied de page sont dupliqués dans les 6 fichiers HTML.**
> C'est volontaire (meilleur référencement, fonctionne sans JavaScript), mais cela veut
> dire qu'**ajouter ou renommer une entrée de menu doit être répercuté dans les 6 fichiers**.

**Ajouter une photo à la galerie** — déposer l'image dans `assets/img/thumb/` (760 px de
large) et `assets/img/full/` (1200 px), puis copier un bloc `<figure class="gallery__item">`
existant dans `realisations.html` en adaptant `data-category`, `data-full`, `data-caption`,
`src` et surtout `alt`.

Pour redimensionner une image sans installer quoi que ce soit (macOS) :

```bash
sips -Z 760  -s format jpeg -s formatOptions 68 source.jpg --out assets/img/thumb/nom.jpg
sips -Z 1200 -s format jpeg -s formatOptions 72 source.jpg --out assets/img/full/nom.jpg
```

## Introduction plein écran (page d'accueil)

Au chargement de `index.html`, une surcouche occupe toute la fenêtre : une planche
de noyer apparaît, un courant cuivré parcourt les tracés du monogramme et le
dessine, le rendu final se pose, puis le voile s'ouvre sur le site avec un léger
zoom du bois et une montée du contenu. Durée totale ≈ 4,4 s.

**Fichiers concernés**

```
assets/img/intro/fond.jpg         la planche seule (265 Ko)
assets/img/intro/logo.png         le logo détouré, fond transparent (235 Ko)
assets/img/intro/monogramme.svg   13 tracés « segment-01 … segment-13 » (4,5 Ko)
assets/js/intro.js                le graphe, la chronologie et l'animation
```

**Alignement.** `logo.png` et `monogramme.svg` partagent le cadrage
`424 77 884 745`, découpé dans les visuels d'origine de 1672 × 941. Les tracés, le
masque et le logo vivent donc dans le même repère : la superposition est exacte
par construction, à toute taille d'écran, et il n'y a aucun calage manuel à
maintenir. Contrôle effectué : le masque couvre 100 % des pixels pleins du logo.

Le fond, lui, est indépendant — il couvre toute la fenêtre en `cover`, tandis que
le monogramme est dimensionné en `clamp()` dans un conteneur au rapport
884 / 745. De 320 à 1920 px de large, le logo mesure de 243 à 608 px et ne sort
jamais de l'écran.

**Comment le parcours est calculé.** Le script ne suit pas l'ordre numérique des
segments. Il relève les deux extrémités de chaque chemin (`getPointAtLength`),
fusionne celles qui coïncident à 6 unités près pour en faire des nœuds, isole les
groupes connectés, puis un Dijkstra par groupe donne la distance de chaque nœud à
son point de départ. Toutes les branches issues d'une même intersection démarrent
donc au même instant, et la vitesse (`longueur ÷ temps`) reste constante quelle
que soit la longueur du segment.

Le réseau contient quatre boucles : la panse du P, les deux panses du B et le 0.
Leurs segments sont allumés par leurs **deux** extrémités ; le script calcule le
point de rencontre des deux fronts et les fait se rejoindre sans raccord visible.

**Quatre groupes non connectés** — le P (`segment-01` à `03`), le HB (`04` à `11`),
le 7 (`12`) et le 0 (`13`) — s'allument à 0, 130, 300 et 330 ms. Le premier segment
d'un groupe désigne son point d'allumage : réordonner le SVG suffit à changer
l'endroit d'où part le courant, sans toucher au script.

**Le passage au rendu final** ne fait intervenir aucun fondu entre deux calques :
il n'y a qu'une seule image de logo, révélée par un masque. Ce masque contient les
tracés (le courant) **et** un voile blanc couvrant tout le cadre, dont l'opacité
monte de 2,2 à 3,2 s — ce sont alors la lueur et les ombres du rendu final qui
apparaissent autour des traits déjà révélés. Aucun décalage possible, ni de taille
ni de position.

**Réglages utiles** — en haut de `assets/js/intro.js` :

| Constante | Rôle |
|---|---|
| `T_FOND`, `T_PROPAG`, `D_FINAL`, `T_FINAL`, `T_PAUSE`, `T_SORTIE` | minutage des étapes, en millisecondes |
| `RETARDS` | décalage d'allumage de chaque groupe |
| `LARGEUR_MASQUE` | épaisseur du masque (34 ; le trait du logo mesure 22) |
| `LONGUEUR_FRONT` | longueur de la zone lumineuse en tête de propagation |

Les couleurs de la lueur, du front et de la nappe chaude sont dans
`assets/css/style.css`, section « Introduction plein écran ».

**Comportements de repli**

- `prefers-reduced-motion: reduce` → pas de courant, pas de zoom : le logo final
  est posé d'emblée, un fondu de 0,25 s, et la main est rendue au bout de 0,7 s.
- JavaScript absent → le conteneur reste vide, `.intro:empty` le neutralise.
- Onglet mis en arrière-plan pendant l'introduction → elle se termine aussitôt,
  pour éviter de retrouver un voile figé (`requestAnimationFrame` y est suspendu,
  et les navigateurs mobiles gèlent vite les onglets).
- Un clic ou une touche passent l'introduction ; la tabulation amène au bouton
  « Passer l'introduction », seul point d'arrêt du clavier tant que le voile est
  là. À la sortie, le focus va sur `#main`.
- Deux garde-fous indépendants (un `setTimeout` dans le script, un second dans
  `index.html`) rétablissent le contenu même si l'animation ne démarre jamais.

**Reprendre les visuels.** Les fichiers d'origine font 1672 × 941 (`fond.png`,
`logo-détouré.png`, `logo.png` et `tracé.svg`). Pour en régénérer les versions
utilisées ici, il faut découper la zone `424, 77, 884 × 745` du logo détouré et
donner le même cadrage au `viewBox` du SVG — c'est ce couple qui garantit
l'alignement.

## À compléter avant la mise en ligne

Ces points sont signalés dans le code par des commentaires `TODO` :

1. **Formulaire de contact** — créer un compte gratuit sur [formspree.io](https://formspree.io),
   récupérer l'identifiant du formulaire et remplacer `TODO_FORMSPREE_ID` dans `contact.html`.
   Tant que ce n'est pas fait, le formulaire affiche un message invitant à appeler : aucune
   demande n'est perdue en silence.
2. **Mentions légales** — compléter dans `mentions-legales.html` les champs marqués
   *à compléter* (forme juridique, SIREN, TVA, directeur de publication, hébergeur).
3. **Adresse e-mail de contact** — le site actuel n'en publiait aucune. Si vous en avez une,
   l'ajouter dans le pied de page, sur la page contact et dans les mentions légales.
4. **Chiffres de l'accueil** — les trois chiffres clés (`+20`, `4`, `100 %`) sont volontairement
   conservateurs et vérifiables. Les remplacer par les vrais volumes (nombre de chambres
   livrées, de projets, de couverts) leur donnerait beaucoup plus de poids.
5. **Fiches projet** — la galerie de `realisations.html` est un pis-aller. Une fiche par projet
   (établissement, nombre de clés, périmètre livré, atelier, délai tenu) convaincra bien
   davantage un acheteur hôtelier que trente-six photos anonymes.
6. **Photographies** — deux images de l'ancien site étaient des photos de stock Unsplash ;
   elles ont été écartées. Les visuels actuels proviennent tous de phb70.com.

## Mise en ligne

Le site étant entièrement statique, il s'héberge gratuitement sur Netlify, Vercel,
Cloudflare Pages ou GitHub Pages : déposer le dossier, il n'y a pas de commande de build.

Les redirections des anciennes URL WordPress (`/notre-mission/`, `/notre-expertise/`,
`/un-monde-sur-mesure/`, `/contactez-nous/`) sont déjà écrites pour Netlify (`_redirects`)
et Vercel (`vercel.json`). Pour un autre hébergeur, il faudra les transposer — c'est
important, ces URL sont indexées par Google.

## Choix techniques

- **Aucun cookie, aucun traceur, aucune ressource tierce.** Les polices sont auto-hébergées.
  Aucune bannière de consentement n'est donc nécessaire — c'est autant de gagné en vitesse.
- **Accessibilité** : tous les contrastes dépassent le niveau AAA (7:1), la navigation au
  clavier fonctionne partout, la lightbox piège le focus et rend la main à la vignette
  d'origine, et `prefers-reduced-motion` désactive toutes les animations.
- **Sans JavaScript**, le site reste entièrement lisible et navigable : le menu mobile
  redevient une liste statique et les blocs animés s'affichent normalement.
- **Poids** : première visite de l'accueil ≈ 1,16 Mo, dont 500 Ko pour les visuels de
  l'introduction et 534 Ko pour la photo du hero. Les images de galerie et les visuels
  plus bas dans la page sont chargés à la demande. Les trois fichiers de l'introduction
  sont préchargés dès l'en-tête, et le site se charge derrière le voile : la transition
  finale n'attend donc aucun octet.
