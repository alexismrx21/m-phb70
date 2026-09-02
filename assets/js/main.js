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
    var items = Array.prototype.slice.call(gallery.querySelectorAll('[data-category]'));
    var filters = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var visible = items.slice();

    var applyFilter = function (value) {
      visible = [];
      items.forEach(function (item) {
        var match = value === 'all' || item.getAttribute('data-category') === value;
        item.hidden = !match;
        if (match) visible.push(item);
      });
      filters.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === value));
      });
    };

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

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
        boxImg.alt = trigger.querySelector('img').alt;
        boxCaption.textContent = trigger.getAttribute('data-caption') || '';
      };

      var openBox = function (item) {
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
        document.body.classList.remove('is-locked');
        if (opener) opener.focus();
      };

      var step = function (delta) {
        if (!visible.length) return;
        index = (index + delta + visible.length) % visible.length;
        render();
      };

      gallery.addEventListener('click', function (e) {
        var trigger = e.target.closest('button[data-full]');
        if (trigger) openBox(trigger.closest('[data-category]'));
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
     Formulaire de contact.
     Envoi asynchrone si un endpoint est configuré ; sinon on laisse le
     navigateur faire un POST classique plutôt que d'avaler la soumission.
     --------------------------------------------------------------------- */
  var form = document.querySelector('[data-form]');

  if (form) {
    var status = form.querySelector('[data-form-status]');
    var action = form.getAttribute('action') || '';
    var configured = action.indexOf('TODO_FORMSPREE_ID') === -1;

    var say = function (message) {
      if (!status) return;
      status.textContent = message;
      status.hidden = false;
    };

    form.addEventListener('submit', function (e) {
      if (!configured) {
        e.preventDefault();
        say(
          "Le formulaire n'est pas encore relié à sa boîte de réception. " +
          "En attendant, appelez directement le bureau concerné : les quatre numéros figurent plus bas sur cette page."
        );
        return;
      }

      e.preventDefault();
      var submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      say('Envoi en cours…');

      fetch(action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.reset();
          say('Merci. Votre message est parti — nous revenons vers vous sous 48 heures ouvrées.');
        })
        .catch(function () {
          say("L'envoi a échoué. Appelez le bureau le plus proche — les numéros figurent plus bas sur cette page — nous traiterons votre demande de la même façon.");
        })
        .finally(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

})();
