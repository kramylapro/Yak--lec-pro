/* Yak-élec-pro – utilisateurs, projets, paramètres (stockage local du navigateur / de l'appareil) */
(function (g) {
  'use strict';
  const EE = g.EE;
  const mem = {};
  const S = {
    persistent: true,
    get(k, def) { try { const v = g.localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : def) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : def; } },
    set(k, v) { mem[k] = v; try { g.localStorage.setItem(k, JSON.stringify(v)); S.persistent = true; return true; } catch (e) { S.persistent = false; return false; } },
    del(k) { delete mem[k]; try { g.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  EE.INSTALLS = ['Résidentiel', 'Tertiaire', 'Industriel', 'Enseignement / atelier', 'Autre'];
  EE.SCHEMAS = { developpe: 'Schéma développé', unifilaire: 'Schéma unifilaire', multifilaire: 'Schéma multifilaire', architectural: 'Schéma architectural (plan)' };

  const Users = {
    list() { return S.get('eep.users', []); },
    current() { const id = S.get('eep.session', null); return id ? Users.list().find((u) => u.id === id) || null : null; },
    hash(name, pwd, salt) { return EE.sha256(salt + '|' + name.toLowerCase() + '|' + pwd); },
    register(name, pwd) {
      name = (name || '').trim();
      if (name.length < 2) throw new Error('Le nom doit contenir au moins 2 caractères.');
      if ((pwd || '').length < 4) throw new Error('Le mot de passe doit contenir au moins 4 caractères.');
      if (EE.Config && EE.Config.isAdminName(name) && !EE.Config.checkAdminPassword(pwd)) throw new Error('Ce nom de compte est réservé à l\'administrateur : mot de passe administrateur requis.');
      const us = Users.list();
      if (us.some((u) => u.name.toLowerCase() === name.toLowerCase())) throw new Error('Ce nom d\'utilisateur existe déjà.');
      const salt = EE.uid('s'); const u = { id: EE.uid('u'), name, salt, hash: Users.hash(name, pwd, salt), created: Date.now() };
      us.push(u); S.set('eep.users', us); S.set('eep.session', u.id); return u;
    },
    login(name, pwd) {
      const u = Users.list().find((x) => x.name.toLowerCase() === (name || '').trim().toLowerCase());
      if (!u || u.hash !== Users.hash(u.name, pwd || '', u.salt)) throw new Error('Nom ou mot de passe incorrect.');
      S.set('eep.session', u.id); return u;
    },
    logout() { S.del('eep.session'); },
    changePassword(oldPwd, newPwd) {
      const u = Users.current(); if (!u) throw new Error('Aucun utilisateur connecté.');
      if (u.hash !== Users.hash(u.name, oldPwd || '', u.salt)) throw new Error('Ancien mot de passe incorrect.');
      if ((newPwd || '').length < 4) throw new Error('Le nouveau mot de passe doit contenir au moins 4 caractères.');
      const us = Users.list(); const x = us.find((a) => a.id === u.id); x.hash = Users.hash(u.name, newPwd, x.salt); S.set('eep.users', us);
    },
    remove(id) { S.set('eep.users', Users.list().filter((u) => u.id !== id)); S.del('eep.projects.' + id); S.del('eep.settings.' + id); if (S.get('eep.session') === id) S.del('eep.session'); },
  };

  const defaultSettings = { snap: true, grid: true, autolabel: true, theme: 'light', terminalMarks: true };
  const Settings = {
    get() { const u = Users.current(); return Object.assign({}, defaultSettings, u ? S.get('eep.settings.' + u.id, {}) : {}); },
    set(patch) { const u = Users.current(); if (!u) return; S.set('eep.settings.' + u.id, Object.assign(Settings.get(), patch)); },
  };

  const key = () => { const u = Users.current(); if (!u) throw new Error('Aucun utilisateur connecté.'); return 'eep.projects.' + u.id; };
  const Projects = {
    list() { return S.get(key(), []); },
    get(id) { return Projects.list().find((p) => p.id === id) || null; },
    _save(l) { const ok = S.set(key(), l); if (!ok) throw new Error('Stockage plein ou indisponible : exportez vos projets.'); },
    create({ name, install, schema }) {
      name = (name || '').trim(); if (!name) throw new Error('Le nom du projet est obligatoire.');
      const p = { id: EE.uid('p'), owner: Users.current().id, name, install: install || EE.INSTALLS[0], schema: schema || 'developpe', created: Date.now(), modified: Date.now(), opened: Date.now(), doc: { comps: [], wires: [] }, view: { x: 80, y: 80, k: 1 }, v: 1 };
      const l = Projects.list(); l.push(p); Projects._save(l); return p;
    },
    update(p) { const l = Projects.list(); const i = l.findIndex((x) => x.id === p.id); if (i < 0) throw new Error('Projet introuvable.'); p.modified = Date.now(); l[i] = p; Projects._save(l); return p; },
    touch(id) { const l = Projects.list(); const p = l.find((x) => x.id === id); if (p) { p.opened = Date.now(); Projects._save(l); } return p; },
    edit(id, { name, install, schema }) {
      name = (name || '').trim(); if (!name) throw new Error('Le nom du projet est obligatoire.');
      const l = Projects.list(); const p = l.find((x) => x.id === id); if (!p) throw new Error('Projet introuvable.');
      Object.assign(p, { name, install, schema, modified: Date.now() }); Projects._save(l); return p;
    },
    duplicate(id) {
      const l = Projects.list(); const p = l.find((x) => x.id === id); if (!p) throw new Error('Projet introuvable.');
      const c = EE.clone(p); c.id = EE.uid('p'); c.name = p.name + ' (copie)'; c.created = c.modified = c.opened = Date.now(); l.push(c); Projects._save(l); return c;
    },
    remove(id) { Projects._save(Projects.list().filter((p) => p.id !== id)); },
    recent(n = 5) { return Projects.list().slice().sort((a, b) => b.opened - a.opened).slice(0, n); },
    exportJSON(id) { const p = Projects.get(id); return JSON.stringify({ format: 'yak-elec-pro', version: 1, project: p }, null, 1); },
    importJSON(text) {
      let o; try { o = JSON.parse(text); } catch (e) { throw new Error('Fichier illisible (JSON invalide).'); }
      if (!o || !['yak-elec-pro', 'elec-expert-pro'].includes(o.format) || !o.project || !o.project.doc || !Array.isArray(o.project.doc.comps) || !Array.isArray(o.project.doc.wires)) throw new Error('Ce fichier n\'est pas un projet Yak-élec-pro.');
      const p = o.project; p.id = EE.uid('p'); p.owner = Users.current().id; p.name = (p.name || 'Projet importé'); p.modified = p.opened = Date.now();
      const l = Projects.list(); l.push(p); Projects._save(l); return p;
    },
  };
  EE.Store = { raw: S, Users, Settings, Projects };
})(window);
