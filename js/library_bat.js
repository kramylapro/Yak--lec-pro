/* Yak-élec-pro – symboles du schéma architectural (plan d'implantation d'un bâtiment) */
(function (g) {
  'use strict';
  const EE = g.EE, { L, C, R, P, T } = EE.Draw;
  const CAT = 'Plan architectural';
  const REFP = 'NF C 15-100 – repérage des équipements sur les plans ; symboles simplifiés d\'après les usages (NF EN 60617)';
  const NOTE = 'Sur un plan, 1 carreau de la grille = 25 cm (1 m = 4 carreaux).';
  const base = (id, name, bbox, desc, notes, body, o = {}) => Object.assign({ id, name, cat: CAT, prefix: '', term: [], bbox, desc, notes: (notes ? notes + ' ' : '') + NOTE, body, ref: REFP, plan: true }, o);
  const tick = (x, y, dx, dy) => L(x, y, x + dx, y + dy);
  const defs = [
    base('p_porte', 'Porte (battant)', [-24, -44, 24, 6], 'Porte à un battant de 80 cm : le trait montre le battant, l\'arc son ouverture.', 'Placez-la dans une ouverture du mur (2 carreaux). Pivoter avec R.', () => L(-20, 0, -20, -40) + P('M-20,-40 A40,40 0 0 1 20,0') + L(-20, 0, 20, 0, 'stroke-dasharray="3 3"')),
    base('p_fenetre', 'Fenêtre', [-24, -8, 24, 8], 'Fenêtre ou baie vitrée de 1 m (4 carreaux de 25 cm = 1 m : ici 2 carreaux = 50 cm, en placer plusieurs).', 'Placez-la dans le mur ; répétez pour une grande baie.', () => R(-20, -5, 40, 10) + L(-20, 0, 20, 0)),
    base('p_etiquette', 'Nom de la pièce', [-50, -10, 50, 10], 'Texte indiquant la pièce (Salon, Chambre 1, Cuisine…).', 'Écrivez le nom dans « Valeur » du panneau Propriétés.', (c) => T(0, 5, c.val || 'Pièce', 14), { params: { val: true }, defVal: 'Salon', noLabel: true }),
    base('p_plafonnier', 'Point lumineux en plafond (DCL)', [-14, -14, 14, 14], 'Luminaire fixé au plafond sur un dispositif de connexion pour luminaire (DCL).', 'Repérer le circuit éclairage dans « Identification » (ex. C1).', () => C(0, 0, 10) + L(-7, -7, 7, 7) + L(-7, 7, 7, -7)),
    base('p_applique', 'Point lumineux en applique', [-14, -14, 14, 18], 'Luminaire fixé au mur (applique).', 'Se place contre le mur.', () => C(0, 0, 9) + L(-6, -6, 6, 6) + L(-6, 6, 6, -6) + L(-12, 12, 12, 12)),
    base('p_inter', 'Interrupteur simple allumage', [-12, -14, 14, 10], 'Commande un point lumineux depuis un endroit.', 'À 1,10 m du sol environ, côté poignée de porte (hauteur à vérifier dans la norme).', () => C(0, 0, 5, true) + L(0, 0, 11, -11)),
    base('p_inter_double', 'Interrupteur double allumage', [-12, -14, 18, 10], 'Commande deux points lumineux (ou deux groupes) depuis un même endroit.', '', () => C(0, 0, 5, true) + L(0, 0, 11, -11) + L(0, 0, 14, -5)),
    base('p_va_vient', 'Interrupteur va-et-vient', [-12, -14, 14, 12], 'Commande un point lumineux depuis deux endroits (utilisé par paire).', 'Prévoir deux va-et-vient par circuit.', () => C(0, 0, 5, true) + L(0, 0, 11, -11) + L(7, -7, 12, -2)),
    base('p_bp', 'Bouton poussoir', [-12, -12, 12, 12], 'Bouton poussoir (télérupteur, minuterie, sonnerie).', '', () => C(0, 0, 8) + T(0, 4, 'P', 11)),
    base('p_prise', 'Prise de courant 16 A 2P+T', [-12, -12, 12, 12], 'Prise de courant 2P+T 16 A.', 'Repérer le circuit prises dans « Identification ».', () => C(0, 0, 8) + L(-12, 0, 12, 0) + L(0, 0, 0, -8)),
    base('p_prise20', 'Prise de courant 20 A', [-12, -12, 12, 12], 'Prise 2P+T 20 A (circuit dédié).', '', () => C(0, 0, 8) + L(-12, 0, 12, 0) + L(0, 0, 0, -8) + T(0, 22, '20 A', 8)),
    base('p_prise_sp', 'Prise spécialisée', [-14, -14, 14, 14], 'Prise d\'un circuit spécialisé (lave-linge, lave-vaisselle, four, plaque…).', 'Précisez l\'appareil dans « Valeur ».', () => R(-10, -10, 20, 20) + C(0, 0, 5) + L(-5, 0, 5, 0), { params: { val: true }, defVal: 'LL' }),
    base('p_rj45', 'Prise de communication (RJ45)', [-12, -12, 12, 12], 'Prise de communication (téléphone, informatique).', '', () => P('M-10,-8 L10,-8 L0,8 Z') + T(0, -11, 'RJ', 8)),
    base('p_tv', 'Prise TV', [-12, -12, 12, 12], 'Prise de télévision (antenne / réseau).', '', () => C(0, 0, 9) + T(0, 3, 'TV', 8)),
    base('p_tableau', 'Tableau de répartition', [-24, -16, 24, 16], 'Tableau de répartition (coffret) : voir le menu Quantitatif pour sa composition.', 'Placé dans la gaine technique du logement (GTL) ou près de l\'entrée.', () => R(-20, -12, 40, 24) + T(0, 4, 'TD', 12)),
    base('p_compteur', 'Compteur / disjoncteur de branchement', [-16, -16, 16, 16], 'Compteur et disjoncteur de branchement (limite de propriété ou GTL).', '', () => R(-12, -12, 24, 24) + T(0, 4, 'kWh', 8)),
    base('p_daaf', 'Détecteur de fumée (DAAF)', [-12, -12, 12, 12], 'Détecteur avertisseur autonome de fumée (obligatoire dans les logements).', '', () => C(0, 0, 9) + T(0, 4, 'D', 11)),
    base('p_convecteur', 'Convecteur / radiateur électrique', [-24, -10, 24, 10], 'Appareil de chauffage électrique.', 'Circuit chauffage dédié (calibre à vérifier selon la puissance).', () => R(-20, -7, 40, 14) + P('M-14,0 L-10,-4 L-6,4 L-2,-4 L2,4 L6,-4 L10,4 L14,0')),
    base('p_chauffe_eau', 'Chauffe-eau', [-16, -16, 16, 16], 'Chauffe-eau électrique (circuit spécialisé).', '', () => C(0, 0, 13) + T(0, 4, 'CE', 10)),
    base('p_sonnerie', 'Sonnerie / sonnette', [-12, -12, 12, 12], 'Sonnerie ou sonnette d\'entrée.', '', () => P('M-8,6 L-8,-2 A8,8 0 0 1 8,-2 L8,6 Z') + L(-10, 6, 10, 6) + C(0, 9, 2, true)),
    base('p_vmc', 'VMC (ventilation)', [-14, -14, 14, 14], 'Ventilation mécanique contrôlée.', '', () => C(0, 0, 11) + T(0, 4, 'V', 12)),
    base('p_clim', 'Climatiseur', [-24, -10, 24, 10], 'Unité de climatisation (circuit dédié).', '', () => R(-20, -7, 40, 14) + T(0, 4, 'CL', 10)),
    base('p_derivation', 'Boîte de dérivation', [-10, -10, 10, 10], 'Boîte de dérivation : point de jonction des câbles.', 'Toujours accessible.', () => R(-8, -8, 16, 16) + L(-8, -8, 8, 8) + L(-8, 8, 8, -8)),
  ];
  defs.forEach((d) => { d.params = d.params || {}; });
  EE.Library.cats.push(CAT);
  EE.Library.add(defs);
})(window);
