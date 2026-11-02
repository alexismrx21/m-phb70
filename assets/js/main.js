/* PHB70 — comportements de l'interface.
   Vanilla, sans dépendance. Tout est optionnel : sans JS le site reste
   entièrement lisible et navigable. */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Année du pied de page — plus de date figée en dur.
     --------------------------------------------------------------------- */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------------------
     En-tête : fond opaque dès qu'on quitte le haut de page.
     --------------------------------------------------------------------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var syncHeader = function () {
      header.classList.toggle('is-stuck', window.scrollY > 40);
    };
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  /* ---------------------------------------------------------------------
     Navigation mobile : ouverture/fermeture, Escape, piège de focus.
     --------------------------------------------------------------------- */
  var burger = document.querySelector('[data-burger]');
  var nav = document.querySelector('[data-nav]');

  if (burger && nav) {
    var focusablesIn = function (root) {
      return Array.prototype.filter.call(
        root.querySelectorAll('a[href], button:not([disabled])'),
        function (el) { return el.offsetParent !== null; }
      );
    };

    var setNav = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      if (open) {
        var first = focusablesIn(nav)[0];
        if (first) first.focus();
      }
    };

    burger.addEventListener('click', function () {
      setNav(burger.getAttribute('aria-expanded') !== 'true');
    });

    // Un clic sur un lien referme le menu (utile pour les ancres).
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });

    document.addEventListener('keydown', function (e) {
      if (burger.getAttribute('aria-expanded') !== 'true') return;

      if (e.key === 'Escape') {
        setNav(false);
        burger.focus();
        return;
      }

      if (e.key === 'Tab') {
        var items = focusablesIn(nav).concat([burger]);
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    });

    // Repasser en desktop doit toujours rendre la nav utilisable.
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (ev) {
      if (ev.matches) setNav(false);
    });
  }

  /* ---------------------------------------------------------------------
     Révélation au scroll.
     --------------------------------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(revealables, function (el) {
        el.classList.add('is-visible');
      });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

      Array.prototype.forEach.call(revealables, function (el) { observer.observe(el); });
    }
  }

  /* ---------------------------------------------------------------------
     Galerie : filtres par catégorie + lightbox clavier.
     --------------------------------------------------------------------- */
  var gallery = document.querySelector('[data-gallery]');

  if (gallery) {
    // Ce que le filtre montre et ce que la visionneuse enchaîne ne sont pas
    // toujours la même chose. Sur une page projet, il n'y a que des photos
    // (`[data-shot]`) et aucun filtre. Sur Réalisations, les projets sont
    // filtrables (`[data-category]`) et leurs photos, rangées en listes
    // masquées, ne s'affichent que dans le livre ouvert. Sur Sur-mesure,
    // les vues du carrousel sont des photos, sans filtre. D'où cette bascule :
    // les photos si la page en contient, les blocs de catégorie sinon.
    var groups = Array.prototype.slice.call(gallery.querySelectorAll('[data-category]'));
    var filters = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var byShot = gallery.querySelector('[data-shot]') !== null;
    var unit = byShot ? '[data-shot]' : '[data-category]';
    var units = Array.prototype.slice.call(gallery.querySelectorAll(unit));
    var visible = [];

    // Un élément compte pour la visionneuse si rien au-dessus de lui n'est
    // masqué. `closest` teste aussi l'élément lui-même : la règle vaut donc
    // aussi bien pour une photo rangée dans un bloc écarté par le filtre que
    // pour une photo qui porte le `hidden` en propre.
    // `autour` est la photo qu'on vient de cliquer : la série qui la contient —
    // un projet, sur la page Réalisations — borne alors le défilé, et les
    // flèches de la visionneuse ne passent pas au projet suivant. Sans elle,
    // toute la page défile, ce qui reste le cas des pages qui n'ont qu'une
    // série.
    var collect = function (autour) {
      var serie = autour && autour.closest('[data-serie]');
      var source = serie ? serie.querySelectorAll(unit) : units;
      visible = Array.prototype.filter.call(source, function (el) {
        return !el.closest('[hidden]');
      });
    };

    var applyFilter = function (value) {
      groups.forEach(function (group) {
        group.hidden = !(value === 'all' || group.getAttribute('data-category') === value);
      });
      collect();
      filters.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === value));
      });
    };

    collect();

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

    // --- Les carnets (page Réalisations) ---
    // Un livre par projet. La couverture est un lien vers la page du projet :
    // sans JavaScript, c'est là qu'elle mène. Ici, elle ouvre le livre en plein
    // écran. Le livre est construit à chaque ouverture à partir de la liste de
    // photos du projet : une feuille = deux faces dos à dos, qui pivotent
    // autour du dos. `tournees` compte les feuilles passées à gauche.
    var carnet = document.querySelector('[data-carnet]');
    var ouvrirVisionneuse = null;   // branchée plus bas, avec la lightbox
    var visionneuseOuverte = function () {
      var b = document.querySelector('[data-lightbox]');
      return !!b && b.classList.contains('is-open');
    };

    if (carnet) {
      var livre = carnet.querySelector('[data-carnet-livre]');
      var titreCarnet = carnet.querySelector('[data-carnet-titre]');
      var lienCarnet = carnet.querySelector('[data-carnet-lien]');
      var compteurCarnet = carnet.querySelector('[data-carnet-compteur]');
      var btnPrec = carnet.querySelector('[data-carnet-prec]');
      var btnSuiv = carnet.querySelector('[data-carnet-suiv]');
      var btnFermer = carnet.querySelector('[data-carnet-fermer]');
      var DUREE = reduceMotion ? 0 : 900;
      var feuilles = [];
      var tournees = 0;
      var zHaut = 0;
      var declencheur = null;
      var minuteur = null;

      var el = function (tag, cls, texte) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (texte) n.textContent = texte;
        return n;
      };

      // Deux photos horizontales par page, l'une sous l'autre ; une photo
      // verticale a sa page pour elle seule.
      var paginer = function (items) {
        var pages = [];
        var ouverte = null;
        items.forEach(function (li) {
          if (li.getAttribute('data-format') === 'portrait') {
            pages.push([li]);
            ouverte = null;
          } else if (ouverte) {
            ouverte.push(li);
            ouverte = null;
          } else {
            ouverte = [li];
            pages.push(ouverte);
          }
        });
        return pages;
      };

      var pagePhotos = function (lis) {
        var page = el('div', 'page page--photos');
        if (lis.length === 1 && lis[0].getAttribute('data-format') === 'portrait') {
          page.classList.add('page--portrait');
        }
        var liste = el('ul', 'page__contenu');
        lis.forEach(function (li) {
          var copie = li.cloneNode(true);
          var img = copie.querySelector('img');
          if (img) img.loading = 'eager';
          var legende = el('span', 'carnet__legende', copie.querySelector('button').getAttribute('data-caption'));
          legende.setAttribute('aria-hidden', 'true');
          copie.appendChild(legende);
          liste.appendChild(copie);
        });
        page.appendChild(liste);
        return page;
      };

      var pageTitre = function (titre, categorie, nb) {
        var page = el('div', 'page page--titre');
        page.appendChild(el('p', 'page__cat', categorie));
        page.appendChild(el('h3', 'page__titre', titre));
        page.appendChild(el('span', 'page__filet'));
        page.appendChild(el('p', 'page__nb', nb + ' ' + carnet.getAttribute('data-txt-photos')));
        return page;
      };

      var pageFin = function () {
        var page = el('div', 'page page--fin');
        page.appendChild(el('p', 'page__nb', carnet.getAttribute('data-txt-fin')));
        page.appendChild(el('span', 'page__filet'));
        page.appendChild(el('p', 'page__marque', 'PHB70'));
        return page;
      };

      var platAvant = function (titre, vignette) {
        var plat = el('div', 'plat plat--avant');
        if (vignette) {
          var cadre = el('div', 'plat__vignette');
          var img = el('img');
          img.src = vignette.getAttribute('src');
          img.alt = '';
          cadre.appendChild(img);
          plat.appendChild(cadre);
        }
        plat.appendChild(el('p', 'plat__titre', titre));
        plat.appendChild(el('p', 'plat__marque', 'PHB70'));
        return plat;
      };

      var platArriere = function () {
        var plat = el('div', 'plat plat--arriere');
        plat.appendChild(el('p', 'plat__marque', 'PHB70'));
        return plat;
      };

      var compter = function () {
        var doubles = feuilles.length - 1;
        compteurCarnet.innerHTML = tournees > 0 && tournees < feuilles.length
          ? tournees + '&nbsp;/&nbsp;' + doubles
          : '';
      };

      // Remet chaque feuille à sa place. Seules les deux pages visibles restent
      // atteignables au clavier et par les lecteurs d'écran.
      var rendre = function () {
        feuilles.forEach(function (f, i) {
          var tournee = i < tournees;
          f.classList.toggle('is-tournee', tournee);
          if (!f.classList.contains('is-anim')) {
            f.style.zIndex = tournee ? i + 1 : feuilles.length - i;
          }
          f.firstChild.inert = i !== tournees;
          f.lastChild.inert = i !== tournees - 1;
        });
        livre.classList.toggle('is-ouvert', tournees > 0 && tournees < feuilles.length);
        livre.classList.toggle('is-fini', tournees === feuilles.length);
        btnPrec.disabled = tournees === 0;
        btnSuiv.disabled = tournees === feuilles.length;
        compter();
      };

      // Pendant qu'elle tourne, une feuille passe au-dessus de toutes les
      // autres ; elle reprend sa place dans la pile une fois posée.
      var animer = function (f) {
        zHaut += 1;
        f.style.zIndex = zHaut;
        f.classList.add('is-anim');
        clearTimeout(f.finAnim);
        f.finAnim = setTimeout(function () {
          f.classList.remove('is-anim');
          rendre();
        }, DUREE + 50);
      };

      var tourner = function (sens) {
        var i = sens > 0 ? tournees : tournees - 1;
        if (i < 0 || i >= feuilles.length) return;
        animer(feuilles[i]);
        tournees += sens;
        rendre();
      };

      var construire = function (article, lien) {
        var titre = lien.getAttribute('data-titre');
        var items = Array.prototype.slice.call(article.querySelectorAll('[data-carnet-photos] [data-shot]'));
        var pages = [pageTitre(titre, lien.getAttribute('data-categorie'), items.length)]
          .concat(paginer(items).map(pagePhotos))
          .concat([pageFin()]);
        if (pages.length % 2) pages.push(el('div', 'page page--blanche'));

        // Plat avant | revers (garde) — les pages — garde | plat arrière.
        var faces = [platAvant(titre, lien.querySelector('.couv__vignette img')), el('div', 'plat plat--garde')]
          .concat(pages)
          .concat([el('div', 'plat plat--garde'), platArriere()]);

        livre.innerHTML = '';
        livre.setAttribute('data-category', article.getAttribute('data-category'));
        feuilles = [];
        for (var i = 0; i < faces.length; i += 2) {
          var f = el('div', 'feuille');
          faces[i].classList.add('face', 'face--recto');
          faces[i + 1].classList.add('face', 'face--verso');
          f.appendChild(faces[i]);
          f.appendChild(faces[i + 1]);
          livre.appendChild(f);
          feuilles.push(f);
        }
        tournees = 0;
        zHaut = feuilles.length + 1;

        // Mise en place sans transition : le livre doit apparaître fermé, pas
        // se refermer depuis l'état du livre précédent.
        livre.style.transition = 'none';
        rendre();
        void livre.offsetWidth;
        livre.style.transition = '';
      };

      var ouvrirCarnet = function (lien) {
        var article = lien.closest('.projet');
        if (!article) return;
        declencheur = lien;
        titreCarnet.textContent = lien.getAttribute('data-titre');
        lienCarnet.href = lien.getAttribute('href');
        construire(article, lien);
        carnet.classList.add('is-open');
        carnet.removeAttribute('aria-hidden');
        document.body.classList.add('is-locked');
        btnFermer.focus();
        // Le livre apparaît fermé, puis sa couverture s'ouvre d'elle-même.
        clearTimeout(minuteur);
        minuteur = setTimeout(function () { tourner(1); }, reduceMotion ? 0 : 500);
      };

      var fermerCarnet = function () {
        clearTimeout(minuteur);
        carnet.classList.remove('is-open');
        carnet.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('is-locked');
        if (declencheur) declencheur.focus();
      };

      document.addEventListener('click', function (e) {
        var lien = e.target.closest('[data-carnet-ouvrir]');
        if (!lien || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        ouvrirCarnet(lien);
      });

      btnFermer.addEventListener('click', fermerCarnet);
      btnPrec.addEventListener('click', function () { tourner(-1); });
      btnSuiv.addEventListener('click', function () { tourner(1); });

      // Tourner à la main : on saisit la page de droite pour avancer, celle de
      // gauche pour revenir. Un simple clic tourne aussi la page — sauf sur une
      // photo, qu'il agrandit.
      var prise = null;

      livre.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || e.target.closest('a')) return;
        var r = livre.getBoundingClientRect();
        var sens = e.clientX >= r.left + r.width / 2 ? 1 : -1;
        var i = sens > 0 ? tournees : tournees - 1;
        prise = {
          x: e.clientX,
          sens: sens,
          i: i >= 0 && i < feuilles.length ? i : -1,
          largeur: r.width / 2,
          cible: e.target,
          id: e.pointerId,
          active: false,
          part: 0
        };
      });

      livre.addEventListener('pointermove', function (e) {
        if (!prise || prise.i < 0) return;
        var dx = e.clientX - prise.x;
        var f = feuilles[prise.i];
        if (!prise.active) {
          if (Math.abs(dx) < 8) return;
          prise.active = true;
          try { livre.setPointerCapture(prise.id); } catch (err) { }
          zHaut += 1;
          f.style.zIndex = zHaut;
          f.style.transition = 'none';
          f.classList.add('is-glisse');
        }
        var part = Math.max(0, Math.min(1, (prise.sens > 0 ? -dx : dx) / (prise.largeur * 1.2)));
        prise.part = part;
        var angle = prise.sens > 0 ? -180 * part : -180 + 180 * part;
        f.style.transform = 'rotateY(' + angle + 'deg)';
      });

      var lacher = function (e) {
        if (!prise) return;
        var p = prise;
        prise = null;

        if (!p.active) {
          if (e.type !== 'pointerup') return;
          var photo = p.cible.closest('.carnet__photo');
          if (photo && ouvrirVisionneuse) ouvrirVisionneuse(photo.closest('[data-shot]'));
          else tourner(p.sens);
          return;
        }

        // On repart de l'angle atteint : la page finit de tourner si on l'a
        // menée au-delà d'un tiers, sinon elle retombe.
        var f = feuilles[p.i];
        f.classList.remove('is-glisse');
        f.style.transition = '';
        f.style.transform = '';
        animer(f);
        if (p.part > 0.3) tournees += p.sens;
        rendre();
      };

      livre.addEventListener('pointerup', lacher);
      livre.addEventListener('pointercancel', lacher);

      // Au clavier, la photo s'agrandit avec Entrée (le pointeur, lui, est géré
      // au relâcher ci-dessus).
      livre.addEventListener('click', function (e) {
        var photo = e.target.closest('.carnet__photo');
        if (photo && e.detail === 0 && ouvrirVisionneuse) ouvrirVisionneuse(photo.closest('[data-shot]'));
      });

      // Écouté avant celui de la visionneuse : quand elle est ouverte par-dessus
      // le livre, c'est elle seule qui répond au clavier.
      document.addEventListener('keydown', function (e) {
        if (!carnet.classList.contains('is-open') || visionneuseOuverte()) return;

        if (e.key === 'Escape') { fermerCarnet(); return; }
        if (e.key === 'ArrowLeft') { tourner(-1); return; }
        if (e.key === 'ArrowRight') { tourner(1); return; }

        if (e.key === 'Tab') {
          var items = Array.prototype.filter.call(
            carnet.querySelectorAll('button:not([disabled]), a[href]'),
            function (n) { return !n.closest('[inert]'); }
          );
          if (!items.length) return;
          var first = items[0];
          var last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
        }
      });
    }

    // --- Lightbox ---
    var box = document.querySelector('[data-lightbox]');

    if (box) {
      var boxImg = box.querySelector('[data-lightbox-img]');
      var boxCaption = box.querySelector('[data-lightbox-caption]');
      var index = 0;
      var opener = null;

      var render = function () {
        var item = visible[index];
        if (!item) return;
        var trigger = item.querySelector('button');
        boxImg.src = trigger.getAttribute('data-full');
        // Une vignette porte son texte alternatif dans son <img> ; une zone
        // cliquable posée sur une image d'ensemble n'en a pas, elle le porte
        // alors en attribut.
        var vignette = trigger.querySelector('img');
        boxImg.alt = vignette ? vignette.alt : (trigger.getAttribute('data-alt') || '');
        boxCaption.textContent = trigger.getAttribute('data-caption') || '';
      };

      var openBox = function (item) {
        collect(item);
        index = visible.indexOf(item);
        if (index < 0) return;
        opener = item.querySelector('button');
        render();
        box.classList.add('is-open');
        box.removeAttribute('aria-hidden');
        document.body.classList.add('is-locked');
        // La visibilité bascule sans transition à l'ouverture (voir la feuille
        // de style) : le bouton est donc focusable immédiatement.
        box.querySelector('[data-lightbox-close]').focus();
      };

      var closeBox = function () {
        box.classList.remove('is-open');
        box.setAttribute('aria-hidden', 'true');
        // Ouverte depuis un livre, la visionneuse rend la main au livre, qui
        // garde la page verrouillée.
        if (!(carnet && carnet.classList.contains('is-open'))) {
          document.body.classList.remove('is-locked');
        }
        if (opener) opener.focus();
      };

      var step = function (delta) {
        if (!visible.length) return;
        index = (index + delta + visible.length) % visible.length;
        render();
      };

      ouvrirVisionneuse = openBox;

      gallery.addEventListener('click', function (e) {
        var trigger = e.target.closest('button[data-full]');
        if (trigger) openBox(trigger.closest(unit));
      });

      box.addEventListener('click', function (e) {
        if (e.target.closest('[data-lightbox-close]') || e.target === box) closeBox();
        else if (e.target.closest('[data-lightbox-prev]')) step(-1);
        else if (e.target.closest('[data-lightbox-next]')) step(1);
      });

      document.addEventListener('keydown', function (e) {
        if (!box.classList.contains('is-open')) return;

        if (e.key === 'Escape') { closeBox(); return; }
        if (e.key === 'ArrowLeft') { step(-1); return; }
        if (e.key === 'ArrowRight') { step(1); return; }

        // Le focus ne doit pas s'échapper derrière la visionneuse.
        if (e.key === 'Tab') {
          var items = box.querySelectorAll('button');
          if (!items.length) return;
          var first = items[0];
          var last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Carrousel (page Sur-mesure).
     Le défilement est celui du navigateur, accroché au centre de chaque vue ;
     le script suit la vue centrée, pilote les flèches et avance seul.

     En boucle : la série est recopiée une fois avant et une fois après. Quand
     le défilement s'arrête sur une copie, on saute sans animation à la vue
     d'origine équivalente — au même endroit à l'écran, le saut ne se voit pas.
     Les copies sont inertes et sans `data-shot` : la visionneuse n'enchaîne
     que les vraies vues.
     --------------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-defile]'), function (defile) {
    var piste = defile.querySelector('[data-defile-piste]');
    var originales = Array.prototype.slice.call(piste.querySelectorAll('.defile__vue'));
    var n = originales.length;
    var num = defile.querySelector('[data-defile-num]');
    var titre = defile.querySelector('[data-defile-titre]');
    var barre = defile.querySelector('[data-defile-barre]');
    var PAUSE = 2500;
    var position = -1;      // rang dans la piste complète (copies comprises)
    var minuterie = null;
    var arret = null;
    var enVue = true;
    if (n < 2) return;

    var copier = function (v) {
      var c = v.cloneNode(true);
      c.removeAttribute('data-shot');
      c.setAttribute('aria-hidden', 'true');
      c.inert = true;
      c.classList.add('defile__vue--copie');
      return c;
    };
    originales.slice().reverse().forEach(function (v) { piste.insertBefore(copier(v), piste.firstChild); });
    originales.forEach(function (v) { piste.appendChild(copier(v)); });
    var vues = Array.prototype.slice.call(piste.querySelectorAll('.defile__vue'));

    var deuxChiffres = function (k) { return (k < 10 ? '0' : '') + k; };

    var marquer = function (p) {
      if (p === position) return;
      position = p;
      vues.forEach(function (v, k) { v.classList.toggle('is-active', k === p); });
      var reel = p % n;
      num.textContent = deuxChiffres(reel + 1);
      titre.textContent = originales[reel].querySelector('button').getAttribute('data-caption');
      barre.style.width = ((reel + 1) / n * 100) + '%';
    };

    var gauche = function (p) {
      var v = vues[p];
      return v.offsetLeft - (piste.clientWidth - v.offsetWidth) / 2;
    };

    var aller = function (p, instantane) {
      p = Math.max(0, Math.min(vues.length - 1, p));
      piste.scrollTo({ left: gauche(p), behavior: instantane || reduceMotion ? 'auto' : 'smooth' });
      marquer(p);
    };

    // Saut invisible d'une copie vers la vue d'origine : sans transition, pour
    // que la vue reste exactement comme elle était.
    var recentrer = function () {
      if (position >= n && position < 2 * n) return;
      piste.classList.add('defile__piste--saut');
      aller(n + position % n, true);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { piste.classList.remove('defile__piste--saut'); });
      });
    };

    var suivre = function () {
      var centre = piste.scrollLeft + piste.clientWidth / 2;
      var proche = 0;
      var ecart = Infinity;
      vues.forEach(function (v, k) {
        var d = Math.abs(v.offsetLeft + v.offsetWidth / 2 - centre);
        if (d < ecart) { ecart = d; proche = k; }
      });
      marquer(proche);
    };

    var image = null;
    piste.addEventListener('scroll', function () {
      if (!image) image = requestAnimationFrame(function () { image = null; suivre(); });
      clearTimeout(arret);
      arret = setTimeout(recentrer, 160);
    }, { passive: true });

    // Défilement automatique, en continu. Il s'interrompt hors de l'écran,
    // pendant que la visionneuse est ouverte, et repart de zéro après chaque
    // geste de l'utilisateur.
    var relancer = function () {
      clearInterval(minuterie);
      minuterie = null;
      if (reduceMotion || !enVue) return;
      minuterie = setInterval(function () {
        var b = document.querySelector('[data-lightbox]');
        if (b && b.classList.contains('is-open')) return;
        aller(position + 1);
      }, PAUSE);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        enVue = entries[0].isIntersecting;
        relancer();
      }, { threshold: 0.3 }).observe(defile);
    }

    piste.addEventListener('pointerdown', relancer);
    piste.addEventListener('wheel', relancer, { passive: true });

    defile.querySelector('[data-defile-prec]').addEventListener('click', function () { aller(position - 1); relancer(); });
    defile.querySelector('[data-defile-suiv]').addEventListener('click', function () { aller(position + 1); relancer(); });

    // Un clic sur une voisine la ramène au centre au lieu de l'agrandir :
    // écouté en capture, il passe avant la visionneuse. Une copie ne s'agrandit
    // jamais elle-même : c'est sa vue d'origine qui s'ouvre.
    piste.addEventListener('click', function (e) {
      var v = e.target.closest('.defile__vue');
      if (!v) return;
      var p = vues.indexOf(v);
      if (p !== position) {
        e.preventDefault();
        e.stopPropagation();
        aller(p);
        relancer();
      } else if (v.classList.contains('defile__vue--copie')) {
        e.preventDefault();
        e.stopPropagation();
        originales[p % n].querySelector('button').click();
      }
    }, true);

    piste.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); aller(position - 1); relancer(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); aller(position + 1); relancer(); }
    });

    // Départ sur la première vraie vue, au milieu de la piste.
    piste.classList.add('defile__piste--saut');
    aller(n, true);
    requestAnimationFrame(function () { piste.classList.remove('defile__piste--saut'); });
    relancer();
  });

  /* ---------------------------------------------------------------------
     Formulaire de contact.
     Envoi asynchrone si un endpoint est configuré ; sinon on laisse le
     navigateur faire un POST classique plutôt que d'avaler la soumission.
     --------------------------------------------------------------------- */
  var form = document.querySelector('[data-form]');

  if (form) {
    var status = form.querySelector('[data-form-status]');
    var action = form.getAttribute('action') || '';
    var configured = action.indexOf('TODO_FORMSPREE_ID') === -1;

    // Messages dans la langue de la page (version anglaise : /en/).
    var en = document.documentElement.lang === 'en';
    var messages = en ? {
      nonRelie: "The form is not yet connected to its inbox. " +
        "In the meantime, please call the relevant office directly: all four numbers are listed further down this page.",
      envoi: 'Sending…',
      merci: 'Thank you. Your message has been sent — we will get back to you within 48 business hours.',
      echec: "Sending failed. Please call your nearest office — the numbers are listed further down this page — and we will handle your request just the same."
    } : {
      nonRelie: "Le formulaire n'est pas encore relié à sa boîte de réception. " +
        "En attendant, appelez directement le bureau concerné : les quatre numéros figurent plus bas sur cette page.",
      envoi: 'Envoi en cours…',
      merci: 'Merci. Votre message est parti — nous revenons vers vous sous 48 heures ouvrées.',
      echec: "L'envoi a échoué. Appelez le bureau le plus proche — les numéros figurent plus bas sur cette page — nous traiterons votre demande de la même façon."
    };

    var say = function (message) {
      if (!status) return;
      status.textContent = message;
      status.hidden = false;
    };

    form.addEventListener('submit', function (e) {
      if (!configured) {
        e.preventDefault();
        say(messages.nonRelie);
        return;
      }

      e.preventDefault();
      var submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      say(messages.envoi);

      fetch(action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.reset();
          say(messages.merci);
        })
        .catch(function () {
          say(messages.echec);
        })
        .finally(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

})();
