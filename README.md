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
assets/fonts/           Cormorant Garamond + Inter, auto-hébergées (208 Ko)
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

## Ouverture du hero (page d'accueil)

Au chargement de `index.html`, une planche de bois apparaît, le monogramme PHB s'y
dessine par propagation d'une impulsion ambrée, puis le menu et le contenu du hero
apparaissent en fondu. Durée totale ≈ 2,5 s (logo posé à 2,1 s, voile effacé à 2,5 s).

**Fichiers concernés**

```
assets/img/hero/monogramme.svg    14 tracés « segment-01 … segment-14 » (2,6 Ko)
assets/img/hero/planche.jpg       la planche seule
assets/img/hero/planche-logo.jpg  la même planche, logo doré compris
assets/js/hero-monogramme.js      le graphe et l'animation
```

**Comment le parcours est calculé.** Le script ne suit pas l'ordre numérique des
segments. Il relève les deux extrémités de chaque chemin (`getPointAtLength`),
fusionne celles qui coïncident à 6 unités près pour en faire des nœuds, puis un
Dijkstra donne la distance de chaque nœud au point de départ — le bas du P, début
de `segment-01`. Toutes les branches issues d'une même intersection démarrent donc
au même instant, et la vitesse (`longueur ÷ temps`) reste constante quelle que soit
la longueur du segment.

Le réseau contient trois boucles (la panse du P, les deux panses du B). Les segments
`04`, `11` et `14` sont donc allumés par leurs **deux** extrémités : le script calcule
le point de rencontre des deux fronts et les fait se rejoindre sans raccord visible.

**Alignement.** La planche, le logo et les tracés vivent tous dans le même `viewBox`
de 1254 × 1254 : l'alignement est exact par construction, il n'y a aucun calage manuel
à maintenir. Contrôle effectué : le masque couvre 100 % des pixels dorés du monogramme.

**Réglages utiles** — en haut de `assets/js/hero-monogramme.js` :

| Constante | Rôle |
|---|---|
| `T_PLANCHE`, `T_PROPAG`, `T_RETOMBEE`, `T_SORTIE` | minutage des étapes, en millisecondes |
| `LARGEUR_MASQUE` | épaisseur du masque (74 ; le trait doré mesure 55 à 65) |
| `LONGUEUR_FRONT` | longueur de la zone lumineuse en tête de propagation |

Les couleurs de la lueur et du front sont dans `assets/css/style.css`, section
« Ouverture du hero ».

**Comportements de repli**

- `prefers-reduced-motion: reduce` → aucune ouverture, la page s'affiche directement.
- JavaScript absent → le conteneur reste vide, `.intro:empty` le neutralise.
- Onglet mis en arrière-plan pendant l'ouverture → elle se termine aussitôt, pour
  éviter de retrouver un voile figé (les navigateurs mobiles gèlent vite les onglets).
- Un clic ou une touche passent l'ouverture.
- Deux garde-fous indépendants (un `setTimeout` dans le script, un second dans
  `index.html`) rétablissent le contenu même si l'animation ne démarre jamais.

**Le « 70 »** n'appartient pas encore au réseau de tracés : il n'est donc pas parcouru
par la propagation et apparaît en fondu à la fin, avec le logo complet. Pour l'inclure
plus tard, il faudra ajouter ses tracés dans `monogramme.svg` — le graphe les prendra
en compte automatiquement, sans modifier le script.

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
- **Poids** : première visite de l'accueil ≈ 770 Ko. Les images de galerie sont chargées
  à la demande.
