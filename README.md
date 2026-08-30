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
index.html              Accueil : hero, secteurs, méthode épinglée, chiffres, réseau
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
assets/img/hero/        Les quatre photos du diaporama d'accueil (810 Ko)
assets/img/secteurs/    Les trois cartes « secteurs d'expertise » (305 Ko)
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
de noyer apparaît, le laiton se découvre progressivement le long des tracés du
monogramme, le « 70 » vient le signer, le rendu final se pose — puis le bois se
dissout pendant que le monogramme glisse et rétrécit jusqu'à sa case dans le
header, en haut à gauche. Durée totale ≈ 4,9 s.

**Rien de lumineux ne court devant le tracé.** Le masque s'ouvre le long du
chemin et c'est lui, et lui seul, qui découvre le métal : le logo se dessine sans
qu'on voie ce qui le dessine. Ne subsistent qu'une lueur chaude très discrète sur
la portion déjà découverte, et la nappe de lumière posée sur le bois.

**Le monogramme est le logo du site.** `assets/img/logo.png` (300 × 253, 30 Ko)
est le même dessin que celui de l'introduction, réduit : c'est lui qu'on retrouve
dans l'en-tête et le pied de page des six pages. C'est aussi ce qui rend
l'atterrissage invisible — ce qui vole et ce qui se pose sont la même image.
Le header est passé de 76 à 92 px de haut (64 → 76 px sous 900 px) pour laisser
respirer un logo presque carré là où l'ancien tracé était très horizontal.

**Fichiers concernés**

```
assets/img/intro/fond.jpg         la planche seule (350 Ko)
assets/img/intro/logo.png         le logo détouré, fond transparent (188 Ko)
assets/img/intro/monogramme.svg   13 tracés « segment-01 … segment-13 » (4,5 Ko)
assets/img/logo.png               le même logo réduit (300 × 253, 30 Ko)
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
Leurs segments sont ouverts par leurs **deux** extrémités ; le script calcule le
point de rencontre des deux avancées et les fait se rejoindre sans raccord
visible.

**Quatre groupes non connectés** — le P (`segment-01` à `03`), le HB (`04` à `11`),
le 7 (`12`) et le 0 (`13`) — s'allument à 0, 130, 2300 et 2330 ms. Le P et le HB se
répondent d'emblée ; le « 70 » attend délibérément que la panse basse du B s'achève
pour s'allumer à son tour et signer la composition. Le premier segment d'un groupe
désigne son point d'allumage : réordonner le SVG suffit à changer l'endroit d'où
part le courant, sans toucher au script.

`RETARDS` est le seul réglage à toucher pour redistribuer ces départs. Les étapes
qui suivent la propagation sont calées à l'exécution sur sa fin réelle
(`finPropagation`) : le rendu final ne commence jamais à se poser avant que la
dernière avancée soit arrivée au bout — sans quoi le voile du masque dévoilerait
le « 70 » avant que le tracé ne l'ait parcouru.

**Le passage au rendu final** ne fait intervenir aucun fondu entre deux calques :
il n'y a qu'une seule image de logo, révélée par un masque. Ce masque contient les
tracés **et** un voile blanc couvrant tout le cadre, dont l'opacité monte de 3,2
à 3,5 s — ce sont alors les bords doux et les ombres du rendu final qui
apparaissent autour des traits déjà révélés. Aucun décalage possible, ni de taille
ni de position. Le logo reste ensuite posé 0,2 s avant de partir vers le header.

**Réglages utiles** — en haut de `assets/js/intro.js` :

| Constante | Rôle |
|---|---|
| `T_FOND`, `T_PROPAG`, `T_FINAL`, `T_TRACES`, `T_PAUSE` | durée de chaque étape, en millisecondes |
| `T_VOL`, `T_SORTIE` | durée du vol vers le header, et du fondu de repli |
| `RETARDS` | décalage d'allumage de chaque groupe |
| `LARGEUR_MASQUE` | épaisseur du masque (34 ; le trait du logo mesure 19) |

Les couleurs de la lueur et de la nappe chaude sont dans
`assets/css/style.css`, section « Introduction plein écran ».

**Le vol jusqu'au header.** Une fois le logo posé, la surcouche ne s'efface pas :
elle emmène le monogramme à sa place définitive. Le script mesure deux
rectangles — celui de la scène plein écran et celui de `.brand img` — et en
déduit le `translate` + `scale` à appliquer (technique FLIP). Rien n'est supposé
de la mise en page : le vol atterrit au pixel près à toute taille d'écran
(contrôle effectué : écart maximal 0,06 px). Pendant ce temps le bois se fond, le
site monte en dessous, et le logo du header reste masqué par la classe
`intro-vol` jusqu'à l'atterrissage — sinon on en verrait deux.

C'est la raison pour laquelle le header ne se décale plus pendant l'introduction
et ne fait que s'effacer : sa case logo doit rester mesurable au pixel près à
tout instant. Ne pas y remettre de `transform`.

**Comportements de repli**

- `prefers-reduced-motion: reduce` → pas de courant, pas de vol : le logo final
  est posé d'emblée, un fondu de 0,25 s, et la main est rendue au bout de 0,7 s.
- Header introuvable (page sans `.brand img`) → le voile s'efface sur place, sans
  vol. Idem si l'on saute l'introduction : le monogramme est complété d'un coup
  puis s'efface, plutôt que de partir en vol à moitié dessiné.
- JavaScript absent → le conteneur reste vide, `.intro:empty` le neutralise.
- Onglet mis en arrière-plan pendant l'introduction → elle se termine aussitôt,
  pour éviter de retrouver un voile figé (`requestAnimationFrame` y est suspendu,
  et les navigateurs mobiles gèlent vite les onglets).
- Un clic ou n'importe quelle touche passent l'introduction — tabulation comprise,
  pour que le clavier ne se perde pas derrière le voile. À la sortie, le focus va
  sur `#main`.
- Deux garde-fous indépendants (un `setTimeout` dans le script, un second dans
  `index.html`) rétablissent le contenu même si l'animation ne démarre jamais.

**Reprendre les visuels.** Les fichiers d'origine font 1672 × 941. Pour en
régénérer les versions utilisées ici, il faut découper la zone
`424, 77, 884 × 745` du logo détouré et donner le même cadrage au `viewBox` du
SVG — c'est ce couple qui garantit l'alignement.

Deux pièges rencontrés lors du remplacement des visuels, à éviter la prochaine
fois :

- **le logo détouré doit vraiment porter un canal alpha.** Un export où le damier
  de transparence a été aplati en pixels n'est pas un détourage. Il reste
  récupérable — l'or est saturé, le damier neutre et clair, la saturation donne
  donc un masque exact — mais c'est une reconstruction, pas la source.
- **le détouré et le composite doivent partager le cadrage.** Lors du dernier
  remplacement le logo mesurait 756 px de large dans le détouré et 569 px dans le
  composite : seul le détouré était au cadrage attendu par `monogramme.svg`.

Contrôle à refaire après tout changement de visuel : le masque doit couvrir
100 % des pixels pleins du logo (`LARGEUR_MASQUE`, en haut de `intro.js`).

## Le hero de l'accueil

Quatre photos s'enchaînent en fondu derrière le titre, six secondes chacune, avec
un léger zoom. Quatre filets de laiton sous les boutons se remplissent au rythme
des vues.

**Changer les photos** — remplacer les quatre fichiers de `assets/img/hero/`.
Rien d'autre à toucher. Les formats d'origine sont libres : `object-fit: cover`
recadre, et le voile s'occupe du reste.

**Changer leur nombre** — c'est la seule contrainte de ce montage : il faut
ajuster `--diapo-n` dans `assets/css/style.css` **et** les pourcentages des deux
`@keyframes` (`heroDiapo` et `heroJauge`). À quatre vues, chacune occupe 25 % du
cycle ; à cinq, ce serait 20 %. Puis ajouter ou retirer une balise `.hero__slide`
et une `.hero__jauge` dans `index.html`, en renumérotant `--i`.

**Pourquoi en CSS et pas en JavaScript** — aucun minuteur à nettoyer, aucun
écouteur à retirer, et le diaporama tourne même sans JS. Le seul lien avec le
script est la classe `intro-en-cours`, qui met l'animation en pause tant que
l'introduction couvre l'écran : sans elle, le diaporama aurait déjà consommé
cinq secondes de son cycle avant d'être visible.

**Traitement des images** — `filter: brightness(.74) saturate(.92)` puis deux
dégradés : une colonne sombre à gauche qui porte le texte, un dégradé vertical
qui assied le bas. Le diaporama mêle des vues très claires (la salle classée) et
très sombres (la chambre en marqueterie) ; ce réglage est le compromis qui laisse
les deux lisibles. En le durcissant, les vues sombres virent au noir.

**Mouvement réduit** — aucune rotation, la première photo reste posée. La règle
globale de `prefers-reduced-motion` réduirait sinon l'animation à néant et
laisserait le hero sans image du tout : c'est pourquoi la section porte un
`animation: none !important` explicite.

## Nos secteurs d'expertise

Trois cartes portrait (3:4) juste sous le hero. Photo en noir et blanc par
défaut, qui reprend ses couleurs au survol avec un léger zoom, un filet doré qui
s'intensifie et un « Découvrir » qui apparaît en fondu — le tout sur 600 ms.

**Changer une photo** — remplacer le fichier dans `assets/img/secteurs/`. Les
originaux étaient en paysage : ils ont été recadrés en portrait 3:4 avec un
cadrage choisi image par image (un recadrage centré automatique coupait le lit de
la chambre). Si vous repartez d'un paysage, pensez à ce recadrage.

**Au doigt, il n'y a pas de survol** : sous `@media (hover: none)` la photo est en
couleur d'emblée et le « Découvrir » est déjà visible. C'est la seule façon de ne
pas laisser les cartes en noir et blanc sur mobile.

**La place du « Découvrir » est réservée en permanence**, à opacité nulle : il
apparaît en fondu sans jamais déplacer le texte au-dessus.

> **Attention — doublon à trancher.** La section « Ce que nous livrons », plus bas
> sur la même page, présente déjà trois cartes Hôtellerie / Restauration / Pièces
> d'exception. Elle fait maintenant largement double emploi avec les secteurs
> d'expertise. Il faudra soit la supprimer, soit la retourner vers autre chose
> (des projets nommés plutôt que des catégories, par exemple).

## Notre méthode

Quatre étapes parcourues au scroll, juste sous les secteurs. Un même balisage
sert deux rendus :

- **Épinglé** (au-delà de 900 px, hors mouvement réduit) — la section fait
  `--methode-course` de haut (340 vh), la scène se colle en haut de fenêtre, et
  la progression du scroll pilote l'étape affichée. Un curseur doré parcourt la
  frise sous les quatre icônes.
- **Empilé** (mobile, mouvement réduit, ou sans JavaScript) — les quatre étapes
  se suivent verticalement, chacune avec son icône, son numéro, son titre et sa
  phrase. Ce n'est pas un pis-aller : c'est un état complet et lisible.

C'est pour cela que la classe `methode--epingle` est posée **par le script** et
non écrite dans le HTML : si rien ne s'exécute, on retombe sur l'état empilé.

**Réglages** — `--methode-course` en tête de la section dans `style.css` fixe la
hauteur à parcourir : la baisser rend l'enchaînement plus nerveux, la monter le
rend plus contemplatif.

**Le fondu entre deux étapes est décalé** : le contenu sortant s'efface en
0,28 s sans délai, l'entrant apparaît en 0,46 s après 0,2 s d'attente. Sans ce
décalage les deux textes se superposent à mi-course et se brouillent — c'est le
seul réglage qui rend le relais lisible.

**Les icônes** sont des `<symbol>` SVG au trait définis une seule fois en fin de
`index.html`, posés deux fois chacun (sélecteur et contenu) via `<use>`. Elles
héritent de `currentColor`, donc l'or de l'étape active suffit à les allumer.

**Le sélecteur est masqué aux lecteurs d'écran** (`aria-hidden`) : il redit
exactement ce que portent les quatre contenus, qui eux restent tous dans le
document et donc tous lisibles, quelle que soit l'étape affichée.

> **Contenu retiré.** L'ancienne section « Quatre étapes, un seul responsable »
> portait un paragraphe argumenté par étape (« Les arbitrages faits à ce stade
> sont les seuls qui ne se paient pas », etc.). La nouvelle maquette ne prévoit
> qu'une phrase par étape : ces paragraphes ont été retirés. Ils restent dans
> l'historique git et mériteraient une page « Notre méthode » dédiée.

## À compléter avant la mise en ligne

Ces points sont signalés dans le code par des commentaires `TODO` :

1. **Sous-pages sectorielles** — les trois cartes « secteurs d'expertise » pointent
   pour l'instant vers `realisations.html` et `sur-mesure.html`. Quand les pages
   dédiées existeront, il suffira de remplacer les `href` dans `index.html`.
2. **Formulaire de contact** — créer un compte gratuit sur [formspree.io](https://formspree.io),
   récupérer l'identifiant du formulaire et remplacer `TODO_FORMSPREE_ID` dans `contact.html`.
   Tant que ce n'est pas fait, le formulaire affiche un message invitant à appeler : aucune
   demande n'est perdue en silence.
3. **Mentions légales** — compléter dans `mentions-legales.html` les champs marqués
   *à compléter* (forme juridique, SIREN, TVA, directeur de publication, hébergeur).
4. **Adresse e-mail de contact** — le site actuel n'en publiait aucune. Si vous en avez une,
   l'ajouter dans le pied de page, sur la page contact et dans les mentions légales.
5. **Chiffres de l'accueil** — les trois chiffres clés (`+20`, `4`, `100 %`) sont volontairement
   conservateurs et vérifiables. Les remplacer par les vrais volumes (nombre de chambres
   livrées, de projets, de couverts) leur donnerait beaucoup plus de poids.
6. **Fiches projet** — la galerie de `realisations.html` est un pis-aller. Une fiche par projet
   (établissement, nombre de clés, périmètre livré, atelier, délai tenu) convaincra bien
   davantage un acheteur hôtelier que trente-six photos anonymes.
7. **Photographies** — deux images de l'ancien site étaient des photos de stock Unsplash ;
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
- **Poids** : chemin critique de l'accueil ≈ 930 Ko, dont 530 Ko pour les visuels de
  l'introduction et 216 Ko pour la première photo du hero. Les trois autres photos du
  diaporama (590 Ko) sont chargées en `fetchpriority="low"` : elles n'apparaissent
  qu'après six secondes, elles ont tout le temps d'arriver. Les autres pages ne portent
  que le logo réduit (30 Ko). Les images de galerie et les visuels
  plus bas dans la page sont chargés à la demande. Les trois fichiers de l'introduction
  sont préchargés dès l'en-tête, et le site se charge derrière le voile : la transition
  finale n'attend donc aucun octet.
