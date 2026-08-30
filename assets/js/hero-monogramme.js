/* PHB70 — Animation d'ouverture du hero.
 *
 * Une impulsion ambrée part du bas du P (début de segment-01) et se propage
 * dans le réseau de tracés du monogramme. Les tracés servent de masque : ils
 * révèlent progressivement le logo doré posé sur la planche.
 *
 * Le parcours n'est PAS l'ordre numérique des segments. On construit un graphe
 * à partir des extrémités réelles des chemins, puis un Dijkstra donne l'instant
 * d'allumage de chaque nœud. Toutes les branches issues d'une intersection
 * démarrent donc exactement au même instant, et deux fronts qui se croisent
 * dans un même segment se rejoignent au bon endroit.
 *
 * La vitesse est exprimée en unités SVG par seconde et reste constante : un
 * segment deux fois plus long met deux fois plus de temps.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SOURCE = 'assets/img/hero/monogramme.svg';
  var PLANCHE = 'assets/img/hero/planche.jpg';
  var COMPOSITE = 'assets/img/hero/planche-logo.jpg';

  var COTE = 1254;        // côté du viewBox, commun aux trois éléments
  var TOLERANCE = 6;      // rayon de fusion de deux extrémités en un nœud
  var LARGEUR_MASQUE = 74;// épaisseur du masque (trait doré mesuré : 55–65)
  var LONGUEUR_FRONT = 84;// longueur de la zone lumineuse en tête de propagation

  // Minutage, en millisecondes.
  var T_PLANCHE  = 350;   // 1. la planche apparaît seule
  var T_ATTENTE  = 120;   //    court temps mort avant l'impulsion
  var T_PROPAG   = 1250;  // 2–7. propagation dans le réseau
  var T_RETOMBEE = 380;   // 8–9. la lueur retombe, le « 70 » se pose
  var T_SORTIE   = 380;   // 10. le voile s'efface, le contenu apparaît

  var racine = document.documentElement;
  var hote = document.querySelector('[data-intro]');

  /* Quoi qu'il arrive, le contenu doit redevenir visible. */
  var termine = false;
  function terminer(retirerVoile) {
    if (termine) return;
    termine = true;
    racine.classList.remove('intro-en-cours');
    document.removeEventListener('keydown', passer);
    if (hote) {
      if (retirerVoile === false) { hote.remove(); return; }
      hote.classList.add('intro--sortie');
      window.setTimeout(function () { hote.remove(); }, T_SORTIE + 80);
    }
  }

  function passer(e) {
    if (e && e.type === 'keydown' && e.key === 'Tab') return; // ne pas voler la tabulation
    terminer(true);
  }

  if (!hote) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    terminer(false);   // aucune animation : la page s'affiche directement
    return;
  }

  // Page ouverte dans un onglet d'arrière-plan (ouverture en nouvel onglet,
  // préchargement) : requestAnimationFrame y est suspendu. Inutile de monter
  // la scène pour la figer — on affiche la page telle quelle.
  if (document.hidden) {
    terminer(false);
    return;
  }

  /* ---------------------------------------------------------------------
     Construction du graphe à partir des extrémités des chemins.
     --------------------------------------------------------------------- */

  function construireGraphe(chemins) {
    var noeuds = [];   // { x, y }
    var aretes = [];   // { id, L, a, b } — a et b sont des index de noeuds

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
      aretes.push({
        id: p.id,
        chemin: p,
        L: L,
        a: noeudPour(p.getPointAtLength(0)),
        b: noeudPour(p.getPointAtLength(L))
      });
    });

    return { noeuds: noeuds, aretes: aretes };
  }

  /* Distances le long des tracés depuis le nœud de départ. */
  function dijkstra(graphe, depart) {
    var n = graphe.noeuds.length;
    var dist = new Array(n), vus = new Array(n);
    for (var i = 0; i < n; i++) { dist[i] = Infinity; vus[i] = false; }
    dist[depart] = 0;

    for (var k = 0; k < n; k++) {
      var u = -1, meilleur = Infinity;
      for (var j = 0; j < n; j++) if (!vus[j] && dist[j] < meilleur) { meilleur = dist[j]; u = j; }
      if (u === -1) break;
      vus[u] = true;
      graphe.aretes.forEach(function (e) {
        var v = e.a === u ? e.b : (e.b === u ? e.a : -1);
        if (v === -1) return;
        if (dist[u] + e.L < dist[v]) dist[v] = dist[u] + e.L;
      });
    }
    return dist;
  }

  /* ---------------------------------------------------------------------
     Construction de la scène SVG.
     Tout vit dans le même viewBox 1254 : l'alignement entre la planche,
     le logo et les tracés est donc exact par construction.
     --------------------------------------------------------------------- */

  function el(nom, attrs) {
    var n = document.createElementNS(SVG_NS, nom);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }

  function image(classe, href, extra) {
    var n = el('image', {
      href: href, x: 0, y: 0, width: COTE, height: COTE,
      preserveAspectRatio: 'xMidYMid slice'
    });
    n.setAttribute('class', classe);
    for (var k in extra || {}) n.setAttribute(k, extra[k]);
    return n;
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

  fetch(SOURCE)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (texte) {
      var doc = new DOMParser().parseFromString(texte, 'image/svg+xml');
      if (doc.querySelector('parsererror')) throw new Error('SVG illisible');

      var modeles = Array.prototype.slice.call(doc.querySelectorAll('path[id^="segment-"]'));
      modeles.sort(function (a, b) { return a.id.localeCompare(b.id); });
      if (!modeles.length) throw new Error('aucun segment');

      return precharger([PLANCHE, COMPOSITE]).then(function () {
        return modeles;
      });
    })
    .then(function (modeles) { demarrer(modeles); })
    .catch(function () { terminer(false); });   // en cas d'échec, pas d'intro

  function demarrer(modeles) {
    if (termine) return;

    var scene = el('svg', {
      viewBox: '0 0 ' + COTE + ' ' + COTE,
      preserveAspectRatio: 'xMidYMid meet'
    });
    scene.setAttribute('class', 'intro__scene');
    scene.setAttribute('aria-hidden', 'true');

    var defs = el('defs');

    // Un seul jeu de chemins pour le masque et pour la lueur : les <use>
    // reflètent en direct les pointillés, sans recopier les attributs.
    var reseau = el('g', { id: 'phb-reseau', fill: 'none',
                           'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    var fronts = el('g', { id: 'phb-fronts', fill: 'none',
                           'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

    // Les chemins servant à mesurer le graphe (une copie par segment).
    var mesures = modeles.map(function (m) {
      return el('path', { d: m.getAttribute('d'), id: m.id });
    });
    var mesureG = el('g', { visibility: 'hidden' });
    mesures.forEach(function (p) { mesureG.appendChild(p); });
    defs.appendChild(mesureG);
    defs.appendChild(reseau);
    defs.appendChild(fronts);
    scene.appendChild(defs);
    hote.appendChild(scene);   // il faut être dans le document pour mesurer

    var graphe = construireGraphe(mesures);

    // Départ : première extrémité de segment-01, le bas du P.
    var premier = graphe.aretes.filter(function (e) { return e.id === 'segment-01'; })[0]
               || graphe.aretes[0];
    var dist = dijkstra(graphe, premier.a);

    // Pour chaque segment : point de rencontre des deux fronts.
    var brins = [];
    var finPropagation = 0;

    graphe.aretes.forEach(function (e) {
      var dA = dist[e.a], dB = dist[e.b];
      // Position, mesurée depuis A, où les deux fronts se rejoignent.
      var rencontre = Math.max(0, Math.min(e.L, (e.L + dB - dA) / 2));

      if (rencontre > 0.5) {
        brins.push(creerBrin(e, 'a', dA, rencontre));
        finPropagation = Math.max(finPropagation, dA + rencontre);
      }
      if (e.L - rencontre > 0.5) {
        brins.push(creerBrin(e, 'b', dB, e.L - rencontre));
        finPropagation = Math.max(finPropagation, dB + (e.L - rencontre));
      }
    });

    function creerBrin(e, cote, depart, course) {
      var masque = el('path', { d: e.chemin.getAttribute('d') });
      var front = el('path', { d: e.chemin.getAttribute('d') });
      masque.setAttribute('stroke-dasharray', e.L);
      front.setAttribute('stroke-dasharray', LONGUEUR_FRONT + ' ' + (e.L + LONGUEUR_FRONT));
      reseau.appendChild(masque);
      fronts.appendChild(front);
      return { L: e.L, cote: cote, depart: depart, course: course,
               masque: masque, front: front };
    }

    // Vitesse : constante, calée sur la distance totale à parcourir.
    var vitesse = finPropagation / (T_PROPAG / 1000);   // unités SVG par seconde

    var masque = el('mask', { id: 'phb-masque', maskUnits: 'userSpaceOnUse',
                              x: 0, y: 0, width: COTE, height: COTE });
    masque.appendChild(usage('#phb-reseau', { stroke: '#fff', 'stroke-width': LARGEUR_MASQUE }));
    defs.appendChild(masque);

    function usage(href, attrs) {
      var u = el('use', attrs || {});
      u.setAttribute('href', href);
      u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
      return u;
    }

    scene.appendChild(image('intro__planche', PLANCHE));
    scene.appendChild(image('intro__revele', COMPOSITE, { mask: 'url(#phb-masque)' }));
    scene.appendChild(image('intro__final', COMPOSITE));

    // Lueur douce laissée derrière le front (empilement de traits translucides,
    // moins coûteux qu'un filtre de flou et fluide sur mobile).
    var lueur = el('g', { class: 'intro__lueur' });
    lueur.appendChild(usage('#phb-reseau', { 'stroke-width': 104, class: 'l1' }));
    lueur.appendChild(usage('#phb-reseau', { 'stroke-width': 58, class: 'l2' }));
    scene.appendChild(lueur);

    // Front lumineux, plus intense, en tête de propagation.
    var tete = el('g', { class: 'intro__front' });
    tete.appendChild(usage('#phb-fronts', { 'stroke-width': 78, class: 'f1' }));
    tete.appendChild(usage('#phb-fronts', { 'stroke-width': 34, class: 'f2' }));
    tete.appendChild(usage('#phb-fronts', { 'stroke-width': 12, class: 'f3' }));
    scene.appendChild(tete);

    hote.classList.add('intro--prete');
    document.addEventListener('keydown', passer);
    hote.addEventListener('click', passer);

    // requestAnimationFrame est suspendu dans un onglet caché : sans cela, un
    // visiteur qui change d'onglet pendant l'ouverture retrouverait le voile
    // figé à son retour. Les mobiles gèlent particulièrement vite.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) terminer(false);
    });

    // Filet de sécurité indépendant de la boucle : setTimeout continue de
    // s'exécuter là où requestAnimationFrame s'arrête.
    window.setTimeout(function () { terminer(true); },
                      T_PLANCHE + T_ATTENTE + T_PROPAG + T_RETOMBEE + 1200);

    /* -------------------------------------------------------------------
       Boucle d'animation.
       ------------------------------------------------------------------- */

    var t0 = null;
    var debutPropagation = T_PLANCHE + T_ATTENTE;

    function poser(brin, avance) {
      var L = brin.L;
      // Portion révélée depuis l'extrémité concernée.
      var vu = Math.max(0, Math.min(brin.course, avance));

      if (brin.cote === 'a') {
        brin.masque.setAttribute('stroke-dashoffset', L - vu);
        brin.front.setAttribute('stroke-dashoffset', LONGUEUR_FRONT - vu);
      } else {
        brin.masque.setAttribute('stroke-dashoffset', -(L - vu));
        brin.front.setAttribute('stroke-dashoffset', vu - L);
      }

      // Le front ne brille que tant qu'il avance réellement.
      var actif = avance > 0 && avance < brin.course + LONGUEUR_FRONT * 0.5;
      brin.front.setAttribute('opacity', actif ? 1 : 0);
    }

    brins.forEach(function (b) { poser(b, 0); });

    function image_(t) {
      if (termine) return;
      if (t0 === null) t0 = t;
      var e = t - t0;

      // 1. la planche apparaît seule
      var apparition = Math.min(1, e / T_PLANCHE);
      hote.style.setProperty('--planche', apparition.toFixed(3));

      // 2–7. propagation
      var tp = (e - debutPropagation) / 1000;          // secondes écoulées
      var avancement = 0;
      brins.forEach(function (b) {
        var avance = (tp * vitesse) - b.depart;
        poser(b, avance);
        avancement = Math.max(avancement, Math.min(1, avance / Math.max(b.course, 1)));
      });

      var finiPropagation = tp * vitesse >= finPropagation;

      // 8–9. la lueur retombe, le logo complet (avec le 70) se pose
      var apresPropagation = e - (debutPropagation + T_PROPAG);
      var retombee = Math.max(0, Math.min(1, apresPropagation / T_RETOMBEE));
      hote.style.setProperty('--lueur', (1 - retombee).toFixed(3));
      hote.style.setProperty('--final', retombee.toFixed(3));

      if (finiPropagation && retombee >= 1) {
        terminer(true);      // 10. le voile s'efface, le contenu apparaît
        return;
      }
      window.requestAnimationFrame(image_);
    }

    window.requestAnimationFrame(image_);
  }
})();
