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
index.html              Accueil : hero, secteurs, méthode épinglée, réseau, contact
agence.html             Philippe Boccara, l'équipe, les trois pôles
realisations.html       Un livre par projet, filtrable, pages qui tournent + lightbox
projet-*.html           Une page par projet : sa notice et toutes ses photos (7)
sur-mesure.html         Pièces d'exception, ateliers, résidences
contact.html            Formulaire de contact (les 4 bureaux sont au pied de page)
mentions-legales.html   Mentions légales
en/                     Version anglaise : les mêmes pages, mêmes noms de fichiers,
                        textes traduits (bouton FR / EN dans l'en-tête)

assets/css/style.css    Tout le CSS : variables de design puis composants
assets/js/main.js       Nav mobile, révélation au scroll, filtres, lightbox, formulaire
assets/js/intro.js      L'introduction plein écran de l'accueil
assets/fonts/           Cormorant Garamond + Inter, auto-hébergées (208 Ko)
assets/img/intro/       Les visuels de l'introduction — planche, logo détouré, tracés
assets/img/hero/        Les quatre photos du diaporama d'accueil (810 Ko)
assets/img/secteurs/    Les trois cartes « secteurs d'expertise » (305 Ko)
assets/img/full/        Images grand format (héros, lightbox) — 1200 à 1920 px
                        dont livre-pieces.jpg, la planche d'album de Sur-mesure,
                        et livre-vierge.jpg, la même dépouillée de ses neuf vues
                        (voir « L'album de la page Réalisations »)
assets/img/thumb/       Vignettes de galerie — 760 px
assets/img/raw/         Originaux téléchargés depuis l'ancien site (non versionnés)

_redirects              Redirections des anciennes URL WordPress (Netlify)
vercel.json             Les mêmes redirections (Vercel)
```

## Les livres de la page Réalisations

Chaque projet est un livre fermé (couverture en toile, couleur selon la
catégorie). Un clic l'ouvre en plein écran et ses pages se tournent en 3D :
clic sur une page, flèches, clavier ou glisser. Un clic sur une photo l'agrandit.

Le livre est construit par `main.js` (« Les carnets ») à partir de la liste
`<ul data-carnet-photos>` du projet : deux photos horizontales par page, une
seule si elle est verticale. Sans JavaScript, la couverture mène à la page du
projet.

POUR AJOUTER UN PROJET : dupliquer un `<article class="projet">` dans
`realisations.html` (et `en/realisations.html`), lui donner sa catégorie et ses
photos, puis dupliquer une page `projet-*.html` et l'ajouter au `sitemap.xml`.

## Version anglaise

Chaque page existe en double : `page.html` en français, `en/page.html` en
anglais, sous le même nom de fichier. Le bouton FR / EN de l'en-tête renvoie
simplement à la page jumelle, et chaque page déclare l'autre en `hreflang`.

Les pages anglaises chargent les mêmes CSS, JS et images via `../assets/`.
Les messages du formulaire (`main.js`) suivent l'attribut `lang` de la page.

POUR MODIFIER UN TEXTE : le changer dans les deux versions. POUR AJOUTER UNE
PAGE : la créer aussi dans `en/` (chemins en `../assets/`), avec ses balises
`hreflang`, son bouton de langue, et l'ajouter deux fois au `sitemap.xml`.
