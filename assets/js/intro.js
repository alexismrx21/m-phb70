/* PHB70 — Introduction plein écran.
 *
 * Une surcouche occupe toute la fenêtre au chargement : la planche de bois
 * apparaît seule, puis un courant cuivré parcourt les tracés du monogramme et
 * le révèle, et enfin le rendu final se pose avant que le voile s'efface.
 *
 * Trois principes de construction :
 *
 * 1. ALIGNEMENT. assets/img/intro/logo.png et assets/img/intro/monogramme.svg
 *    partagent le cadrage « 424 77 884 745 ». Les tracés, le masque et le logo
 *    vivent donc dans le même repère : l'alignement est exact par construction,
 *    à toute taille d'écran, sans aucun calage manuel à maintenir.
 *
 * 2. PROPAGATION. Le parcours n'est pas l'ordre des segments. On relève les
 *    deux extrémités de chaque chemin, on fusionne celles qui coïncident pour
 *    en faire des nœuds, on isole les groupes connectés (le P, le HB, le 70),
 *    puis un Dijkstra par groupe donne l'instant d'allumage de chaque nœud.
 *    Toutes les branches issues d'une intersection partent donc au même
 *    instant, et la vitesse — en unités SVG par seconde — reste constante :
 *    un segment deux fois plus long met deux fois plus de temps.
 *
 * 3. PASSAGE AU RENDU FINAL. Il n'y a qu'une seule image de logo, révélée par
 *    un masque. Le masque contient les tracés (le courant) et un voile blanc
 *    couvrant tout le cadre, dont l'opacité monte à la fin : la lueur et les
 *    ombres du rendu final apparaissent alors autour des traits déjà révélés.
 *    Aucun fondu entre deux calques, donc aucun risque de décalage.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var TRACES = 'assets/img/intro/monogramme.svg';
  var FOND   = 'assets/img/intro/fond.jpg';
  var LOGO   = 'assets/img/intro/logo.png';

  // Cadrage commun aux tracés et au logo (voir monogramme.svg).
  var VUE = { x: 424, y: 77, w: 884, h: 745 };

  var TOLERANCE = 6;       // rayon de fusion de deux extrémités en un nœud
  var LARGEUR_MASQUE = 34; // épaisseur du masque (trait du logo mesuré : 22)
  var LONGUEUR_FRONT = 54; // longueur de la zone lumineuse en tête de courant

  // Minutage, en millisecondes. Ce sont des DURÉES, pas des instants : les
  // étapes qui suivent la propagation sont calées à l'exécution sur sa fin
  // réelle (voir `finPropagation`). Retoucher RETARDS décale donc toute la
  // suite de la chronologie sans qu'aucune autre valeur soit à corriger.
  var T_FOND    = 400;   // le bois seul, avant la première étincelle
  var T_PROPAG  = 2800;  // fenêtre laissée à chaque groupe pour se parcourir
  var T_FINAL   = 900;   // fondu du rendu final, une fois le courant au bout
  var T_TRACES  = 600;   // extinction des tracés, sous le rendu final
  var T_PAUSE   = 600;   // temps de pose sur le logo terminé
  var T_SORTIE  = 850;   // ouverture du voile sur le site

  // Décalage d'allumage des groupes non connectés, dans l'ordre du SVG. Le
  // monogramme en compte quatre : le P, le HB, le 7, puis le 0 — le 7 et le 0
  // ne se touchent pas, 30 ms d'écart suffisent à les lire comme un seul « 70 ».
  // Le « 70 » part volontairement bien après le monogramme : il s'allume au
  // moment où le B s'achève, et signe la composition plutôt que d'apparaître
  // en même temps qu'elle.
  var RETARDS = [0, 130, 2300, 2330];
  var RETARD_SUP = 120;  // pour un groupe ajouté plus tard au tracé

  var racine = document.documentElement;
  var hote = document.querySelector('[data-intro]');
  if (!hote) return;

  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------------
     Fin de l'introduction — un seul chemin de sortie, quoi qu'il arrive.
     --------------------------------------------------------------------- */

  var termine = false;
  var boucle = null;
  var minuteries = [];

  function differer(fn, ms) {
    var id = window.setTimeout(fn, ms);
    minuteries.push(id);
    return id;
  }

  function detacher() {
    document.removeEventListener('keydown', surTouche);
    document.removeEventListener('visibilitychange', surVisibilite);
    hote.removeEventListener('click', passer);
    if (boucle !== null) { window.cancelAnimationFrame(boucle); boucle = null; }
    minuteries.forEach(window.clearTimeout);
    minuteries.length = 0;
  }

  // `fondu` à false : on rend la main immédiatement, sans transition.
  function terminer(fondu) {
    if (termine) return;
    termine = true;
    detacher();
    racine.classList.remove('intro-en-cours');

    if (fondu === false) { hote.remove(); rendreLeFocus(); return; }

    hote.classList.add('intro--sortie');
    window.setTimeout(function () { hote.remove(); rendreLeFocus(); }, T_SORTIE + 80);
  }

  // Le contenu reprend la main : le clavier doit repartir du contenu principal
  // et non du début du document. `preventScroll` évite tout saut de page.
  function rendreLeFocus() {
    var principal = document.getElementById('main');
    if (!principal) return;
    try { principal.focus({ preventScroll: true }); }
    catch (e) { principal.focus(); }
  }

  function passer() { terminer(true); }

  function surTouche(e) {
    // Le voile couvre la page : la tabulation ne doit pas se perdre derrière
    // lui. Le seul point d'arrêt du clavier est le bouton qui l'escamote.
    if (e.key === 'Tab') {
      var bouton = hote.querySelector('.intro__skip');
      if (bouton) { e.preventDefault(); bouton.focus(); }
      return;
    }
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' ||
        e.key === 'Meta') return;
    passer();
  }

  // requestAnimationFrame est suspendu dans un onglet caché : sans cela, un
  // visiteur qui change d'onglet retrouverait le voile figé à son retour.
  function surVisibilite() { if (document.hidden) terminer(false); }

  /* ---------------------------------------------------------------------
     Fabrique de nœuds.
     --------------------------------------------------------------------- */

  function el(nom, attrs) {
    var n = document.createElementNS(SVG_NS, nom);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }

  function usage(href, attrs) {
    var u = el('use', attrs || {});
    u.setAttribute('href', href);
    u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
    return u;
  }

  // Le fond couvre toute la fenêtre ; les dimensions intrinsèques évitent
  // toute réservation de place erronée pendant le chargement.
  function imageFond() {
    var img = new Image(1672, 941);
    img.className = 'intro__fond';
    img.src = FOND;
    img.alt = '';
    img.decoding = 'async';
    img.setAttribute('fetchpriority', 'high');
    img.setAttribute('aria-hidden', 'true');
    return img;
  }

  function scene() {
    var d = document.createElement('div');
    d.className = 'intro__stage';
    d.setAttribute('aria-hidden', 'true');
    var halo = document.createElement('span');
    halo.className = 'intro__halo';
    d.appendChild(halo);
    return d;
  }

  function boutonPasser() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'intro__skip';
    b.textContent = 'Passer l’introduction';
    b.addEventListener('click', function (e) { e.stopPropagation(); passer(); });
    return b;
  }

  function precharger(sources) {
    return Promise.all(sources.map(function (src) {
      return new Promise(function (ok) {
        var i = new Image();
        i.onload = i.onerror = function () { ok(); };
        i.src = src;
      });
    }));
  }

  /* ---------------------------------------------------------------------
     Mouvement réduit — le logo final, un fondu très court, et on passe.
     --------------------------------------------------------------------- */

  if (reduit.matches) {
    var pFond = imageFond();
    var pStage = scene();
    var pLogo = new Image(VUE.w, VUE.h);
    pLogo.className = 'intro__fixe';
    pLogo.src = LOGO;
    pLogo.alt = '';
    pLogo.decoding = 'async';
    hote.appendChild(pFond);
    pStage.appendChild(pLogo);
    hote.appendChild(pStage);
    hote.appendChild(boutonPasser());
    hote.addEventListener('click', passer);
    document.addEventListener('keydown', surTouche);

    hote.classList.add('intro--prete', 'intro--immediat');
    differer(function () { terminer(true); }, 700);
    return;
  }

  // Onglet ouvert en arrière-plan (nouvel onglet, préchargement) : inutile de
  // monter la scène pour la figer, la page s'affiche telle quelle.
  if (document.hidden) { terminer(false); return; }

  /* ---------------------------------------------------------------------
     Chargement des tracés puis des images.
     --------------------------------------------------------------------- */

  fetch(TRACES)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (texte) {
      var doc = new DOMParser().parseFromString(texte, 'image/svg+xml');
      if (doc.querySelector('parsererror')) throw new Error('SVG illisible');

      var modeles = Array.prototype.slice.call(
        doc.querySelectorAll('path[id^="segment-"]'));
      modeles.sort(function (a, b) { return a.id.localeCompare(b.id); });
      if (!modeles.length) throw new Error('aucun segment');

      return precharger([FOND, LOGO]).then(function () { return modeles; });
    })
    .then(demarrer)
    .catch(function () { terminer(false); });  // en cas d'échec, pas d'intro

  /* ---------------------------------------------------------------------
     Graphe : nœuds, arêtes, groupes connectés, distances.
     --------------------------------------------------------------------- */

  function construireGraphe(chemins) {
    var noeuds = [];
    var aretes = [];

    function noeudPour(pt) {
      for (var i = 0; i < noeuds.length; i++) {
        var dx = noeuds[i].x - pt.x, dy = noeuds[i].y - pt.y;
        if (dx * dx + dy * dy <= TOLERANCE * TOLERANCE) return i;
      }
      noeuds.push({ x: pt.x, y: pt.y });
      return noeuds.length - 1;
    }

    chemins.forEach(function (p) {
      var L = p.getTotalLength();
      if (!(L > 0)) return;
      aretes.push({
        id: p.id,
        d: p.getAttribute('d'),
        L: L,
        a: noeudPour(p.getPointAtLength(0)),
        b: noeudPour(p.getPointAtLength(L))
      });
    });

    return { noeuds: noeuds, aretes: aretes };
  }

  // Groupes connectés (le P, le HB, le 70), repérés par union-find. Ils sont
  // rendus dans l'ordre d'apparition des segments, et le premier segment d'un
  // groupe en désigne le point d'allumage : réordonner le SVG suffit donc à
  // changer l'endroit d'où part le courant.
  function groupes(graphe) {
    var parent = [];
    for (var i = 0; i < graphe.noeuds.length; i++) parent[i] = i;

    function racineDe(i) {
      while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
      return i;
    }
    function unir(a, b) {
      a = racineDe(a); b = racineDe(b);
      if (a !== b) parent[b] = a;
    }

    graphe.aretes.forEach(function (e) { unir(e.a, e.b); });

    var parRacine = {};
    var liste = [];
    graphe.aretes.forEach(function (e) {
      var r = racineDe(e.a);
      var g = parRacine[r];
      if (!g) {
        g = parRacine[r] = { index: liste.length, depart: e.a, aretes: [] };
        liste.push(g);
      }
      g.aretes.push(e);
    });
    return liste;
  }

  /* Distances le long des tracés depuis le nœud de départ du groupe. */
  function dijkstra(noeuds, aretes, depart) {
    var n = noeuds.length;
    var dist = new Array(n), vus = new Array(n);
    for (var i = 0; i < n; i++) { dist[i] = Infinity; vus[i] = false; }
    dist[depart] = 0;

    for (var k = 0; k < n; k++) {
      var u = -1, meilleur = Infinity;
      for (var j = 0; j < n; j++) if (!vus[j] && dist[j] < meilleur) { meilleur = dist[j]; u = j; }
      if (u === -1) break;
      vus[u] = true;
      aretes.forEach(function (e) {
        var v = e.a === u ? e.b : (e.b === u ? e.a : -1);
        if (v === -1) return;
        if (dist[u] + e.L < dist[v]) dist[v] = dist[u] + e.L;
      });
    }
    return dist;
  }

  /* ---------------------------------------------------------------------
     Montage de la scène et boucle d'animation.
     --------------------------------------------------------------------- */

  function demarrer(modeles) {
    if (termine) return;

    var cadre = VUE.x + ' ' + VUE.y + ' ' + VUE.w + ' ' + VUE.h;

    var svg = el('svg', {
      viewBox: cadre,
      preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true'
    });
    svg.setAttribute('class', 'intro__scene');

    var defs = el('defs');

    // Un seul jeu de chemins alimente le masque et la lueur : les <use>
    // reflètent en direct les pointillés, sans recopier d'attributs.
    var reseau = el('g', { id: 'phb-reseau', fill: 'none',
                           'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    var fronts = el('g', { id: 'phb-fronts', fill: 'none',
                           'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

    // Copies servant uniquement à mesurer la géométrie.
    var mesures = el('g', { id: 'phb-mesures' });
    var chemins = modeles.map(function (m) {
      var p = el('path', { d: m.getAttribute('d'), id: m.id });
      mesures.appendChild(p);
      return p;
    });
    defs.appendChild(mesures);
    defs.appendChild(reseau);
    defs.appendChild(fronts);
    svg.appendChild(defs);

    var stage = scene();
    stage.appendChild(svg);
    hote.appendChild(imageFond());
    hote.appendChild(stage);
    hote.appendChild(boutonPasser());

    // Les chemins doivent être dans le document pour être mesurables.

    var graphe = construireGraphe(chemins);
    if (!graphe.aretes.length) { terminer(false); return; }

    var lots = groupes(graphe);
    if (!lots.length) { terminer(false); return; }

    /* Un Dijkstra par groupe, puis point de rencontre des fronts dans chaque
       segment. Les boucles (la panse du P, les deux panses du B, le 0) sont
       allumées par leurs deux extrémités : les deux fronts se rejoignent au
       milieu du temps de parcours, sans raccord visible. */

    var brins = [];

    lots.forEach(function (lot) {
      var dist = dijkstra(graphe.noeuds, lot.aretes, lot.depart);
      var retard = lot.index < RETARDS.length
        ? RETARDS[lot.index]
        : RETARDS[RETARDS.length - 1] + (lot.index - RETARDS.length + 1) * RETARD_SUP;

      lot.retard = retard;
      lot.portee = 0;

      lot.aretes.forEach(function (e) {
        var dA = dist[e.a], dB = dist[e.b];
        if (!isFinite(dA) && !isFinite(dB)) return;
        if (!isFinite(dA)) dA = dB + e.L;
        if (!isFinite(dB)) dB = dA + e.L;

        // Position, mesurée depuis A, où les deux fronts se rejoignent.
        var rencontre = Math.max(0, Math.min(e.L, (e.L + dB - dA) / 2));

        if (rencontre > 0.5) {
          brins.push(creerBrin(e, 'a', dA, rencontre, lot));
          lot.portee = Math.max(lot.portee, dA + rencontre);
        }
        if (e.L - rencontre > 0.5) {
          brins.push(creerBrin(e, 'b', dB, e.L - rencontre, lot));
          lot.portee = Math.max(lot.portee, dB + (e.L - rencontre));
        }
      });
    });

    function creerBrin(e, cote, depart, course, lot) {
      var masque = el('path', { d: e.d, 'stroke-dasharray': e.L });
      var front = el('path', {
        d: e.d,
        'stroke-dasharray': LONGUEUR_FRONT + ' ' + (e.L + LONGUEUR_FRONT)
      });
      reseau.appendChild(masque);
      fronts.appendChild(front);
      return { L: e.L, cote: cote, depart: depart, course: course,
               lot: lot, masque: masque, front: front };
    }

    // Vitesse unique, en unités SVG par seconde : celle qui fait tenir le
    // groupe le plus contraint dans la fenêtre de propagation.
    var vitesse = 0;
    lots.forEach(function (lot) {
      var dispo = Math.max(200, T_PROPAG - lot.retard) / 1000;
      vitesse = Math.max(vitesse, lot.portee / dispo);
    });
    if (!(vitesse > 0)) { terminer(false); return; }

    // Instant où le dernier front atteint le bout de sa course. Le rendu final
    // ne commence pas à se poser avant : sans cela, le voile du masque
    // dévoilerait le « 70 » avant que le courant ne l'ait parcouru.
    var finPropagation = 0;
    lots.forEach(function (lot) {
      finPropagation = Math.max(finPropagation,
                                T_FOND + lot.retard + (lot.portee / vitesse) * 1000);
    });
    var debutFinal  = finPropagation;
    var debutTraces = debutFinal + T_FINAL - T_TRACES;  // les deux finissent ensemble

    // Masque : les tracés révèlent le courant, le voile révèle ensuite tout
    // le reste du rendu final — sa lueur et ses ombres.
    var masque = el('mask', { id: 'phb-masque', maskUnits: 'userSpaceOnUse',
                              x: VUE.x, y: VUE.y, width: VUE.w, height: VUE.h });
    masque.appendChild(usage('#phb-reseau', { stroke: '#fff',
                                              'stroke-width': LARGEUR_MASQUE }));
    var voile = el('rect', { x: VUE.x, y: VUE.y, width: VUE.w, height: VUE.h,
                             fill: '#fff' });
    voile.setAttribute('class', 'intro__voile');
    masque.appendChild(voile);
    defs.appendChild(masque);

    var logo = el('image', {
      href: LOGO, x: VUE.x, y: VUE.y, width: VUE.w, height: VUE.h,
      preserveAspectRatio: 'xMidYMid meet', mask: 'url(#phb-masque)'
    });
    logo.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', LOGO);
    logo.setAttribute('class', 'intro__logo');
    svg.appendChild(logo);

    // Lueur chaude laissée derrière le front : deux traits translucides
    // empilés, moins coûteux qu'un filtre de flou et fluide sur mobile.
    var lueur = el('g');
    lueur.setAttribute('class', 'intro__lueur');
    lueur.appendChild(usage('#phb-reseau', { 'stroke-width': 34, class: 'l1' }));
    lueur.appendChild(usage('#phb-reseau', { 'stroke-width': 17, class: 'l2' }));
    svg.appendChild(lueur);

    // Front électrique, plus intense, en tête de propagation.
    var tete = el('g');
    tete.setAttribute('class', 'intro__front');
    tete.appendChild(usage('#phb-fronts', { 'stroke-width': 30,  class: 'f1' }));
    tete.appendChild(usage('#phb-fronts', { 'stroke-width': 14,  class: 'f2' }));
    tete.appendChild(usage('#phb-fronts', { 'stroke-width': 4.5, class: 'f3' }));
    svg.appendChild(tete);

    hote.classList.add('intro--prete');
    document.addEventListener('keydown', surTouche);
    document.addEventListener('visibilitychange', surVisibilite);
    hote.addEventListener('click', passer);

    // Filet de sécurité indépendant de la boucle : setTimeout continue de
    // s'exécuter là où requestAnimationFrame s'arrête.
    differer(function () { terminer(true); },
             finPropagation + T_FINAL + T_PAUSE + 1500);

    /* ------------------------------------------------------------------- */

    function poser(brin, avance) {
      var L = brin.L;
      var vu = Math.max(0, Math.min(brin.course, avance));

      if (brin.cote === 'a') {
        brin.masque.setAttribute('stroke-dashoffset', L - vu);
        brin.front.setAttribute('stroke-dashoffset', LONGUEUR_FRONT - vu);
      } else {
        brin.masque.setAttribute('stroke-dashoffset', -(L - vu));
        brin.front.setAttribute('stroke-dashoffset', vu - L);
      }

      // Le front ne brille que tant qu'il avance. Arrivé au bout de sa
      // course il s'éteint en fondu, le temps que les branches suivantes
      // s'allument : aucune extinction sèche à une intersection.
      var reste = (avance - brin.course) / (LONGUEUR_FRONT * 0.9);
      var eclat = avance <= 0 ? 0 : (reste <= 0 ? 1 : Math.max(0, 1 - reste));
      brin.front.setAttribute('opacity', eclat.toFixed(3));
    }

    brins.forEach(function (b) { poser(b, 0); });

    var t0 = null;

    function image_(t) {
      if (termine) return;
      if (t0 === null) t0 = t;
      var e = t - t0;

      // 1. le bois apparaît seul
      hote.style.setProperty('--fond', Math.min(1, e / T_FOND).toFixed(3));

      // 2. le courant parcourt le réseau
      var fini = true;
      brins.forEach(function (b) {
        var tp = (e - T_FOND - b.lot.retard) / 1000;
        var avance = tp * vitesse - b.depart;
        poser(b, avance);
        if (avance < b.course) fini = false;
      });

      // 3. le rendu final se pose, puis les tracés s'effacent dessous
      var f = borne((e - debutFinal) / T_FINAL);
      var tr = borne((e - debutTraces) / T_TRACES);
      hote.style.setProperty('--final', f.toFixed(3));
      hote.style.setProperty('--lueur', (1 - tr).toFixed(3));
      hote.style.setProperty('--halo', (Math.max(borne(e / finPropagation) * .7, f)).toFixed(3));

      // 4. temps de pose, puis le voile s'ouvre sur le site
      if (fini && f >= 1 && tr >= 1) {
        differer(function () { terminer(true); }, T_PAUSE);
        boucle = null;
        return;
      }
      boucle = window.requestAnimationFrame(image_);
    }

    function borne(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

    boucle = window.requestAnimationFrame(image_);
  }
})();
