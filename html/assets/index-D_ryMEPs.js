const Sk = Object.defineProperty; const _k = (e, t, n) => t in e ? Sk(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n; const ji = (e, t, n) => _k(e, typeof t != 'symbol' ? `${t}` : t, n); (function () {
  const t = document.createElement('link').relList; if (t && t.supports && t.supports('modulepreload'))
    return; for (const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s); new MutationObserver((s) => {
    for (const l of s) {
      if (l.type === 'childList') {
        for (const u of l.addedNodes)u.tagName === 'LINK' && u.rel === 'modulepreload' && i(u)
      }
    }
  }).observe(document, { childList: !0, subtree: !0 }); function n(s) { const l = {}; return s.integrity && (l.integrity = s.integrity), s.referrerPolicy && (l.referrerPolicy = s.referrerPolicy), s.crossOrigin === 'use-credentials' ? l.credentials = 'include' : s.crossOrigin === 'anonymous' ? l.credentials = 'omit' : l.credentials = 'same-origin', l } function i(s) {
    if (s.ep)
      return; s.ep = !0; const l = n(s); fetch(s.href, l)
  }
})()/**
     * @vue/shared v3.5.16
     * (c) 2018-present Yuxi (Evan) You and Vue contributors
     * @license MIT
     *//*! #__NO_SIDE_EFFECTS__ */function Jh(e) { const t = Object.create(null); for (const n of e.split(','))t[n] = 1; return n => n in t } const vt = {}; const Ps = []; function Yr() {} const kk = () => !1; const Bu = e => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97); const Yh = e => e.startsWith('onUpdate:'); const on = Object.assign; function Zh(e, t) { const n = e.indexOf(t); n > -1 && e.splice(n, 1) } const Tk = Object.prototype.hasOwnProperty; const wt = (e, t) => Tk.call(e, t); const Fe = Array.isArray; const Os = e => Oa(e) === '[object Map]'; const Wu = e => Oa(e) === '[object Set]'; const Zm = e => Oa(e) === '[object Date]'; const Ge = e => typeof e == 'function'; const Dt = e => typeof e == 'string'; const Nr = e => typeof e == 'symbol'; const _t = e => e !== null && typeof e == 'object'; const eb = e => (_t(e) || Ge(e)) && Ge(e.then) && Ge(e.catch); const tb = Object.prototype.toString; const Oa = e => tb.call(e); const Ck = e => Oa(e).slice(8, -1); const nb = e => Oa(e) === '[object Object]'; const Qh = e => Dt(e) && e !== 'NaN' && e[0] !== '-' && `${Number.parseInt(e, 10)}` === e; const Yl = Jh(',key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted'); function ju(e) { const t = Object.create(null); return n => t[n] || (t[n] = e(n)) } const Ek = /-(\w)/g; const ir = ju(e => e.replace(Ek, (t, n) => n ? n.toUpperCase() : '')); const Ak = /\B([A-Z])/g; const Ai = ju(e => e.replace(Ak, '-$1').toLowerCase()); const qu = ju(e => e.charAt(0).toUpperCase() + e.slice(1)); const Xc = ju(e => e ? `on${qu(e)}` : ''); const Vn = (e, t) => !Object.is(e, t); function Kc(e, ...t) { for (let n = 0; n < e.length; n++)e[n](...t) } function rb(e, t, n, i = !1) { Object.defineProperty(e, t, { configurable: !0, enumerable: !1, writable: i, value: n }) } function Yd(e) { const t = Number.parseFloat(e); return isNaN(t) ? e : t } function ib(e) { const t = Dt(e) ? Number(e) : Number.NaN; return isNaN(t) ? e : t } let Qm; const Uu = () => Qm || (Qm = typeof globalThis < 'u' ? globalThis : typeof self < 'u' ? self : typeof window < 'u' ? window : typeof global < 'u' ? global : {}); function nn(e) {
  if (Fe(e)) {
    const t = {}; for (let n = 0; n < e.length; n++) {
      const i = e[n]; const s = Dt(i) ? Nk(i) : nn(i); if (s) {
        for (const l in s)t[l] = s[l]
      }
    } return t
  }
  else if (Dt(e) || _t(e)) {
    return e
  }
} const Lk = /;(?![^(]*\))/g; const $k = /:([\s\S]+)/; const Mk = /\/\*[\s\S]*?\*\//g; function Nk(e) { const t = {}; return e.replace(Mk, '').split(Lk).forEach((n) => { if (n) { const i = n.split($k); i.length > 1 && (t[i[0].trim()] = i[1].trim()) } }), t } function ot(e) {
  let t = ''; if (Dt(e)) {
    t = e
  }
  else if (Fe(e)) {
    for (let n = 0; n < e.length; n++) { const i = ot(e[n]); i && (t += `${i} `) }
  }
  else if (_t(e)) {
    for (const n in e)e[n] && (t += `${n} `)
  } return t.trim()
} function Ik(e) {
  if (!e)
    return null; const { class: t, style: n } = e; return t && !Dt(t) && (e.class = ot(t)), n && (e.style = nn(n)), e
} const Pk = 'itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly'; const Ok = Jh(Pk); function ob(e) { return !!e || e === '' } function Rk(e, t) {
  if (e.length !== t.length)
    return !1; let n = !0; for (let i = 0; n && i < e.length; i++)n = Vu(e[i], t[i]); return n
} function Vu(e, t) {
  if (e === t)
    return !0; let n = Zm(e); let i = Zm(t); if (n || i)
    return n && i ? e.getTime() === t.getTime() : !1; if (n = Nr(e), i = Nr(t), n || i)
    return e === t; if (n = Fe(e), i = Fe(t), n || i)
    return n && i ? Rk(e, t) : !1; if (n = _t(e), i = _t(t), n || i) {
    if (!n || !i)
      return !1; const s = Object.keys(e).length; const l = Object.keys(t).length; if (s !== l)
      return !1; for (const u in e) {
      const f = e.hasOwnProperty(u); const h = t.hasOwnProperty(u); if (f && !h || !f && h || !Vu(e[u], t[u]))
        return !1
    }
  } return String(e) === String(t)
} function sb(e, t) { return e.findIndex(n => Vu(n, t)) } const lb = e => !!(e && e.__v_isRef === !0); const Re = e => Dt(e) ? e : e == null ? '' : Fe(e) || _t(e) && (e.toString === tb || !Ge(e.toString)) ? lb(e) ? Re(e.value) : JSON.stringify(e, ab, 2) : String(e); const ab = (e, t) => lb(t) ? ab(e, t.value) : Os(t) ? { [`Map(${t.size})`]: [...t.entries()].reduce((n, [i, s], l) => (n[`${pd(i, l)} =>`] = s, n), {}) } : Wu(t) ? { [`Set(${t.size})`]: [...t.values()].map(n => pd(n)) } : Nr(t) ? pd(t) : _t(t) && !Fe(t) && !nb(t) ? String(t) : t; function pd(e, t = '') { let n; return Nr(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e }/**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * @vue/reactivity v3.5.16
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * (c) 2018-present Yuxi (Evan) You and Vue contributors
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * @license MIT
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          */let yn; class zk {
  constructor(t = !1) { this.detached = t, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = yn, !t && yn && (this.index = (yn.scopes || (yn.scopes = [])).push(this) - 1) } get active() { return this._active }pause() {
    if (this._active) {
      this._isPaused = !0; let t, n; if (this.scopes) {
        for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].pause()
      } for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].pause()
    }
  }

  resume() {
    if (this._active && this._isPaused) {
      this._isPaused = !1; let t, n; if (this.scopes) {
        for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].resume()
      } for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].resume()
    }
  }

  run(t) {
    if (this._active) {
      const n = yn; try { return yn = this, t() }
      finally { yn = n }
    }
  }

  on() { ++this._on === 1 && (this.prevScope = yn, yn = this) }off() { this._on > 0 && --this._on === 0 && (yn = this.prevScope, this.prevScope = void 0) }stop(t) { if (this._active) { this._active = !1; let n, i; for (n = 0, i = this.effects.length; n < i; n++) this.effects[n].stop(); for (this.effects.length = 0, n = 0, i = this.cleanups.length; n < i; n++) this.cleanups[n](); if (this.cleanups.length = 0, this.scopes) { for (n = 0, i = this.scopes.length; n < i; n++) this.scopes[n].stop(!0); this.scopes.length = 0 } if (!this.detached && this.parent && !t) { const s = this.parent.scopes.pop(); s && s !== this && (this.parent.scopes[this.index] = s, s.index = this.index) } this.parent = void 0 } }
} function cb() { return yn } function Dk(e, t = !1) { yn && yn.cleanups.push(e) } let Tt; const gd = new WeakSet(); class ub {
  constructor(t) { this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, yn && yn.active && yn.effects.push(this) }pause() { this.flags |= 64 }resume() { this.flags & 64 && (this.flags &= -65, gd.has(this) && (gd.delete(this), this.trigger())) }notify() { this.flags & 2 && !(this.flags & 32) || this.flags & 8 || db(this) }run() {
    if (!(this.flags & 1))
      return this.fn(); this.flags |= 2, ev(this), hb(this); const t = Tt; const n = $r; Tt = this, $r = !0; try { return this.fn() }
    finally { pb(this), Tt = t, $r = n, this.flags &= -3 }
  }

  stop() { if (this.flags & 1) { for (let t = this.deps; t; t = t.nextDep)np(t); this.deps = this.depsTail = void 0, ev(this), this.onStop && this.onStop(), this.flags &= -2 } }trigger() { this.flags & 64 ? gd.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty() }runIfDirty() { Zd(this) && this.run() } get dirty() { return Zd(this) }
} let fb = 0; let Zl; let Ql; function db(e, t = !1) { if (e.flags |= 8, t) { e.next = Ql, Ql = e; return }e.next = Zl, Zl = e } function ep() { fb++ } function tp() {
  if (--fb > 0)
    return; if (Ql) { let t = Ql; for (Ql = void 0; t;) { const n = t.next; t.next = void 0, t.flags &= -9, t = n } } let e; for (;Zl;) {
    let t = Zl; for (Zl = void 0; t;) {
      const n = t.next; if (t.next = void 0, t.flags &= -9, t.flags & 1) {
        try { t.trigger() }
        catch (i) { e || (e = i) }
      }t = n
    }
  } if (e)
    throw e
} function hb(e) { for (let t = e.deps; t; t = t.nextDep)t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t } function pb(e) { let t; let n = e.depsTail; let i = n; for (;i;) { const s = i.prevDep; i.version === -1 ? (i === n && (n = s), np(i), Fk(i)) : t = i, i.dep.activeLink = i.prevActiveLink, i.prevActiveLink = void 0, i = s }e.deps = t, e.depsTail = n } function Zd(e) {
  for (let t = e.deps; t; t = t.nextDep) {
    if (t.dep.version !== t.version || t.dep.computed && (gb(t.dep.computed) || t.dep.version !== t.version))
      return !0
  } return !!e._dirty
} function gb(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === ua) || (e.globalVersion = ua, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Zd(e))))
    return; e.flags |= 2; const t = e.dep; const n = Tt; const i = $r; Tt = e, $r = !0; try { hb(e); const s = e.fn(e._value); (t.version === 0 || Vn(s, e._value)) && (e.flags |= 128, e._value = s, t.version++) }
  catch (s) { throw t.version++, s }
  finally { Tt = n, $r = i, pb(e), e.flags &= -3 }
} function np(e, t = !1) { const { dep: n, prevSub: i, nextSub: s } = e; if (i && (i.nextSub = s, e.prevSub = void 0), s && (s.prevSub = i, e.nextSub = void 0), n.subs === e && (n.subs = i, !i && n.computed)) { n.computed.flags &= -5; for (let l = n.computed.deps; l; l = l.nextDep)np(l, !0) }!t && !--n.sc && n.map && n.map.delete(n.key) } function Fk(e) { const { prevDep: t, nextDep: n } = e; t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0) } let $r = !0; const mb = []; function ki() { mb.push($r), $r = !1 } function Ti() { const e = mb.pop(); $r = e === void 0 ? !0 : e } function ev(e) {
  const { cleanup: t } = e; if (e.cleanup = void 0, t) {
    const n = Tt; Tt = void 0; try { t() }
    finally { Tt = n }
  }
} let ua = 0; class Hk {constructor(t, n) { this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0 }} class Gu {
  constructor(t) { this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0 }track(t) {
    if (!Tt || !$r || Tt === this.computed)
      return; let n = this.activeLink; if (n === void 0 || n.sub !== Tt) {
      n = this.activeLink = new Hk(Tt, this), Tt.deps ? (n.prevDep = Tt.depsTail, Tt.depsTail.nextDep = n, Tt.depsTail = n) : Tt.deps = Tt.depsTail = n, vb(n)
    }
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) { const i = n.nextDep; i.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = i), n.prevDep = Tt.depsTail, n.nextDep = void 0, Tt.depsTail.nextDep = n, Tt.depsTail = n, Tt.deps === n && (Tt.deps = i) } return n
  }

  trigger(t) { this.version++, ua++, this.notify(t) }notify(t) {
    ep(); try { for (let n = this.subs; n; n = n.prevSub)n.sub.notify() && n.sub.dep.notify() }
    finally { tp() }
  }
} function vb(e) { if (e.dep.sc++, e.sub.flags & 4) { const t = e.dep.computed; if (t && !e.dep.subs) { t.flags |= 20; for (let i = t.deps; i; i = i.nextDep)vb(i) } const n = e.dep.subs; n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e } } const cu = new WeakMap(); const jo = Symbol(''); const Qd = Symbol(''); const fa = Symbol(''); function bn(e, t, n) { if ($r && Tt) { let i = cu.get(e); i || cu.set(e, i = new Map()); let s = i.get(n); s || (i.set(n, s = new Gu()), s.map = i, s.key = n), s.track() } } function wi(e, t, n, i, s, l) {
  const u = cu.get(e); if (!u) { ua++; return } const f = (h) => { h && h.trigger() }; if (ep(), t === 'clear') {
    u.forEach(f)
  }
  else {
    const h = Fe(e); const p = h && Qh(n); if (h && n === 'length') { const g = Number(i); u.forEach((v, y) => { (y === 'length' || y === fa || !Nr(y) && y >= g) && f(v) }) }
    else {
      switch ((n !== void 0 || u.has(void 0)) && f(u.get(n)), p && f(u.get(fa)), t) { case 'add':h ? p && f(u.get('length')) : (f(u.get(jo)), Os(e) && f(u.get(Qd))); break; case 'delete':h || (f(u.get(jo)), Os(e) && f(u.get(Qd))); break; case 'set':Os(e) && f(u.get(jo)); break }
    }
  }tp()
} function Bk(e, t) { const n = cu.get(e); return n && n.get(t) } function ks(e) { const t = mt(e); return t === e ? t : (bn(t, 'iterate', fa), dr(e) ? t : t.map(hn)) } function Xu(e) { return bn(e = mt(e), 'iterate', fa), e } const Wk = { __proto__: null, [Symbol.iterator]() { return md(this, Symbol.iterator, hn) }, concat(...e) { return ks(this).concat(...e.map(t => Fe(t) ? ks(t) : t)) }, entries() { return md(this, 'entries', e => (e[1] = hn(e[1]), e)) }, every(e, t) { return hi(this, 'every', e, t, void 0, arguments) }, filter(e, t) { return hi(this, 'filter', e, t, n => n.map(hn), arguments) }, find(e, t) { return hi(this, 'find', e, t, hn, arguments) }, findIndex(e, t) { return hi(this, 'findIndex', e, t, void 0, arguments) }, findLast(e, t) { return hi(this, 'findLast', e, t, hn, arguments) }, findLastIndex(e, t) { return hi(this, 'findLastIndex', e, t, void 0, arguments) }, forEach(e, t) { return hi(this, 'forEach', e, t, void 0, arguments) }, includes(...e) { return vd(this, 'includes', e) }, indexOf(...e) { return vd(this, 'indexOf', e) }, join(e) { return ks(this).join(e) }, lastIndexOf(...e) { return vd(this, 'lastIndexOf', e) }, map(e, t) { return hi(this, 'map', e, t, void 0, arguments) }, pop() { return Fl(this, 'pop') }, push(...e) { return Fl(this, 'push', e) }, reduce(e, ...t) { return tv(this, 'reduce', e, t) }, reduceRight(e, ...t) { return tv(this, 'reduceRight', e, t) }, shift() { return Fl(this, 'shift') }, some(e, t) { return hi(this, 'some', e, t, void 0, arguments) }, splice(...e) { return Fl(this, 'splice', e) }, toReversed() { return ks(this).toReversed() }, toSorted(e) { return ks(this).toSorted(e) }, toSpliced(...e) { return ks(this).toSpliced(...e) }, unshift(...e) { return Fl(this, 'unshift', e) }, values() { return md(this, 'values', hn) } }; function md(e, t, n) { const i = Xu(e); const s = i[t](); return i !== e && !dr(e) && (s._next = s.next, s.next = () => { const l = s._next(); return l.value && (l.value = n(l.value)), l }), s } const jk = Array.prototype; function hi(e, t, n, i, s, l) { const u = Xu(e); const f = u !== e && !dr(e); const h = u[t]; if (h !== jk[t]) { const v = h.apply(e, l); return f ? hn(v) : v } let p = n; u !== e && (f ? p = function (v, y) { return n.call(this, hn(v), y, e) } : n.length > 2 && (p = function (v, y) { return n.call(this, v, y, e) })); const g = h.call(u, p, i); return f && s ? s(g) : g } function tv(e, t, n, i) { const s = Xu(e); let l = n; return s !== e && (dr(e) ? n.length > 3 && (l = function (u, f, h) { return n.call(this, u, f, h, e) }) : l = function (u, f, h) { return n.call(this, u, hn(f), h, e) }), s[t](l, ...i) } function vd(e, t, n) { const i = mt(e); bn(i, 'iterate', fa); const s = i[t](...n); return (s === -1 || s === !1) && sp(n[0]) ? (n[0] = mt(n[0]), i[t](...n)) : s } function Fl(e, t, n = []) { ki(), ep(); const i = mt(e)[t].apply(e, n); return tp(), Ti(), i } const qk = Jh('__proto__,__v_isRef,__isVue'); const yb = new Set(Object.getOwnPropertyNames(Symbol).filter(e => e !== 'arguments' && e !== 'caller').map(e => Symbol[e]).filter(Nr)); function Uk(e) { Nr(e) || (e = String(e)); const t = mt(this); return bn(t, 'has', e), t.hasOwnProperty(e) } class bb {
  constructor(t = !1, n = !1) { this._isReadonly = t, this._isShallow = n }get(t, n, i) {
    if (n === '__v_skip')
      return t.__v_skip; const s = this._isReadonly; const l = this._isShallow; if (n === '__v_isReactive')
      return !s; if (n === '__v_isReadonly')
      return s; if (n === '__v_isShallow')
      return l; if (n === '__v_raw')
      return i === (s ? l ? tT : _b : l ? Sb : xb).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(i) ? t : void 0; const u = Fe(t); if (!s) {
      let h; if (u && (h = Wk[n]))
        return h; if (n === 'hasOwnProperty')
        return Uk
    } const f = Reflect.get(t, n, kt(t) ? t : i); return (Nr(n) ? yb.has(n) : qk(n)) || (s || bn(t, 'get', n), l) ? f : kt(f) ? u && Qh(n) ? f : f.value : _t(f) ? s ? Ra(f) : rr(f) : f
  }
} class wb extends bb {
  constructor(t = !1) { super(!1, t) }set(t, n, i, s) {
    let l = t[n]; if (!this._isShallow) {
      const h = uo(l); if (!dr(i) && !uo(i) && (l = mt(l), i = mt(i)), !Fe(t) && kt(l) && !kt(i))
        return h ? !1 : (l.value = i, !0)
    } const u = Fe(t) && Qh(n) ? Number(n) < t.length : wt(t, n); const f = Reflect.set(t, n, i, kt(t) ? t : s); return t === mt(s) && (u ? Vn(i, l) && wi(t, 'set', n, i) : wi(t, 'add', n, i)), f
  }

  deleteProperty(t, n) { const i = wt(t, n); t[n]; const s = Reflect.deleteProperty(t, n); return s && i && wi(t, 'delete', n, void 0), s }has(t, n) { const i = Reflect.has(t, n); return (!Nr(n) || !yb.has(n)) && bn(t, 'has', n), i }ownKeys(t) { return bn(t, 'iterate', Fe(t) ? 'length' : jo), Reflect.ownKeys(t) }
} class Vk extends bb {constructor(t = !1) { super(!0, t) }set(t, n) { return !0 }deleteProperty(t, n) { return !0 }} const Gk = new wb(); const Xk = new Vk(); const Kk = new wb(!0); const eh = e => e; const $c = e => Reflect.getPrototypeOf(e); function Jk(e, t, n) { return function (...i) { const s = this.__v_raw; const l = mt(s); const u = Os(l); const f = e === 'entries' || e === Symbol.iterator && u; const h = e === 'keys' && u; const p = s[e](...i); const g = n ? eh : t ? uu : hn; return !t && bn(l, 'iterate', h ? Qd : jo), { next() { const { value: v, done: y } = p.next(); return y ? { value: v, done: y } : { value: f ? [g(v[0]), g(v[1])] : g(v), done: y } }, [Symbol.iterator]() { return this } } } } function Mc(e) { return function (...t) { return e === 'delete' ? !1 : e === 'clear' ? void 0 : this } } function Yk(e, t) {
  const n = { get(s) {
    const l = this.__v_raw; const u = mt(l); const f = mt(s); e || (Vn(s, f) && bn(u, 'get', s), bn(u, 'get', f)); const { has: h } = $c(u); const p = t ? eh : e ? uu : hn; if (h.call(u, s))
      return p(l.get(s)); if (h.call(u, f))
      return p(l.get(f)); l !== u && l.get(s)
  }, get size() { const s = this.__v_raw; return !e && bn(mt(s), 'iterate', jo), Reflect.get(s, 'size', s) }, has(s) { const l = this.__v_raw; const u = mt(l); const f = mt(s); return e || (Vn(s, f) && bn(u, 'has', s), bn(u, 'has', f)), s === f ? l.has(s) : l.has(s) || l.has(f) }, forEach(s, l) { const u = this; const f = u.__v_raw; const h = mt(f); const p = t ? eh : e ? uu : hn; return !e && bn(h, 'iterate', jo), f.forEach((g, v) => s.call(l, p(g), p(v), u)) } }; return on(n, e ? { add: Mc('add'), set: Mc('set'), delete: Mc('delete'), clear: Mc('clear') } : { add(s) { !t && !dr(s) && !uo(s) && (s = mt(s)); const l = mt(this); return $c(l).has.call(l, s) || (l.add(s), wi(l, 'add', s, s)), this }, set(s, l) { !t && !dr(l) && !uo(l) && (l = mt(l)); const u = mt(this); const { has: f, get: h } = $c(u); let p = f.call(u, s); p || (s = mt(s), p = f.call(u, s)); const g = h.call(u, s); return u.set(s, l), p ? Vn(l, g) && wi(u, 'set', s, l) : wi(u, 'add', s, l), this }, delete(s) { const l = mt(this); const { has: u, get: f } = $c(l); let h = u.call(l, s); h || (s = mt(s), h = u.call(l, s)), f && f.call(l, s); const p = l.delete(s); return h && wi(l, 'delete', s, void 0), p }, clear() { const s = mt(this); const l = s.size !== 0; const u = s.clear(); return l && wi(s, 'clear', void 0, void 0), u } }), ['keys', 'values', 'entries', Symbol.iterator].forEach((s) => { n[s] = Jk(s, e, t) }), n
} function rp(e, t) { const n = Yk(e, t); return (i, s, l) => s === '__v_isReactive' ? !e : s === '__v_isReadonly' ? e : s === '__v_raw' ? i : Reflect.get(wt(n, s) && s in i ? n : i, s, l) } const Zk = { get: rp(!1, !1) }; const Qk = { get: rp(!1, !0) }; const eT = { get: rp(!0, !1) }; const xb = new WeakMap(); const Sb = new WeakMap(); const _b = new WeakMap(); const tT = new WeakMap(); function nT(e) { switch (e) { case 'Object':case 'Array':return 1; case 'Map':case 'Set':case 'WeakMap':case 'WeakSet':return 2; default:return 0 } } function rT(e) { return e.__v_skip || !Object.isExtensible(e) ? 0 : nT(Ck(e)) } function rr(e) { return uo(e) ? e : op(e, !1, Gk, Zk, xb) } function ip(e) { return op(e, !1, Kk, Qk, Sb) } function Ra(e) { return op(e, !0, Xk, eT, _b) } function op(e, t, n, i, s) {
  if (!_t(e) || e.__v_raw && !(t && e.__v_isReactive))
    return e; const l = rT(e); if (l === 0)
    return e; const u = s.get(e); if (u)
    return u; const f = new Proxy(e, l === 2 ? i : n); return s.set(e, f), f
} function Rs(e) { return uo(e) ? Rs(e.__v_raw) : !!(e && e.__v_isReactive) } function uo(e) { return !!(e && e.__v_isReadonly) } function dr(e) { return !!(e && e.__v_isShallow) } function sp(e) { return e ? !!e.__v_raw : !1 } function mt(e) { const t = e && e.__v_raw; return t ? mt(t) : e } function lp(e) { return !wt(e, '__v_skip') && Object.isExtensible(e) && rb(e, '__v_skip', !0), e } const hn = e => _t(e) ? rr(e) : e; const uu = e => _t(e) ? Ra(e) : e; function kt(e) { return e ? e.__v_isRef === !0 : !1 } function Ue(e) { return kb(e, !1) } function rn(e) { return kb(e, !0) } function kb(e, t) { return kt(e) ? e : new iT(e, t) } class iT {constructor(t, n) { this.dep = new Gu(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : mt(t), this._value = n ? t : hn(t), this.__v_isShallow = n } get value() { return this.dep.track(), this._value } set value(t) { const n = this._rawValue; const i = this.__v_isShallow || dr(t) || uo(t); t = i ? t : mt(t), Vn(t, n) && (this._rawValue = t, this._value = i ? t : hn(t), this.dep.trigger()) }} function j(e) { return kt(e) ? e.value : e } function Gt(e) { return Ge(e) ? e() : j(e) } const oT = { get: (e, t, n) => t === '__v_raw' ? e : j(Reflect.get(e, t, n)), set: (e, t, n, i) => { const s = e[t]; return kt(s) && !kt(n) ? (s.value = n, !0) : Reflect.set(e, t, n, i) } }; function Tb(e) { return Rs(e) ? e : new Proxy(e, oT) } class sT {constructor(t) { this.__v_isRef = !0, this._value = void 0; const n = this.dep = new Gu(); const { get: i, set: s } = t(n.track.bind(n), n.trigger.bind(n)); this._get = i, this._set = s } get value() { return this._value = this._get() } set value(t) { this._set(t) }} function Cb(e) { return new sT(e) } function lT(e) { const t = Fe(e) ? Array.from({ length: e.length }) : {}; for (const n in e)t[n] = Eb(e, n); return t } class aT {constructor(t, n, i) { this._object = t, this._key = n, this._defaultValue = i, this.__v_isRef = !0, this._value = void 0 } get value() { const t = this._object[this._key]; return this._value = t === void 0 ? this._defaultValue : t } set value(t) { this._object[this._key] = t } get dep() { return Bk(mt(this._object), this._key) }} class cT {constructor(t) { this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0 } get value() { return this._value = this._getter() }} function ol(e, t, n) { return kt(e) ? e : Ge(e) ? new cT(e) : _t(e) && arguments.length > 1 ? Eb(e, t, n) : Ue(e) } function Eb(e, t, n) { const i = e[t]; return kt(i) ? i : new aT(e, t, n) } class uT {
  constructor(t, n, i) { this.fn = t, this.setter = n, this._value = void 0, this.dep = new Gu(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = ua - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = i }notify() {
    if (this.flags |= 16, !(this.flags & 8) && Tt !== this)
      return db(this, !0), !0
  }

  get value() { const t = this.dep.track(); return gb(this), t && (t.version = this.dep.version), this._value } set value(t) { this.setter && this.setter(t) }
} function fT(e, t, n = !1) { let i, s; return Ge(e) ? i = e : (i = e.get, s = e.set), new uT(i, s, n) } const Nc = {}; const fu = new WeakMap(); let zo; function dT(e, t = !1, n = zo) { if (n) { let i = fu.get(n); i || fu.set(n, i = []), i.push(e) } } function hT(e, t, n = vt) {
  const { immediate: i, deep: s, once: l, scheduler: u, augmentJob: f, call: h } = n; const p = k => s ? k : dr(k) || s === !1 || s === 0 ? xi(k, 1) : xi(k); let g; let v; let y; let w; let L = !1; let $ = !1; if (kt(e)
    ? (v = () => e.value, L = dr(e))
    : Rs(e)
      ? (v = () => p(e), L = !0)
      : Fe(e)
        ? ($ = !0, L = e.some(k => Rs(k) || dr(k)), v = () => e.map((k) => {
            if (kt(k))
              return k.value; if (Rs(k))
              return p(k); if (Ge(k))
              return h ? h(k, 2) : k()
          }))
        : Ge(e)
          ? t
            ? v = h ? () => h(e, 2) : e
            : v = () => {
              if (y) {
                ki(); try { y() }
                finally { Ti() }
              } const k = zo; zo = g; try { return h ? h(e, 3, [w]) : e(w) }
              finally { zo = k }
            }
          : v = Yr, t && s) { const k = v; const z = s === !0 ? 1 / 0 : s; v = () => xi(k(), z) } const A = cb(); const E = () => { g.stop(), A && A.active && Zh(A.effects, g) }; if (l && t) { const k = t; t = (...z) => { k(...z), E() } } let M = $ ? Array.from({ length: e.length }).fill(Nc) : Nc; const O = (k) => {
    if (!(!(g.flags & 1) || !g.dirty && !k)) {
      if (t) {
        const z = g.run(); if (s || L || ($ ? z.some((D, te) => Vn(D, M[te])) : Vn(z, M))) {
          y && y(); const D = zo; zo = g; try { const te = [z, M === Nc ? void 0 : $ && M[0] === Nc ? [] : M, w]; M = z, h ? h(t, 3, te) : t(...te) }
          finally { zo = D }
        }
      }
      else {
        g.run()
      }
    }
  }; return f && f(O), g = new ub(v), g.scheduler = u ? () => u(O, !1) : O, w = k => dT(k, !1, g), y = g.onStop = () => {
    const k = fu.get(g); if (k) {
      if (h) {
        h(k, 4)
      }
      else {
        for (const z of k)z()
      }fu.delete(g)
    }
  }, t ? i ? O(!0) : M = g.run() : u ? u(O.bind(null, !0), !0) : g.run(), E.pause = g.pause.bind(g), E.resume = g.resume.bind(g), E.stop = E, E
} function xi(e, t = 1 / 0, n) {
  if (t <= 0 || !_t(e) || e.__v_skip || (n = n || new Set(), n.has(e)))
    return e; if (n.add(e), t--, kt(e)) {
    xi(e.value, t, n)
  }
  else if (Fe(e)) {
    for (let i = 0; i < e.length; i++)xi(e[i], t, n)
  }
  else if (Wu(e) || Os(e)) {
    e.forEach((i) => { xi(i, t, n) })
  }
  else if (nb(e)) { for (const i in e)xi(e[i], t, n); for (const i of Object.getOwnPropertySymbols(e))Object.prototype.propertyIsEnumerable.call(e, i) && xi(e[i], t, n) } return e
}/**
  * @vue/runtime-core v3.5.16
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  */function za(e, t, n, i) {
  try { return i ? e(...i) : e() }
  catch (s) { Da(s, t, n) }
} function Ir(e, t, n, i) { if (Ge(e)) { const s = za(e, t, n, i); return s && eb(s) && s.catch((l) => { Da(l, t, n) }), s } if (Fe(e)) { const s = []; for (let l = 0; l < e.length; l++)s.push(Ir(e[l], t, n, i)); return s } } function Da(e, t, n, i = !0) {
  const s = t ? t.vnode : null; const { errorHandler: l, throwUnhandledErrorInProduction: u } = t && t.appContext.config || vt; if (t) {
    let f = t.parent; const h = t.proxy; const p = `https://vuejs.org/error-reference/#runtime-${n}`; for (;f;) {
      const g = f.ec; if (g) {
        for (let v = 0; v < g.length; v++) {
          if (g[v](e, h, p) === !1)
            return
        }
      }f = f.parent
    } if (l) { ki(), za(l, null, 10, [e, h, p]), Ti(); return }
  }pT(e, n, s, i, u)
} function pT(e, t, n, i = !0, s = !1) {
  if (s)
    throw e; console.error(e)
} const In = []; let Gr = -1; const zs = []; let Ki = null; let Cs = 0; const Ab = Promise.resolve(); let du = null; function Et(e) { const t = du || Ab; return e ? t.then(this ? e.bind(this) : e) : t } function gT(e) { let t = Gr + 1; let n = In.length; for (;t < n;) { const i = t + n >>> 1; const s = In[i]; const l = da(s); l < e || l === e && s.flags & 2 ? t = i + 1 : n = i } return t } function ap(e) { if (!(e.flags & 1)) { const t = da(e); const n = In[In.length - 1]; !n || !(e.flags & 2) && t >= da(n) ? In.push(e) : In.splice(gT(t), 0, e), e.flags |= 1, Lb() } } function Lb() { du || (du = Ab.then(Mb)) } function th(e) { Fe(e) ? zs.push(...e) : Ki && e.id === -1 ? Ki.splice(Cs + 1, 0, e) : e.flags & 1 || (zs.push(e), e.flags |= 1), Lb() } function nv(e, t, n = Gr + 1) {
  for (;n < In.length; n++) {
    const i = In[n]; if (i && i.flags & 2) {
      if (e && i.id !== e.uid)
        continue; In.splice(n, 1), n--, i.flags & 4 && (i.flags &= -2), i(), i.flags & 4 || (i.flags &= -2)
    }
  }
} function $b(e) { if (zs.length) { const t = [...new Set(zs)].sort((n, i) => da(n) - da(i)); if (zs.length = 0, Ki) { Ki.push(...t); return } for (Ki = t, Cs = 0; Cs < Ki.length; Cs++) { const n = Ki[Cs]; n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2 }Ki = null, Cs = 0 } } const da = e => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id; function Mb(e) {
  try { for (Gr = 0; Gr < In.length; Gr++) { const t = In[Gr]; t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), za(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2)) } }
  finally { for (;Gr < In.length; Gr++) { const t = In[Gr]; t && (t.flags &= -2) }Gr = -1, In.length = 0, $b(), du = null, (In.length || zs.length) && Mb() }
} let tn = null; let Ku = null; function hu(e) { const t = tn; return tn = e, Ku = e && e.type.__scopeId || null, t } function Nb(e) { Ku = e } function Ib() { Ku = null } const Pb = e => it; function it(e, t = tn, n) {
  if (!t || e._n)
    return e; const i = (...s) => {
    i._d && vu(-1); const l = hu(t); let u; try { u = e(...s) }
    finally { hu(l), i._d && vu(1) } return u
  }; return i._n = !0, i._c = !0, i._d = !0, i
} function ct(e, t) {
  if (tn === null)
    return e; const n = rf(tn); const i = e.dirs || (e.dirs = []); for (let s = 0; s < t.length; s++) { let [l, u, f, h = vt] = t[s]; l && (Ge(l) && (l = { mounted: l, updated: l }), l.deep && xi(u), i.push({ dir: l, instance: n, value: u, oldValue: void 0, arg: f, modifiers: h })) } return e
} function No(e, t, n, i) { const s = e.dirs; const l = t && t.dirs; for (let u = 0; u < s.length; u++) { const f = s[u]; l && (f.oldValue = l[u].value); const h = f.dir[i]; h && (ki(), Ir(h, n, 8, [e.el, f, e, t]), Ti()) } } const mT = Symbol('_vte'); const Ob = e => e.__isTeleport; const Ji = Symbol('_leaveCb'); const Ic = Symbol('_enterCb'); function vT() { const e = { isMounted: !1, isLeaving: !1, isUnmounting: !1, leavingVNodes: new Map() }; return bo(() => { e.isMounted = !0 }), Fa(() => { e.isUnmounting = !0 }), e } const ar = [Function, Array]; const Rb = { mode: String, appear: Boolean, persisted: Boolean, onBeforeEnter: ar, onEnter: ar, onAfterEnter: ar, onEnterCancelled: ar, onBeforeLeave: ar, onLeave: ar, onAfterLeave: ar, onLeaveCancelled: ar, onBeforeAppear: ar, onAppear: ar, onAfterAppear: ar, onAppearCancelled: ar }; function zb(e) { const t = e.subTree; return t.component ? zb(t.component) : t } const yT = { name: 'BaseTransition', props: Rb, setup(e, { slots: t }) {
  const n = Ko(); const i = vT(); return () => {
    const s = t.default && Hb(t.default(), !0); if (!s || !s.length)
      return; const l = Db(s); const u = mt(e); const { mode: f } = u; if (i.isLeaving)
      return yd(l); const h = rv(l); if (!h)
      return yd(l); let p = nh(h, u, i, n, v => p = v); h.type !== ln && ha(h, p); let g = n.subTree && rv(n.subTree); if (g && g.type !== ln && !Kr(h, g) && zb(n).type !== ln) {
      const v = nh(g, u, i, n); if (ha(g, v), f === 'out-in' && h.type !== ln)
        return i.isLeaving = !0, v.afterLeave = () => { i.isLeaving = !1, n.job.flags & 8 || n.update(), delete v.afterLeave, g = void 0 }, yd(l); f === 'in-out' && h.type !== ln ? v.delayLeave = (y, w, L) => { const $ = Fb(i, g); $[String(g.key)] = g, y[Ji] = () => { w(), y[Ji] = void 0, delete p.delayedLeave, g = void 0 }, p.delayedLeave = () => { L(), delete p.delayedLeave, g = void 0 } } : g = void 0
    }
    else {
      g && (g = void 0)
    } return l
  }
} }; function Db(e) {
  let t = e[0]; if (e.length > 1) {
    for (const n of e) {
      if (n.type !== ln) { t = n; break }
    }
  } return t
} const bT = yT; function Fb(e, t) { const { leavingVNodes: n } = e; let i = n.get(t.type); return i || (i = Object.create(null), n.set(t.type, i)), i } function nh(e, t, n, i, s) {
  const { appear: l, mode: u, persisted: f = !1, onBeforeEnter: h, onEnter: p, onAfterEnter: g, onEnterCancelled: v, onBeforeLeave: y, onLeave: w, onAfterLeave: L, onLeaveCancelled: $, onBeforeAppear: A, onAppear: E, onAfterAppear: M, onAppearCancelled: O } = t; const k = String(e.key); const z = Fb(n, e); const D = (W, q) => { W && Ir(W, i, 9, q) }; const te = (W, q) => { const K = q[1]; D(W, q), Fe(W) ? W.every(C => C.length <= 1) && K() : W.length <= 1 && K() }; const ee = { mode: u, persisted: f, beforeEnter(W) {
    let q = h; if (!n.isMounted) {
      if (l)
        q = A || h; else return
    } W[Ji] && W[Ji](!0); const K = z[k]; K && Kr(e, K) && K.el[Ji] && K.el[Ji](), D(q, [W])
  }, enter(W) {
    let q = p; let K = g; let C = v; if (!n.isMounted) {
      if (l)
        q = E || p, K = M || g, C = O || v; else return
    } let P = !1; const I = W[Ic] = (S) => { P || (P = !0, S ? D(C, [W]) : D(K, [W]), ee.delayedLeave && ee.delayedLeave(), W[Ic] = void 0) }; q ? te(q, [W, I]) : I()
  }, leave(W, q) {
    const K = String(e.key); if (W[Ic] && W[Ic](!0), n.isUnmounting)
      return q(); D(y, [W]); let C = !1; const P = W[Ji] = (I) => { C || (C = !0, q(), I ? D($, [W]) : D(L, [W]), W[Ji] = void 0, z[K] === e && delete z[K]) }; z[K] = e, w ? te(w, [W, P]) : P()
  }, clone(W) { const q = nh(W, t, n, i, s); return s && s(q), q } }; return ee
} function yd(e) {
  if (Ju(e))
    return e = fo(e), e.children = null, e
} function rv(e) {
  if (!Ju(e))
    return Ob(e.type) && e.children ? Db(e.children) : e; if (e.component)
    return e.component.subTree; const { shapeFlag: t, children: n } = e; if (n) {
    if (t & 16)
      return n[0]; if (t & 32 && Ge(n.default))
      return n.default()
  }
} function ha(e, t) { e.shapeFlag & 6 && e.component ? (e.transition = t, ha(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t } function Hb(e, t = !1, n) {
  let i = []; let s = 0; for (let l = 0; l < e.length; l++) { const u = e[l]; const f = n == null ? u.key : String(n) + String(u.key != null ? u.key : l); u.type === nt ? (u.patchFlag & 128 && s++, i = i.concat(Hb(u.children, t, f))) : (t || u.type !== ln) && i.push(f != null ? fo(u, { key: f }) : u) } if (s > 1) {
    for (let l = 0; l < i.length; l++)i[l].patchFlag = -2
  } return i
}/*! #__NO_SIDE_EFFECTS__ */ function at(e, t) { return Ge(e) ? on({ name: e.name }, t, { setup: e }) : e } function Bb(e) { e.ids = [`${e.ids[0] + e.ids[2]++}-`, 0, 0] } function pu(e, t, n, i, s = !1) {
  if (Fe(e)) { e.forEach((L, $) => pu(L, t && (Fe(t) ? t[$] : t), n, i, s)); return } if (Ds(i) && !s) { i.shapeFlag & 512 && i.type.__asyncResolved && i.component.subTree.component && pu(e, t, n, i.component.subTree); return } const l = i.shapeFlag & 4 ? rf(i.component) : i.el; const u = s ? null : l; const { i: f, r: h } = e; const p = t && t.r; const g = f.refs === vt ? f.refs = {} : f.refs; const v = f.setupState; const y = mt(v); const w = v === vt ? () => !1 : L => wt(y, L); if (p != null && p !== h && (Dt(p) ? (g[p] = null, w(p) && (v[p] = null)) : kt(p) && (p.value = null)), Ge(h)) {
    za(h, f, 12, [u, g])
  }
  else {
    const L = Dt(h); const $ = kt(h); if (L || $) {
      const A = () => {
        if (e.f) { const E = L ? w(h) ? v[h] : g[h] : h.value; s ? Fe(E) && Zh(E, l) : Fe(E) ? E.includes(l) || E.push(l) : L ? (g[h] = [l], w(h) && (v[h] = g[h])) : (h.value = [l], e.k && (g[e.k] = h.value)) }
        else {
          L ? (g[h] = u, w(h) && (v[h] = u)) : $ && (h.value = u, e.k && (g[e.k] = u))
        }
      }; u ? (A.id = -1, Qn(A, n)) : A()
    }
  }
}Uu().requestIdleCallback; Uu().cancelIdleCallback; const Ds = e => !!e.type.__asyncLoader; const Ju = e => e.type.__isKeepAlive; function wT(e, t) { Wb(e, 'a', t) } function xT(e, t) { Wb(e, 'da', t) } function Wb(e, t, n = an) {
  const i = e.__wdc || (e.__wdc = () => {
    let s = n; for (;s;) {
      if (s.isDeactivated)
        return; s = s.parent
    } return e()
  }); if (Yu(t, i, n), n) { let s = n.parent; for (;s && s.parent;)Ju(s.parent.vnode) && ST(i, t, n, s), s = s.parent }
} function ST(e, t, n, i) { const s = Yu(t, e, i, !0); Zu(() => { Zh(i[t], s) }, n) } function Yu(e, t, n = an, i = !1) { if (n) { const s = n[e] || (n[e] = []); const l = t.__weh || (t.__weh = (...u) => { ki(); const f = Ha(n); const h = Ir(t, n, e, u); return f(), Ti(), h }); return i ? s.unshift(l) : s.push(l), l } } const Li = e => (t, n = an) => { (!ma || e === 'sp') && Yu(e, (...i) => t(...i), n) }; const _T = Li('bm'); const bo = Li('m'); const kT = Li('bu'); const TT = Li('u'); const Fa = Li('bum'); const Zu = Li('um'); const CT = Li('sp'); const ET = Li('rtg'); const AT = Li('rtc'); function LT(e, t = an) { Yu('ec', e, t) } const cp = 'components'; const $T = 'directives'; function Go(e, t) { return up(cp, e, !0, t) || e } const jb = Symbol.for('v-ndc'); function rh(e) { return Dt(e) ? up(cp, e, !1) || e : e || jb } function Dr(e) { return up($T, e) } function up(e, t, n = !0, i = !1) {
  const s = tn || an; if (s) {
    const l = s.type; if (e === cp) {
      const f = SC(l, !1); if (f && (f === t || f === ir(t) || f === qu(ir(t))))
        return l
    } const u = iv(s[e] || l[e], t) || iv(s.appContext[e], t); return !u && i ? l : u
  }
} function iv(e, t) { return e && (e[t] || e[ir(t)] || e[qu(ir(t))]) } function hr(e, t, n, i) {
  let s; const l = n; const u = Fe(e); if (u || Dt(e)) { const f = u && Rs(e); let h = !1; let p = !1; f && (h = !dr(e), p = uo(e), e = Xu(e)), s = Array.from({ length: e.length }); for (let g = 0, v = e.length; g < v; g++)s[g] = t(h ? p ? uu(hn(e[g])) : hn(e[g]) : e[g], g, void 0, l) }
  else if (typeof e == 'number') { s = new Array(e); for (let f = 0; f < e; f++)s[f] = t(f + 1, f, void 0, l) }
  else if (_t(e)) {
    if (e[Symbol.iterator]) {
      s = Array.from(e, (f, h) => t(f, h, void 0, l))
    }
    else { const f = Object.keys(e); s = Array.from({ length: f.length }); for (let h = 0, p = f.length; h < p; h++) { const g = f[h]; s[h] = t(e[g], g, h, l) } }
  }
  else {
    s = []
  } return s
} function MT(e, t) {
  for (let n = 0; n < t.length; n++) {
    const i = t[n]; if (Fe(i)) {
      for (let s = 0; s < i.length; s++)e[i[s].name] = i[s].fn
    }
    else {
      i && (e[i.name] = i.key ? (...s) => { const l = i.fn(...s); return l && (l.key = i.key), l } : i.fn)
    }
  } return e
} function xn(e, t, n = {}, i, s) {
  if (tn.ce || tn.parent && Ds(tn.parent) && tn.parent.ce)
    return t !== 'default' && (n.name = t), se(), Ye(nt, null, [Ie('slot', n, i && i())], 64); const l = e[t]; l && l._c && (l._d = !1), se(); const u = l && qb(l(n)); const f = n.key || u && u.key; const h = Ye(nt, { key: (f && !Nr(f) ? f : `_${t}`) + (!u && i ? '_fb' : '') }, u || (i ? i() : []), u && e._ === 1 ? 64 : -2); return h.scopeId && (h.slotScopeIds = [`${h.scopeId}-s`]), l && l._c && (l._d = !0), h
} function qb(e) { return e.some(t => Js(t) ? !(t.type === ln || t.type === nt && !qb(t.children)) : !0) ? e : null } function NT(e, t) { const n = {}; for (const i in e)n[Xc(i)] = e[i]; return n } const ih = e => e ? gw(e) ? rf(e) : ih(e.parent) : null; const ea = on(Object.create(null), { $: e => e, $el: e => e.vnode.el, $data: e => e.data, $props: e => e.props, $attrs: e => e.attrs, $slots: e => e.slots, $refs: e => e.refs, $parent: e => ih(e.parent), $root: e => ih(e.root), $host: e => e.ce, $emit: e => e.emit, $options: e => Gb(e), $forceUpdate: e => e.f || (e.f = () => { ap(e.update) }), $nextTick: e => e.n || (e.n = Et.bind(e.proxy)), $watch: e => nC.bind(e) }); const bd = (e, t) => e !== vt && !e.__isScriptSetup && wt(e, t); const IT = { get({ _: e }, t) {
  if (t === '__v_skip')
    return !0; const { ctx: n, setupState: i, data: s, props: l, accessCache: u, type: f, appContext: h } = e; let p; if (t[0] !== '$') {
    const w = u[t]; if (w !== void 0) {
      switch (w) { case 1:return i[t]; case 2:return s[t]; case 4:return n[t]; case 3:return l[t] }
    }
    else {
      if (bd(i, t))
        return u[t] = 1, i[t]; if (s !== vt && wt(s, t))
        return u[t] = 2, s[t]; if ((p = e.propsOptions[0]) && wt(p, t))
        return u[t] = 3, l[t]; if (n !== vt && wt(n, t))
        return u[t] = 4, n[t]; oh && (u[t] = 0)
    }
  } const g = ea[t]; let v, y; if (g)
    return t === '$attrs' && bn(e.attrs, 'get', ''), g(e); if ((v = f.__cssModules) && (v = v[t]))
    return v; if (n !== vt && wt(n, t))
    return u[t] = 4, n[t]; if (y = h.config.globalProperties, wt(y, t))
    return y[t]
}, set({ _: e }, t, n) { const { data: i, setupState: s, ctx: l } = e; return bd(s, t) ? (s[t] = n, !0) : i !== vt && wt(i, t) ? (i[t] = n, !0) : wt(e.props, t) || t[0] === '$' && t.slice(1) in e ? !1 : (l[t] = n, !0) }, has({ _: { data: e, setupState: t, accessCache: n, ctx: i, appContext: s, propsOptions: l } }, u) { let f; return !!n[u] || e !== vt && wt(e, u) || bd(t, u) || (f = l[0]) && wt(f, u) || wt(i, u) || wt(ea, u) || wt(s.config.globalProperties, u) }, defineProperty(e, t, n) { return n.get != null ? e._.accessCache[t] = 0 : wt(n, 'value') && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n) } }; function PT() { return Ub().slots } function OT() { return Ub().attrs } function Ub() { const e = Ko(); return e.setupContext || (e.setupContext = vw(e)) } function gu(e) { return Fe(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e } function pa(e, t) { return !e || !t ? e || t : Fe(e) && Fe(t) ? e.concat(t) : on({}, gu(e), gu(t)) } let oh = !0; function RT(e) {
  const t = Gb(e); const n = e.proxy; const i = e.ctx; oh = !1, t.beforeCreate && ov(t.beforeCreate, e, 'bc'); const { data: s, computed: l, methods: u, watch: f, provide: h, inject: p, created: g, beforeMount: v, mounted: y, beforeUpdate: w, updated: L, activated: $, deactivated: A, beforeDestroy: E, beforeUnmount: M, destroyed: O, unmounted: k, render: z, renderTracked: D, renderTriggered: te, errorCaptured: ee, serverPrefetch: W, expose: q, inheritAttrs: K, components: C, directives: P, filters: I } = t; if (p && zT(p, i, null), u) {
    for (const B in u) { const oe = u[B]; Ge(oe) && (i[B] = oe.bind(n)) }
  } if (s) { const B = s.call(n, n); _t(B) && (e.data = rr(B)) } if (oh = !0, l) {
    for (const B in l) { const oe = l[B]; const ue = Ge(oe) ? oe.bind(n, n) : Ge(oe.get) ? oe.get.bind(n, n) : Yr; const we = !Ge(oe) && Ge(oe.set) ? oe.set.bind(n) : Yr; const Pe = _e({ get: ue, set: we }); Object.defineProperty(i, B, { enumerable: !0, configurable: !0, get: () => Pe.value, set: qe => Pe.value = qe }) }
  } if (f) {
    for (const B in f)Vb(f[B], i, n, B)
  } if (h) { const B = Ge(h) ? h.call(n) : h; Reflect.ownKeys(B).forEach((oe) => { Er(oe, B[oe]) }) }g && ov(g, e, 'c'); function R(B, oe) { Fe(oe) ? oe.forEach(ue => B(ue.bind(n))) : oe && B(oe.bind(n)) } if (R(_T, v), R(bo, y), R(kT, w), R(TT, L), R(wT, $), R(xT, A), R(LT, ee), R(AT, D), R(ET, te), R(Fa, M), R(Zu, k), R(CT, W), Fe(q)) {
    if (q.length) { const B = e.exposed || (e.exposed = {}); q.forEach((oe) => { Object.defineProperty(B, oe, { get: () => n[oe], set: ue => n[oe] = ue }) }) }
    else {
      e.exposed || (e.exposed = {})
    }
  }z && e.render === Yr && (e.render = z), K != null && (e.inheritAttrs = K), C && (e.components = C), P && (e.directives = P), W && Bb(e)
} function zT(e, t, n = Yr) { Fe(e) && (e = sh(e)); for (const i in e) { const s = e[i]; let l; _t(s) ? 'default' in s ? l = wn(s.from || i, s.default, !0) : l = wn(s.from || i) : l = wn(s), kt(l) ? Object.defineProperty(t, i, { enumerable: !0, configurable: !0, get: () => l.value, set: u => l.value = u }) : t[i] = l } } function ov(e, t, n) { Ir(Fe(e) ? e.map(i => i.bind(t.proxy)) : e.bind(t.proxy), t, n) } function Vb(e, t, n, i) {
  const s = i.includes('.') ? sw(n, i) : () => n[i]; if (Dt(e)) { const l = t[e]; Ge(l) && St(s, l) }
  else if (Ge(e)) {
    St(s, e.bind(n))
  }
  else if (_t(e)) {
    if (Fe(e)) {
      e.forEach(l => Vb(l, t, n, i))
    }
    else { const l = Ge(e.handler) ? e.handler.bind(n) : t[e.handler]; Ge(l) && St(s, l, e) }
  }
} function Gb(e) { const t = e.type; const { mixins: n, extends: i } = t; const { mixins: s, optionsCache: l, config: { optionMergeStrategies: u } } = e.appContext; const f = l.get(t); let h; return f ? h = f : !s.length && !n && !i ? h = t : (h = {}, s.length && s.forEach(p => mu(h, p, u, !0)), mu(h, t, u)), _t(t) && l.set(t, h), h } function mu(e, t, n, i = !1) {
  const { mixins: s, extends: l } = t; l && mu(e, l, n, !0), s && s.forEach(u => mu(e, u, n, !0)); for (const u in t) {
    if (!(i && u === 'expose')) { const f = DT[u] || n && n[u]; e[u] = f ? f(e[u], t[u]) : t[u] }
  } return e
} const DT = { data: sv, props: lv, emits: lv, methods: Gl, computed: Gl, beforeCreate: $n, created: $n, beforeMount: $n, mounted: $n, beforeUpdate: $n, updated: $n, beforeDestroy: $n, beforeUnmount: $n, destroyed: $n, unmounted: $n, activated: $n, deactivated: $n, errorCaptured: $n, serverPrefetch: $n, components: Gl, directives: Gl, watch: HT, provide: sv, inject: FT }; function sv(e, t) { return t ? e ? function () { return on(Ge(e) ? e.call(this, this) : e, Ge(t) ? t.call(this, this) : t) } : t : e } function FT(e, t) { return Gl(sh(e), sh(t)) } function sh(e) { if (Fe(e)) { const t = {}; for (let n = 0; n < e.length; n++)t[e[n]] = e[n]; return t } return e } function $n(e, t) { return e ? [...new Set([].concat(e, t))] : t } function Gl(e, t) { return e ? on(Object.create(null), e, t) : t } function lv(e, t) { return e ? Fe(e) && Fe(t) ? [...new Set([...e, ...t])] : on(Object.create(null), gu(e), gu(t ?? {})) : t } function HT(e, t) {
  if (!e)
    return t; if (!t)
    return e; const n = on(Object.create(null), e); for (const i in t)n[i] = $n(e[i], t[i]); return n
} function Xb() { return { app: null, config: { isNativeTag: kk, performance: !1, globalProperties: {}, optionMergeStrategies: {}, errorHandler: void 0, warnHandler: void 0, compilerOptions: {} }, mixins: [], components: {}, directives: {}, provides: Object.create(null), optionsCache: new WeakMap(), propsCache: new WeakMap(), emitsCache: new WeakMap() } } let BT = 0; function WT(e, t) {
  return function (i, s = null) {
    Ge(i) || (i = on({}, i)), s != null && !_t(s) && (s = null); const l = Xb(); const u = new WeakSet(); const f = []; let h = !1; const p = l.app = { _uid: BT++, _component: i, _props: s, _container: null, _context: l, _instance: null, version: kC, get config() { return l.config }, set config(g) {}, use(g, ...v) { return u.has(g) || (g && Ge(g.install) ? (u.add(g), g.install(p, ...v)) : Ge(g) && (u.add(g), g(p, ...v))), p }, mixin(g) { return l.mixins.includes(g) || l.mixins.push(g), p }, component(g, v) { return v ? (l.components[g] = v, p) : l.components[g] }, directive(g, v) { return v ? (l.directives[g] = v, p) : l.directives[g] }, mount(g, v, y) { if (!h) { const w = p._ceVNode || Ie(i, s); return w.appContext = l, y === !0 ? y = 'svg' : y === !1 && (y = void 0), e(w, g, y), h = !0, p._container = g, g.__vue_app__ = p, rf(w.component) } }, onUnmount(g) { f.push(g) }, unmount() { h && (Ir(f, p._instance, 16), e(null, p._container), delete p._container.__vue_app__) }, provide(g, v) { return l.provides[g] = v, p }, runWithContext(g) {
      const v = qo; qo = p; try { return g() }
      finally { qo = v }
    } }; return p
  }
} let qo = null; function Er(e, t) { if (an) { let n = an.provides; const i = an.parent && an.parent.provides; i === n && (n = an.provides = Object.create(i)), n[e] = t } } function wn(e, t, n = !1) {
  const i = an || tn; if (i || qo) {
    const s = qo ? qo._context.provides : i ? i.parent == null || i.ce ? i.vnode.appContext && i.vnode.appContext.provides : i.parent.provides : void 0; if (s && e in s)
      return s[e]; if (arguments.length > 1)
      return n && Ge(t) ? t.call(i && i.proxy) : t
  }
} function Kb() { return !!(an || tn || qo) } const Jb = {}; const Yb = () => Object.create(Jb); const Zb = e => Object.getPrototypeOf(e) === Jb; function jT(e, t, n, i = !1) { const s = {}; const l = Yb(); e.propsDefaults = Object.create(null), Qb(e, t, s, l); for (const u in e.propsOptions[0])u in s || (s[u] = void 0); n ? e.props = i ? s : ip(s) : e.type.props ? e.props = s : e.props = l, e.attrs = l } function qT(e, t, n, i) {
  const { props: s, attrs: l, vnode: { patchFlag: u } } = e; const f = mt(s); const [h] = e.propsOptions; let p = !1; if ((i || u > 0) && !(u & 16)) {
    if (u & 8) {
      const g = e.vnode.dynamicProps; for (let v = 0; v < g.length; v++) {
        const y = g[v]; if (tf(e.emitsOptions, y))
          continue; const w = t[y]; if (h) {
          if (wt(l, y)) {
            w !== l[y] && (l[y] = w, p = !0)
          }
          else { const L = ir(y); s[L] = lh(h, f, L, w, e, !1) }
        }
        else {
          w !== l[y] && (l[y] = w, p = !0)
        }
      }
    }
  }
  else {
    Qb(e, t, s, l) && (p = !0); let g; for (const v in f)(!t || !wt(t, v) && ((g = Ai(v)) === v || !wt(t, g))) && (h ? n && (n[v] !== void 0 || n[g] !== void 0) && (s[v] = lh(h, f, v, void 0, e, !0)) : delete s[v]); if (l !== f) {
      for (const v in l)(!t || !wt(t, v)) && (delete l[v], p = !0)
    }
  }p && wi(e.attrs, 'set', '')
} function Qb(e, t, n, i) {
  const [s, l] = e.propsOptions; let u = !1; let f; if (t) {
    for (const h in t) {
      if (Yl(h))
        continue; const p = t[h]; let g; s && wt(s, g = ir(h)) ? !l || !l.includes(g) ? n[g] = p : (f || (f = {}))[g] = p : tf(e.emitsOptions, h) || (!(h in i) || p !== i[h]) && (i[h] = p, u = !0)
    }
  } if (l) { const h = mt(n); const p = f || vt; for (let g = 0; g < l.length; g++) { const v = l[g]; n[v] = lh(s, h, v, p[v], e, !wt(p, v)) } } return u
} function lh(e, t, n, i, s, l) {
  const u = e[n]; if (u != null) {
    const f = wt(u, 'default'); if (f && i === void 0) {
      const h = u.default; if (u.type !== Function && !u.skipFactory && Ge(h)) {
        const { propsDefaults: p } = s; if (n in p) {
          i = p[n]
        }
        else { const g = Ha(s); i = p[n] = h.call(null, t), g() }
      }
      else {
        i = h
      }s.ce && s.ce._setProp(n, i)
    }u[0] && (l && !f ? i = !1 : u[1] && (i === '' || i === Ai(n)) && (i = !0))
  } return i
} const UT = new WeakMap(); function ew(e, t, n = !1) {
  const i = n ? UT : t.propsCache; const s = i.get(e); if (s)
    return s; const l = e.props; const u = {}; const f = []; let h = !1; if (!Ge(e)) { const g = (v) => { h = !0; const [y, w] = ew(v, t, !0); on(u, y), w && f.push(...w) }; !n && t.mixins.length && t.mixins.forEach(g), e.extends && g(e.extends), e.mixins && e.mixins.forEach(g) } if (!l && !h)
    return _t(e) && i.set(e, Ps), Ps; if (Fe(l)) {
    for (let g = 0; g < l.length; g++) { const v = ir(l[g]); av(v) && (u[v] = vt) }
  }
  else if (l) {
    for (const g in l) {
      const v = ir(g); if (av(v)) {
        const y = l[g]; const w = u[v] = Fe(y) || Ge(y) ? { type: y } : on({}, y); const L = w.type; let $ = !1; let A = !0; if (Fe(L)) {
          for (let E = 0; E < L.length; ++E) {
            const M = L[E]; const O = Ge(M) && M.name; if (O === 'Boolean') { $ = !0; break }
            else {
              O === 'String' && (A = !1)
            }
          }
        }
        else {
          $ = Ge(L) && L.name === 'Boolean'
        }w[0] = $, w[1] = A, ($ || wt(w, 'default')) && f.push(v)
      }
    }
  } const p = [u, f]; return _t(e) && i.set(e, p), p
} function av(e) { return e[0] !== '$' && !Yl(e) } const fp = e => e[0] === '_' || e === '$stable'; const dp = e => Fe(e) ? e.map(Ar) : [Ar(e)]; function VT(e, t, n) {
  if (t._n)
    return t; const i = it((...s) => dp(t(...s)), n); return i._c = !1, i
} function tw(e, t, n) {
  const i = e._ctx; for (const s in e) {
    if (fp(s))
      continue; const l = e[s]; if (Ge(l)) {
      t[s] = VT(s, l, i)
    }
    else if (l != null) { const u = dp(l); t[s] = () => u }
  }
} function nw(e, t) { const n = dp(t); e.slots.default = () => n } function rw(e, t, n) { for (const i in t)(n || !fp(i)) && (e[i] = t[i]) } function GT(e, t, n) {
  const i = e.slots = Yb(); if (e.vnode.shapeFlag & 32) { const s = t._; s ? (rw(i, t, n), n && rb(i, '_', s, !0)) : tw(t, i) }
  else {
    t && nw(e, t)
  }
} function XT(e, t, n) {
  const { vnode: i, slots: s } = e; let l = !0; let u = vt; if (i.shapeFlag & 32) { const f = t._; f ? n && f === 1 ? l = !1 : rw(s, t, n) : (l = !t.$stable, tw(t, s)), u = t }
  else {
    t && (nw(e, t), u = { default: 1 })
  } if (l) {
    for (const f in s)!fp(f) && u[f] == null && delete s[f]
  }
} const Qn = hC; function KT(e) { return JT(e) } function JT(e, t) {
  const n = Uu(); n.__VUE__ = !0; const { insert: i, remove: s, patchProp: l, createElement: u, createText: f, createComment: h, setText: p, setElementText: g, parentNode: v, nextSibling: y, setScopeId: w = Yr, insertStaticContent: L } = e; const $ = (F, V, Y, fe = null, pe = null, he = null, Ce = void 0, Ee = null, ve = !!V.dynamicChildren) => {
    if (F === V)
      return; F && !Kr(F, V) && (fe = U(F), qe(F, pe, he, !0), F = null), V.patchFlag === -2 && (ve = !1, V.dynamicChildren = null); const { type: be, ref: We, shapeFlag: Me } = V; switch (be) { case nf:A(F, V, Y, fe); break; case ln:E(F, V, Y, fe); break; case xd:F == null && M(V, Y, fe, Ce); break; case nt:C(F, V, Y, fe, pe, he, Ce, Ee, ve); break; default:Me & 1 ? z(F, V, Y, fe, pe, he, Ce, Ee, ve) : Me & 6 ? P(F, V, Y, fe, pe, he, Ce, Ee, ve) : (Me & 64 || Me & 128) && be.process(F, V, Y, fe, pe, he, Ce, Ee, ve, ae) }We != null && pe && pu(We, F && F.ref, he, V || F, !V)
  }; const A = (F, V, Y, fe) => {
    if (F == null) {
      i(V.el = f(V.children), Y, fe)
    }
    else { const pe = V.el = F.el; V.children !== F.children && p(pe, V.children) }
  }; const E = (F, V, Y, fe) => { F == null ? i(V.el = h(V.children || ''), Y, fe) : V.el = F.el }; const M = (F, V, Y, fe) => { [F.el, F.anchor] = L(F.children, V, Y, fe, F.el, F.anchor) }; const O = ({ el: F, anchor: V }, Y, fe) => { let pe; for (;F && F !== V;)pe = y(F), i(F, Y, fe), F = pe; i(V, Y, fe) }; const k = ({ el: F, anchor: V }) => { let Y; for (;F && F !== V;)Y = y(F), s(F), F = Y; s(V) }; const z = (F, V, Y, fe, pe, he, Ce, Ee, ve) => { V.type === 'svg' ? Ce = 'svg' : V.type === 'math' && (Ce = 'mathml'), F == null ? D(V, Y, fe, pe, he, Ce, Ee, ve) : W(F, V, pe, he, Ce, Ee, ve) }; const D = (F, V, Y, fe, pe, he, Ce, Ee) => { let ve, be; const { props: We, shapeFlag: Me, transition: De, dirs: Ve } = F; if (ve = F.el = u(F.type, he, We && We.is, We), Me & 8 ? g(ve, F.children) : Me & 16 && ee(F.children, ve, null, fe, pe, wd(F, he), Ce, Ee), Ve && No(F, null, fe, 'created'), te(ve, F, F.scopeId, Ce, fe), We) { for (const st in We)st !== 'value' && !Yl(st) && l(ve, st, null, We[st], he, fe); 'value' in We && l(ve, 'value', null, We.value, he), (be = We.onVnodeBeforeMount) && Vr(be, fe, F) }Ve && No(F, null, fe, 'beforeMount'); const rt = YT(pe, De); rt && De.beforeEnter(ve), i(ve, V, Y), ((be = We && We.onVnodeMounted) || rt || Ve) && Qn(() => { be && Vr(be, fe, F), rt && De.enter(ve), Ve && No(F, null, fe, 'mounted') }, pe) }; const te = (F, V, Y, fe, pe) => {
    if (Y && w(F, Y), fe) {
      for (let he = 0; he < fe.length; he++)w(F, fe[he])
    } if (pe) { const he = pe.subTree; if (V === he || cw(he.type) && (he.ssContent === V || he.ssFallback === V)) { const Ce = pe.vnode; te(F, Ce, Ce.scopeId, Ce.slotScopeIds, pe.parent) } }
  }; const ee = (F, V, Y, fe, pe, he, Ce, Ee, ve = 0) => { for (let be = ve; be < F.length; be++) { const We = F[be] = Ee ? Yi(F[be]) : Ar(F[be]); $(null, We, V, Y, fe, pe, he, Ce, Ee) } }; const W = (F, V, Y, fe, pe, he, Ce) => {
    const Ee = V.el = F.el; let { patchFlag: ve, dynamicChildren: be, dirs: We } = V; ve |= F.patchFlag & 16; const Me = F.props || vt; const De = V.props || vt; let Ve; if (Y && Io(Y, !1), (Ve = De.onVnodeBeforeUpdate) && Vr(Ve, Y, V, F), We && No(V, F, Y, 'beforeUpdate'), Y && Io(Y, !0), (Me.innerHTML && De.innerHTML == null || Me.textContent && De.textContent == null) && g(Ee, ''), be ? q(F.dynamicChildren, be, Ee, Y, fe, wd(V, pe), he) : Ce || oe(F, V, Ee, null, Y, fe, wd(V, pe), he, !1), ve > 0) {
      if (ve & 16) {
        K(Ee, Me, De, Y, pe)
      }
      else if (ve & 2 && Me.class !== De.class && l(Ee, 'class', null, De.class, pe), ve & 4 && l(Ee, 'style', Me.style, De.style, pe), ve & 8) { const rt = V.dynamicProps; for (let st = 0; st < rt.length; st++) { const ut = rt[st]; const It = Me[ut]; const lt = De[ut]; (lt !== It || ut === 'value') && l(Ee, ut, It, lt, pe, Y) } }ve & 1 && F.children !== V.children && g(Ee, V.children)
    }
    else {
      !Ce && be == null && K(Ee, Me, De, Y, pe)
    } ((Ve = De.onVnodeUpdated) || We) && Qn(() => { Ve && Vr(Ve, Y, V, F), We && No(V, F, Y, 'updated') }, fe)
  }; const q = (F, V, Y, fe, pe, he, Ce) => { for (let Ee = 0; Ee < V.length; Ee++) { const ve = F[Ee]; const be = V[Ee]; const We = ve.el && (ve.type === nt || !Kr(ve, be) || ve.shapeFlag & 198) ? v(ve.el) : Y; $(ve, be, We, null, fe, pe, he, Ce, !0) } }; const K = (F, V, Y, fe, pe) => {
    if (V !== Y) {
      if (V !== vt) {
        for (const he in V)!Yl(he) && !(he in Y) && l(F, he, V[he], null, pe, fe)
      } for (const he in Y) {
        if (Yl(he))
          continue; const Ce = Y[he]; const Ee = V[he]; Ce !== Ee && he !== 'value' && l(F, he, Ee, Ce, pe, fe)
      }'value' in Y && l(F, 'value', V.value, Y.value, pe)
    }
  }; const C = (F, V, Y, fe, pe, he, Ce, Ee, ve) => { const be = V.el = F ? F.el : f(''); const We = V.anchor = F ? F.anchor : f(''); const { patchFlag: Me, dynamicChildren: De, slotScopeIds: Ve } = V; Ve && (Ee = Ee ? Ee.concat(Ve) : Ve), F == null ? (i(be, Y, fe), i(We, Y, fe), ee(V.children || [], Y, We, pe, he, Ce, Ee, ve)) : Me > 0 && Me & 64 && De && F.dynamicChildren ? (q(F.dynamicChildren, De, Y, pe, he, Ce, Ee), (V.key != null || pe && V === pe.subTree) && iw(F, V, !0)) : oe(F, V, Y, We, pe, he, Ce, Ee, ve) }; const P = (F, V, Y, fe, pe, he, Ce, Ee, ve) => { V.slotScopeIds = Ee, F == null ? V.shapeFlag & 512 ? pe.ctx.activate(V, Y, fe, Ce, ve) : I(V, Y, fe, pe, he, Ce, ve) : S(F, V, ve) }; const I = (F, V, Y, fe, pe, he, Ce) => {
    const Ee = F.component = yC(F, fe, pe); if (Ju(F) && (Ee.ctx.renderer = ae), bC(Ee, !1, Ce), Ee.asyncDep) { if (pe && pe.registerDep(Ee, R, Ce), !F.el) { const ve = Ee.subTree = Ie(ln); E(null, ve, V, Y) } }
    else {
      R(Ee, F, V, Y, pe, he, Ce)
    }
  }; const S = (F, V, Y) => {
    const fe = V.component = F.component; if (lC(F, V, Y)) {
      if (fe.asyncDep && !fe.asyncResolved) { B(fe, V, Y) }
      else {
        fe.next = V, fe.update()
      }
    }
    else {
      V.el = F.el, fe.vnode = V
    }
  }; const R = (F, V, Y, fe, pe, he, Ce) => {
    const Ee = () => {
      if (F.isMounted) { let { next: Me, bu: De, u: Ve, parent: rt, vnode: st } = F; { const Bt = ow(F); if (Bt) { Me && (Me.el = st.el, B(F, Me, Ce)), Bt.asyncDep.then(() => { F.isUnmounted || Ee() }); return } } const ut = Me; let It; Io(F, !1), Me ? (Me.el = st.el, B(F, Me, Ce)) : Me = st, De && Kc(De), (It = Me.props && Me.props.onVnodeBeforeUpdate) && Vr(It, rt, Me, st), Io(F, !0); const lt = uv(F); const Xt = F.subTree; F.subTree = lt, $(Xt, lt, v(Xt.el), U(Xt), F, pe, he), Me.el = lt.el, ut === null && pp(F, lt.el), Ve && Qn(Ve, pe), (It = Me.props && Me.props.onVnodeUpdated) && Qn(() => Vr(It, rt, Me, st), pe) }
      else { let Me; const { el: De, props: Ve } = V; const { bm: rt, m: st, parent: ut, root: It, type: lt } = F; const Xt = Ds(V); Io(F, !1), rt && Kc(rt), !Xt && (Me = Ve && Ve.onVnodeBeforeMount) && Vr(Me, ut, V), Io(F, !0); { It.ce && It.ce._injectChildStyle(lt); const Bt = F.subTree = uv(F); $(null, Bt, Y, fe, F, pe, he), V.el = Bt.el } if (st && Qn(st, pe), !Xt && (Me = Ve && Ve.onVnodeMounted)) { const Bt = V; Qn(() => Vr(Me, ut, Bt), pe) }(V.shapeFlag & 256 || ut && Ds(ut.vnode) && ut.vnode.shapeFlag & 256) && F.a && Qn(F.a, pe), F.isMounted = !0, V = Y = fe = null }
    }; F.scope.on(); const ve = F.effect = new ub(Ee); F.scope.off(); const be = F.update = ve.run.bind(ve); const We = F.job = ve.runIfDirty.bind(ve); We.i = F, We.id = F.uid, ve.scheduler = () => ap(We), Io(F, !0), be()
  }; const B = (F, V, Y) => { V.component = F; const fe = F.vnode.props; F.vnode = V, F.next = null, qT(F, V.props, fe, Y), XT(F, V.children, Y), ki(), nv(F), Ti() }; const oe = (F, V, Y, fe, pe, he, Ce, Ee, ve = !1) => {
    const be = F && F.children; const We = F ? F.shapeFlag : 0; const Me = V.children; const { patchFlag: De, shapeFlag: Ve } = V; if (De > 0) {
      if (De & 128) { we(be, Me, Y, fe, pe, he, Ce, Ee, ve); return }
      else if (De & 256) { ue(be, Me, Y, fe, pe, he, Ce, Ee, ve); return }
    }Ve & 8 ? (We & 16 && ie(be, pe, he), Me !== be && g(Y, Me)) : We & 16 ? Ve & 16 ? we(be, Me, Y, fe, pe, he, Ce, Ee, ve) : ie(be, pe, he, !0) : (We & 8 && g(Y, ''), Ve & 16 && ee(Me, Y, fe, pe, he, Ce, Ee, ve))
  }; const ue = (F, V, Y, fe, pe, he, Ce, Ee, ve) => { F = F || Ps, V = V || Ps; const be = F.length; const We = V.length; const Me = Math.min(be, We); let De; for (De = 0; De < Me; De++) { const Ve = V[De] = ve ? Yi(V[De]) : Ar(V[De]); $(F[De], Ve, Y, null, pe, he, Ce, Ee, ve) }be > We ? ie(F, pe, he, !0, !1, Me) : ee(V, Y, fe, pe, he, Ce, Ee, ve, Me) }; const we = (F, V, Y, fe, pe, he, Ce, Ee, ve) => {
    let be = 0; const We = V.length; let Me = F.length - 1; let De = We - 1; for (;be <= Me && be <= De;) {
      const Ve = F[be]; const rt = V[be] = ve ? Yi(V[be]) : Ar(V[be]); if (Kr(Ve, rt))
        $(Ve, rt, Y, null, pe, he, Ce, Ee, ve); else break; be++
    } for (;be <= Me && be <= De;) {
      const Ve = F[Me]; const rt = V[De] = ve ? Yi(V[De]) : Ar(V[De]); if (Kr(Ve, rt))
        $(Ve, rt, Y, null, pe, he, Ce, Ee, ve); else break; Me--, De--
    } if (be > Me) { if (be <= De) { const Ve = De + 1; const rt = Ve < We ? V[Ve].el : fe; for (;be <= De;)$(null, V[be] = ve ? Yi(V[be]) : Ar(V[be]), Y, rt, pe, he, Ce, Ee, ve), be++ } }
    else if (be > De) {
      for (;be <= Me;)qe(F[be], pe, he, !0), be++
    }
    else {
      const Ve = be; const rt = be; const st = new Map(); for (be = rt; be <= De; be++) { const Ft = V[be] = ve ? Yi(V[be]) : Ar(V[be]); Ft.key != null && st.set(Ft.key, be) } let ut; let It = 0; const lt = De - rt + 1; let Xt = !1; let Bt = 0; const Dn = new Array(lt); for (be = 0; be < lt; be++)Dn[be] = 0; for (be = Ve; be <= Me; be++) {
        const Ft = F[be]; if (It >= lt) { qe(Ft, pe, he, !0); continue } let Fn; if (Ft.key != null) {
          Fn = st.get(Ft.key)
        }
        else {
          for (ut = rt; ut <= De; ut++) {
            if (Dn[ut - rt] === 0 && Kr(Ft, V[ut])) { Fn = ut; break }
          }
        }Fn === void 0 ? qe(Ft, pe, he, !0) : (Dn[Fn - rt] = be + 1, Fn >= Bt ? Bt = Fn : Xt = !0, $(Ft, V[Fn], Y, null, pe, he, Ce, Ee, ve), It++)
      } const Hr = Xt ? ZT(Dn) : Ps; for (ut = Hr.length - 1, be = lt - 1; be >= 0; be--) { const Ft = rt + be; const Fn = V[Ft]; const tt = Ft + 1 < We ? V[Ft + 1].el : fe; Dn[be] === 0 ? $(null, Fn, Y, tt, pe, he, Ce, Ee, ve) : Xt && (ut < 0 || be !== Hr[ut] ? Pe(Fn, Y, tt, 2) : ut--) }
    }
  }; const Pe = (F, V, Y, fe, pe = null) => {
    const { el: he, type: Ce, transition: Ee, children: ve, shapeFlag: be } = F; if (be & 6) { Pe(F.component.subTree, V, Y, fe); return } if (be & 128) { F.suspense.move(V, Y, fe); return } if (be & 64) { Ce.move(F, V, Y, ae); return } if (Ce === nt) { i(he, V, Y); for (let Me = 0; Me < ve.length; Me++)Pe(ve[Me], V, Y, fe); i(F.anchor, V, Y); return } if (Ce === xd) { O(F, V, Y); return } if (fe !== 2 && be & 1 && Ee) {
      if (fe === 0) {
        Ee.beforeEnter(he), i(he, V, Y), Qn(() => Ee.enter(he), pe)
      }
      else { const { leave: Me, delayLeave: De, afterLeave: Ve } = Ee; const rt = () => { F.ctx.isUnmounted ? s(he) : i(he, V, Y) }; const st = () => { Me(he, () => { rt(), Ve && Ve() }) }; De ? De(he, rt, st) : st() }
    }
    else {
      i(he, V, Y)
    }
  }; const qe = (F, V, Y, fe = !1, pe = !1) => {
    const { type: he, props: Ce, ref: Ee, children: ve, dynamicChildren: be, shapeFlag: We, patchFlag: Me, dirs: De, cacheIndex: Ve } = F; if (Me === -2 && (pe = !1), Ee != null && (ki(), pu(Ee, null, Y, F, !0), Ti()), Ve != null && (V.renderCache[Ve] = void 0), We & 256) { V.ctx.deactivate(F); return } const rt = We & 1 && De; const st = !Ds(F); let ut; if (st && (ut = Ce && Ce.onVnodeBeforeUnmount) && Vr(ut, V, F), We & 6) {
      Je(F.component, Y, fe)
    }
    else { if (We & 128) { F.suspense.unmount(Y, fe); return }rt && No(F, null, V, 'beforeUnmount'), We & 64 ? F.type.remove(F, V, Y, ae, fe) : be && !be.hasOnce && (he !== nt || Me > 0 && Me & 64) ? ie(be, V, Y, !1, !0) : (he === nt && Me & 384 || !pe && We & 16) && ie(ve, V, Y), fe && Ze(F) }(st && (ut = Ce && Ce.onVnodeUnmounted) || rt) && Qn(() => { ut && Vr(ut, V, F), rt && No(F, null, V, 'unmounted') }, Y)
  }; const Ze = (F) => {
    const { type: V, el: Y, anchor: fe, transition: pe } = F; if (V === nt) { Ke(Y, fe); return } if (V === xd) { k(F); return } const he = () => { s(Y), pe && !pe.persisted && pe.afterLeave && pe.afterLeave() }; if (F.shapeFlag & 1 && pe && !pe.persisted) { const { leave: Ce, delayLeave: Ee } = pe; const ve = () => Ce(Y, he); Ee ? Ee(F.el, he, ve) : ve() }
    else {
      he()
    }
  }; const Ke = (F, V) => { let Y; for (;F !== V;)Y = y(F), s(F), F = Y; s(V) }; const Je = (F, V, Y) => { const { bum: fe, scope: pe, job: he, subTree: Ce, um: Ee, m: ve, a: be, parent: We, slots: { __: Me } } = F; cv(ve), cv(be), fe && Kc(fe), We && Fe(Me) && Me.forEach((De) => { We.renderCache[De] = void 0 }), pe.stop(), he && (he.flags |= 8, qe(Ce, F, V, Y)), Ee && Qn(Ee, V), Qn(() => { F.isUnmounted = !0 }, V), V && V.pendingBranch && !V.isUnmounted && F.asyncDep && !F.asyncResolved && F.suspenseId === V.pendingId && (V.deps--, V.deps === 0 && V.resolve()) }; const ie = (F, V, Y, fe = !1, pe = !1, he = 0) => { for (let Ce = he; Ce < F.length; Ce++)qe(F[Ce], V, Y, fe, pe) }; const U = (F) => {
    if (F.shapeFlag & 6)
      return U(F.component.subTree); if (F.shapeFlag & 128)
      return F.suspense.next(); const V = y(F.anchor || F.el); const Y = V && V[mT]; return Y ? y(Y) : V
  }; let Q = !1; const J = (F, V, Y) => { F == null ? V._vnode && qe(V._vnode, null, null, !0) : $(V._vnode || null, F, V, null, null, null, Y), V._vnode = F, Q || (Q = !0, nv(), $b(), Q = !1) }; const ae = { p: $, um: qe, m: Pe, r: Ze, mt: I, mc: ee, pc: oe, pbc: q, n: U, o: e }; return { render: J, hydrate: void 0, createApp: WT(J) }
} function wd({ type: e, props: t }, n) { return n === 'svg' && e === 'foreignObject' || n === 'mathml' && e === 'annotation-xml' && t && t.encoding && t.encoding.includes('html') ? void 0 : n } function Io({ effect: e, job: t }, n) { n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5) } function YT(e, t) { return (!e || e && !e.pendingBranch) && t && !t.persisted } function iw(e, t, n = !1) {
  const i = e.children; const s = t.children; if (Fe(i) && Fe(s)) {
    for (let l = 0; l < i.length; l++) { const u = i[l]; let f = s[l]; f.shapeFlag & 1 && !f.dynamicChildren && ((f.patchFlag <= 0 || f.patchFlag === 32) && (f = s[l] = Yi(s[l]), f.el = u.el), !n && f.patchFlag !== -2 && iw(u, f)), f.type === nf && (f.el = u.el), f.type === ln && !f.el && (f.el = u.el) }
  }
} function ZT(e) { const t = e.slice(); const n = [0]; let i, s, l, u, f; const h = e.length; for (i = 0; i < h; i++) { const p = e[i]; if (p !== 0) { if (s = n[n.length - 1], e[s] < p) { t[i] = s, n.push(i); continue } for (l = 0, u = n.length - 1; l < u;)f = l + u >> 1, e[n[f]] < p ? l = f + 1 : u = f; p < e[n[l]] && (l > 0 && (t[i] = n[l - 1]), n[l] = i) } } for (l = n.length, u = n[l - 1]; l-- > 0;)n[l] = u, u = t[u]; return n } function ow(e) {
  const t = e.subTree.component; if (t)
    return t.asyncDep && !t.asyncResolved ? t : ow(t)
} function cv(e) {
  if (e) {
    for (let t = 0; t < e.length; t++)e[t].flags |= 8
  }
} const QT = Symbol.for('v-scx'); const eC = () => wn(QT); function hp(e, t) { return Qu(e, null, t) } function tC(e, t) { return Qu(e, null, { flush: 'sync' }) } function St(e, t, n) { return Qu(e, t, n) } function Qu(e, t, n = vt) {
  const { immediate: i, deep: s, flush: l, once: u } = n; const f = on({}, n); const h = t && i || !t && l !== 'post'; let p; if (ma) {
    if (l === 'sync') { const w = eC(); p = w.__watcherHandles || (w.__watcherHandles = []) }
    else if (!h) { const w = () => {}; return w.stop = Yr, w.resume = Yr, w.pause = Yr, w }
  } const g = an; f.call = (w, L, $) => Ir(w, g, L, $); let v = !1; l === 'post' ? f.scheduler = (w) => { Qn(w, g && g.suspense) } : l !== 'sync' && (v = !0, f.scheduler = (w, L) => { L ? w() : ap(w) }), f.augmentJob = (w) => { t && (w.flags |= 4), v && (w.flags |= 2, g && (w.id = g.uid, w.i = g)) }; const y = hT(e, t, f); return ma && (p ? p.push(y) : h && y()), y
} function nC(e, t, n) { const i = this.proxy; const s = Dt(e) ? e.includes('.') ? sw(i, e) : () => i[e] : e.bind(i, i); let l; Ge(t) ? l = t : (l = t.handler, n = t); const u = Ha(this); const f = Qu(s, l.bind(i), n); return u(), f } function sw(e, t) { const n = t.split('.'); return () => { let i = e; for (let s = 0; s < n.length && i; s++)i = i[n[s]]; return i } } function ef(e, t, n = vt) {
  const i = Ko(); const s = ir(t); const l = Ai(t); const u = lw(e, s); const f = Cb((h, p) => {
    let g; let v = vt; let y; return tC(() => { const w = e[s]; Vn(g, w) && (g = w, p()) }), { get() { return h(), n.get ? n.get(g) : g }, set(w) {
      const L = n.set ? n.set(w) : w; if (!Vn(L, g) && !(v !== vt && Vn(w, v)))
        return; const $ = i.vnode.props; $ && (t in $ || s in $ || l in $) && (`onUpdate:${t}` in $ || `onUpdate:${s}` in $ || `onUpdate:${l}` in $) || (g = w, p()), i.emit(`update:${t}`, L), Vn(w, L) && Vn(w, v) && !Vn(L, y) && p(), v = w, y = L
    } }
  }); return f[Symbol.iterator] = () => { let h = 0; return { next() { return h < 2 ? { value: h++ ? u || vt : f, done: !1 } : { done: !0 } } } }, f
} const lw = (e, t) => t === 'modelValue' || t === 'model-value' ? e.modelModifiers : e[`${t}Modifiers`] || e[`${ir(t)}Modifiers`] || e[`${Ai(t)}Modifiers`]; function rC(e, t, ...n) {
  if (e.isUnmounted)
    return; const i = e.vnode.props || vt; let s = n; const l = t.startsWith('update:'); const u = l && lw(i, t.slice(7)); u && (u.trim && (s = n.map(g => Dt(g) ? g.trim() : g)), u.number && (s = n.map(Yd))); let f; let h = i[f = Xc(t)] || i[f = Xc(ir(t))]; !h && l && (h = i[f = Xc(Ai(t))]), h && Ir(h, e, 6, s); const p = i[`${f}Once`]; if (p) {
    if (!e.emitted)
      e.emitted = {}; else if (e.emitted[f])
      return; e.emitted[f] = !0, Ir(p, e, 6, s)
  }
} function aw(e, t, n = !1) {
  const i = t.emitsCache; const s = i.get(e); if (s !== void 0)
    return s; const l = e.emits; const u = {}; let f = !1; if (!Ge(e)) { const h = (p) => { const g = aw(p, t, !0); g && (f = !0, on(u, g)) }; !n && t.mixins.length && t.mixins.forEach(h), e.extends && h(e.extends), e.mixins && e.mixins.forEach(h) } return !l && !f ? (_t(e) && i.set(e, null), null) : (Fe(l) ? l.forEach(h => u[h] = null) : on(u, l), _t(e) && i.set(e, u), u)
} function tf(e, t) { return !e || !Bu(t) ? !1 : (t = t.slice(2).replace(/Once$/, ''), wt(e, t[0].toLowerCase() + t.slice(1)) || wt(e, Ai(t)) || wt(e, t)) } function uv(e) {
  const { type: t, vnode: n, proxy: i, withProxy: s, propsOptions: [l], slots: u, attrs: f, emit: h, render: p, renderCache: g, props: v, data: y, setupState: w, ctx: L, inheritAttrs: $ } = e; const A = hu(e); let E, M; try {
    if (n.shapeFlag & 4) { const k = s || i; const z = k; E = Ar(p.call(z, k, g, v, w, y, L)), M = f }
    else { const k = t; E = Ar(k.length > 1 ? k(v, { attrs: f, slots: u, emit: h }) : k(v, null)), M = t.props ? f : oC(f) }
  }
  catch (k) { ta.length = 0, Da(k, e, 1), E = Ie(ln) } let O = E; if (M && $ !== !1) { const k = Object.keys(M); const { shapeFlag: z } = O; k.length && z & 7 && (l && k.some(Yh) && (M = sC(M, l)), O = fo(O, M, !1, !0)) } return n.dirs && (O = fo(O, null, !1, !0), O.dirs = O.dirs ? O.dirs.concat(n.dirs) : n.dirs), n.transition && ha(O, n.transition), E = O, hu(A), E
} function iC(e, t = !0) {
  let n; for (let i = 0; i < e.length; i++) {
    const s = e[i]; if (Js(s)) {
      if (s.type !== ln || s.children === 'v-if') {
        if (n)
          return; n = s
      }
    }
    else {
      return
    }
  } return n
} function oC(e) { let t; for (const n in e)(n === 'class' || n === 'style' || Bu(n)) && ((t || (t = {}))[n] = e[n]); return t } function sC(e, t) { const n = {}; for (const i in e)(!Yh(i) || !(i.slice(9) in t)) && (n[i] = e[i]); return n } function lC(e, t, n) {
  const { props: i, children: s, component: l } = e; const { props: u, children: f, patchFlag: h } = t; const p = l.emitsOptions; if (t.dirs || t.transition)
    return !0; if (n && h >= 0) {
    if (h & 1024)
      return !0; if (h & 16)
      return i ? fv(i, u, p) : !!u; if (h & 8) {
      const g = t.dynamicProps; for (let v = 0; v < g.length; v++) {
        const y = g[v]; if (u[y] !== i[y] && !tf(p, y))
          return !0
      }
    }
  }
  else {
    return (s || f) && (!f || !f.$stable) ? !0 : i === u ? !1 : i ? u ? fv(i, u, p) : !0 : !!u
  } return !1
} function fv(e, t, n) {
  const i = Object.keys(t); if (i.length !== Object.keys(e).length)
    return !0; for (let s = 0; s < i.length; s++) {
    const l = i[s]; if (t[l] !== e[l] && !tf(n, l))
      return !0
  } return !1
} function pp({ vnode: e, parent: t }, n) {
  for (;t;) {
    const i = t.subTree; if (i.suspense && i.suspense.activeBranch === e && (i.el = e.el), i === e)
      (e = t.vnode).el = n, t = t.parent; else break
  }
} const cw = e => e.__isSuspense; let ah = 0; const aC = { name: 'Suspense', __isSuspense: !0, process(e, t, n, i, s, l, u, f, h, p) {
  if (e == null) {
    cC(t, n, i, s, l, u, f, h, p)
  }
  else { if (l && l.deps > 0 && !e.suspense.isInFallback) { t.suspense = e.suspense, t.suspense.vnode = t, t.el = e.el; return }uC(e, t, n, i, s, u, f, h, p) }
}, hydrate: fC, normalize: dC }; const gp = aC; function ga(e, t) { const n = e.props && e.props[t]; Ge(n) && n() } function cC(e, t, n, i, s, l, u, f, h) { const { p, o: { createElement: g } } = h; const v = g('div'); const y = e.suspense = uw(e, s, i, t, v, n, l, u, f, h); p(null, y.pendingBranch = e.ssContent, v, null, i, y, l, u), y.deps > 0 ? (ga(e, 'onPending'), ga(e, 'onFallback'), p(null, e.ssFallback, t, n, i, null, l, u), Fs(y, e.ssFallback)) : y.resolve(!1, !0) } function uC(e, t, n, i, s, l, u, f, { p: h, um: p, o: { createElement: g } }) {
  const v = t.suspense = e.suspense; v.vnode = t, t.el = e.el; const y = t.ssContent; const w = t.ssFallback; const { activeBranch: L, pendingBranch: $, isInFallback: A, isHydrating: E } = v; if ($) {
    v.pendingBranch = y, Kr(y, $) ? (h($, y, v.hiddenContainer, null, s, v, l, u, f), v.deps <= 0 ? v.resolve() : A && (E || (h(L, w, n, i, s, null, l, u, f), Fs(v, w)))) : (v.pendingId = ah++, E ? (v.isHydrating = !1, v.activeBranch = $) : p($, s, v), v.deps = 0, v.effects.length = 0, v.hiddenContainer = g('div'), A ? (h(null, y, v.hiddenContainer, null, s, v, l, u, f), v.deps <= 0 ? v.resolve() : (h(L, w, n, i, s, null, l, u, f), Fs(v, w))) : L && Kr(y, L) ? (h(L, y, n, i, s, v, l, u, f), v.resolve(!0)) : (h(null, y, v.hiddenContainer, null, s, v, l, u, f), v.deps <= 0 && v.resolve()))
  }
  else if (L && Kr(y, L)) {
    h(L, y, n, i, s, v, l, u, f), Fs(v, y)
  }
  else if (ga(t, 'onPending'), v.pendingBranch = y, y.shapeFlag & 512 ? v.pendingId = y.component.suspenseId : v.pendingId = ah++, h(null, y, v.hiddenContainer, null, s, v, l, u, f), v.deps <= 0) {
    v.resolve()
  }
  else { const { timeout: M, pendingId: O } = v; M > 0 ? setTimeout(() => { v.pendingId === O && v.fallback(w) }, M) : M === 0 && v.fallback(w) }
} function uw(e, t, n, i, s, l, u, f, h, p, g = !1) {
  const { p: v, m: y, um: w, n: L, o: { parentNode: $, remove: A } } = p; let E; const M = pC(e); M && t && t.pendingBranch && (E = t.pendingId, t.deps++); const O = e.props ? ib(e.props.timeout) : void 0; const k = l; const z = { vnode: e, parent: t, parentComponent: n, namespace: u, container: i, hiddenContainer: s, deps: 0, pendingId: ah++, timeout: typeof O == 'number' ? O : -1, activeBranch: null, pendingBranch: null, isInFallback: !g, isHydrating: g, isUnmounted: !1, effects: [], resolve(D = !1, te = !1) { const { vnode: ee, activeBranch: W, pendingBranch: q, pendingId: K, effects: C, parentComponent: P, container: I } = z; let S = !1; z.isHydrating ? z.isHydrating = !1 : D || (S = W && q.transition && q.transition.mode === 'out-in', S && (W.transition.afterLeave = () => { K === z.pendingId && (y(q, I, l === k ? L(W) : l, 0), th(C)) }), W && ($(W.el) === I && (l = L(W)), w(W, P, z, !0)), S || y(q, I, l, 0)), Fs(z, q), z.pendingBranch = null, z.isInFallback = !1; let R = z.parent; let B = !1; for (;R;) { if (R.pendingBranch) { R.effects.push(...C), B = !0; break }R = R.parent }!B && !S && th(C), z.effects = [], M && t && t.pendingBranch && E === t.pendingId && (t.deps--, t.deps === 0 && !te && t.resolve()), ga(ee, 'onResolve') }, fallback(D) {
    if (!z.pendingBranch)
      return; const { vnode: te, activeBranch: ee, parentComponent: W, container: q, namespace: K } = z; ga(te, 'onFallback'); const C = L(ee); const P = () => { z.isInFallback && (v(null, D, q, C, W, null, K, f, h), Fs(z, D)) }; const I = D.transition && D.transition.mode === 'out-in'; I && (ee.transition.afterLeave = P), z.isInFallback = !0, w(ee, W, null, !0), I || P()
  }, move(D, te, ee) { z.activeBranch && y(z.activeBranch, D, te, ee), z.container = D }, next() { return z.activeBranch && L(z.activeBranch) }, registerDep(D, te, ee) {
    const W = !!z.pendingBranch; W && z.deps++; const q = D.vnode.el; D.asyncDep.catch((K) => { Da(K, D, 0) }).then((K) => {
      if (D.isUnmounted || z.isUnmounted || z.pendingId !== D.suspenseId)
        return; D.asyncResolved = !0; const { vnode: C } = D; uh(D, K), q && (C.el = q); const P = !q && D.subTree.el; te(D, C, $(q || D.subTree.el), q ? null : L(D.subTree), z, u, ee), P && A(P), pp(D, C.el), W && --z.deps === 0 && z.resolve()
    })
  }, unmount(D, te) { z.isUnmounted = !0, z.activeBranch && w(z.activeBranch, n, D, te), z.pendingBranch && w(z.pendingBranch, n, D, te) } }; return z
} function fC(e, t, n, i, s, l, u, f, h) { const p = t.suspense = uw(t, i, n, e.parentNode, document.createElement('div'), null, s, l, u, f, !0); const g = h(e, p.pendingBranch = t.ssContent, n, p, l, u); return p.deps === 0 && p.resolve(!1, !0), g } function dC(e) { const { shapeFlag: t, children: n } = e; const i = t & 32; e.ssContent = dv(i ? n.default : n), e.ssFallback = i ? dv(n.fallback) : Ie(ln) } function dv(e) { let t; if (Ge(e)) { const n = Ks && e._c; n && (e._d = !1, se()), e = e(), n && (e._d = !0, t = Xn, fw()) } return Fe(e) && (e = iC(e)), e = Ar(e), t && !e.dynamicChildren && (e.dynamicChildren = t.filter(n => n !== e)), e } function hC(e, t) { t && t.pendingBranch ? Fe(e) ? t.effects.push(...e) : t.effects.push(e) : th(e) } function Fs(e, t) { e.activeBranch = t; const { vnode: n, parentComponent: i } = e; let s = t.el; for (;!s && t.component;)t = t.component.subTree, s = t.el; n.el = s, i && i.subTree === n && (i.vnode.el = s, pp(i, s)) } function pC(e) { const t = e.props && e.props.suspensible; return t != null && t !== !1 } const nt = Symbol.for('v-fgt'); const nf = Symbol.for('v-txt'); const ln = Symbol.for('v-cmt'); const xd = Symbol.for('v-stc'); const ta = []; let Xn = null; function se(e = !1) { ta.push(Xn = e ? null : []) } function fw() { ta.pop(), Xn = ta[ta.length - 1] || null } let Ks = 1; function vu(e, t = !1) { Ks += e, e < 0 && Xn && t && (Xn.hasOnce = !0) } function dw(e) { return e.dynamicChildren = Ks > 0 ? Xn || Ps : null, fw(), Ks > 0 && Xn && Xn.push(e), e } function ye(e, t, n, i, s, l) { return dw(ne(e, t, n, i, s, l, !0)) } function Ye(e, t, n, i, s) { return dw(Ie(e, t, n, i, s, !0)) } function Js(e) { return e ? e.__v_isVNode === !0 : !1 } function Kr(e, t) { return e.type === t.type && e.key === t.key } const hw = ({ key: e }) => e ?? null; const Jc = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == 'number' && (e = `${e}`), e != null ? Dt(e) || kt(e) || Ge(e) ? { i: tn, r: e, k: t, f: !!n } : e : null); function ne(e, t = null, n = null, i = 0, s = null, l = e === nt ? 0 : 1, u = !1, f = !1) { const h = { __v_isVNode: !0, __v_skip: !0, type: e, props: t, key: t && hw(t), ref: t && Jc(t), scopeId: Ku, slotScopeIds: null, children: n, component: null, suspense: null, ssContent: null, ssFallback: null, dirs: null, transition: null, el: null, anchor: null, target: null, targetStart: null, targetAnchor: null, staticCount: 0, shapeFlag: l, patchFlag: i, dynamicProps: s, dynamicChildren: null, appContext: null, ctx: tn }; return f ? (mp(h, n), l & 128 && e.normalize(h)) : n && (h.shapeFlag |= Dt(n) ? 8 : 16), Ks > 0 && !u && Xn && (h.patchFlag > 0 || l & 6) && h.patchFlag !== 32 && Xn.push(h), h } const Ie = gC; function gC(e, t = null, n = null, i = 0, s = null, l = !1) { if ((!e || e === jb) && (e = ln), Js(e)) { const f = fo(e, t, !0); return n && mp(f, n), Ks > 0 && !l && Xn && (f.shapeFlag & 6 ? Xn[Xn.indexOf(e)] = f : Xn.push(f)), f.patchFlag = -2, f } if (_C(e) && (e = e.__vccOpts), t) { t = pw(t); let { class: f, style: h } = t; f && !Dt(f) && (t.class = ot(f)), _t(h) && (sp(h) && !Fe(h) && (h = on({}, h)), t.style = nn(h)) } const u = Dt(e) ? 1 : cw(e) ? 128 : Ob(e) ? 64 : _t(e) ? 4 : Ge(e) ? 2 : 0; return ne(e, t, n, i, s, u, l, !0) } function pw(e) { return e ? sp(e) || Zb(e) ? on({}, e) : e : null } function fo(e, t, n = !1, i = !1) { const { props: s, ref: l, patchFlag: u, children: f, transition: h } = e; const p = t ? _i(s || {}, t) : s; const g = { __v_isVNode: !0, __v_skip: !0, type: e.type, props: p, key: p && hw(p), ref: t && t.ref ? n && l ? Fe(l) ? l.concat(Jc(t)) : [l, Jc(t)] : Jc(t) : l, scopeId: e.scopeId, slotScopeIds: e.slotScopeIds, children: f, target: e.target, targetStart: e.targetStart, targetAnchor: e.targetAnchor, staticCount: e.staticCount, shapeFlag: e.shapeFlag, patchFlag: t && e.type !== nt ? u === -1 ? 16 : u | 16 : u, dynamicProps: e.dynamicProps, dynamicChildren: e.dynamicChildren, appContext: e.appContext, dirs: e.dirs, transition: h, component: e.component, suspense: e.suspense, ssContent: e.ssContent && fo(e.ssContent), ssFallback: e.ssFallback && fo(e.ssFallback), el: e.el, anchor: e.anchor, ctx: e.ctx, ce: e.ce }; return h && i && ha(g, h.clone(g)), g } function dt(e = ' ', t = 0) { return Ie(nf, null, e, t) } function je(e = '', t = !1) { return t ? (se(), Ye(ln, null, e)) : Ie(ln, null, e) } function Ar(e) { return e == null || typeof e == 'boolean' ? Ie(ln) : Fe(e) ? Ie(nt, null, e.slice()) : Js(e) ? Yi(e) : Ie(nf, null, String(e)) } function Yi(e) { return e.el === null && e.patchFlag !== -1 || e.memo ? e : fo(e) } function mp(e, t) {
  let n = 0; const { shapeFlag: i } = e; if (t == null) {
    t = null
  }
  else if (Fe(t)) {
    n = 16
  }
  else if (typeof t == 'object') {
    if (i & 65) { const s = t.default; s && (s._c && (s._d = !1), mp(e, s()), s._c && (s._d = !0)); return }
    else { n = 32; const s = t._; !s && !Zb(t) ? t._ctx = tn : s === 3 && tn && (tn.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024)) }
  }
  else {
    Ge(t) ? (t = { default: t, _ctx: tn }, n = 32) : (t = String(t), i & 64 ? (n = 16, t = [dt(t)]) : n = 8)
  }e.children = t, e.shapeFlag |= n
} function _i(...e) {
  const t = {}; for (let n = 0; n < e.length; n++) {
    const i = e[n]; for (const s in i) {
      if (s === 'class') {
        t.class !== i.class && (t.class = ot([t.class, i.class]))
      }
      else if (s === 'style') {
        t.style = nn([t.style, i.style])
      }
      else if (Bu(s)) { const l = t[s]; const u = i[s]; u && l !== u && !(Fe(l) && l.includes(u)) && (t[s] = l ? [].concat(l, u) : u) }
      else {
        s !== '' && (t[s] = i[s])
      }
    }
  } return t
} function Vr(e, t, n, i = null) { Ir(e, t, 7, [n, i]) } const mC = Xb(); let vC = 0; function yC(e, t, n) { const i = e.type; const s = (t ? t.appContext : e.appContext) || mC; const l = { uid: vC++, vnode: e, type: i, parent: t, appContext: s, root: null, next: null, subTree: null, effect: null, update: null, job: null, scope: new zk(!0), render: null, proxy: null, exposed: null, exposeProxy: null, withProxy: null, provides: t ? t.provides : Object.create(s.provides), ids: t ? t.ids : ['', 0, 0], accessCache: null, renderCache: [], components: null, directives: null, propsOptions: ew(i, s), emitsOptions: aw(i, s), emit: null, emitted: null, propsDefaults: vt, inheritAttrs: i.inheritAttrs, ctx: vt, data: vt, props: vt, attrs: vt, slots: vt, refs: vt, setupState: vt, setupContext: null, suspense: n, suspenseId: n ? n.pendingId : 0, asyncDep: null, asyncResolved: !1, isMounted: !1, isUnmounted: !1, isDeactivated: !1, bc: null, c: null, bm: null, m: null, bu: null, u: null, um: null, bum: null, da: null, a: null, rtg: null, rtc: null, ec: null, sp: null }; return l.ctx = { _: l }, l.root = t ? t.root : l, l.emit = rC.bind(null, l), e.ce && e.ce(l), l } let an = null; const Ko = () => an || tn; let yu, ch; { const e = Uu(); const t = (n, i) => { let s; return (s = e[n]) || (s = e[n] = []), s.push(i), (l) => { s.length > 1 ? s.forEach(u => u(l)) : s[0](l) } }; yu = t('__VUE_INSTANCE_SETTERS__', n => an = n), ch = t('__VUE_SSR_SETTERS__', n => ma = n) } function Ha(e) { const t = an; return yu(e), e.scope.on(), () => { e.scope.off(), yu(t) } } function hv() { an && an.scope.off(), yu(null) } function gw(e) { return e.vnode.shapeFlag & 4 } let ma = !1; function bC(e, t = !1, n = !1) { t && ch(t); const { props: i, children: s } = e.vnode; const l = gw(e); jT(e, i, l, t), GT(e, s, n || t); const u = l ? wC(e, t) : void 0; return t && ch(!1), u } function wC(e, t) {
  const n = e.type; e.accessCache = Object.create(null), e.proxy = new Proxy(e.ctx, IT); const { setup: i } = n; if (i) {
    ki(); const s = e.setupContext = i.length > 1 ? vw(e) : null; const l = Ha(e); const u = za(i, e, 0, [e.props, s]); const f = eb(u); if (Ti(), l(), (f || e.sp) && !Ds(e) && Bb(e), f) {
      if (u.then(hv, hv), t)
        return u.then((h) => { uh(e, h) }).catch((h) => { Da(h, e, 0) }); e.asyncDep = u
    }
    else {
      uh(e, u)
    }
  }
  else {
    mw(e)
  }
} function uh(e, t, n) { Ge(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : _t(t) && (e.setupState = Tb(t)), mw(e) } function mw(e, t, n) {
  const i = e.type; e.render || (e.render = i.render || Yr); { const s = Ha(e); ki(); try { RT(e) }
  finally { Ti(), s() } }
} const xC = { get(e, t) { return bn(e, 'get', ''), e[t] } }; function vw(e) { const t = (n) => { e.exposed = n || {} }; return { attrs: new Proxy(e.attrs, xC), slots: e.slots, emit: e.emit, expose: t } } function rf(e) {
  return e.exposed
    ? e.exposeProxy || (e.exposeProxy = new Proxy(Tb(lp(e.exposed)), { get(t, n) {
      if (n in t)
        return t[n]; if (n in ea)
        return ea[n](e)
    }, has(t, n) { return n in t || n in ea } }))
    : e.proxy
} function SC(e, t = !0) { return Ge(e) ? e.displayName || e.name : e.name || t && e.__name } function _C(e) { return Ge(e) && '__vccOpts' in e } const _e = (e, t) => fT(e, t, ma); function Ba(e, t, n) { const i = arguments.length; return i === 2 ? _t(t) && !Fe(t) ? Js(t) ? Ie(e, null, [t]) : Ie(e, t) : Ie(e, null, t) : (i > 3 ? n = Array.prototype.slice.call(arguments, 2) : i === 3 && Js(n) && (n = [n]), Ie(e, t, n)) } const kC = '3.5.16'/**
                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @vue/runtime-dom v3.5.16
                                                                                                                                                                                                                                                                                                                                                                                                                                                            * (c) 2018-present Yuxi (Evan) You and Vue contributors
                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MIT
                                                                                                                                                                                                                                                                                                                                                                                                                                                            */let fh; const pv = typeof window < 'u' && window.trustedTypes; if (pv) {
  try { fh = pv.createPolicy('vue', { createHTML: e => e }) }
  catch {}
} const yw = fh ? e => fh.createHTML(e) : e => e; const TC = 'http://www.w3.org/2000/svg'; const CC = 'http://www.w3.org/1998/Math/MathML'; const yi = typeof document < 'u' ? document : null; const gv = yi && yi.createElement('template'); const EC = { insert: (e, t, n) => { t.insertBefore(e, n || null) }, remove: (e) => { const t = e.parentNode; t && t.removeChild(e) }, createElement: (e, t, n, i) => { const s = t === 'svg' ? yi.createElementNS(TC, e) : t === 'mathml' ? yi.createElementNS(CC, e) : n ? yi.createElement(e, { is: n }) : yi.createElement(e); return e === 'select' && i && i.multiple != null && s.setAttribute('multiple', i.multiple), s }, createText: e => yi.createTextNode(e), createComment: e => yi.createComment(e), setText: (e, t) => { e.nodeValue = t }, setElementText: (e, t) => { e.textContent = t }, parentNode: e => e.parentNode, nextSibling: e => e.nextSibling, querySelector: e => yi.querySelector(e), setScopeId(e, t) { e.setAttribute(t, '') }, insertStaticContent(e, t, n, i, s, l) {
  const u = n ? n.previousSibling : t.lastChild; if (s && (s === l || s.nextSibling)) {
    for (;t.insertBefore(s.cloneNode(!0), n), !(s === l || !(s = s.nextSibling)););
  }
  else { gv.innerHTML = yw(i === 'svg' ? `<svg>${e}</svg>` : i === 'mathml' ? `<math>${e}</math>` : e); const f = gv.content; if (i === 'svg' || i === 'mathml') { const h = f.firstChild; for (;h.firstChild;)f.appendChild(h.firstChild); f.removeChild(h) }t.insertBefore(f, n) } return [u ? u.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild]
} }; const qi = 'transition'; const Hl = 'animation'; const va = Symbol('_vtc'); const bw = { name: String, type: String, css: { type: Boolean, default: !0 }, duration: [String, Number, Object], enterFromClass: String, enterActiveClass: String, enterToClass: String, appearFromClass: String, appearActiveClass: String, appearToClass: String, leaveFromClass: String, leaveActiveClass: String, leaveToClass: String }; const AC = on({}, Rb, bw); const LC = e => (e.displayName = 'Transition', e.props = AC, e); const $C = LC((e, { slots: t }) => Ba(bT, MC(e), t)); function Po(e, t = []) { Fe(e) ? e.forEach(n => n(...t)) : e && e(...t) } const mv = e => e ? Fe(e) ? e.some(t => t.length > 1) : e.length > 1 : !1; function MC(e) {
  const t = {}; for (const C in e)C in bw || (t[C] = e[C]); if (e.css === !1)
    return t; const { name: n = 'v', type: i, duration: s, enterFromClass: l = `${n}-enter-from`, enterActiveClass: u = `${n}-enter-active`, enterToClass: f = `${n}-enter-to`, appearFromClass: h = l, appearActiveClass: p = u, appearToClass: g = f, leaveFromClass: v = `${n}-leave-from`, leaveActiveClass: y = `${n}-leave-active`, leaveToClass: w = `${n}-leave-to` } = e; const L = NC(s); const $ = L && L[0]; const A = L && L[1]; const { onBeforeEnter: E, onEnter: M, onEnterCancelled: O, onLeave: k, onLeaveCancelled: z, onBeforeAppear: D = E, onAppear: te = M, onAppearCancelled: ee = O } = t; const W = (C, P, I, S) => { C._enterCancelled = S, Oo(C, P ? g : f), Oo(C, P ? p : u), I && I() }; const q = (C, P) => { C._isLeaving = !1, Oo(C, v), Oo(C, w), Oo(C, y), P && P() }; const K = C => (P, I) => { const S = C ? te : M; const R = () => W(P, C, I); Po(S, [P, R]), vv(() => { Oo(P, C ? h : l), pi(P, C ? g : f), mv(S) || yv(P, i, $, R) }) }; return on(t, { onBeforeEnter(C) { Po(E, [C]), pi(C, l), pi(C, u) }, onBeforeAppear(C) { Po(D, [C]), pi(C, h), pi(C, p) }, onEnter: K(!1), onAppear: K(!0), onLeave(C, P) { C._isLeaving = !0; const I = () => q(C, P); pi(C, v), C._enterCancelled ? (pi(C, y), xv()) : (xv(), pi(C, y)), vv(() => { C._isLeaving && (Oo(C, v), pi(C, w), mv(k) || yv(C, i, A, I)) }), Po(k, [C, I]) }, onEnterCancelled(C) { W(C, !1, void 0, !0), Po(O, [C]) }, onAppearCancelled(C) { W(C, !0, void 0, !0), Po(ee, [C]) }, onLeaveCancelled(C) { q(C), Po(z, [C]) } })
} function NC(e) {
  if (e == null)
    return null; if (_t(e))
    return [Sd(e.enter), Sd(e.leave)]; { const t = Sd(e); return [t, t] }
} function Sd(e) { return ib(e) } function pi(e, t) { t.split(/\s+/).forEach(n => n && e.classList.add(n)), (e[va] || (e[va] = new Set())).add(t) } function Oo(e, t) { t.split(/\s+/).forEach(i => i && e.classList.remove(i)); const n = e[va]; n && (n.delete(t), n.size || (e[va] = void 0)) } function vv(e) { requestAnimationFrame(() => { requestAnimationFrame(e) }) } let IC = 0; function yv(e, t, n, i) {
  const s = e._endId = ++IC; const l = () => { s === e._endId && i() }; if (n != null)
    return setTimeout(l, n); const { type: u, timeout: f, propCount: h } = PC(e, t); if (!u)
    return i(); const p = `${u}end`; let g = 0; const v = () => { e.removeEventListener(p, y), l() }; const y = (w) => { w.target === e && ++g >= h && v() }; setTimeout(() => { g < h && v() }, f + 1), e.addEventListener(p, y)
} function PC(e, t) { const n = window.getComputedStyle(e); const i = L => (n[L] || '').split(', '); const s = i(`${qi}Delay`); const l = i(`${qi}Duration`); const u = bv(s, l); const f = i(`${Hl}Delay`); const h = i(`${Hl}Duration`); const p = bv(f, h); let g = null; let v = 0; let y = 0; t === qi ? u > 0 && (g = qi, v = u, y = l.length) : t === Hl ? p > 0 && (g = Hl, v = p, y = h.length) : (v = Math.max(u, p), g = v > 0 ? u > p ? qi : Hl : null, y = g ? g === qi ? l.length : h.length : 0); const w = g === qi && /\b(transform|all)(,|$)/.test(i(`${qi}Property`).toString()); return { type: g, timeout: v, propCount: y, hasTransform: w } } function bv(e, t) { for (;e.length < t.length;)e = e.concat(e); return Math.max(...t.map((n, i) => wv(n) + wv(e[i]))) } function wv(e) { return e === 'auto' ? 0 : Number(e.slice(0, -1).replace(',', '.')) * 1e3 } function xv() { return document.body.offsetHeight } function OC(e, t, n) { const i = e[va]; i && (t = (t ? [t, ...i] : [...i]).join(' ')), t == null ? e.removeAttribute('class') : n ? e.setAttribute('class', t) : e.className = t } const bu = Symbol('_vod'); const ww = Symbol('_vsh'); const to = { beforeMount(e, { value: t }, { transition: n }) { e[bu] = e.style.display === 'none' ? '' : e.style.display, n && t ? n.beforeEnter(e) : Bl(e, t) }, mounted(e, { value: t }, { transition: n }) { n && t && n.enter(e) }, updated(e, { value: t, oldValue: n }, { transition: i }) { !t != !n && (i ? t ? (i.beforeEnter(e), Bl(e, !0), i.enter(e)) : i.leave(e, () => { Bl(e, !1) }) : Bl(e, t)) }, beforeUnmount(e, { value: t }) { Bl(e, t) } }; function Bl(e, t) { e.style.display = t ? e[bu] : 'none', e[ww] = !t } const RC = Symbol(''); const zC = /(^|;)\s*display\s*:/; function DC(e, t, n) {
  const i = e.style; const s = Dt(n); let l = !1; if (n && !s) {
    if (t) {
      if (Dt(t)) {
        for (const u of t.split(';')) { const f = u.slice(0, u.indexOf(':')).trim(); n[f] == null && Yc(i, f, '') }
      }
      else {
        for (const u in t)n[u] == null && Yc(i, u, '')
      }
    } for (const u in n)u === 'display' && (l = !0), Yc(i, u, n[u])
  }
  else if (s) { if (t !== n) { const u = i[RC]; u && (n += `;${u}`), i.cssText = n, l = zC.test(n) } }
  else {
    t && e.removeAttribute('style')
  }bu in e && (e[bu] = l ? i.display : '', e[ww] && (i.display = 'none'))
} const Sv = /\s*!important$/; function Yc(e, t, n) {
  if (Fe(n)) {
    n.forEach(i => Yc(e, t, i))
  }
  else if (n == null && (n = ''), t.startsWith('--')) {
    e.setProperty(t, n)
  }
  else { const i = FC(e, t); Sv.test(n) ? e.setProperty(Ai(i), n.replace(Sv, ''), 'important') : e[i] = n }
} const _v = ['Webkit', 'Moz', 'ms']; const _d = {}; function FC(e, t) {
  const n = _d[t]; if (n)
    return n; let i = ir(t); if (i !== 'filter' && i in e)
    return _d[t] = i; i = qu(i); for (let s = 0; s < _v.length; s++) {
    const l = _v[s] + i; if (l in e)
      return _d[t] = l
  } return t
} const kv = 'http://www.w3.org/1999/xlink'; function Tv(e, t, n, i, s, l = Ok(t)) { i && t.startsWith('xlink:') ? n == null ? e.removeAttributeNS(kv, t.slice(6, t.length)) : e.setAttributeNS(kv, t, n) : n == null || l && !ob(n) ? e.removeAttribute(t) : e.setAttribute(t, l ? '' : Nr(n) ? String(n) : n) } function Cv(e, t, n, i, s) {
  if (t === 'innerHTML' || t === 'textContent') { n != null && (e[t] = t === 'innerHTML' ? yw(n) : n); return } const l = e.tagName; if (t === 'value' && l !== 'PROGRESS' && !l.includes('-')) { const f = l === 'OPTION' ? e.getAttribute('value') || '' : e.value; const h = n == null ? e.type === 'checkbox' ? 'on' : '' : String(n); (f !== h || !('_value' in e)) && (e.value = h), n == null && e.removeAttribute(t), e._value = n; return } let u = !1; if (n === '' || n == null) { const f = typeof e[t]; f === 'boolean' ? n = ob(n) : n == null && f === 'string' ? (n = '', u = !0) : f === 'number' && (n = 0, u = !0) } try { e[t] = n }
  catch {}u && e.removeAttribute(s || t)
} function Ho(e, t, n, i) { e.addEventListener(t, n, i) } function HC(e, t, n, i) { e.removeEventListener(t, n, i) } const Ev = Symbol('_vei'); function BC(e, t, n, i, s = null) {
  const l = e[Ev] || (e[Ev] = {}); const u = l[t]; if (i && u) {
    u.value = i
  }
  else {
    const [f, h] = WC(t); if (i) { const p = l[t] = UC(i, s); Ho(e, f, p, h) }
    else {
      u && (HC(e, f, u, h), l[t] = void 0)
    }
  }
} const Av = /(?:Once|Passive|Capture)$/; function WC(e) { let t; if (Av.test(e)) { t = {}; let i; for (;i = e.match(Av);)e = e.slice(0, e.length - i[0].length), t[i[0].toLowerCase()] = !0 } return [e[2] === ':' ? e.slice(3) : Ai(e.slice(2)), t] } let kd = 0; const jC = Promise.resolve(); const qC = () => kd || (jC.then(() => kd = 0), kd = Date.now()); function UC(e, t) {
  const n = (i) => {
    if (!i._vts)
      i._vts = Date.now(); else if (i._vts <= n.attached)
      return; Ir(VC(i, n.value), t, 5, [i])
  }; return n.value = e, n.attached = qC(), n
} function VC(e, t) {
  if (Fe(t)) { const n = e.stopImmediatePropagation; return e.stopImmediatePropagation = () => { n.call(e), e._stopped = !0 }, t.map(i => s => !s._stopped && i && i(s)) }
  else {
    return t
  }
} const Lv = e => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123; function GC(e, t, n, i, s, l) { const u = s === 'svg'; t === 'class' ? OC(e, i, u) : t === 'style' ? DC(e, n, i) : Bu(t) ? Yh(t) || BC(e, t, n, i, l) : (t[0] === '.' ? (t = t.slice(1), !0) : t[0] === '^' ? (t = t.slice(1), !1) : XC(e, t, i, u)) ? (Cv(e, t, i), !e.tagName.includes('-') && (t === 'value' || t === 'checked' || t === 'selected') && Tv(e, t, i, u, l, t !== 'value')) : e._isVueCE && (/[A-Z]/.test(t) || !Dt(i)) ? Cv(e, ir(t), i, l, t) : (t === 'true-value' ? e._trueValue = i : t === 'false-value' && (e._falseValue = i), Tv(e, t, i, u)) } function XC(e, t, n, i) {
  if (i)
    return !!(t === 'innerHTML' || t === 'textContent' || t in e && Lv(t) && Ge(n)); if (t === 'spellcheck' || t === 'draggable' || t === 'translate' || t === 'autocorrect' || t === 'form' || t === 'list' && e.tagName === 'INPUT' || t === 'type' && e.tagName === 'TEXTAREA')
    return !1; if (t === 'width' || t === 'height') {
    const s = e.tagName; if (s === 'IMG' || s === 'VIDEO' || s === 'CANVAS' || s === 'SOURCE')
      return !1
  } return Lv(t) && Dt(n) ? !1 : t in e
} function wu(e) { const t = e.props['onUpdate:modelValue'] || !1; return Fe(t) ? n => Kc(t, n) : t } function KC(e) { e.target.composing = !0 } function $v(e) { const t = e.target; t.composing && (t.composing = !1, t.dispatchEvent(new Event('input'))) } const Hs = Symbol('_assign'); const JC = { created(e, { modifiers: { lazy: t, trim: n, number: i } }, s) {
  e[Hs] = wu(s); const l = i || s.props && s.props.type === 'number'; Ho(e, t ? 'change' : 'input', (u) => {
    if (u.target.composing)
      return; let f = e.value; n && (f = f.trim()), l && (f = Yd(f)), e[Hs](f)
  }), n && Ho(e, 'change', () => { e.value = e.value.trim() }), t || (Ho(e, 'compositionstart', KC), Ho(e, 'compositionend', $v), Ho(e, 'change', $v))
}, mounted(e, { value: t }) { e.value = t ?? '' }, beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: i, trim: s, number: l } }, u) {
  if (e[Hs] = wu(u), e.composing)
    return; const f = (l || e.type === 'number') && !/^0\d/.test(e.value) ? Yd(e.value) : e.value; const h = t ?? ''; f !== h && (document.activeElement === e && e.type !== 'range' && (i && t === n || s && e.value.trim() === h) || (e.value = h))
} }; const xw = { deep: !0, created(e, t, n) {
  e[Hs] = wu(n), Ho(e, 'change', () => {
    const i = e._modelValue; const s = YC(e); const l = e.checked; const u = e[Hs]; if (Fe(i)) {
      const f = sb(i, s); const h = f !== -1; if (l && !h) {
        u(i.concat(s))
      }
      else if (!l && h) { const p = [...i]; p.splice(f, 1), u(p) }
    }
    else if (Wu(i)) { const f = new Set(i); l ? f.add(s) : f.delete(s), u(f) }
    else {
      u(Sw(e, l))
    }
  })
}, mounted: Mv, beforeUpdate(e, t, n) { e[Hs] = wu(n), Mv(e, t, n) } }; function Mv(e, { value: t, oldValue: n }, i) {
  e._modelValue = t; let s; if (Fe(t)) {
    s = sb(t, i.props.value) > -1
  }
  else if (Wu(t)) {
    s = t.has(i.props.value)
  }
  else {
    if (t === n)
      return; s = Vu(t, Sw(e, !0))
  }e.checked !== s && (e.checked = s)
} function YC(e) { return '_value' in e ? e._value : e.value } function Sw(e, t) { const n = t ? '_trueValue' : '_falseValue'; return n in e ? e[n] : t } const ZC = ['ctrl', 'shift', 'alt', 'meta']; const QC = { stop: e => e.stopPropagation(), prevent: e => e.preventDefault(), self: e => e.target !== e.currentTarget, ctrl: e => !e.ctrlKey, shift: e => !e.shiftKey, alt: e => !e.altKey, meta: e => !e.metaKey, left: e => 'button' in e && e.button !== 0, middle: e => 'button' in e && e.button !== 1, right: e => 'button' in e && e.button !== 2, exact: (e, t) => ZC.some(n => e[`${n}Key`] && !t.includes(n)) }; function Zc(e, t) {
  const n = e._withMods || (e._withMods = {}); const i = t.join('.'); return n[i] || (n[i] = (s, ...l) => {
    for (let u = 0; u < t.length; u++) {
      const f = QC[t[u]]; if (f && f(s, t))
        return
    } return e(s, ...l)
  })
} const eE = { esc: 'escape', space: ' ', up: 'arrow-up', left: 'arrow-left', right: 'arrow-right', down: 'arrow-down', delete: 'backspace' }; function dh(e, t) {
  const n = e._withKeys || (e._withKeys = {}); const i = t.join('.'); return n[i] || (n[i] = (s) => {
    if (!('key' in s))
      return; const l = Ai(s.key); if (t.some(u => u === l || eE[u] === l))
      return e(s)
  })
} const tE = on({ patchProp: GC }, EC); let Nv; function nE() { return Nv || (Nv = KT(tE)) } function _w(...e) {
  const t = nE().createApp(...e); const { mount: n } = t; return t.mount = (i) => {
    const s = iE(i); if (!s)
      return; const l = t._component; !Ge(l) && !l.render && !l.template && (l.template = s.innerHTML), s.nodeType === 1 && (s.textContent = ''); const u = n(s, !1, rE(s)); return s instanceof Element && (s.removeAttribute('v-cloak'), s.setAttribute('data-v-app', '')), u
  }, t
} function rE(e) {
  if (e instanceof SVGElement)
    return 'svg'; if (typeof MathMLElement == 'function' && e instanceof MathMLElement)
    return 'mathml'
} function iE(e) { return Dt(e) ? document.querySelector(e) : e } function ni(e, t) { const n = e.__vccOpts || e; for (const [i, s] of t)n[i] = s; return n } const oE = {}; function sE(e, t) { const n = Go('RouterView'); return se(), Ye(n) } const lE = ni(oE, [['render', sE]]); const aE = ['top', 'right', 'bottom', 'left']; const Iv = ['start', 'end']; const Pv = aE.reduce((e, t) => e.concat(t, `${t}-${Iv[0]}`, `${t}-${Iv[1]}`), []); const ya = Math.min; const Do = Math.max; const cE = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' }; const uE = { start: 'end', end: 'start' }; function hh(e, t, n) { return Do(e, ya(t, n)) } function Jo(e, t) { return typeof e == 'function' ? e(t) : e } function ti(e) { return e.split('-')[0] } function Mr(e) { return e.split('-')[1] } function kw(e) { return e === 'x' ? 'y' : 'x' } function vp(e) { return e === 'y' ? 'height' : 'width' } function Wa(e) { return ['top', 'bottom'].includes(ti(e)) ? 'y' : 'x' } function yp(e) { return kw(Wa(e)) } function Tw(e, t, n) { n === void 0 && (n = !1); const i = Mr(e); const s = yp(e); const l = vp(s); let u = s === 'x' ? i === (n ? 'end' : 'start') ? 'right' : 'left' : i === 'start' ? 'bottom' : 'top'; return t.reference[l] > t.floating[l] && (u = Su(u)), [u, Su(u)] } function fE(e) { const t = Su(e); return [xu(e), t, xu(t)] } function xu(e) { return e.replace(/start|end/g, t => uE[t]) } function dE(e, t, n) { const i = ['left', 'right']; const s = ['right', 'left']; const l = ['top', 'bottom']; const u = ['bottom', 'top']; switch (e) { case 'top':case 'bottom':return n ? t ? s : i : t ? i : s; case 'left':case 'right':return t ? l : u; default:return [] } } function hE(e, t, n, i) { const s = Mr(e); let l = dE(ti(e), n === 'start', i); return s && (l = l.map(u => `${u}-${s}`), t && (l = l.concat(l.map(xu)))), l } function Su(e) { return e.replace(/left|right|bottom|top/g, t => cE[t]) } function pE(e) { return { top: 0, right: 0, bottom: 0, left: 0, ...e } } function Cw(e) { return typeof e != 'number' ? pE(e) : { top: e, right: e, bottom: e, left: e } } function na(e) { return { ...e, top: e.y, left: e.x, right: e.x + e.width, bottom: e.y + e.height } } function Ov(e, t, n) { const { reference: i, floating: s } = e; const l = Wa(t); const u = yp(t); const f = vp(u); const h = ti(t); const p = l === 'y'; const g = i.x + i.width / 2 - s.width / 2; const v = i.y + i.height / 2 - s.height / 2; const y = i[f] / 2 - s[f] / 2; let w; switch (h) { case 'top':w = { x: g, y: i.y - s.height }; break; case 'bottom':w = { x: g, y: i.y + i.height }; break; case 'right':w = { x: i.x + i.width, y: v }; break; case 'left':w = { x: i.x - s.width, y: v }; break; default:w = { x: i.x, y: i.y } } switch (Mr(t)) { case 'start':w[u] -= y * (n && p ? -1 : 1); break; case 'end':w[u] += y * (n && p ? -1 : 1); break } return w } async function gE(e, t, n) { const { placement: i = 'bottom', strategy: s = 'absolute', middleware: l = [], platform: u } = n; const f = l.filter(Boolean); const h = await (u.isRTL == null ? void 0 : u.isRTL(t)); let p = await u.getElementRects({ reference: e, floating: t, strategy: s }); let { x: g, y: v } = Ov(p, i, h); let y = i; let w = {}; let L = 0; for (let $ = 0; $ < f.length; $++) { const { name: A, fn: E } = f[$]; const { x: M, y: O, data: k, reset: z } = await E({ x: g, y: v, initialPlacement: i, placement: y, strategy: s, middlewareData: w, rects: p, platform: u, elements: { reference: e, floating: t } }); g = M ?? g, v = O ?? v, w = { ...w, [A]: { ...w[A], ...k } }, z && L <= 50 && (L++, typeof z == 'object' && (z.placement && (y = z.placement), z.rects && (p = z.rects === !0 ? await u.getElementRects({ reference: e, floating: t, strategy: s }) : z.rects), { x: g, y: v } = Ov(p, y, h)), $ = -1) } return { x: g, y: v, placement: y, strategy: s, middlewareData: w } } async function of(e, t) { let n; t === void 0 && (t = {}); const { x: i, y: s, platform: l, rects: u, elements: f, strategy: h } = e; const { boundary: p = 'clippingAncestors', rootBoundary: g = 'viewport', elementContext: v = 'floating', altBoundary: y = !1, padding: w = 0 } = Jo(t, e); const L = Cw(w); const A = f[y ? v === 'floating' ? 'reference' : 'floating' : v]; const E = na(await l.getClippingRect({ element: (n = await (l.isElement == null ? void 0 : l.isElement(A))) == null || n ? A : A.contextElement || await (l.getDocumentElement == null ? void 0 : l.getDocumentElement(f.floating)), boundary: p, rootBoundary: g, strategy: h })); const M = v === 'floating' ? { ...u.floating, x: i, y: s } : u.reference; const O = await (l.getOffsetParent == null ? void 0 : l.getOffsetParent(f.floating)); const k = await (l.isElement == null ? void 0 : l.isElement(O)) ? await (l.getScale == null ? void 0 : l.getScale(O)) || { x: 1, y: 1 } : { x: 1, y: 1 }; const z = na(l.convertOffsetParentRelativeRectToViewportRelativeRect ? await l.convertOffsetParentRelativeRectToViewportRelativeRect({ elements: f, rect: M, offsetParent: O, strategy: h }) : M); return { top: (E.top - z.top + L.top) / k.y, bottom: (z.bottom - E.bottom + L.bottom) / k.y, left: (E.left - z.left + L.left) / k.x, right: (z.right - E.right + L.right) / k.x } } function mE(e) {
  return { name: 'arrow', options: e, async fn(t) {
    const { x: n, y: i, placement: s, rects: l, platform: u, elements: f, middlewareData: h } = t; const { element: p, padding: g = 0 } = Jo(e, t) || {}; if (p == null)
      return {}; const v = Cw(g); const y = { x: n, y: i }; const w = yp(s); const L = vp(w); const $ = await u.getDimensions(p); const A = w === 'y'; const E = A ? 'top' : 'left'; const M = A ? 'bottom' : 'right'; const O = A ? 'clientHeight' : 'clientWidth'; const k = l.reference[L] + l.reference[w] - y[w] - l.floating[L]; const z = y[w] - l.reference[w]; const D = await (u.getOffsetParent == null ? void 0 : u.getOffsetParent(p)); let te = D ? D[O] : 0; (!te || !await (u.isElement == null ? void 0 : u.isElement(D))) && (te = f.floating[O] || l.floating[L]); const ee = k / 2 - z / 2; const W = te / 2 - $[L] / 2 - 1; const q = ya(v[E], W); const K = ya(v[M], W); const C = q; const P = te - $[L] - K; const I = te / 2 - $[L] / 2 + ee; const S = hh(C, I, P); const R = !h.arrow && Mr(s) != null && I !== S && l.reference[L] / 2 - (I < C ? q : K) - $[L] / 2 < 0; const B = R ? I < C ? I - C : I - P : 0; return { [w]: y[w] + B, data: { [w]: S, centerOffset: I - S - B, ...R && { alignmentOffset: B } }, reset: R }
  } }
} function vE(e, t, n) { return (e ? [...n.filter(s => Mr(s) === e), ...n.filter(s => Mr(s) !== e)] : n.filter(s => ti(s) === s)).filter(s => e ? Mr(s) === e || (t ? xu(s) !== s : !1) : !0) } function yE(e) {
  return e === void 0 && (e = {}), { name: 'autoPlacement', options: e, async fn(t) {
    let n, i, s; const { rects: l, middlewareData: u, placement: f, platform: h, elements: p } = t; const { crossAxis: g = !1, alignment: v, allowedPlacements: y = Pv, autoAlignment: w = !0, ...L } = Jo(e, t); const $ = v !== void 0 || y === Pv ? vE(v || null, w, y) : y; const A = await of(t, L); const E = ((n = u.autoPlacement) == null ? void 0 : n.index) || 0; const M = $[E]; if (M == null)
      return {}; const O = Tw(M, l, await (h.isRTL == null ? void 0 : h.isRTL(p.floating))); if (f !== M)
      return { reset: { placement: $[0] } }; const k = [A[ti(M)], A[O[0]], A[O[1]]]; const z = [...((i = u.autoPlacement) == null ? void 0 : i.overflows) || [], { placement: M, overflows: k }]; const D = $[E + 1]; if (D)
      return { data: { index: E + 1, overflows: z }, reset: { placement: D } }; const te = z.map((q) => { const K = Mr(q.placement); return [q.placement, K && g ? q.overflows.slice(0, 2).reduce((C, P) => C + P, 0) : q.overflows[0], q.overflows] }).sort((q, K) => q[1] - K[1]); const W = ((s = te.filter(q => q[2].slice(0, Mr(q[0]) ? 2 : 3).every(K => K <= 0))[0]) == null ? void 0 : s[0]) || te[0][0]; return W !== f ? { data: { index: E + 1, overflows: z }, reset: { placement: W } } : {}
  } }
} function bE(e) {
  return e === void 0 && (e = {}), { name: 'flip', options: e, async fn(t) {
    let n, i; const { placement: s, middlewareData: l, rects: u, initialPlacement: f, platform: h, elements: p } = t; const { mainAxis: g = !0, crossAxis: v = !0, fallbackPlacements: y, fallbackStrategy: w = 'bestFit', fallbackAxisSideDirection: L = 'none', flipAlignment: $ = !0, ...A } = Jo(e, t); if ((n = l.arrow) != null && n.alignmentOffset)
      return {}; const E = ti(s); const M = ti(f) === f; const O = await (h.isRTL == null ? void 0 : h.isRTL(p.floating)); const k = y || (M || !$ ? [Su(f)] : fE(f)); !y && L !== 'none' && k.push(...hE(f, $, L, O)); const z = [f, ...k]; const D = await of(t, A); const te = []; let ee = ((i = l.flip) == null ? void 0 : i.overflows) || []; if (g && te.push(D[E]), v) { const C = Tw(s, u, O); te.push(D[C[0]], D[C[1]]) } if (ee = [...ee, { placement: s, overflows: te }], !te.every(C => C <= 0)) {
      let W, q; const C = (((W = l.flip) == null ? void 0 : W.index) || 0) + 1; const P = z[C]; if (P)
        return { data: { index: C, overflows: ee }, reset: { placement: P } }; let I = (q = ee.filter(S => S.overflows[0] <= 0).sort((S, R) => S.overflows[1] - R.overflows[1])[0]) == null ? void 0 : q.placement; if (!I)
        switch (w) { case 'bestFit':{ let K; const S = (K = ee.map(R => [R.placement, R.overflows.filter(B => B > 0).reduce((B, oe) => B + oe, 0)]).sort((R, B) => R[1] - B[1])[0]) == null ? void 0 : K[0]; S && (I = S); break } case 'initialPlacement':I = f; break } if (s !== I)
        return { reset: { placement: I } }
    } return {}
  } }
} async function wE(e, t) { const { placement: n, platform: i, elements: s } = e; const l = await (i.isRTL == null ? void 0 : i.isRTL(s.floating)); const u = ti(n); const f = Mr(n); const h = Wa(n) === 'y'; const p = ['left', 'top'].includes(u) ? -1 : 1; const g = l && h ? -1 : 1; const v = Jo(t, e); let { mainAxis: y, crossAxis: w, alignmentAxis: L } = typeof v == 'number' ? { mainAxis: v, crossAxis: 0, alignmentAxis: null } : { mainAxis: 0, crossAxis: 0, alignmentAxis: null, ...v }; return f && typeof L == 'number' && (w = f === 'end' ? L * -1 : L), h ? { x: w * g, y: y * p } : { x: y * p, y: w * g } } function xE(e) { return e === void 0 && (e = 0), { name: 'offset', options: e, async fn(t) { let n, i; const { x: s, y: l, placement: u, middlewareData: f } = t; const h = await wE(t, e); return u === ((n = f.offset) == null ? void 0 : n.placement) && (i = f.arrow) != null && i.alignmentOffset ? {} : { x: s + h.x, y: l + h.y, data: { ...h, placement: u } } } } } function SE(e) { return e === void 0 && (e = {}), { name: 'shift', options: e, async fn(t) { const { x: n, y: i, placement: s } = t; const { mainAxis: l = !0, crossAxis: u = !1, limiter: f = { fn: (A) => { const { x: E, y: M } = A; return { x: E, y: M } } }, ...h } = Jo(e, t); const p = { x: n, y: i }; const g = await of(t, h); const v = Wa(ti(s)); const y = kw(v); let w = p[y]; let L = p[v]; if (l) { const A = y === 'y' ? 'top' : 'left'; const E = y === 'y' ? 'bottom' : 'right'; const M = w + g[A]; const O = w - g[E]; w = hh(M, w, O) } if (u) { const A = v === 'y' ? 'top' : 'left'; const E = v === 'y' ? 'bottom' : 'right'; const M = L + g[A]; const O = L - g[E]; L = hh(M, L, O) } const $ = f.fn({ ...t, [y]: w, [v]: L }); return { ...$, data: { x: $.x - n, y: $.y - i } } } } } function _E(e) {
  return e === void 0 && (e = {}), { name: 'size', options: e, async fn(t) {
    const { placement: n, rects: i, platform: s, elements: l } = t; const { apply: u = () => {}, ...f } = Jo(e, t); const h = await of(t, f); const p = ti(n); const g = Mr(n); const v = Wa(n) === 'y'; const { width: y, height: w } = i.floating; let L, $; p === 'top' || p === 'bottom' ? (L = p, $ = g === (await (s.isRTL == null ? void 0 : s.isRTL(l.floating)) ? 'start' : 'end') ? 'left' : 'right') : ($ = p, L = g === 'end' ? 'top' : 'bottom'); const A = w - h[L]; const E = y - h[$]; const M = !t.middlewareData.shift; let O = A; let k = E; if (v) { const D = y - h.left - h.right; k = g || M ? ya(E, D) : D }
    else { const D = w - h.top - h.bottom; O = g || M ? ya(A, D) : D } if (M && !g) { const D = Do(h.left, 0); const te = Do(h.right, 0); const ee = Do(h.top, 0); const W = Do(h.bottom, 0); v ? k = y - 2 * (D !== 0 || te !== 0 ? D + te : Do(h.left, h.right)) : O = w - 2 * (ee !== 0 || W !== 0 ? ee + W : Do(h.top, h.bottom)) } await u({ ...t, availableWidth: k, availableHeight: O }); const z = await s.getDimensions(l.floating); return y !== z.width || w !== z.height ? { reset: { rects: !0 } } : {}
  } }
} function fr(e) { let t; return ((t = e.ownerDocument) == null ? void 0 : t.defaultView) || window } function Zr(e) { return fr(e).getComputedStyle(e) } const Rv = Math.min; const ra = Math.max; const _u = Math.round; function Ew(e) { const t = Zr(e); let n = Number.parseFloat(t.width); let i = Number.parseFloat(t.height); const s = e.offsetWidth; const l = e.offsetHeight; const u = _u(n) !== s || _u(i) !== l; return u && (n = s, i = l), { width: n, height: i, fallback: u } } function ho(e) { return Lw(e) ? (e.nodeName || '').toLowerCase() : '' } let Pc; function Aw() {
  if (Pc)
    return Pc; const e = navigator.userAgentData; return e && Array.isArray(e.brands) ? (Pc = e.brands.map(t => `${t.brand}/${t.version}`).join(' '), Pc) : navigator.userAgent
} function Qr(e) { return e instanceof fr(e).HTMLElement } function io(e) { return e instanceof fr(e).Element } function Lw(e) { return e instanceof fr(e).Node } function zv(e) { return typeof ShadowRoot > 'u' ? !1 : e instanceof fr(e).ShadowRoot || e instanceof ShadowRoot } function sf(e) { const { overflow: t, overflowX: n, overflowY: i, display: s } = Zr(e); return /auto|scroll|overlay|hidden|clip/.test(t + i + n) && !['inline', 'contents'].includes(s) } function kE(e) { return ['table', 'td', 'th'].includes(ho(e)) } function ph(e) { const t = /firefox/i.test(Aw()); const n = Zr(e); const i = n.backdropFilter || n.WebkitBackdropFilter; return n.transform !== 'none' || n.perspective !== 'none' || !!i && i !== 'none' || t && n.willChange === 'filter' || t && !!n.filter && n.filter !== 'none' || ['transform', 'perspective'].some(s => n.willChange.includes(s)) || ['paint', 'layout', 'strict', 'content'].some((s) => { const l = n.contain; return l != null && l.includes(s) }) } function $w() { return !/^((?!chrome|android).)*safari/i.test(Aw()) } function bp(e) { return ['html', 'body', '#document'].includes(ho(e)) } function Mw(e) { return io(e) ? e : e.contextElement } const Nw = { x: 1, y: 1 }; function Bs(e) {
  const t = Mw(e); if (!Qr(t))
    return Nw; const n = t.getBoundingClientRect(); const { width: i, height: s, fallback: l } = Ew(t); let u = (l ? _u(n.width) : n.width) / i; let f = (l ? _u(n.height) : n.height) / s; return u && Number.isFinite(u) || (u = 1), f && Number.isFinite(f) || (f = 1), { x: u, y: f }
} function ba(e, t, n, i) { let s, l; t === void 0 && (t = !1), n === void 0 && (n = !1); const u = e.getBoundingClientRect(); const f = Mw(e); let h = Nw; t && (i ? io(i) && (h = Bs(i)) : h = Bs(e)); const p = f ? fr(f) : window; const g = !$w() && n; let v = (u.left + (g && ((s = p.visualViewport) == null ? void 0 : s.offsetLeft) || 0)) / h.x; let y = (u.top + (g && ((l = p.visualViewport) == null ? void 0 : l.offsetTop) || 0)) / h.y; let w = u.width / h.x; let L = u.height / h.y; if (f) { const $ = fr(f); const A = i && io(i) ? fr(i) : i; let E = $.frameElement; for (;E && i && A !== $;) { const M = Bs(E); const O = E.getBoundingClientRect(); const k = getComputedStyle(E); O.x += (E.clientLeft + Number.parseFloat(k.paddingLeft)) * M.x, O.y += (E.clientTop + Number.parseFloat(k.paddingTop)) * M.y, v *= M.x, y *= M.y, w *= M.x, L *= M.y, v += O.x, y += O.y, E = fr(E).frameElement } } return { width: w, height: L, top: y, right: v + w, bottom: y + L, left: v, x: v, y } } function oo(e) { return ((Lw(e) ? e.ownerDocument : e.document) || window.document).documentElement } function lf(e) { return io(e) ? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop } : { scrollLeft: e.pageXOffset, scrollTop: e.pageYOffset } } function Iw(e) { return ba(oo(e)).left + lf(e).scrollLeft } function wa(e) {
  if (ho(e) === 'html')
    return e; const t = e.assignedSlot || e.parentNode || zv(e) && e.host || oo(e); return zv(t) ? t.host : t
} function Pw(e) { const t = wa(e); return bp(t) ? t.ownerDocument.body : Qr(t) && sf(t) ? t : Pw(t) } function ku(e, t) { let n; t === void 0 && (t = []); const i = Pw(e); const s = i === ((n = e.ownerDocument) == null ? void 0 : n.body); const l = fr(i); return s ? t.concat(l, l.visualViewport || [], sf(i) ? i : []) : t.concat(i, ku(i)) } function Dv(e, t, n) { return t === 'viewport' ? na(function (i, s) { const l = fr(i); const u = oo(i); const f = l.visualViewport; let h = u.clientWidth; let p = u.clientHeight; let g = 0; let v = 0; if (f) { h = f.width, p = f.height; const y = $w(); (y || !y && s === 'fixed') && (g = f.offsetLeft, v = f.offsetTop) } return { width: h, height: p, x: g, y: v } }(e, n)) : io(t) ? na(function (i, s) { const l = ba(i, !0, s === 'fixed'); const u = l.top + i.clientTop; const f = l.left + i.clientLeft; const h = Qr(i) ? Bs(i) : { x: 1, y: 1 }; return { width: i.clientWidth * h.x, height: i.clientHeight * h.y, x: f * h.x, y: u * h.y } }(t, n)) : na(function (i) { const s = oo(i); const l = lf(i); const u = i.ownerDocument.body; const f = ra(s.scrollWidth, s.clientWidth, u.scrollWidth, u.clientWidth); const h = ra(s.scrollHeight, s.clientHeight, u.scrollHeight, u.clientHeight); let p = -l.scrollLeft + Iw(i); const g = -l.scrollTop; return Zr(u).direction === 'rtl' && (p += ra(s.clientWidth, u.clientWidth) - f), { width: f, height: h, x: p, y: g } }(oo(e))) } function Fv(e) { return Qr(e) && Zr(e).position !== 'fixed' ? e.offsetParent : null } function Hv(e) {
  const t = fr(e); let n = Fv(e); for (;n && kE(n) && Zr(n).position === 'static';)n = Fv(n); return n && (ho(n) === 'html' || ho(n) === 'body' && Zr(n).position === 'static' && !ph(n))
    ? t
    : n || (function (i) {
      let s = wa(i); for (;Qr(s) && !bp(s);) {
        if (ph(s))
          return s; s = wa(s)
      } return null
    }(e)) || t
} function TE(e, t, n) {
  const i = Qr(t); const s = oo(t); const l = ba(e, !0, n === 'fixed', t); let u = { scrollLeft: 0, scrollTop: 0 }; const f = { x: 0, y: 0 }; if (i || !i && n !== 'fixed') {
    if ((ho(t) !== 'body' || sf(s)) && (u = lf(t)), Qr(t)) { const h = ba(t, !0); f.x = h.x + t.clientLeft, f.y = h.y + t.clientTop }
    else {
      s && (f.x = Iw(s))
    }
  } return { x: l.left + u.scrollLeft - f.x, y: l.top + u.scrollTop - f.y, width: l.width, height: l.height }
} const CE = { getClippingRect(e) {
  const { element: t, boundary: n, rootBoundary: i, strategy: s } = e; const l = n === 'clippingAncestors'
    ? (function (p, g) {
        const v = g.get(p); if (v)
          return v; let y = ku(p).filter(A => io(A) && ho(A) !== 'body'); let w = null; const L = Zr(p).position === 'fixed'; let $ = L ? wa(p) : p; for (;io($) && !bp($);) { const A = Zr($); const E = ph($); (L ? E || w : E || A.position !== 'static' || !w || !['absolute', 'fixed'].includes(w.position)) ? w = A : y = y.filter(M => M !== $), $ = wa($) } return g.set(p, y), y
      }(t, this._c))
    : [].concat(n); const u = [...l, i]; const f = u[0]; const h = u.reduce((p, g) => { const v = Dv(t, g, s); return p.top = ra(v.top, p.top), p.right = Rv(v.right, p.right), p.bottom = Rv(v.bottom, p.bottom), p.left = ra(v.left, p.left), p }, Dv(t, f, s)); return { width: h.right - h.left, height: h.bottom - h.top, x: h.left, y: h.top }
}, convertOffsetParentRelativeRectToViewportRelativeRect(e) {
  const { rect: t, offsetParent: n, strategy: i } = e; const s = Qr(n); const l = oo(n); if (n === l)
    return t; let u = { scrollLeft: 0, scrollTop: 0 }; let f = { x: 1, y: 1 }; const h = { x: 0, y: 0 }; if ((s || !s && i !== 'fixed') && ((ho(n) !== 'body' || sf(l)) && (u = lf(n)), Qr(n))) { const p = ba(n); f = Bs(n), h.x = p.x + n.clientLeft, h.y = p.y + n.clientTop } return { width: t.width * f.x, height: t.height * f.y, x: t.x * f.x - u.scrollLeft * f.x + h.x, y: t.y * f.y - u.scrollTop * f.y + h.y }
}, isElement: io, getDimensions(e) { return Qr(e) ? Ew(e) : e.getBoundingClientRect() }, getOffsetParent: Hv, getDocumentElement: oo, getScale: Bs, async getElementRects(e) { const { reference: t, floating: n, strategy: i } = e; const s = this.getOffsetParent || Hv; const l = this.getDimensions; return { reference: TE(t, await s(n), i), floating: { x: 0, y: 0, ...await l(n) } } }, getClientRects: e => Array.from(e.getClientRects()), isRTL: e => Zr(e).direction === 'rtl' }; function EE(e, t, n) { const i = new Map(); const s = { platform: CE, ...n }; const l = { ...s.platform, _c: i }; return gE(e, t, { ...s, platform: l }) } const so = { disabled: !1, distance: 5, skidding: 0, container: 'body', boundary: void 0, instantMove: !1, disposeTimeout: 150, popperTriggers: [], strategy: 'absolute', preventOverflow: !0, flip: !0, shift: !0, overflowPadding: 0, arrowPadding: 0, arrowOverflow: !0, autoHideOnMousedown: !1, themes: { tooltip: { placement: 'top', triggers: ['hover', 'focus', 'touch'], hideTriggers: e => [...e, 'click'], delay: { show: 200, hide: 0 }, handleResize: !1, html: !1, loadingContent: '...' }, dropdown: { placement: 'bottom', triggers: ['click'], delay: 0, handleResize: !0, autoHide: !0 }, menu: { $extend: 'dropdown', triggers: ['hover', 'focus'], popperTriggers: ['hover'], delay: { show: 0, hide: 400 } } } }; function xa(e, t) { let n = so.themes[e] || {}; let i; do i = n[t], typeof i > 'u' ? n.$extend ? n = so.themes[n.$extend] || {} : (n = null, i = so[t]) : n = null; while (n); return i } function AE(e) { const t = [e]; let n = so.themes[e] || {}; do n.$extend && !n.$resetCss ? (t.push(n.$extend), n = so.themes[n.$extend] || {}) : n = null; while (n); return t.map(i => `v-popper--theme-${i}`) } function Bv(e) { const t = [e]; let n = so.themes[e] || {}; do n.$extend ? (t.push(n.$extend), n = so.themes[n.$extend] || {}) : n = null; while (n); return t } let Sa = !1; if (typeof window < 'u') {
  Sa = !1; try { const e = Object.defineProperty({}, 'passive', { get() { Sa = !0 } }); window.addEventListener('test', null, e) }
  catch {}
} let Ow = !1; typeof window < 'u' && typeof navigator < 'u' && (Ow = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream); const Rw = ['auto', 'top', 'bottom', 'left', 'right'].reduce((e, t) => e.concat([t, `${t}-start`, `${t}-end`]), []); const Wv = { hover: 'mouseenter', focus: 'focus', click: 'click', touch: 'touchstart', pointer: 'pointerdown' }; const jv = { hover: 'mouseleave', focus: 'blur', click: 'click', touch: 'touchend', pointer: 'pointerup' }; function qv(e, t) { const n = e.indexOf(t); n !== -1 && e.splice(n, 1) } function Td() { return new Promise(e => requestAnimationFrame(() => { requestAnimationFrame(e) })) } const tr = []; let Ro = null; const Uv = {}; function Vv(e) { let t = Uv[e]; return t || (t = Uv[e] = []), t } let gh = function () {}; typeof window < 'u' && (gh = window.Element); function ft(e) { return function (t) { return xa(t.theme, e) } } const Cd = '__floating-vue__popper'; function zw() {
  return at({ name: 'VPopper', provide() { return { [Cd]: { parentPopper: this } } }, inject: { [Cd]: { default: null } }, props: { theme: { type: String, required: !0 }, targetNodes: { type: Function, required: !0 }, referenceNode: { type: Function, default: null }, popperNode: { type: Function, required: !0 }, shown: { type: Boolean, default: !1 }, showGroup: { type: String, default: null }, ariaId: { default: null }, disabled: { type: Boolean, default: ft('disabled') }, positioningDisabled: { type: Boolean, default: ft('positioningDisabled') }, placement: { type: String, default: ft('placement'), validator: e => Rw.includes(e) }, delay: { type: [String, Number, Object], default: ft('delay') }, distance: { type: [Number, String], default: ft('distance') }, skidding: { type: [Number, String], default: ft('skidding') }, triggers: { type: Array, default: ft('triggers') }, showTriggers: { type: [Array, Function], default: ft('showTriggers') }, hideTriggers: { type: [Array, Function], default: ft('hideTriggers') }, popperTriggers: { type: Array, default: ft('popperTriggers') }, popperShowTriggers: { type: [Array, Function], default: ft('popperShowTriggers') }, popperHideTriggers: { type: [Array, Function], default: ft('popperHideTriggers') }, container: { type: [String, Object, gh, Boolean], default: ft('container') }, boundary: { type: [String, gh], default: ft('boundary') }, strategy: { type: String, validator: e => ['absolute', 'fixed'].includes(e), default: ft('strategy') }, autoHide: { type: [Boolean, Function], default: ft('autoHide') }, handleResize: { type: Boolean, default: ft('handleResize') }, instantMove: { type: Boolean, default: ft('instantMove') }, eagerMount: { type: Boolean, default: ft('eagerMount') }, popperClass: { type: [String, Array, Object], default: ft('popperClass') }, computeTransformOrigin: { type: Boolean, default: ft('computeTransformOrigin') }, autoMinSize: { type: Boolean, default: ft('autoMinSize') }, autoSize: { type: [Boolean, String], default: ft('autoSize') }, autoMaxSize: { type: Boolean, default: ft('autoMaxSize') }, autoBoundaryMaxSize: { type: Boolean, default: ft('autoBoundaryMaxSize') }, preventOverflow: { type: Boolean, default: ft('preventOverflow') }, overflowPadding: { type: [Number, String], default: ft('overflowPadding') }, arrowPadding: { type: [Number, String], default: ft('arrowPadding') }, arrowOverflow: { type: Boolean, default: ft('arrowOverflow') }, flip: { type: Boolean, default: ft('flip') }, shift: { type: Boolean, default: ft('shift') }, shiftCrossAxis: { type: Boolean, default: ft('shiftCrossAxis') }, noAutoFocus: { type: Boolean, default: ft('noAutoFocus') }, disposeTimeout: { type: Number, default: ft('disposeTimeout') } }, emits: { 'show': () => !0, 'hide': () => !0, 'update:shown': e => !0, 'apply-show': () => !0, 'apply-hide': () => !0, 'close-group': () => !0, 'close-directive': () => !0, 'auto-hide': () => !0, 'resize': () => !0 }, data() { return { isShown: !1, isMounted: !1, skipTransition: !1, classes: { showFrom: !1, showTo: !1, hideFrom: !1, hideTo: !0 }, result: { x: 0, y: 0, placement: '', strategy: this.strategy, arrow: { x: 0, y: 0, centerOffset: 0 }, transformOrigin: null }, randomId: `popper_${[Math.random(), Date.now()].map(e => e.toString(36).substring(2, 10)).join('_')}`, shownChildren: new Set(), lastAutoHide: !0, pendingHide: !1, containsGlobalTarget: !1, isDisposed: !0, mouseDownContains: !1 } }, computed: { popperId() { return this.ariaId != null ? this.ariaId : this.randomId }, shouldMountContent() { return this.eagerMount || this.isMounted }, slotData() { return { popperId: this.popperId, isShown: this.isShown, shouldMountContent: this.shouldMountContent, skipTransition: this.skipTransition, autoHide: typeof this.autoHide == 'function' ? this.lastAutoHide : this.autoHide, show: this.show, hide: this.hide, handleResize: this.handleResize, onResize: this.onResize, classes: { ...this.classes, popperClass: this.popperClass }, result: this.positioningDisabled ? null : this.result, attrs: this.$attrs } }, parentPopper() { let e; return (e = this[Cd]) == null ? void 0 : e.parentPopper }, hasPopperShowTriggerHover() { let e, t; return ((e = this.popperTriggers) == null ? void 0 : e.includes('hover')) || ((t = this.popperShowTriggers) == null ? void 0 : t.includes('hover')) } }, watch: { shown: '$_autoShowHide', disabled(e) { e ? this.dispose() : this.init() }, async container() { this.isShown && (this.$_ensureTeleport(), await this.$_computePosition()) }, triggers: { handler: '$_refreshListeners', deep: !0 }, positioningDisabled: '$_refreshListeners', ...['placement', 'distance', 'skidding', 'boundary', 'strategy', 'overflowPadding', 'arrowPadding', 'preventOverflow', 'shift', 'shiftCrossAxis', 'flip'].reduce((e, t) => (e[t] = '$_computePosition', e), {}) }, created() { this.autoMinSize && console.warn('[floating-vue] `autoMinSize` option is deprecated. Use `autoSize="min"` instead.'), this.autoMaxSize && console.warn('[floating-vue] `autoMaxSize` option is deprecated. Use `autoBoundaryMaxSize` instead.') }, mounted() { this.init(), this.$_detachPopperNode() }, activated() { this.$_autoShowHide() }, deactivated() { this.hide() }, beforeUnmount() { this.dispose() }, methods: { show({ event: e = null, skipDelay: t = !1, force: n = !1 } = {}) { let i, s; (i = this.parentPopper) != null && i.lockedChild && this.parentPopper.lockedChild !== this || (this.pendingHide = !1, (n || !this.disabled) && (((s = this.parentPopper) == null ? void 0 : s.lockedChild) === this && (this.parentPopper.lockedChild = null), this.$_scheduleShow(e, t), this.$emit('show'), this.$_showFrameLocked = !0, requestAnimationFrame(() => { this.$_showFrameLocked = !1 })), this.$emit('update:shown', !0)) }, hide({ event: e = null, skipDelay: t = !1 } = {}) { let n; if (!this.$_hideInProgress) { if (this.shownChildren.size > 0) { this.pendingHide = !0; return } if (this.hasPopperShowTriggerHover && this.$_isAimingPopper()) { this.parentPopper && (this.parentPopper.lockedChild = this, clearTimeout(this.parentPopper.lockedChildTimer), this.parentPopper.lockedChildTimer = setTimeout(() => { this.parentPopper.lockedChild === this && (this.parentPopper.lockedChild.hide({ skipDelay: t }), this.parentPopper.lockedChild = null) }, 1e3)); return }((n = this.parentPopper) == null ? void 0 : n.lockedChild) === this && (this.parentPopper.lockedChild = null), this.pendingHide = !1, this.$_scheduleHide(e, t), this.$emit('hide'), this.$emit('update:shown', !1) } }, init() { let e; this.isDisposed && (this.isDisposed = !1, this.isMounted = !1, this.$_events = [], this.$_preventShow = !1, this.$_referenceNode = ((e = this.referenceNode) == null ? void 0 : e.call(this)) ?? this.$el, this.$_targetNodes = this.targetNodes().filter(t => t.nodeType === t.ELEMENT_NODE), this.$_popperNode = this.popperNode(), this.$_innerNode = this.$_popperNode.querySelector('.v-popper__inner'), this.$_arrowNode = this.$_popperNode.querySelector('.v-popper__arrow-container'), this.$_swapTargetAttrs('title', 'data-original-title'), this.$_detachPopperNode(), this.triggers.length && this.$_addEventListeners(), this.shown && this.show()) }, dispose() { this.isDisposed || (this.isDisposed = !0, this.$_removeEventListeners(), this.hide({ skipDelay: !0 }), this.$_detachPopperNode(), this.isMounted = !1, this.isShown = !1, this.$_updateParentShownChildren(!1), this.$_swapTargetAttrs('data-original-title', 'title')) }, async onResize() { this.isShown && (await this.$_computePosition(), this.$emit('resize')) }, async $_computePosition() {
    if (this.isDisposed || this.positioningDisabled)
      return; const e = { strategy: this.strategy, middleware: [] }; (this.distance || this.skidding) && e.middleware.push(xE({ mainAxis: this.distance, crossAxis: this.skidding })); const t = this.placement.startsWith('auto'); if (t ? e.middleware.push(yE({ alignment: this.placement.split('-')[1] ?? '' })) : e.placement = this.placement, this.preventOverflow && (this.shift && e.middleware.push(SE({ padding: this.overflowPadding, boundary: this.boundary, crossAxis: this.shiftCrossAxis })), !t && this.flip && e.middleware.push(bE({ padding: this.overflowPadding, boundary: this.boundary }))), e.middleware.push(mE({ element: this.$_arrowNode, padding: this.arrowPadding })), this.arrowOverflow && e.middleware.push({ name: 'arrowOverflow', fn: ({ placement: i, rects: s, middlewareData: l }) => { let u; const { centerOffset: f } = l.arrow; return i.startsWith('top') || i.startsWith('bottom') ? u = Math.abs(f) > s.reference.width / 2 : u = Math.abs(f) > s.reference.height / 2, { data: { overflow: u } } } }), this.autoMinSize || this.autoSize) {
      const i = this.autoSize ? this.autoSize : this.autoMinSize ? 'min' : null; e.middleware.push({ name: 'autoSize', fn: ({ rects: s, placement: l, middlewareData: u }) => {
        let f; if ((f = u.autoSize) != null && f.skip)
          return {}; let h, p; return l.startsWith('top') || l.startsWith('bottom') ? h = s.reference.width : p = s.reference.height, this.$_innerNode.style[i === 'min' ? 'minWidth' : i === 'max' ? 'maxWidth' : 'width'] = h != null ? `${h}px` : null, this.$_innerNode.style[i === 'min' ? 'minHeight' : i === 'max' ? 'maxHeight' : 'height'] = p != null ? `${p}px` : null, { data: { skip: !0 }, reset: { rects: !0 } }
      } })
    }(this.autoMaxSize || this.autoBoundaryMaxSize) && (this.$_innerNode.style.maxWidth = null, this.$_innerNode.style.maxHeight = null, e.middleware.push(_E({ boundary: this.boundary, padding: this.overflowPadding, apply: ({ availableWidth: i, availableHeight: s }) => { this.$_innerNode.style.maxWidth = i != null ? `${i}px` : null, this.$_innerNode.style.maxHeight = s != null ? `${s}px` : null } }))); const n = await EE(this.$_referenceNode, this.$_popperNode, e); Object.assign(this.result, { x: n.x, y: n.y, placement: n.placement, strategy: n.strategy, arrow: { ...n.middlewareData.arrow, ...n.middlewareData.arrowOverflow } })
  }, $_scheduleShow(e, t = !1) { if (this.$_updateParentShownChildren(!0), this.$_hideInProgress = !1, clearTimeout(this.$_scheduleTimer), Ro && this.instantMove && Ro.instantMove && Ro !== this.parentPopper) { Ro.$_applyHide(!0), this.$_applyShow(!0); return }t ? this.$_applyShow() : this.$_scheduleTimer = setTimeout(this.$_applyShow.bind(this), this.$_computeDelay('show')) }, $_scheduleHide(e, t = !1) { if (this.shownChildren.size > 0) { this.pendingHide = !0; return } this.$_updateParentShownChildren(!1), this.$_hideInProgress = !0, clearTimeout(this.$_scheduleTimer), this.isShown && (Ro = this), t ? this.$_applyHide() : this.$_scheduleTimer = setTimeout(this.$_applyHide.bind(this), this.$_computeDelay('hide')) }, $_computeDelay(e) { const t = this.delay; return Number.parseInt(t && t[e] || t || 0) }, async $_applyShow(e = !1) { clearTimeout(this.$_disposeTimer), clearTimeout(this.$_scheduleTimer), this.skipTransition = e, !this.isShown && (this.$_ensureTeleport(), await Td(), await this.$_computePosition(), await this.$_applyShowEffect(), this.positioningDisabled || this.$_registerEventListeners([...ku(this.$_referenceNode), ...ku(this.$_popperNode)], 'scroll', () => { this.$_computePosition() })) }, async $_applyShowEffect() {
    if (this.$_hideInProgress)
      return; if (this.computeTransformOrigin) { const t = this.$_referenceNode.getBoundingClientRect(); const n = this.$_popperNode.querySelector('.v-popper__wrapper'); const i = n.parentNode.getBoundingClientRect(); const s = t.x + t.width / 2 - (i.left + n.offsetLeft); const l = t.y + t.height / 2 - (i.top + n.offsetTop); this.result.transformOrigin = `${s}px ${l}px` } this.isShown = !0, this.$_applyAttrsToTarget({ 'aria-describedby': this.popperId, 'data-popper-shown': '' }); const e = this.showGroup; if (e) { let t; for (let n = 0; n < tr.length; n++)t = tr[n], t.showGroup !== e && (t.hide(), t.$emit('close-group')) }tr.push(this), document.body.classList.add('v-popper--some-open'); for (const t of Bv(this.theme))Vv(t).push(this), document.body.classList.add(`v-popper--some-open--${t}`); this.$emit('apply-show'), this.classes.showFrom = !0, this.classes.showTo = !1, this.classes.hideFrom = !1, this.classes.hideTo = !1, await Td(), this.classes.showFrom = !1, this.classes.showTo = !0, this.noAutoFocus || this.$_popperNode.focus()
  }, async $_applyHide(e = !1) {
    if (this.shownChildren.size > 0) { this.pendingHide = !0, this.$_hideInProgress = !1; return } if (clearTimeout(this.$_scheduleTimer), !this.isShown)
      return; this.skipTransition = e, qv(tr, this), tr.length === 0 && document.body.classList.remove('v-popper--some-open'); for (const n of Bv(this.theme)) { const i = Vv(n); qv(i, this), i.length === 0 && document.body.classList.remove(`v-popper--some-open--${n}`) }Ro === this && (Ro = null), this.isShown = !1, this.$_applyAttrsToTarget({ 'aria-describedby': void 0, 'data-popper-shown': void 0 }), clearTimeout(this.$_disposeTimer); const t = this.disposeTimeout; t !== null && (this.$_disposeTimer = setTimeout(() => { this.$_popperNode && (this.$_detachPopperNode(), this.isMounted = !1) }, t)), this.$_removeEventListeners('scroll'), this.$emit('apply-hide'), this.classes.showFrom = !1, this.classes.showTo = !1, this.classes.hideFrom = !0, this.classes.hideTo = !1, await Td(), this.classes.hideFrom = !1, this.classes.hideTo = !0
  }, $_autoShowHide() { this.shown ? this.show() : this.hide() }, $_ensureTeleport() {
    if (this.isDisposed)
      return; let e = this.container; if (typeof e == 'string' ? e = window.document.querySelector(e) : e === !1 && (e = this.$_targetNodes[0].parentNode), !e)
      throw new Error(`No container for popover: ${this.container}`); e.appendChild(this.$_popperNode), this.isMounted = !0
  }, $_addEventListeners() { const e = (n) => { this.isShown && !this.$_hideInProgress || (n.usedByTooltip = !0, !this.$_preventShow && this.show({ event: n })) }; this.$_registerTriggerListeners(this.$_targetNodes, Wv, this.triggers, this.showTriggers, e), this.$_registerTriggerListeners([this.$_popperNode], Wv, this.popperTriggers, this.popperShowTriggers, e); const t = (n) => { n.usedByTooltip || this.hide({ event: n }) }; this.$_registerTriggerListeners(this.$_targetNodes, jv, this.triggers, this.hideTriggers, t), this.$_registerTriggerListeners([this.$_popperNode], jv, this.popperTriggers, this.popperHideTriggers, t) }, $_registerEventListeners(e, t, n) { this.$_events.push({ targetNodes: e, eventType: t, handler: n }), e.forEach(i => i.addEventListener(t, n, Sa ? { passive: !0 } : void 0)) }, $_registerTriggerListeners(e, t, n, i, s) { let l = n; i != null && (l = typeof i == 'function' ? i(l) : i), l.forEach((u) => { const f = t[u]; f && this.$_registerEventListeners(e, f, s) }) }, $_removeEventListeners(e) { const t = []; this.$_events.forEach((n) => { const { targetNodes: i, eventType: s, handler: l } = n; !e || e === s ? i.forEach(u => u.removeEventListener(s, l)) : t.push(n) }), this.$_events = t }, $_refreshListeners() { this.isDisposed || (this.$_removeEventListeners(), this.$_addEventListeners()) }, $_handleGlobalClose(e, t = !1) { this.$_showFrameLocked || (this.hide({ event: e }), e.closePopover ? this.$emit('close-directive') : this.$emit('auto-hide'), t && (this.$_preventShow = !0, setTimeout(() => { this.$_preventShow = !1 }, 300))) }, $_detachPopperNode() { this.$_popperNode.parentNode && this.$_popperNode.parentNode.removeChild(this.$_popperNode) }, $_swapTargetAttrs(e, t) { for (const n of this.$_targetNodes) { const i = n.getAttribute(e); i && (n.removeAttribute(e), n.setAttribute(t, i)) } }, $_applyAttrsToTarget(e) {
    for (const t of this.$_targetNodes) {
      for (const n in e) { const i = e[n]; i == null ? t.removeAttribute(n) : t.setAttribute(n, i) }
    }
  }, $_updateParentShownChildren(e) { let t = this.parentPopper; for (;t;)e ? t.shownChildren.add(this.randomId) : (t.shownChildren.delete(this.randomId), t.pendingHide && t.hide()), t = t.parentPopper }, $_isAimingPopper() { const e = this.$_referenceNode.getBoundingClientRect(); if (ia >= e.left && ia <= e.right && oa >= e.top && oa <= e.bottom) { const t = this.$_popperNode.getBoundingClientRect(); const n = ia - Gi; const i = oa - Xi; const s = t.left + t.width / 2 - Gi + (t.top + t.height / 2) - Xi + t.width + t.height; const l = Gi + n * s; const u = Xi + i * s; return Oc(Gi, Xi, l, u, t.left, t.top, t.left, t.bottom) || Oc(Gi, Xi, l, u, t.left, t.top, t.right, t.top) || Oc(Gi, Xi, l, u, t.right, t.top, t.right, t.bottom) || Oc(Gi, Xi, l, u, t.left, t.bottom, t.right, t.bottom) } return !1 } }, render() { return this.$slots.default(this.slotData) } })
} if (typeof document < 'u' && typeof window < 'u') {
  if (Ow) { const e = Sa ? { passive: !0, capture: !0 } : !0; document.addEventListener('touchstart', t => Gv(t), e), document.addEventListener('touchend', t => Xv(t, !0), e) }
  else {
    window.addEventListener('mousedown', e => Gv(e), !0), window.addEventListener('click', e => Xv(e, !1), !0)
  }window.addEventListener('resize', ME)
} function Gv(e, t) {
  for (let n = 0; n < tr.length; n++) {
    const i = tr[n]; try { i.mouseDownContains = i.popperNode().contains(e.target) }
    catch {}
  }
} function Xv(e, t) { LE(e, t) } function LE(e, t) {
  const n = {}; for (let i = tr.length - 1; i >= 0; i--) {
    const s = tr[i]; try { const l = s.containsGlobalTarget = s.mouseDownContains || s.popperNode().contains(e.target); s.pendingHide = !1, requestAnimationFrame(() => { if (s.pendingHide = !1, !n[s.randomId] && Kv(s, l, e)) { if (s.$_handleGlobalClose(e, t), !e.closeAllPopover && e.closePopover && l) { let f = s.parentPopper; for (;f;)n[f.randomId] = !0, f = f.parentPopper; return } let u = s.parentPopper; for (;u && Kv(u, u.containsGlobalTarget, e);)u.$_handleGlobalClose(e, t), u = u.parentPopper } }) }
    catch {}
  }
} function Kv(e, t, n) { return n.closeAllPopover || n.closePopover && t || $E(e, n) && !t } function $E(e, t) { if (typeof e.autoHide == 'function') { const n = e.autoHide(t); return e.lastAutoHide = n, n } return e.autoHide } function ME() { for (let e = 0; e < tr.length; e++)tr[e].$_computePosition() } function Jv() { for (let e = 0; e < tr.length; e++)tr[e].hide() } let Gi = 0; let Xi = 0; let ia = 0; let oa = 0; typeof window < 'u' && window.addEventListener('mousemove', (e) => { Gi = ia, Xi = oa, ia = e.clientX, oa = e.clientY }, Sa ? { passive: !0 } : void 0); function Oc(e, t, n, i, s, l, u, f) { const h = ((u - s) * (t - l) - (f - l) * (e - s)) / ((f - l) * (n - e) - (u - s) * (i - t)); const p = ((n - e) * (t - l) - (i - t) * (e - s)) / ((f - l) * (n - e) - (u - s) * (i - t)); return h >= 0 && h <= 1 && p >= 0 && p <= 1 } const NE = { extends: zw() }; function af(e, t) { const n = e.__vccOpts || e; for (const [i, s] of t)n[i] = s; return n } function IE(e, t, n, i, s, l) { return se(), ye('div', { ref: 'reference', class: ot(['v-popper', { 'v-popper--shown': e.slotData.isShown }]) }, [xn(e.$slots, 'default', Ik(pw(e.slotData)))], 2) } const PE = af(NE, [['render', IE]]); function OE() {
  const e = window.navigator.userAgent; const t = e.indexOf('MSIE '); if (t > 0)
    return Number.parseInt(e.substring(t + 5, e.indexOf('.', t)), 10); const n = e.indexOf('Trident/'); if (n > 0) { const i = e.indexOf('rv:'); return Number.parseInt(e.substring(i + 3, e.indexOf('.', i)), 10) } const s = e.indexOf('Edge/'); return s > 0 ? Number.parseInt(e.substring(s + 5, e.indexOf('.', s)), 10) : -1
} let Qc; function mh() { mh.init || (mh.init = !0, Qc = OE() !== -1) } const cf = { name: 'ResizeObserver', props: { emitOnMount: { type: Boolean, default: !1 }, ignoreWidth: { type: Boolean, default: !1 }, ignoreHeight: { type: Boolean, default: !1 } }, emits: ['notify'], mounted() { mh(), Et(() => { this._w = this.$el.offsetWidth, this._h = this.$el.offsetHeight, this.emitOnMount && this.emitSize() }); const e = document.createElement('object'); this._resizeObject = e, e.setAttribute('aria-hidden', 'true'), e.setAttribute('tabindex', -1), e.onload = this.addResizeHandlers, e.type = 'text/html', Qc && this.$el.appendChild(e), e.data = 'about:blank', Qc || this.$el.appendChild(e) }, beforeUnmount() { this.removeResizeHandlers() }, methods: { compareAndNotify() { (!this.ignoreWidth && this._w !== this.$el.offsetWidth || !this.ignoreHeight && this._h !== this.$el.offsetHeight) && (this._w = this.$el.offsetWidth, this._h = this.$el.offsetHeight, this.emitSize()) }, emitSize() { this.$emit('notify', { width: this._w, height: this._h }) }, addResizeHandlers() { this._resizeObject.contentDocument.defaultView.addEventListener('resize', this.compareAndNotify), this.compareAndNotify() }, removeResizeHandlers() { this._resizeObject && this._resizeObject.onload && (!Qc && this._resizeObject.contentDocument && this._resizeObject.contentDocument.defaultView.removeEventListener('resize', this.compareAndNotify), this.$el.removeChild(this._resizeObject), this._resizeObject.onload = null, this._resizeObject = null) } } }; const RE = Pb(); Nb('data-v-b329ee4c'); const zE = { class: 'resize-observer', tabindex: '-1' }; Ib(); const DE = RE((e, t, n, i, s, l) => (se(), Ye('div', zE))); cf.render = DE; cf.__scopeId = 'data-v-b329ee4c'; cf.__file = 'src/components/ResizeObserver.vue'; const Dw = (e = 'theme') => ({ computed: { themeClass() { return AE(this[e]) } } }); const FE = at({ name: 'VPopperContent', components: { ResizeObserver: cf }, mixins: [Dw()], props: { popperId: String, theme: String, shown: Boolean, mounted: Boolean, skipTransition: Boolean, autoHide: Boolean, handleResize: Boolean, classes: Object, result: Object }, emits: ['hide', 'resize'], methods: { toPx(e) { return e != null && !isNaN(e) ? `${e}px` : null } } }); const HE = ['id', 'aria-hidden', 'tabindex', 'data-popper-placement']; const BE = { ref: 'inner', class: 'v-popper__inner' }; const WE = ne('div', { class: 'v-popper__arrow-outer' }, null, -1); const jE = ne('div', { class: 'v-popper__arrow-inner' }, null, -1); const qE = [WE, jE]; function UE(e, t, n, i, s, l) { const u = Go('ResizeObserver'); return se(), ye('div', { 'id': e.popperId, 'ref': 'popover', 'class': ot(['v-popper__popper', [e.themeClass, e.classes.popperClass, { 'v-popper__popper--shown': e.shown, 'v-popper__popper--hidden': !e.shown, 'v-popper__popper--show-from': e.classes.showFrom, 'v-popper__popper--show-to': e.classes.showTo, 'v-popper__popper--hide-from': e.classes.hideFrom, 'v-popper__popper--hide-to': e.classes.hideTo, 'v-popper__popper--skip-transition': e.skipTransition, 'v-popper__popper--arrow-overflow': e.result && e.result.arrow.overflow, 'v-popper__popper--no-positioning': !e.result }]]), 'style': nn(e.result ? { position: e.result.strategy, transform: `translate3d(${Math.round(e.result.x)}px,${Math.round(e.result.y)}px,0)` } : void 0), 'aria-hidden': e.shown ? 'false' : 'true', 'tabindex': e.autoHide ? 0 : void 0, 'data-popper-placement': e.result ? e.result.placement : void 0, 'onKeyup': t[2] || (t[2] = dh(f => e.autoHide && e.$emit('hide'), ['esc'])) }, [ne('div', { class: 'v-popper__backdrop', onClick: t[0] || (t[0] = f => e.autoHide && e.$emit('hide')) }), ne('div', { class: 'v-popper__wrapper', style: nn(e.result ? { transformOrigin: e.result.transformOrigin } : void 0) }, [ne('div', BE, [e.mounted ? (se(), ye(nt, { key: 0 }, [ne('div', null, [xn(e.$slots, 'default')]), e.handleResize ? (se(), Ye(u, { key: 0, onNotify: t[1] || (t[1] = f => e.$emit('resize', f)) })) : je('', !0)], 64)) : je('', !0)], 512), ne('div', { ref: 'arrow', class: 'v-popper__arrow-container', style: nn(e.result ? { left: e.toPx(e.result.arrow.x), top: e.toPx(e.result.arrow.y) } : void 0) }, qE, 4)], 4)], 46, HE) } const Fw = af(FE, [['render', UE]]); const Hw = { methods: { show(...e) { return this.$refs.popper.show(...e) }, hide(...e) { return this.$refs.popper.hide(...e) }, dispose(...e) { return this.$refs.popper.dispose(...e) }, onResize(...e) { return this.$refs.popper.onResize(...e) } } }; let vh = function () {}; typeof window < 'u' && (vh = window.Element); const VE = at({ name: 'VPopperWrapper', components: { Popper: PE, PopperContent: Fw }, mixins: [Hw, Dw('finalTheme')], props: { theme: { type: String, default: null }, referenceNode: { type: Function, default: null }, shown: { type: Boolean, default: !1 }, showGroup: { type: String, default: null }, ariaId: { default: null }, disabled: { type: Boolean, default: void 0 }, positioningDisabled: { type: Boolean, default: void 0 }, placement: { type: String, default: void 0 }, delay: { type: [String, Number, Object], default: void 0 }, distance: { type: [Number, String], default: void 0 }, skidding: { type: [Number, String], default: void 0 }, triggers: { type: Array, default: void 0 }, showTriggers: { type: [Array, Function], default: void 0 }, hideTriggers: { type: [Array, Function], default: void 0 }, popperTriggers: { type: Array, default: void 0 }, popperShowTriggers: { type: [Array, Function], default: void 0 }, popperHideTriggers: { type: [Array, Function], default: void 0 }, container: { type: [String, Object, vh, Boolean], default: void 0 }, boundary: { type: [String, vh], default: void 0 }, strategy: { type: String, default: void 0 }, autoHide: { type: [Boolean, Function], default: void 0 }, handleResize: { type: Boolean, default: void 0 }, instantMove: { type: Boolean, default: void 0 }, eagerMount: { type: Boolean, default: void 0 }, popperClass: { type: [String, Array, Object], default: void 0 }, computeTransformOrigin: { type: Boolean, default: void 0 }, autoMinSize: { type: Boolean, default: void 0 }, autoSize: { type: [Boolean, String], default: void 0 }, autoMaxSize: { type: Boolean, default: void 0 }, autoBoundaryMaxSize: { type: Boolean, default: void 0 }, preventOverflow: { type: Boolean, default: void 0 }, overflowPadding: { type: [Number, String], default: void 0 }, arrowPadding: { type: [Number, String], default: void 0 }, arrowOverflow: { type: Boolean, default: void 0 }, flip: { type: Boolean, default: void 0 }, shift: { type: Boolean, default: void 0 }, shiftCrossAxis: { type: Boolean, default: void 0 }, noAutoFocus: { type: Boolean, default: void 0 }, disposeTimeout: { type: Number, default: void 0 } }, emits: { 'show': () => !0, 'hide': () => !0, 'update:shown': e => !0, 'apply-show': () => !0, 'apply-hide': () => !0, 'close-group': () => !0, 'close-directive': () => !0, 'auto-hide': () => !0, 'resize': () => !0 }, computed: { finalTheme() { return this.theme ?? this.$options.vPopperTheme } }, methods: { getTargetNodes() { return Array.from(this.$el.children).filter(e => e !== this.$refs.popperContent.$el) } } }); function GE(e, t, n, i, s, l) { const u = Go('PopperContent'); const f = Go('Popper'); return se(), Ye(f, _i({ ref: 'popper' }, e.$props, { 'theme': e.finalTheme, 'target-nodes': e.getTargetNodes, 'popper-node': () => e.$refs.popperContent.$el, 'class': [e.themeClass], 'onShow': t[0] || (t[0] = () => e.$emit('show')), 'onHide': t[1] || (t[1] = () => e.$emit('hide')), 'onUpdate:shown': t[2] || (t[2] = h => e.$emit('update:shown', h)), 'onApplyShow': t[3] || (t[3] = () => e.$emit('apply-show')), 'onApplyHide': t[4] || (t[4] = () => e.$emit('apply-hide')), 'onCloseGroup': t[5] || (t[5] = () => e.$emit('close-group')), 'onCloseDirective': t[6] || (t[6] = () => e.$emit('close-directive')), 'onAutoHide': t[7] || (t[7] = () => e.$emit('auto-hide')), 'onResize': t[8] || (t[8] = () => e.$emit('resize')) }), { default: it(({ popperId: h, isShown: p, shouldMountContent: g, skipTransition: v, autoHide: y, show: w, hide: L, handleResize: $, onResize: A, classes: E, result: M }) => [xn(e.$slots, 'default', { shown: p, show: w, hide: L }), Ie(u, { 'ref': 'popperContent', 'popper-id': h, 'theme': e.finalTheme, 'shown': p, 'mounted': g, 'skip-transition': v, 'auto-hide': y, 'handle-resize': $, 'classes': E, 'result': M, 'onHide': L, 'onResize': A }, { default: it(() => [xn(e.$slots, 'popper', { shown: p, hide: L })]), _: 2 }, 1032, ['popper-id', 'theme', 'shown', 'mounted', 'skip-transition', 'auto-hide', 'handle-resize', 'classes', 'result', 'onHide', 'onResize'])]), _: 3 }, 16, ['theme', 'target-nodes', 'popper-node', 'class']) } const wp = af(VE, [['render', GE]]); ({ ...wp }); ({ ...wp }); const XE = { ...wp, name: 'VTooltip', vPopperTheme: 'tooltip' }; const KE = at({ name: 'VTooltipDirective', components: { Popper: zw(), PopperContent: Fw }, mixins: [Hw], inheritAttrs: !1, props: { theme: { type: String, default: 'tooltip' }, html: { type: Boolean, default: e => xa(e.theme, 'html') }, content: { type: [String, Number, Function], default: null }, loadingContent: { type: String, default: e => xa(e.theme, 'loadingContent') }, targetNodes: { type: Function, required: !0 } }, data() { return { asyncContent: null } }, computed: { isContentAsync() { return typeof this.content == 'function' }, loading() { return this.isContentAsync && this.asyncContent == null }, finalContent() { return this.isContentAsync ? this.loading ? this.loadingContent : this.asyncContent : this.content } }, watch: { content: { handler() { this.fetchContent(!0) }, immediate: !0 }, async finalContent() { await this.$nextTick(), this.$refs.popper.onResize() } }, created() { this.$_fetchId = 0 }, methods: { fetchContent(e) { if (typeof this.content == 'function' && this.$_isShown && (e || !this.$_loading && this.asyncContent == null)) { this.asyncContent = null, this.$_loading = !0; const t = ++this.$_fetchId; const n = this.content(this); n.then ? n.then(i => this.onResult(t, i)) : this.onResult(t, n) } }, onResult(e, t) { e === this.$_fetchId && (this.$_loading = !1, this.asyncContent = t) }, onShow() { this.$_isShown = !0, this.fetchContent() }, onHide() { this.$_isShown = !1 } } }); const JE = ['innerHTML']; const YE = ['textContent']; function ZE(e, t, n, i, s, l) { const u = Go('PopperContent'); const f = Go('Popper'); return se(), Ye(f, _i({ ref: 'popper' }, e.$attrs, { 'theme': e.theme, 'target-nodes': e.targetNodes, 'popper-node': () => e.$refs.popperContent.$el, 'onApplyShow': e.onShow, 'onApplyHide': e.onHide }), { default: it(({ popperId: h, isShown: p, shouldMountContent: g, skipTransition: v, autoHide: y, hide: w, handleResize: L, onResize: $, classes: A, result: E }) => [Ie(u, { 'ref': 'popperContent', 'class': ot({ 'v-popper--tooltip-loading': e.loading }), 'popper-id': h, 'theme': e.theme, 'shown': p, 'mounted': g, 'skip-transition': v, 'auto-hide': y, 'handle-resize': L, 'classes': A, 'result': E, 'onHide': w, 'onResize': $ }, { default: it(() => [e.html ? (se(), ye('div', { key: 0, innerHTML: e.finalContent }, null, 8, JE)) : (se(), ye('div', { key: 1, textContent: Re(e.finalContent) }, null, 8, YE))]), _: 2 }, 1032, ['class', 'popper-id', 'theme', 'shown', 'mounted', 'skip-transition', 'auto-hide', 'handle-resize', 'classes', 'result', 'onHide', 'onResize'])]), _: 1 }, 16, ['theme', 'target-nodes', 'popper-node', 'onApplyShow', 'onApplyHide']) } const QE = af(KE, [['render', ZE]]); const Bw = 'v-popper--has-tooltip'; function eA(e, t) {
  let n = e.placement; if (!n && t) {
    for (const i of Rw)t[i] && (n = i)
  } return n || (n = xa(e.theme || 'tooltip', 'placement')), n
} function Ww(e, t, n) { let i; const s = typeof t; return s === 'string' ? i = { content: t } : t && s === 'object' ? i = t : i = { content: !1 }, i.placement = eA(i, n), i.targetNodes = () => [e], i.referenceNode = () => e, i } let Ed; let _a; let tA = 0; function nA() {
  if (Ed)
    return; _a = Ue([]), Ed = _w({ name: 'VTooltipDirectiveApp', setup() { return { directives: _a } }, render() { return this.directives.map(t => Ba(QE, { ...t.options, shown: t.shown || t.options.shown, key: t.id })) }, devtools: { hide: !0 } }); const e = document.createElement('div'); document.body.appendChild(e), Ed.mount(e)
} function jw(e, t, n) { nA(); const i = Ue(Ww(e, t, n)); const s = Ue(!1); const l = { id: tA++, options: i, shown: s }; return _a.value.push(l), e.classList && e.classList.add(Bw), e.$_popper = { options: i, item: l, show() { s.value = !0 }, hide() { s.value = !1 } } } function xp(e) { if (e.$_popper) { const t = _a.value.indexOf(e.$_popper.item); t !== -1 && _a.value.splice(t, 1), delete e.$_popper, delete e.$_popperOldShown, delete e.$_popperMountTarget }e.classList && e.classList.remove(Bw) } function Yv(e, { value: t, modifiers: n }) {
  const i = Ww(e, t, n); if (!i.content || xa(i.theme || 'tooltip', 'disabled')) {
    xp(e)
  }
  else { let s; e.$_popper ? (s = e.$_popper, s.options.value = i) : s = jw(e, t, n), typeof t.shown < 'u' && t.shown !== e.$_popperOldShown && (e.$_popperOldShown = t.shown, t.shown ? s.show() : s.hide()) }
} const rA = { beforeMount: Yv, updated: Yv, beforeUnmount(e) { xp(e) } }; const iA = rA; const qw = XE; const Uw = { options: so }; const oA = { reset: [0, 0], bold: [1, 22, '\x1B[22m\x1B[1m'], dim: [2, 22, '\x1B[22m\x1B[2m'], italic: [3, 23], underline: [4, 24], inverse: [7, 27], hidden: [8, 28], strikethrough: [9, 29], black: [30, 39], red: [31, 39], green: [32, 39], yellow: [33, 39], blue: [34, 39], magenta: [35, 39], cyan: [36, 39], white: [37, 39], gray: [90, 39], bgBlack: [40, 49], bgRed: [41, 49], bgGreen: [42, 49], bgYellow: [43, 49], bgBlue: [44, 49], bgMagenta: [45, 49], bgCyan: [46, 49], bgWhite: [47, 49], blackBright: [90, 39], redBright: [91, 39], greenBright: [92, 39], yellowBright: [93, 39], blueBright: [94, 39], magentaBright: [95, 39], cyanBright: [96, 39], whiteBright: [97, 39], bgBlackBright: [100, 49], bgRedBright: [101, 49], bgGreenBright: [102, 49], bgYellowBright: [103, 49], bgBlueBright: [104, 49], bgMagentaBright: [105, 49], bgCyanBright: [106, 49], bgWhiteBright: [107, 49] }; const sA = Object.entries(oA); function Sp(e) { return String(e) }Sp.open = ''; Sp.close = ''; function lA(e = !1) { const t = typeof process < 'u' ? process : void 0; const n = (t == null ? void 0 : t.env) || {}; const i = (t == null ? void 0 : t.argv) || []; return !('NO_COLOR' in n || i.includes('--no-color')) && ('FORCE_COLOR' in n || i.includes('--color') || (t == null ? void 0 : t.platform) === 'win32' || e && n.TERM !== 'dumb' || 'CI' in n) || typeof window < 'u' && !!window.chrome } function aA(e = !1) { const t = lA(e); const n = (u, f, h, p) => { let g = ''; let v = 0; do g += u.substring(v, p) + h, v = p + f.length, p = u.indexOf(f, v); while (~p); return g + u.substring(v) }; const i = (u, f, h = u) => { const p = (g) => { const v = String(g); const y = v.indexOf(f, u.length); return ~y ? u + n(v, f, h, y) + f : u + v + f }; return p.open = u, p.close = f, p }; const s = { isColorSupported: t }; const l = u => `\x1B[${u}m`; for (const [u, f] of sA)s[u] = t ? i(l(f[0]), l(f[1]), f[2]) : Sp; return s }aA(); const Zv = { bold: ['1', '22'], dim: ['2', '22'], italic: ['3', '23'], underline: ['4', '24'], inverse: ['7', '27'], hidden: ['8', '28'], strike: ['9', '29'], black: ['30', '39'], red: ['31', '39'], green: ['32', '39'], yellow: ['33', '39'], blue: ['34', '39'], magenta: ['35', '39'], cyan: ['36', '39'], white: ['37', '39'], brightblack: ['30;1', '39'], brightred: ['31;1', '39'], brightgreen: ['32;1', '39'], brightyellow: ['33;1', '39'], brightblue: ['34;1', '39'], brightmagenta: ['35;1', '39'], brightcyan: ['36;1', '39'], brightwhite: ['37;1', '39'], grey: ['90', '39'] }; const cA = { special: 'cyan', number: 'yellow', bigint: 'yellow', boolean: 'yellow', undefined: 'grey', null: 'bold', string: 'green', symbol: 'green', date: 'magenta', regexp: 'red' }; const Ys = '…'; function uA(e, t) { const n = Zv[cA[t]] || Zv[t] || ''; return n ? `\x1B[${n[0]}m${String(e)}\x1B[${n[1]}m` : String(e) } function fA({ showHidden: e = !1, depth: t = 2, colors: n = !1, customInspect: i = !0, showProxy: s = !1, maxArrayLength: l = 1 / 0, breakLength: u = 1 / 0, seen: f = [], truncate: h = 1 / 0, stylize: p = String } = {}, g) { const v = { showHidden: !!e, depth: Number(t), colors: !!n, customInspect: !!i, showProxy: !!s, maxArrayLength: Number(l), breakLength: Number(u), truncate: Number(h), seen: f, inspect: g, stylize: p }; return v.colors && (v.stylize = uA), v } function dA(e) { return e >= '\uD800' && e <= '\uDBFF' } function wo(e, t, n = Ys) {
  e = String(e); const i = n.length; const s = e.length; if (i > t && s > i)
    return n; if (s > t && s > i) { let l = t - i; return l > 0 && dA(e[l - 1]) && (l = l - 1), `${e.slice(0, l)}${n}` } return e
} function Pr(e, t, n, i = ', ') {
  n = n || t.inspect; const s = e.length; if (s === 0)
    return ''; const l = t.truncate; let u = ''; let f = ''; let h = ''; for (let p = 0; p < s; p += 1) {
    const g = p + 1 === e.length; const v = p + 2 === e.length; h = `${Ys}(${e.length - p})`; const y = e[p]; t.truncate = l - u.length - (g ? 0 : i.length); const w = f || n(y, t) + (g ? '' : i); const L = u.length + w.length; const $ = L + h.length; if (g && L > l && u.length + h.length <= l || !g && !v && $ > l || (f = g ? '' : n(e[p + 1], t) + (v ? '' : i), !g && v && $ > l && L + f.length > l))
      break; if (u += w, !g && !v && L + f.length >= l) { h = `${Ys}(${e.length - p - 1})`; break }h = ''
  } return `${u}${h}`
} function hA(e) { return e.match(/^[a-z_]\w*$/i) ? e : JSON.stringify(e).replace(/'/g, '\\\'').replace(/\\"/g, '"').replace(/(^"|"$)/g, '\'') } function ka([e, t], n) { return n.truncate -= 2, typeof e == 'string' ? e = hA(e) : typeof e != 'number' && (e = `[${n.inspect(e, n)}]`), n.truncate -= e.length, t = n.inspect(t, n), `${e}: ${t}` } function pA(e, t) {
  const n = Object.keys(e).slice(e.length); if (!e.length && !n.length)
    return '[]'; t.truncate -= 4; const i = Pr(e, t); t.truncate -= i.length; let s = ''; return n.length && (s = Pr(n.map(l => [l, e[l]]), t, ka)), `[ ${i}${s ? `, ${s}` : ''} ]`
} const gA = e => typeof Buffer == 'function' && e instanceof Buffer ? 'Buffer' : e[Symbol.toStringTag] ? e[Symbol.toStringTag] : e.constructor.name; function gi(e, t) {
  const n = gA(e); t.truncate -= n.length + 4; const i = Object.keys(e).slice(e.length); if (!e.length && !i.length)
    return `${n}[]`; let s = ''; for (let u = 0; u < e.length; u++) { const f = `${t.stylize(wo(e[u], t.truncate), 'number')}${u === e.length - 1 ? '' : ', '}`; if (t.truncate -= f.length, e[u] !== e.length && t.truncate <= 3) { s += `${Ys}(${e.length - e[u] + 1})`; break }s += f } let l = ''; return i.length && (l = Pr(i.map(u => [u, e[u]]), t, ka)), `${n}[ ${s}${l ? `, ${l}` : ''} ]`
} function mA(e, t) {
  const n = e.toJSON(); if (n === null)
    return 'Invalid Date'; const i = n.split('T'); const s = i[0]; return t.stylize(`${s}T${wo(i[1], t.truncate - s.length - 1)}`, 'date')
} function Qv(e, t) { const n = e[Symbol.toStringTag] || 'Function'; const i = e.name; return i ? t.stylize(`[${n} ${wo(i, t.truncate - 11)}]`, 'special') : t.stylize(`[${n}]`, 'special') } function vA([e, t], n) { return n.truncate -= 4, e = n.inspect(e, n), n.truncate -= e.length, t = n.inspect(t, n), `${e} => ${t}` } function yA(e) { const t = []; return e.forEach((n, i) => { t.push([i, n]) }), t } function bA(e, t) { return e.size === 0 ? 'Map{}' : (t.truncate -= 7, `Map{ ${Pr(yA(e), t, vA)} }`) } const wA = Number.isNaN || (e => e !== e); function e0(e, t) { return wA(e) ? t.stylize('NaN', 'number') : e === 1 / 0 ? t.stylize('Infinity', 'number') : e === -1 / 0 ? t.stylize('-Infinity', 'number') : e === 0 ? t.stylize(1 / e === 1 / 0 ? '+0' : '-0', 'number') : t.stylize(wo(String(e), t.truncate), 'number') } function t0(e, t) { let n = wo(e.toString(), t.truncate - 1); return n !== Ys && (n += 'n'), t.stylize(n, 'bigint') } function xA(e, t) { const n = e.toString().split('/')[2]; const i = t.truncate - (2 + n.length); const s = e.source; return t.stylize(`/${wo(s, i)}/${n}`, 'regexp') } function SA(e) { const t = []; return e.forEach((n) => { t.push(n) }), t } function _A(e, t) { return e.size === 0 ? 'Set{}' : (t.truncate -= 7, `Set{ ${Pr(SA(e), t)} }`) } const n0 = new RegExp('[\'\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]', 'g'); const kA = { '\b': '\\b', '	': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '\'': '\\\'', '\\': '\\\\' }; const TA = 16; function CA(e) { return kA[e] || `\\u${`0000${e.charCodeAt(0).toString(TA)}`.slice(-4)}` } function r0(e, t) { return n0.test(e) && (e = e.replace(n0, CA)), t.stylize(`'${wo(e, t.truncate - 2)}'`, 'string') } function i0(e) { return 'description' in Symbol.prototype ? e.description ? `Symbol(${e.description})` : 'Symbol()' : e.toString() } let Vw = () => 'Promise{…}'; try { const { getPromiseDetails: e, kPending: t, kRejected: n } = process.binding('util'); Array.isArray(e(Promise.resolve())) && (Vw = (i, s) => { const [l, u] = e(i); return l === t ? 'Promise{<pending>}' : `Promise${l === n ? '!' : ''}{${s.inspect(u, s)}}` }) }
catch {} function eu(e, t) {
  const n = Object.getOwnPropertyNames(e); const i = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(e) : []; if (n.length === 0 && i.length === 0)
    return '{}'; if (t.truncate -= 4, t.seen = t.seen || [], t.seen.includes(e))
    return '[Circular]'; t.seen.push(e); const s = Pr(n.map(f => [f, e[f]]), t, ka); const l = Pr(i.map(f => [f, e[f]]), t, ka); t.seen.pop(); let u = ''; return s && l && (u = ', '), `{ ${s}${u}${l} }`
} const Ad = typeof Symbol < 'u' && Symbol.toStringTag ? Symbol.toStringTag : !1; function EA(e, t) { let n = ''; return Ad && Ad in e && (n = e[Ad]), n = n || e.constructor.name, (!n || n === '_class') && (n = '<Anonymous Class>'), t.truncate -= n.length, `${n}${eu(e, t)}` } function AA(e, t) { return e.length === 0 ? 'Arguments[]' : (t.truncate -= 13, `Arguments[ ${Pr(e, t)} ]`) } const LA = ['stack', 'line', 'column', 'name', 'message', 'fileName', 'lineNumber', 'columnNumber', 'number', 'description', 'cause']; function $A(e, t) {
  const n = Object.getOwnPropertyNames(e).filter(u => !LA.includes(u)); const i = e.name; t.truncate -= i.length; let s = ''; if (typeof e.message == 'string' ? s = wo(e.message, t.truncate) : n.unshift('message'), s = s ? `: ${s}` : '', t.truncate -= s.length + 5, t.seen = t.seen || [], t.seen.includes(e))
    return '[Circular]'; t.seen.push(e); const l = Pr(n.map(u => [u, e[u]]), t, ka); return `${i}${s}${l ? ` { ${l} }` : ''}`
} function MA([e, t], n) { return n.truncate -= 3, t ? `${n.stylize(String(e), 'yellow')}=${n.stylize(`"${t}"`, 'string')}` : `${n.stylize(String(e), 'yellow')}` } function yh(e, t) {
  return Pr(e, t, NA, `
`)
} function NA(e, t) { switch (e.nodeType) { case 1:return Gw(e, t); case 3:return t.inspect(e.data, t); default:return t.inspect(e, t) } } function Gw(e, t) { const n = e.getAttributeNames(); const i = e.tagName.toLowerCase(); const s = t.stylize(`<${i}`, 'special'); const l = t.stylize('>', 'special'); const u = t.stylize(`</${i}>`, 'special'); t.truncate -= i.length * 2 + 5; let f = ''; n.length > 0 && (f += ' ', f += Pr(n.map(g => [g, e.getAttribute(g)]), t, MA, ' ')), t.truncate -= f.length; const h = t.truncate; let p = yh(e.children, t); return p && p.length > h && (p = `${Ys}(${e.children.length})`), `${s}${f}${l}${p}${u}` } const IA = typeof Symbol == 'function' && typeof Symbol.for == 'function'; const Ld = IA ? Symbol.for('chai/inspect') : '@@chai/inspect'; const $d = Symbol.for('nodejs.util.inspect.custom'); const o0 = new WeakMap(); const s0 = {}; const l0 = { undefined: (e, t) => t.stylize('undefined', 'undefined'), null: (e, t) => t.stylize('null', 'null'), boolean: (e, t) => t.stylize(String(e), 'boolean'), Boolean: (e, t) => t.stylize(String(e), 'boolean'), number: e0, Number: e0, bigint: t0, BigInt: t0, string: r0, String: r0, function: Qv, Function: Qv, symbol: i0, Symbol: i0, Array: pA, Date: mA, Map: bA, Set: _A, RegExp: xA, Promise: Vw, WeakSet: (e, t) => t.stylize('WeakSet{…}', 'special'), WeakMap: (e, t) => t.stylize('WeakMap{…}', 'special'), Arguments: AA, Int8Array: gi, Uint8Array: gi, Uint8ClampedArray: gi, Int16Array: gi, Uint16Array: gi, Int32Array: gi, Uint32Array: gi, Float32Array: gi, Float64Array: gi, Generator: () => '', DataView: () => '', ArrayBuffer: () => '', Error: $A, HTMLCollection: yh, NodeList: yh }; const PA = (e, t, n) => Ld in e && typeof e[Ld] == 'function' ? e[Ld](t) : $d in e && typeof e[$d] == 'function' ? e[$d](t.depth, t) : 'inspect' in e && typeof e.inspect == 'function' ? e.inspect(t.depth, t) : 'constructor' in e && o0.has(e.constructor) ? o0.get(e.constructor)(e, t) : s0[n] ? s0[n](e, t) : ''; const OA = Object.prototype.toString; function bh(e, t = {}) {
  const n = fA(t, bh); const { customInspect: i } = n; let s = e === null ? 'null' : typeof e; if (s === 'object' && (s = OA.call(e).slice(8, -1)), s in l0)
    return l0[s](e, n); if (i && e) {
    const u = PA(e, n, s); if (u)
      return typeof u == 'string' ? u : bh(u, n)
  } const l = e ? Object.getPrototypeOf(e) : !1; return l === Object.prototype || l === null ? eu(e, n) : e && typeof HTMLElement == 'function' && e instanceof HTMLElement ? Gw(e, n) : 'constructor' in e ? e.constructor !== Object ? EA(e, n) : eu(e, n) : e === Object(e) ? eu(e, n) : n.stylize(String(e), s)
} const RA = /%[sdjifoOc%]/g; function zA(...e) {
  if (typeof e[0] != 'string') { const l = []; for (let u = 0; u < e.length; u++)l.push(Es(e[u], { depth: 0, colors: !1 })); return l.join(' ') } const t = e.length; let n = 1; const i = e[0]; let s = String(i).replace(RA, (l) => {
    if (l === '%%')
      return '%'; if (n >= t)
      return l; switch (l) {
      case '%s':{ const u = e[n++]; return typeof u == 'bigint' ? `${u.toString()}n` : typeof u == 'number' && u === 0 && 1 / u < 0 ? '-0' : typeof u == 'object' && u !== null ? typeof u.toString == 'function' && u.toString !== Object.prototype.toString ? u.toString() : Es(u, { depth: 0, colors: !1 }) : String(u) } case '%d':{ const u = e[n++]; return typeof u == 'bigint' ? `${u.toString()}n` : Number(u).toString() } case '%i':{ const u = e[n++]; return typeof u == 'bigint' ? `${u.toString()}n` : Number.parseInt(String(u)).toString() } case '%f':return Number.parseFloat(String(e[n++])).toString(); case '%o':return Es(e[n++], { showHidden: !0, showProxy: !0 }); case '%O':return Es(e[n++]); case '%c':return n++, ''; case '%j':try { return JSON.stringify(e[n++]) }
      catch (u) {
        const f = u.message; if (f.includes('circular structure') || f.includes('cyclic structures') || f.includes('cyclic object'))
          return '[Circular]'; throw u
      } default:return l
    }
  }); for (let l = e[n]; n < t; l = e[++n])l === null || typeof l != 'object' ? s += ` ${l}` : s += ` ${Es(l)}`; return s
} function Es(e, t = {}) { return t.truncate === 0 && (t.truncate = Number.POSITIVE_INFINITY), bh(e, t) } function DA(e, t = {}) {
  typeof t.truncate > 'u' && (t.truncate = 40); const n = Es(e, t); const i = Object.prototype.toString.call(e); if (t.truncate && n.length >= t.truncate) {
    if (i === '[object Function]') { const s = e; return s.name ? `[Function: ${s.name}]` : '[Function]' }
    else {
      if (i === '[object Array]')
        return `[ Array(${e.length}) ]`; if (i === '[object Object]') { const s = Object.keys(e); return `{ Object (${s.length > 2 ? `${s.splice(0, 2).join(', ')}, ...` : s.join(', ')}) }` }
      else {
        return n
      }
    }
  } return n
} function Xw(e) { return e != null } function ja(e) { return e == null && (e = []), Array.isArray(e) ? e : [e] } function Kw(e) { return e != null && typeof e == 'object' && !Array.isArray(e) } function a0(e, t, n = void 0) {
  const i = t.replace(/\[(\d+)\]/g, '.$1').split('.'); let s = e; for (const l of i) {
    if (s = new Object(s)[l], s === void 0)
      return n
  } return s
} function c0() { let e = null; let t = null; const n = new Promise((i, s) => { e = i, t = s }); return n.resolve = e, n.reject = t, n } function FA(e) {
  if (!Number.isNaN(e))
    return !1; const t = new Float64Array(1); return t[0] = e, new Uint32Array(t.buffer)[1] >>> 31 === 1
} let Md, u0; function HA() {
  if (u0)
    return Md; u0 = 1; let e, t, n, i, s, l, u, f, h, p, g, v, y, w, L, $, A, E, M; return y = /\/(?![*/])(?:\[(?:(?![\]\\]).|\\.)*\]|(?![/\\]).|\\.)*(\/[$\u200C\u200D\p{ID_Continue}]*|\\)?/uy, v = /--|\+\+|=>|\.{3}|\??\.(?!\d)|(?:&&|\|\||\?\?|[+\-%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2}|\/(?![/*]))=?|[?~,:;[\](){}]/y, e = /(\x23?)(?=[$_\p{ID_Start}\\])(?:[$\u200C\u200D\p{ID_Continue}]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/uy, L = /(['"])(?:(?!\1)[^\\\n\r]|\\(?:\r\n|[\s\S]))*(\1)?/y, g = /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[oO][0-7](?:_?[0-7])*|0[bB][01](?:_?[01])*)n?|0n|[1-9](?:_?\d)*n|(?:(?:0(?!\d)|0\d*[89]\d*|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|0[0-7]+/y, $ = /[`}](?:[^`\\$]|\\[\s\S]|\$(?!\{))*(`|\$\{)?/y, M = /[\t\v\f\uFEFF\p{Zs}]+/uy, f = /\r?\n|[\r\u2028\u2029]/y, h = /\/\*(?:[^*]|\*(?!\/))*(\*\/)?/y, w = /\/\/.*/y, n = /[<>.:={}]|\/(?![/*])/y, t = /[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}-]*/uy, i = /(['"])(?:(?!\1)[\s\S])*(\1)?/y, s = /[^<>{}]+/y, E = /^(?:[/+-]|\.{3}|\?(?:InterpolationIn(?:JSX|Template)|NoLineTerminatorHere|NonExpressionParenEnd|UnaryIncDec))?$|[{}([,;<>=*%&|^!~?:]$/, A = /^(?:=>|[;\]){}]|else|\?(?:NoLineTerminatorHere|NonExpressionParenEnd))?$/, l = /^(?:await|case|default|delete|do|else|instanceof|new|return|throw|typeof|void|yield)$/, u = /^(?:return|throw|yield)$/, p = new RegExp(f.source), Md = function* (O, { jsx: k = !1 } = {}) { let z, D, te, ee, W, q, K, C, P, I, S, R, B, oe; for ({ length: q } = O, ee = 0, W = '', oe = [{ tag: 'JS' }], z = [], S = 0, R = !1; ee < q;) { switch (C = oe[oe.length - 1], C.tag) { case 'JS':case 'JSNonExpressionParen':case 'InterpolationInTemplate':case 'InterpolationInJSX':if (O[ee] === '/' && (E.test(W) || l.test(W)) && (y.lastIndex = ee, K = y.exec(O))) { ee = y.lastIndex, W = K[0], R = !0, yield { type: 'RegularExpressionLiteral', value: K[0], closed: K[1] !== void 0 && K[1] !== '\\' }; continue } if (v.lastIndex = ee, K = v.exec(O)) { switch (B = K[0], P = v.lastIndex, I = B, B) { case '(':W === '?NonExpressionParenKeyword' && oe.push({ tag: 'JSNonExpressionParen', nesting: S }), S++, R = !1; break; case ')':S--, R = !0, C.tag === 'JSNonExpressionParen' && S === C.nesting && (oe.pop(), I = '?NonExpressionParenEnd', R = !1); break; case '{':v.lastIndex = 0, te = !A.test(W) && (E.test(W) || l.test(W)), z.push(te), R = !1; break; case '}':switch (C.tag) { case 'InterpolationInTemplate':if (z.length === C.nesting) { $.lastIndex = ee, K = $.exec(O), ee = $.lastIndex, W = K[0], K[1] === '${' ? (W = '?InterpolationInTemplate', R = !1, yield { type: 'TemplateMiddle', value: K[0] }) : (oe.pop(), R = !0, yield { type: 'TemplateTail', value: K[0], closed: K[1] === '`' }); continue } break; case 'InterpolationInJSX':if (z.length === C.nesting) { oe.pop(), ee += 1, W = '}', yield { type: 'JSXPunctuator', value: '}' }; continue } }R = z.pop(), I = R ? '?ExpressionBraceEnd' : '}'; break; case ']':R = !0; break; case '++':case '--':I = R ? '?PostfixIncDec' : '?UnaryIncDec'; break; case '<':if (k && (E.test(W) || l.test(W))) { oe.push({ tag: 'JSXTag' }), ee += 1, W = '<', yield { type: 'JSXPunctuator', value: B }; continue }R = !1; break; default:R = !1 }ee = P, W = I, yield { type: 'Punctuator', value: B }; continue } if (e.lastIndex = ee, K = e.exec(O)) { switch (ee = e.lastIndex, I = K[0], K[0]) { case 'for':case 'if':case 'while':case 'with':W !== '.' && W !== '?.' && (I = '?NonExpressionParenKeyword') }W = I, R = !l.test(K[0]), yield { type: K[1] === '#' ? 'PrivateIdentifier' : 'IdentifierName', value: K[0] }; continue } if (L.lastIndex = ee, K = L.exec(O)) { ee = L.lastIndex, W = K[0], R = !0, yield { type: 'StringLiteral', value: K[0], closed: K[2] !== void 0 }; continue } if (g.lastIndex = ee, K = g.exec(O)) { ee = g.lastIndex, W = K[0], R = !0, yield { type: 'NumericLiteral', value: K[0] }; continue } if ($.lastIndex = ee, K = $.exec(O)) { ee = $.lastIndex, W = K[0], K[1] === '${' ? (W = '?InterpolationInTemplate', oe.push({ tag: 'InterpolationInTemplate', nesting: z.length }), R = !1, yield { type: 'TemplateHead', value: K[0] }) : (R = !0, yield { type: 'NoSubstitutionTemplate', value: K[0], closed: K[1] === '`' }); continue } break; case 'JSXTag':case 'JSXTagEnd':if (n.lastIndex = ee, K = n.exec(O)) { switch (ee = n.lastIndex, I = K[0], K[0]) { case '<':oe.push({ tag: 'JSXTag' }); break; case '>':oe.pop(), W === '/' || C.tag === 'JSXTagEnd' ? (I = '?JSX', R = !0) : oe.push({ tag: 'JSXChildren' }); break; case '{':oe.push({ tag: 'InterpolationInJSX', nesting: z.length }), I = '?InterpolationInJSX', R = !1; break; case '/':W === '<' && (oe.pop(), oe[oe.length - 1].tag === 'JSXChildren' && oe.pop(), oe.push({ tag: 'JSXTagEnd' })) }W = I, yield { type: 'JSXPunctuator', value: K[0] }; continue } if (t.lastIndex = ee, K = t.exec(O)) { ee = t.lastIndex, W = K[0], yield { type: 'JSXIdentifier', value: K[0] }; continue } if (i.lastIndex = ee, K = i.exec(O)) { ee = i.lastIndex, W = K[0], yield { type: 'JSXString', value: K[0], closed: K[2] !== void 0 }; continue } break; case 'JSXChildren':if (s.lastIndex = ee, K = s.exec(O)) { ee = s.lastIndex, W = K[0], yield { type: 'JSXText', value: K[0] }; continue } switch (O[ee]) { case '<':oe.push({ tag: 'JSXTag' }), ee++, W = '<', yield { type: 'JSXPunctuator', value: '<' }; continue; case '{':oe.push({ tag: 'InterpolationInJSX', nesting: z.length }), ee++, W = '?InterpolationInJSX', R = !1, yield { type: 'JSXPunctuator', value: '{' }; continue } } if (M.lastIndex = ee, K = M.exec(O)) { ee = M.lastIndex, yield { type: 'WhiteSpace', value: K[0] }; continue } if (f.lastIndex = ee, K = f.exec(O)) { ee = f.lastIndex, R = !1, u.test(W) && (W = '?NoLineTerminatorHere'), yield { type: 'LineTerminatorSequence', value: K[0] }; continue } if (h.lastIndex = ee, K = h.exec(O)) { ee = h.lastIndex, p.test(K[0]) && (R = !1, u.test(W) && (W = '?NoLineTerminatorHere')), yield { type: 'MultiLineComment', value: K[0], closed: K[1] !== void 0 }; continue } if (w.lastIndex = ee, K = w.exec(O)) { ee = w.lastIndex, R = !1, yield { type: 'SingleLineComment', value: K[0] }; continue }D = String.fromCodePoint(O.codePointAt(ee)), ee += D.length, W = D, R = !1, yield { type: C.tag.startsWith('JSX') ? 'JSXInvalid' : 'Invalid', value: D } } }, Md
}HA(); const Jw = { keyword: ['break', 'case', 'catch', 'continue', 'debugger', 'default', 'do', 'else', 'finally', 'for', 'function', 'if', 'return', 'switch', 'throw', 'try', 'var', 'const', 'while', 'with', 'new', 'this', 'super', 'class', 'extends', 'export', 'import', 'null', 'true', 'false', 'in', 'instanceof', 'typeof', 'void', 'delete'], strict: ['implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield'] }; new Set(Jw.keyword); new Set(Jw.strict); const f0 = Symbol('vitest:SAFE_TIMERS'); function Yw() { const { setTimeout: e, setInterval: t, clearInterval: n, clearTimeout: i, setImmediate: s, clearImmediate: l, queueMicrotask: u } = globalThis[f0] || globalThis; const { nextTick: f } = globalThis[f0] || globalThis.process || { nextTick: h => h() }; return { nextTick: f, setTimeout: e, setInterval: t, clearInterval: n, clearTimeout: i, setImmediate: s, clearImmediate: l, queueMicrotask: u } } const BA = 44; const d0 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; const WA = new Uint8Array(64); const Zw = new Uint8Array(128); for (let e = 0; e < d0.length; e++) { const t = d0.charCodeAt(e); WA[e] = t, Zw[t] = e } function Wl(e, t) { let n = 0; let i = 0; let s = 0; do { const u = e.next(); s = Zw[u], n |= (s & 31) << i, i += 5 } while (s & 32); const l = n & 1; return n >>>= 1, l && (n = -2147483648 | -n), t + n } function h0(e, t) { return e.pos >= t ? !1 : e.peek() !== BA } class jA {constructor(t) { this.pos = 0, this.buffer = t }next() { return this.buffer.charCodeAt(this.pos++) }peek() { return this.buffer.charCodeAt(this.pos) }indexOf(t) { const { buffer: n, pos: i } = this; const s = n.indexOf(t, i); return s === -1 ? n.length : s }} function qA(e) { const { length: t } = e; const n = new jA(e); const i = []; let s = 0; let l = 0; let u = 0; let f = 0; let h = 0; do { const p = n.indexOf(';'); const g = []; let v = !0; let y = 0; for (s = 0; n.pos < p;) { let w; s = Wl(n, s), s < y && (v = !1), y = s, h0(n, p) ? (l = Wl(n, l), u = Wl(n, u), f = Wl(n, f), h0(n, p) ? (h = Wl(n, h), w = [s, l, u, f, h]) : w = [s, l, u, f]) : w = [s], g.push(w), n.pos++ }v || UA(g), i.push(g), n.pos = p + 1 } while (n.pos <= t); return i } function UA(e) { e.sort(VA) } function VA(e, t) { return e[0] - t[0] } const GA = /^[\w+.-]+:\/\//; const XA = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/; const KA = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?([^#?]*)(\?[^#]*)?(#.*)?/i; let Ut; (function (e) { e[e.Empty = 1] = 'Empty', e[e.Hash = 2] = 'Hash', e[e.Query = 3] = 'Query', e[e.RelativePath = 4] = 'RelativePath', e[e.AbsolutePath = 5] = 'AbsolutePath', e[e.SchemeRelative = 6] = 'SchemeRelative', e[e.Absolute = 7] = 'Absolute' })(Ut || (Ut = {})); function JA(e) { return GA.test(e) } function YA(e) { return e.startsWith('//') } function Qw(e) { return e.startsWith('/') } function ZA(e) { return e.startsWith('file:') } function p0(e) { return /^[.?#]/.test(e) } function Rc(e) { const t = XA.exec(e); return ex(t[1], t[2] || '', t[3], t[4] || '', t[5] || '/', t[6] || '', t[7] || '') } function QA(e) { const t = KA.exec(e); const n = t[2]; return ex('file:', '', t[1] || '', '', Qw(n) ? n : `/${n}`, t[3] || '', t[4] || '') } function ex(e, t, n, i, s, l, u) { return { scheme: e, user: t, host: n, port: i, path: s, query: l, hash: u, type: Ut.Absolute } } function g0(e) {
  if (YA(e)) { const n = Rc(`http:${e}`); return n.scheme = '', n.type = Ut.SchemeRelative, n } if (Qw(e)) { const n = Rc(`http://foo.com${e}`); return n.scheme = '', n.host = '', n.type = Ut.AbsolutePath, n } if (ZA(e))
    return QA(e); if (JA(e))
    return Rc(e); const t = Rc(`http://foo.com/${e}`); return t.scheme = '', t.host = '', t.type = e ? e.startsWith('?') ? Ut.Query : e.startsWith('#') ? Ut.Hash : Ut.RelativePath : Ut.Empty, t
} function eL(e) {
  if (e.endsWith('/..'))
    return e; const t = e.lastIndexOf('/'); return e.slice(0, t + 1)
} function tL(e, t) { tx(t, t.type), e.path === '/' ? e.path = t.path : e.path = eL(t.path) + e.path } function tx(e, t) { const n = t <= Ut.RelativePath; const i = e.path.split('/'); let s = 1; let l = 0; let u = !1; for (let h = 1; h < i.length; h++) { const p = i[h]; if (!p) { u = !0; continue } if (u = !1, p !== '.') { if (p === '..') { l ? (u = !0, l--, s--) : n && (i[s++] = p); continue }i[s++] = p, l++ } } let f = ''; for (let h = 1; h < s; h++)f += `/${i[h]}`; (!f || u && !f.endsWith('/..')) && (f += '/'), e.path = f } function nL(e, t) {
  if (!e && !t)
    return ''; const n = g0(e); let i = n.type; if (t && i !== Ut.Absolute) { const l = g0(t); const u = l.type; switch (i) { case Ut.Empty:n.hash = l.hash; case Ut.Hash:n.query = l.query; case Ut.Query:case Ut.RelativePath:tL(n, l); case Ut.AbsolutePath:n.user = l.user, n.host = l.host, n.port = l.port; case Ut.SchemeRelative:n.scheme = l.scheme }u > i && (i = u) }tx(n, i); const s = n.query + n.hash; switch (i) { case Ut.Hash:case Ut.Query:return s; case Ut.RelativePath:{ const l = n.path.slice(1); return l ? p0(t || e) && !p0(l) ? `./${l}${s}` : l + s : s || '.' } case Ut.AbsolutePath:return n.path + s; default:return `${n.scheme}//${n.user}${n.host}${n.port}${n.path}${s}` }
} function m0(e, t) { return t && !t.endsWith('/') && (t += '/'), nL(e, t) } function rL(e) {
  if (!e)
    return ''; const t = e.lastIndexOf('/'); return e.slice(0, t + 1)
} const po = 0; const iL = 1; const oL = 2; const sL = 3; const lL = 4; function aL(e, t) {
  const n = v0(e, 0); if (n === e.length)
    return e; t || (e = e.slice()); for (let i = n; i < e.length; i = v0(e, i + 1))e[i] = uL(e[i], t); return e
} function v0(e, t) {
  for (let n = t; n < e.length; n++) {
    if (!cL(e[n]))
      return n
  } return e.length
} function cL(e) {
  for (let t = 1; t < e.length; t++) {
    if (e[t][po] < e[t - 1][po])
      return !1
  } return !0
} function uL(e, t) { return t || (e = e.slice()), e.sort(fL) } function fL(e, t) { return e[po] - t[po] } let Tu = !1; function dL(e, t, n, i) {
  for (;n <= i;) {
    const s = n + (i - n >> 1); const l = e[s][po] - t; if (l === 0)
      return Tu = !0, s; l < 0 ? n = s + 1 : i = s - 1
  } return Tu = !1, n - 1
} function hL(e, t, n) { for (let i = n + 1; i < e.length && e[i][po] === t; n = i++);return n } function pL(e, t, n) { for (let i = n - 1; i >= 0 && e[i][po] === t; n = i--);return n } function gL() { return { lastKey: -1, lastNeedle: -1, lastIndex: -1 } } function mL(e, t, n, i) {
  const { lastKey: s, lastNeedle: l, lastIndex: u } = n; let f = 0; let h = e.length - 1; if (i === s) {
    if (t === l)
      return Tu = u !== -1 && e[u][po] === t, u; t >= l ? f = u === -1 ? 0 : u : h = u
  } return n.lastKey = i, n.lastNeedle = t, n.lastIndex = dL(e, t, f, h)
} const vL = '`line` must be greater than 0 (lines start at line 1)'; const yL = '`column` must be greater than or equal to 0 (columns start at column 0)'; const y0 = -1; const bL = 1; class wL {
  constructor(t, n) {
    const i = typeof t == 'string'; if (!i && t._decodedMemo)
      return t; const s = i ? JSON.parse(t) : t; const { version: l, file: u, names: f, sourceRoot: h, sources: p, sourcesContent: g } = s; this.version = l, this.file = u, this.names = f || [], this.sourceRoot = h, this.sources = p, this.sourcesContent = g, this.ignoreList = s.ignoreList || s.x_google_ignoreList || void 0; const v = m0(h || '', rL(n)); this.resolvedSources = p.map(w => m0(w || '', v)); const { mappings: y } = s; typeof y == 'string' ? (this._encoded = y, this._decoded = void 0) : (this._encoded = void 0, this._decoded = aL(y, i)), this._decodedMemo = gL(), this._bySources = void 0, this._bySourceMemos = void 0
  }
} function xL(e) { let t; return (t = e)._decoded || (t._decoded = qA(e._encoded)) } function SL(e, t) {
  let { line: n, column: i, bias: s } = t; if (n--, n < 0)
    throw new Error(vL); if (i < 0)
    throw new Error(yL); const l = xL(e); if (n >= l.length)
    return zc(null, null, null, null); const u = l[n]; const f = _L(u, e._decodedMemo, n, i, s || bL); if (f === -1)
    return zc(null, null, null, null); const h = u[f]; if (h.length === 1)
    return zc(null, null, null, null); const { names: p, resolvedSources: g } = e; return zc(g[h[iL]], h[oL] + 1, h[sL], h.length === 5 ? p[h[lL]] : null)
} function zc(e, t, n, i) { return { source: e, line: t, column: n, name: i } } function _L(e, t, n, i, s) { let l = mL(e, i, t, n); return Tu ? l = (s === y0 ? hL : pL)(e, i, l) : s === y0 && l++, l === -1 || l === e.length ? -1 : l } const kL = /^[A-Z]:\//i; function TL(e = '') { return e && e.replace(/\\/g, '/').replace(kL, t => t.toUpperCase()) } const CL = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Z]:[/\\]/i; function EL() { return typeof process < 'u' && typeof process.cwd == 'function' ? process.cwd().replace(/\\/g, '/') : '/' } function AL(...e) { e = e.map(i => TL(i)); let t = ''; let n = !1; for (let i = e.length - 1; i >= -1 && !n; i--) { const s = i >= 0 ? e[i] : EL(); !s || s.length === 0 || (t = `${s}/${t}`, n = b0(s)) } return t = LL(t, !n), n && !b0(t) ? `/${t}` : t.length > 0 ? t : '.' } function LL(e, t) {
  let n = ''; let i = 0; let s = -1; let l = 0; let u = null; for (let f = 0; f <= e.length; ++f) {
    if (f < e.length) {
      u = e[f]
    }
    else {
      if (u === '/')
        break; u = '/'
    } if (u === '/') {
      if (!(s === f - 1 || l === 1)) {
        if (l === 2) {
          if (n.length < 2 || i !== 2 || n[n.length - 1] !== '.' || n[n.length - 2] !== '.') {
            if (n.length > 2) { const h = n.lastIndexOf('/'); h === -1 ? (n = '', i = 0) : (n = n.slice(0, h), i = n.length - 1 - n.lastIndexOf('/')), s = f, l = 0; continue }
            else if (n.length > 0) { n = '', i = 0, s = f, l = 0; continue }
          }t && (n += n.length > 0 ? '/..' : '..', i = 2)
        }
        else {
          n.length > 0 ? n += `/${e.slice(s + 1, f)}` : n = e.slice(s + 1, f), i = f - s - 1
        }
      }s = f, l = 0
    }
    else {
      u === '.' && l !== -1 ? ++l : l = -1
    }
  } return n
} function b0(e) { return CL.test(e) } const _p = /^\s*at .*(?:\S:\d+|\(native\))/m; const $L = /^(?:eval@)?(?:\[native code\])?$/; const ML = ['node:internal', /\/packages\/\w+\/dist\//, /\/@vitest\/\w+\/dist\//, '/vitest/dist/', '/vitest/src/', '/vite-node/dist/', '/vite-node/src/', '/node_modules/chai/', '/node_modules/tinypool/', '/node_modules/tinyspy/', '/deps/chunk-', '/deps/@vitest', '/deps/loupe', '/deps/chai', /node:\w+/, /__vitest_test__/, /__vitest_browser__/, /\/deps\/vitest_/]; function nx(e) {
  if (!e.includes(':'))
    return [e]; const n = /(.+?)(?::(\d+))?(?::(\d+))?$/.exec(e.replace(/^\(|\)$/g, '')); if (!n)
    return [e]; let i = n[1]; if (i.startsWith('async ') && (i = i.slice(6)), i.startsWith('http:') || i.startsWith('https:')) { const s = new URL(i); s.searchParams.delete('import'), s.searchParams.delete('browserv'), i = s.pathname + s.hash + s.search } if (i.startsWith('/@fs/')) { const s = /^\/@fs\/[a-zA-Z]:\//.test(i); i = i.slice(s ? 5 : 4) } return [i, n[2] || void 0, n[3] || void 0]
} function rx(e) {
  let t = e.trim(); if ($L.test(t) || (t.includes(' > eval') && (t = t.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ':$1')), !t.includes('@') && !t.includes(':')))
    return null; const n = /(([^\n\r"\u2028\u2029]*".[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*(?:@[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*)*(?:[\n\r\u2028\u2029][^@]*)?)?[^@]*)(@)/; const i = t.match(n); const s = i && i[1] ? i[1] : void 0; const [l, u, f] = nx(t.replace(n, '')); return !l || !u || !f ? null : { file: l, method: s || '', line: Number.parseInt(u), column: Number.parseInt(f) }
} function ix(e) { const t = e.trim(); return _p.test(t) ? ox(t) : rx(t) } function ox(e) {
  let t = e.trim(); if (!_p.test(t))
    return null; t.includes('(eval ') && (t = t.replace(/eval code/g, 'eval').replace(/(\(eval at [^()]*)|(,.*$)/g, '')); let n = t.replace(/^\s+/, '').replace(/\(eval code/g, '(').replace(/^.*?\s+/, ''); const i = n.match(/ (\(.+\)$)/); n = i ? n.replace(i[0], '') : n; const [s, l, u] = nx(i ? i[1] : n); let f = i && n || ''; let h = s && ['eval', '<anonymous>'].includes(s) ? void 0 : s; return !h || !l || !u ? null : (f.startsWith('async ') && (f = f.slice(6)), h.startsWith('file://') && (h = h.slice(7)), h = h.startsWith('node:') || h.startsWith('internal:') ? h : AL(h), f && (f = f.replace(/__vite_ssr_import_\d+__\./g, '')), { method: f, file: h, line: Number.parseInt(l), column: Number.parseInt(u) })
} function NL(e, t = {}) {
  const { ignoreStackEntries: n = ML } = t; return (_p.test(e) ? PL(e) : IL(e)).map((s) => {
    let l; t.getUrlId && (s.file = t.getUrlId(s.file)); const u = (l = t.getSourceMap) === null || l === void 0 ? void 0 : l.call(t, s.file); if (!u || typeof u != 'object' || !u.version)
      return w0(n, s.file) ? null : s; const f = new wL(u); const { line: h, column: p, source: g, name: v } = SL(f, s); let y = s.file; if (g) { const w = s.file.startsWith('file://') ? s.file : `file://${s.file}`; const L = u.sourceRoot ? new URL(u.sourceRoot, w) : w; y = new URL(g, L).pathname, y.match(/\/\w:\//) && (y = y.slice(1)) } return w0(n, y) ? null : h != null && p != null ? { line: h, column: p, file: y, method: v || s.method } : s
  }).filter(s => s != null)
} function w0(e, t) { return e.some(n => t.match(n)) } function IL(e) {
  return e.split(`
`).map(t => rx(t)).filter(Xw)
} function PL(e) {
  return e.split(`
`).map(t => ox(t)).filter(Xw)
} function kp(e) { return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, 'default') ? e.default : e } let Nd, x0; function OL() {
  if (x0)
    return Nd; x0 = 1; let e, t, n, i, s, l, u, f, h, p, g, v, y, w, L, $, A, E, M, O; return w = /\/(?![*/])(?:\[(?:[^\]\\\n\r\u2028\u2029]|\\.)*\]?|[^/[\\\n\r\u2028\u2029]|\\.)*(\/[$\u200C\u200D\p{ID_Continue}]*|\\)?/uy, y = /--|\+\+|=>|\.{3}|\??\.(?!\d)|(?:&&|\|\||\?\?|[+\-%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2}|\/(?![/*]))=?|[?~,:;[\](){}]/y, t = /(\x23?)(?=[$_\p{ID_Start}\\])(?:[$\u200C\u200D\p{ID_Continue}]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/uy, $ = /(['"])(?:[^'"\\\n\r]|(?!\1)['"]|\\(?:\r\n|[\s\S]))*(\1)?/y, v = /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[oO][0-7](?:_?[0-7])*|0[bB][01](?:_?[01])*)n?|0n|[1-9](?:_?\d)*n|(?:(?:0(?!\d)|0\d*[89]\d*|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|0[0-7]+/y, A = /[`}](?:[^`\\$]|\\[\s\S]|\$(?!\{))*(`|\$\{)?/y, O = /[\t\v\f\uFEFF\p{Zs}]+/uy, h = /\r?\n|[\r\u2028\u2029]/y, p = /\/\*(?:[^*]|\*(?!\/))*(\*\/)?/y, L = /\/\/.*/y, e = /^#!.*/, i = /[<>.:={}]|\/(?![/*])/y, n = /[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}-]*/uy, s = /(['"])(?:[^'"]|(?!\1)['"])*(\1)?/y, l = /[^<>{}]+/y, M = /^(?:[/+-]|\.{3}|\?(?:InterpolationIn(?:JSX|Template)|NoLineTerminatorHere|NonExpressionParenEnd|UnaryIncDec))?$|[{}([,;<>=*%&|^!~?:]$/, E = /^(?:=>|[;\]){}]|else|\?(?:NoLineTerminatorHere|NonExpressionParenEnd))?$/, u = /^(?:await|case|default|delete|do|else|instanceof|new|return|throw|typeof|void|yield)$/, f = /^(?:return|throw|yield)$/, g = new RegExp(h.source), Nd = function* (k, { jsx: z = !1 } = {}) { let D, te, ee, W, q, K, C, P, I, S, R, B, oe, ue; for ({ length: K } = k, W = 0, q = '', ue = [{ tag: 'JS' }], D = [], R = 0, B = !1, (C = e.exec(k)) && (yield { type: 'HashbangComment', value: C[0] }, W = C[0].length); W < K;) { switch (P = ue[ue.length - 1], P.tag) { case 'JS':case 'JSNonExpressionParen':case 'InterpolationInTemplate':case 'InterpolationInJSX':if (k[W] === '/' && (M.test(q) || u.test(q)) && (w.lastIndex = W, C = w.exec(k))) { W = w.lastIndex, q = C[0], B = !0, yield { type: 'RegularExpressionLiteral', value: C[0], closed: C[1] !== void 0 && C[1] !== '\\' }; continue } if (y.lastIndex = W, C = y.exec(k)) { switch (oe = C[0], I = y.lastIndex, S = oe, oe) { case '(':q === '?NonExpressionParenKeyword' && ue.push({ tag: 'JSNonExpressionParen', nesting: R }), R++, B = !1; break; case ')':R--, B = !0, P.tag === 'JSNonExpressionParen' && R === P.nesting && (ue.pop(), S = '?NonExpressionParenEnd', B = !1); break; case '{':y.lastIndex = 0, ee = !E.test(q) && (M.test(q) || u.test(q)), D.push(ee), B = !1; break; case '}':switch (P.tag) { case 'InterpolationInTemplate':if (D.length === P.nesting) { A.lastIndex = W, C = A.exec(k), W = A.lastIndex, q = C[0], C[1] === '${' ? (q = '?InterpolationInTemplate', B = !1, yield { type: 'TemplateMiddle', value: C[0] }) : (ue.pop(), B = !0, yield { type: 'TemplateTail', value: C[0], closed: C[1] === '`' }); continue } break; case 'InterpolationInJSX':if (D.length === P.nesting) { ue.pop(), W += 1, q = '}', yield { type: 'JSXPunctuator', value: '}' }; continue } }B = D.pop(), S = B ? '?ExpressionBraceEnd' : '}'; break; case ']':B = !0; break; case '++':case '--':S = B ? '?PostfixIncDec' : '?UnaryIncDec'; break; case '<':if (z && (M.test(q) || u.test(q))) { ue.push({ tag: 'JSXTag' }), W += 1, q = '<', yield { type: 'JSXPunctuator', value: oe }; continue }B = !1; break; default:B = !1 }W = I, q = S, yield { type: 'Punctuator', value: oe }; continue } if (t.lastIndex = W, C = t.exec(k)) { switch (W = t.lastIndex, S = C[0], C[0]) { case 'for':case 'if':case 'while':case 'with':q !== '.' && q !== '?.' && (S = '?NonExpressionParenKeyword') }q = S, B = !u.test(C[0]), yield { type: C[1] === '#' ? 'PrivateIdentifier' : 'IdentifierName', value: C[0] }; continue } if ($.lastIndex = W, C = $.exec(k)) { W = $.lastIndex, q = C[0], B = !0, yield { type: 'StringLiteral', value: C[0], closed: C[2] !== void 0 }; continue } if (v.lastIndex = W, C = v.exec(k)) { W = v.lastIndex, q = C[0], B = !0, yield { type: 'NumericLiteral', value: C[0] }; continue } if (A.lastIndex = W, C = A.exec(k)) { W = A.lastIndex, q = C[0], C[1] === '${' ? (q = '?InterpolationInTemplate', ue.push({ tag: 'InterpolationInTemplate', nesting: D.length }), B = !1, yield { type: 'TemplateHead', value: C[0] }) : (B = !0, yield { type: 'NoSubstitutionTemplate', value: C[0], closed: C[1] === '`' }); continue } break; case 'JSXTag':case 'JSXTagEnd':if (i.lastIndex = W, C = i.exec(k)) { switch (W = i.lastIndex, S = C[0], C[0]) { case '<':ue.push({ tag: 'JSXTag' }); break; case '>':ue.pop(), q === '/' || P.tag === 'JSXTagEnd' ? (S = '?JSX', B = !0) : ue.push({ tag: 'JSXChildren' }); break; case '{':ue.push({ tag: 'InterpolationInJSX', nesting: D.length }), S = '?InterpolationInJSX', B = !1; break; case '/':q === '<' && (ue.pop(), ue[ue.length - 1].tag === 'JSXChildren' && ue.pop(), ue.push({ tag: 'JSXTagEnd' })) }q = S, yield { type: 'JSXPunctuator', value: C[0] }; continue } if (n.lastIndex = W, C = n.exec(k)) { W = n.lastIndex, q = C[0], yield { type: 'JSXIdentifier', value: C[0] }; continue } if (s.lastIndex = W, C = s.exec(k)) { W = s.lastIndex, q = C[0], yield { type: 'JSXString', value: C[0], closed: C[2] !== void 0 }; continue } break; case 'JSXChildren':if (l.lastIndex = W, C = l.exec(k)) { W = l.lastIndex, q = C[0], yield { type: 'JSXText', value: C[0] }; continue } switch (k[W]) { case '<':ue.push({ tag: 'JSXTag' }), W++, q = '<', yield { type: 'JSXPunctuator', value: '<' }; continue; case '{':ue.push({ tag: 'InterpolationInJSX', nesting: D.length }), W++, q = '?InterpolationInJSX', B = !1, yield { type: 'JSXPunctuator', value: '{' }; continue } } if (O.lastIndex = W, C = O.exec(k)) { W = O.lastIndex, yield { type: 'WhiteSpace', value: C[0] }; continue } if (h.lastIndex = W, C = h.exec(k)) { W = h.lastIndex, B = !1, f.test(q) && (q = '?NoLineTerminatorHere'), yield { type: 'LineTerminatorSequence', value: C[0] }; continue } if (p.lastIndex = W, C = p.exec(k)) { W = p.lastIndex, g.test(C[0]) && (B = !1, f.test(q) && (q = '?NoLineTerminatorHere')), yield { type: 'MultiLineComment', value: C[0], closed: C[1] !== void 0 }; continue } if (L.lastIndex = W, C = L.exec(k)) { W = L.lastIndex, B = !1, yield { type: 'SingleLineComment', value: C[0] }; continue }te = String.fromCodePoint(k.codePointAt(W)), W += te.length, q = te, B = !1, yield { type: P.tag.startsWith('JSX') ? 'JSXInvalid' : 'Invalid', value: te } } }, Nd
} const RL = OL(); const zL = kp(RL); function DL(e, t) { const n = ' '; const i = ' '; let s = ''; const l = []; for (const u of zL(e, { jsx: !1 })) { if (l.push(u), u.type === 'SingleLineComment') { s += i.repeat(u.value.length); continue } if (u.type === 'MultiLineComment') { s += u.value.replace(/[^\n]/g, i); continue } if (u.type === 'StringLiteral') { if (!u.closed) { s += u.value; continue } const f = u.value.slice(1, -1); { s += u.value[0] + n.repeat(f.length) + u.value[u.value.length - 1]; continue } } if (u.type === 'NoSubstitutionTemplate') { const f = u.value.slice(1, -1); { s += `\`${f.replace(/[^\n]/g, n)}\``; continue } } if (u.type === 'RegularExpressionLiteral') { const f = u.value; { s += f.replace(/\/(.*)\/(\w?)$/g, (h, p, g) => `/${n.repeat(p.length)}/${g}`); continue } } if (u.type === 'TemplateHead') { const f = u.value.slice(1, -2); { s += `\`${f.replace(/[^\n]/g, n)}\${`; continue } } if (u.type === 'TemplateTail') { const f = u.value.slice(0, -2); { s += `}${f.replace(/[^\n]/g, n)}\``; continue } } if (u.type === 'TemplateMiddle') { const f = u.value.slice(1, -2); { s += `}${f.replace(/[^\n]/g, n)}\${`; continue } }s += u.value } return { result: s, tokens: l } } function FL(e, t) { return HL(e).result } function HL(e, t) { return DL(e) } const BL = /^[A-Z]:\//i; function WL(e = '') { return e && e.replace(/\\/g, '/').replace(BL, t => t.toUpperCase()) } const jL = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Z]:[/\\]/i; const S0 = /^\/([A-Z]:)?$/i; function qL() { return typeof process < 'u' && typeof process.cwd == 'function' ? process.cwd().replace(/\\/g, '/') : '/' } function _0(...e) { e = e.map(i => WL(i)); let t = ''; let n = !1; for (let i = e.length - 1; i >= -1 && !n; i--) { const s = i >= 0 ? e[i] : qL(); !s || s.length === 0 || (t = `${s}/${t}`, n = k0(s)) } return t = UL(t, !n), n && !k0(t) ? `/${t}` : t.length > 0 ? t : '.' } function UL(e, t) {
  let n = ''; let i = 0; let s = -1; let l = 0; let u = null; for (let f = 0; f <= e.length; ++f) {
    if (f < e.length) {
      u = e[f]
    }
    else {
      if (u === '/')
        break; u = '/'
    } if (u === '/') {
      if (!(s === f - 1 || l === 1)) {
        if (l === 2) {
          if (n.length < 2 || i !== 2 || n[n.length - 1] !== '.' || n[n.length - 2] !== '.') {
            if (n.length > 2) { const h = n.lastIndexOf('/'); h === -1 ? (n = '', i = 0) : (n = n.slice(0, h), i = n.length - 1 - n.lastIndexOf('/')), s = f, l = 0; continue }
            else if (n.length > 0) { n = '', i = 0, s = f, l = 0; continue }
          }t && (n += n.length > 0 ? '/..' : '..', i = 2)
        }
        else {
          n.length > 0 ? n += `/${e.slice(s + 1, f)}` : n = e.slice(s + 1, f), i = f - s - 1
        }
      }s = f, l = 0
    }
    else {
      u === '.' && l !== -1 ? ++l : l = -1
    }
  } return n
} function k0(e) { return jL.test(e) } function sx(e, t) {
  const n = _0(e).replace(S0, '$1').split('/'); const i = _0(t).replace(S0, '$1').split('/'); if (i[0][1] === ':' && n[0][1] === ':' && n[0] !== i[0])
    return i.join('/'); const s = [...n]; for (const l of s) {
    if (i[0] !== l)
      break; n.shift(), i.shift()
  } return [...n.map(() => '..'), ...i].join('/')
} class VL extends Error {constructor(n, i, s) { super(n); ji(this, 'code', 'VITEST_PENDING'); ji(this, 'taskId'); this.message = n, this.note = s, this.taskId = i.id }} const GL = new WeakMap(); const lx = new WeakMap(); const ax = new WeakMap(); function XL(e, t) { GL.set(e, t) } function KL(e, t) { lx.set(e, t) } function JL(e) { return lx.get(e) } function YL(e, t) { ax.set(e, t) } function ZL(e) { return ax.get(e) } function QL(e, t) { const n = t.reduce((l, u) => (l[u.prop] = u, l), {}); const i = {}; e.forEach((l) => { const u = n[l.prop] || { ...l }; i[u.prop] = u }); for (const l in i) { var s; const u = i[l]; u.deps = (s = u.deps) === null || s === void 0 ? void 0 : s.map(f => i[f.prop]) } return Object.values(i) } function cx(e, t, n) {
  const i = ['auto', 'injected', 'scope']; const s = Object.entries(e).map(([l, u]) => { const f = { value: u }; if (Array.isArray(u) && u.length >= 2 && Kw(u[1]) && Object.keys(u[1]).some(p => i.includes(p))) { let h; Object.assign(f, u[1]); const p = u[0]; f.value = f.injected ? ((h = n.injectValue) === null || h === void 0 ? void 0 : h.call(n, l)) ?? p : p } return f.scope = f.scope || 'test', f.scope === 'worker' && !n.getWorkerContext && (f.scope = 'file'), f.prop = l, f.isFn = typeof f.value == 'function', f }); return Array.isArray(t.fixtures) ? t.fixtures = t.fixtures.concat(s) : t.fixtures = s, s.forEach((l) => {
    if (l.isFn) {
      const f = fx(l.value); if (f.length && (l.deps = t.fixtures.filter(({ prop: h }) => h !== l.prop && f.includes(h))), l.scope !== 'test') {
        let u; (u = l.deps) === null || u === void 0 || u.forEach((h) => {
          if (h.isFn && !(l.scope === 'worker' && h.scope === 'worker') && !(l.scope === 'file' && h.scope !== 'test'))
            throw new SyntaxError(`cannot use the ${h.scope} fixture "${h.prop}" inside the ${l.scope} fixture "${l.prop}"`)
        })
      }
    }
  }), t
} const Id = new Map(); const Ws = new Map(); function e$(e, t, n) {
  return (i) => {
    const s = i || n; if (!s)
      return t({}); const l = JL(s); if (!(l != null && l.length))
      return t(s); const u = fx(t); const f = l.some(({ auto: w }) => w); if (!u.length && !f)
      return t(s); Id.get(s) || Id.set(s, new Map()); const h = Id.get(s); Ws.has(s) || Ws.set(s, []); const p = Ws.get(s); const g = l.filter(({ prop: w, auto: L }) => L || u.includes(w)); const v = ux(g); if (!v.length)
      return t(s); async function y() {
      for (const w of v) {
        if (h.has(w))
          continue; const L = await t$(e, w, s, p); s[w.prop] = L, h.set(w, L), w.scope === 'test' && p.unshift(() => { h.delete(w) })
      }
    } return y().then(() => t(s))
  }
} const Dc = new WeakMap(); function t$(e, t, n, i) {
  let s; const l = S$(n.task.file); const u = (s = e.getWorkerContext) === null || s === void 0 ? void 0 : s.call(e); if (!t.isFn) { let f; if (l[f = t.prop] ?? (l[f] = t.value), u) { let h; u[h = t.prop] ?? (u[h] = t.value) } return t.value } if (t.scope === 'test')
    return T0(t.value, n, i); if (Dc.has(t))
    return Dc.get(t); let p; if (t.scope === 'worker') {
    if (!u)
      throw new TypeError('[@vitest/runner] The worker context is not available in the current test runner. Please, provide the `getWorkerContext` method when initiating the runner.'); p = u
  }
  else {
    p = l
  } if (t.prop in p)
    return p[t.prop]; Ws.has(p) || Ws.set(p, []); const g = Ws.get(p); const v = T0(t.value, p, g).then(y => (p[t.prop] = y, Dc.delete(t), y)); return Dc.set(t, v), v
} async function T0(e, t, n) { const i = c0(); let s = !1; const l = e(t, async (u) => { s = !0, i.resolve(u); const f = c0(); n.push(async () => { f.resolve(), await l }), await f }).catch((u) => { if (!s) { i.reject(u); return } throw u }); return i } function ux(e, t = new Set(), n = []) {
  return e.forEach((i) => {
    if (!n.includes(i)) {
      if (!i.isFn || !i.deps) { n.push(i); return } if (t.has(i))
        throw new Error(`Circular fixture dependency detected: ${i.prop} <- ${[...t].reverse().map(s => s.prop).join(' <- ')}`); t.add(i), ux(i.deps, t, n), n.push(i), t.clear()
    }
  }), n
} function fx(e) {
  let t = FL(e.toString()); /__async\((?:this|null), (?:null|arguments|\[[_0-9, ]*\]), function\*/.test(t) && (t = t.split(/__async\((?:this|null),/)[1]); const n = t.match(/[^(]*\(([^)]*)/); if (!n)
    return []; const i = C0(n[1]); if (!i.length)
    return []; let s = i[0]; if ('__VITEST_FIXTURE_INDEX__' in e && (s = i[e.__VITEST_FIXTURE_INDEX__], !s))
    return []; if (!(s.startsWith('{') && s.endsWith('}')))
    throw new Error(`The first argument inside a fixture must use object destructuring pattern, e.g. ({ test } => {}). Instead, received "${s}".`); const l = s.slice(1, -1).replace(/\s/g, ''); const u = C0(l).map(h => h.replace(/:.*|=.*/g, '')); const f = u.at(-1); if (f && f.startsWith('...'))
    throw new Error(`Rest parameters are not supported in fixtures, received "${f}".`); return u
} function C0(e) {
  const t = []; const n = []; let i = 0; for (let l = 0; l < e.length; l++) {
    if (e[l] === '{' || e[l] === '[') {
      n.push(e[l] === '{' ? '}' : ']')
    }
    else if (e[l] === n[n.length - 1]) {
      n.pop()
    }
    else if (!n.length && e[l] === ',') { const u = e.substring(i, l).trim(); u && t.push(u), i = l + 1 }
  } const s = e.substring(i).trim(); return s && t.push(s), t
} function dx(e, t) { function n(s) { const l = function (...u) { return t.apply(s, u) }; Object.assign(l, t), l.withContext = () => l.bind(s), l.setContext = (u, f) => { s[u] = f }, l.mergeContext = (u) => { Object.assign(s, u) }; for (const u of e)Object.defineProperty(l, u, { get() { return n({ ...s, [u]: !0 }) } }); return l } const i = n({}); return i.fn = t, i } const jl = a$(); Tp(function (e, t, n) { wh().test.fn.call(this, lo(e), t, n) }); let Xr, hx, n$; function px(e, t) {
  if (!e)
    throw new Error(`Vitest failed to find ${t}. This is a bug in Vitest. Please, open an issue with reproduction.`)
} function r$() { return n$ } function i$() { return px(Xr, 'the runner'), Xr } function wh() { const e = ao.currentSuite || hx; return px(e, 'the current suite'), e } function o$() { return { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] } } function Uo(e, t) {
  let n = {}; let i = () => {}; if (typeof t == 'object') {
    if (typeof e == 'object')
      throw new TypeError('Cannot use two objects as arguments. Please provide options and a function callback in that order.'); console.warn('Using an object as a third argument is deprecated. Vitest 4 will throw an error if the third argument is not a timeout number. Please use the second argument for options. See more at https://vitest.dev/guide/migration'), n = t
  }
  else {
    typeof t == 'number' ? n = { timeout: t } : typeof e == 'object' && (n = e)
  } if (typeof e == 'function') {
    if (typeof t == 'function')
      throw new TypeError('Cannot use two functions as arguments. Please use the second argument for options.'); i = e
  }
  else {
    typeof t == 'function' && (i = t)
  } return { options: n, handler: i }
} function s$(e, t = () => {}, n, i, s, l) {
  const u = []; let f; w(); const h = function (A = '', E = {}) { let M; const O = (E == null ? void 0 : E.timeout) ?? Xr.config.testTimeout; const k = { id: '', name: A, suite: (M = ao.currentSuite) === null || M === void 0 ? void 0 : M.suite, each: E.each, fails: E.fails, context: void 0, type: 'test', file: void 0, timeout: O, retry: E.retry ?? Xr.config.retry, repeats: E.repeats, mode: E.only ? 'only' : E.skip ? 'skip' : E.todo ? 'todo' : 'run', meta: E.meta ?? Object.create(null), annotations: [] }; const z = E.handler; (E.concurrent || !E.sequential && Xr.config.sequence.concurrent) && (k.concurrent = !0), k.shuffle = s == null ? void 0 : s.shuffle; const D = w$(k, Xr); Object.defineProperty(k, 'context', { value: D, enumerable: !1 }), KL(D, E.fixtures); const te = Error.stackTraceLimit; Error.stackTraceLimit = 15; const ee = new Error('STACK_TRACE_ERROR'); if (Error.stackTraceLimit = te, z && XL(k, xh(l$(e$(Xr, z, D), k), O, !1, ee, (W, q) => y$([D], q))), Xr.config.includeTaskLocation) { const W = ee.stack; const q = u$(W); q && (k.location = q) } return u.push(k), k }; const p = Tp(function (A, E, M) { let { options: O, handler: k } = Uo(E, M); typeof s == 'object' && (O = Object.assign({}, s, O)), O.concurrent = this.concurrent || !this.sequential && (O == null ? void 0 : O.concurrent), O.sequential = this.sequential || !this.concurrent && (O == null ? void 0 : O.sequential); const z = h(lo(A), { ...this, ...O, handler: k }); z.type = 'test' }); let g = l; const v = { type: 'collector', name: e, mode: n, suite: f, options: s, test: p, tasks: u, collect: $, task: h, clear: L, on: y, fixtures() { return g }, scoped(A) { const E = cx(A, { fixtures: g }, Xr); E.fixtures && (g = E.fixtures) } }; function y(A, ...E) { ZL(f)[A].push(...E) } function w(A) { let E; typeof s == 'number' && (s = { timeout: s }), f = { id: '', type: 'suite', name: e, suite: (E = ao.currentSuite) === null || E === void 0 ? void 0 : E.suite, mode: n, each: i, file: void 0, shuffle: s == null ? void 0 : s.shuffle, tasks: [], meta: Object.create(null), concurrent: s == null ? void 0 : s.concurrent }, YL(f, o$()) } function L() { u.length = 0, w() } async function $(A) {
    if (!A)
      throw new TypeError('File is required to collect tasks.'); t && await v$(v, () => t(p)); const E = []; for (const M of u)E.push(M.type === 'collector' ? await M.collect(A) : M); return f.file = A, f.tasks = E, E.forEach((M) => { M.file = A }), f
  } return m$(v), v
} function l$(e, t) {
  return async (...n) => {
    const i = await e(...n); if (t.promises) {
      const l = (await Promise.allSettled(t.promises)).map(u => u.status === 'rejected' ? u.reason : void 0).filter(Boolean); if (l.length)
        throw l
    } return i
  }
} function a$() { function e(t, n, i) { let s; const l = this.only ? 'only' : this.skip ? 'skip' : this.todo ? 'todo' : 'run'; const u = ao.currentSuite || hx; let { options: f, handler: h } = Uo(n, i); const p = f.concurrent || this.concurrent || f.sequential === !1; const g = f.sequential || this.sequential || f.concurrent === !1; f = { ...u == null ? void 0 : u.options, ...f, shuffle: this.shuffle ?? f.shuffle ?? (u == null || (s = u.options) === null || s === void 0 ? void 0 : s.shuffle) ?? void 0 }; const v = p || f.concurrent && !g; const y = g || f.sequential && !p; return f.concurrent = v && !y, f.sequential = y && !v, s$(lo(t), h, l, this.each, f, u == null ? void 0 : u.fixtures()) } return e.each = function (t, ...n) { const i = this.withContext(); return this.setContext('each', !0), Array.isArray(t) && n.length && (t = Cu(t, n)), (s, l, u) => { const f = lo(s); const h = t.every(Array.isArray); const { options: p, handler: g } = Uo(l, u); const v = typeof l == 'function' && typeof u == 'object'; t.forEach((y, w) => { const L = Array.isArray(y) ? y : [y]; v ? h ? i(Jr(f, L, w), () => g(...L), p) : i(Jr(f, L, w), () => g(y), p) : h ? i(Jr(f, L, w), p, () => g(...L)) : i(Jr(f, L, w), p, () => g(y)) }), this.setContext('each', void 0) } }, e.for = function (t, ...n) { return Array.isArray(t) && n.length && (t = Cu(t, n)), (i, s, l) => { const u = lo(i); const { options: f, handler: h } = Uo(s, l); t.forEach((p, g) => { jl(Jr(u, ja(p), g), f, () => h(p)) }) } }, e.skipIf = t => t ? jl.skip : jl, e.runIf = t => t ? jl : jl.skip, dx(['concurrent', 'sequential', 'shuffle', 'skip', 'only', 'todo'], e) } function c$(e, t) { const n = e; n.each = function (s, ...l) { const u = this.withContext(); return this.setContext('each', !0), Array.isArray(s) && l.length && (s = Cu(s, l)), (f, h, p) => { const g = lo(f); const v = s.every(Array.isArray); const { options: y, handler: w } = Uo(h, p); const L = typeof h == 'function' && typeof p == 'object'; s.forEach(($, A) => { const E = Array.isArray($) ? $ : [$]; L ? v ? u(Jr(g, E, A), () => w(...E), y) : u(Jr(g, E, A), () => w($), y) : v ? u(Jr(g, E, A), y, () => w(...E)) : u(Jr(g, E, A), y, () => w($)) }), this.setContext('each', void 0) } }, n.for = function (s, ...l) { const u = this.withContext(); return Array.isArray(s) && l.length && (s = Cu(s, l)), (f, h, p) => { const g = lo(f); const { options: v, handler: y } = Uo(h, p); s.forEach((w, L) => { const $ = A => y(w, A); $.__VITEST_FIXTURE_INDEX__ = 1, $.toString = () => y.toString(), u(Jr(g, ja(w), L), v, $) }) } }, n.skipIf = function (s) { return s ? this.skip : this }, n.runIf = function (s) { return s ? this : this.skip }, n.scoped = function (s) { wh().scoped(s) }, n.extend = function (s) { const l = cx(s, t || {}, Xr); const u = e; return Tp(function (f, h, p) { const v = wh().fixtures(); const y = { ...this }; v && (y.fixtures = QL(y.fixtures || [], v)); const { handler: w, options: L } = Uo(h, p); const $ = L.timeout ?? void 0; u.call(y, lo(f), w, $) }, l) }; const i = dx(['concurrent', 'sequential', 'skip', 'only', 'todo', 'fails'], n); return t && i.mergeContext(t), i } function Tp(e, t) { return c$(e, t) } function lo(e) { return typeof e == 'string' ? e : typeof e == 'function' ? e.name || '<anonymous>' : String(e) } function Jr(e, t, n) {
  (e.includes('%#') || e.includes('%$')) && (e = e.replace(/%%/g, '__vitest_escaped_%__').replace(/%#/g, `${n}`).replace(/%\$/g, `${n + 1}`).replace(/__vitest_escaped_%__/g, '%%')); const i = e.split('%').length - 1; e.includes('%f') && (e.match(/%f/g) || []).forEach((f, h) => { if (FA(t[h]) || Object.is(t[h], -0)) { let p = 0; e = e.replace(/%f/g, g => (p++, p === h + 1 ? '-%f' : g)) } }); let s = zA(e, ...t.slice(0, i)); const l = Kw(t[0]); return s = s.replace(/\$([$\w.]+)/g, (u, f) => {
    const h = /^\d+$/.test(f); if (!l && !h)
      return `$${f}`; const p = h ? a0(t, f) : void 0; const g = l ? a0(t[0], f, p) : p; return DA(g, { truncate: void 0 })
  }), s
} function Cu(e, t) {
  const n = e.join('').trim().replace(/ /g, '').split(`
`).map(s => s.split('|'))[0]; const i = []; for (let s = 0; s < Math.floor(t.length / n.length); s++) { const l = {}; for (let u = 0; u < n.length; u++)l[n[u]] = t[s * n.length + u]; i.push(l) } return i
} function u$(e) {
  const t = r$(); const n = e.split(`
`).slice(1); for (const i of n) {
    const s = ix(i); if (s && s.file === t)
      return { line: s.line, column: s.column }
  }
} function f$(e) {
  let t = 0; if (e.length === 0)
    return `${t}`; for (let n = 0; n < e.length; n++) { const i = e.charCodeAt(n); t = (t << 5) - t + i, t = t & t } return `${t}`
} function gx(e, t, n, i) { const s = sx(t, e); const l = { id: d$(s, n), name: s, type: 'suite', mode: 'queued', filepath: e, tasks: [], meta: Object.create(null), projectName: n, file: void 0, pool: i }; return l.file = l, _$(l, Object.create(null)), l } function d$(e, t) { return f$(`${e}${t || ''}`) }globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now; function mx(e) { return Ta(e) } function Ta(e) { return e.type === 'test' } function vx(e) {
  const t = []; const n = ja(e); for (const i of n) {
    if (Ta(i)) {
      t.push(i)
    }
    else {
      for (const s of i.tasks) {
        if (Ta(s)) {
          t.push(s)
        }
        else { const l = vx(s); for (const u of l)t.push(u) }
      }
    }
  } return t
} function Cp(e = []) { return ja(e).flatMap(t => Ta(t) ? [t] : [t, ...Cp(t.tasks)]) } function h$(e) { const t = [e.name]; let n = e; for (;n != null && n.suite;)n = n.suite, n != null && n.name && t.unshift(n.name); return n !== e.file && t.unshift(e.file.name), t }globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now; Yw(); const Pd = new Map(); const E0 = []; const tu = []; function p$(e) { if (Pd.size) { let t; const n = Array.from(Pd).map(([s, l]) => [s, l[0], l[1]]); const i = (t = e.onTaskUpdate) === null || t === void 0 ? void 0 : t.call(e, n, E0); i && (tu.push(i), i.then(() => tu.splice(tu.indexOf(i), 1), () => {})), E0.length = 0, Pd.clear() } } async function g$(e) { p$(e), await Promise.all(tu) } const A0 = Date.now; const ao = { currentSuite: null }; function m$(e) { let t; (t = ao.currentSuite) === null || t === void 0 || t.tasks.push(e) } async function v$(e, t) { const n = ao.currentSuite; ao.currentSuite = e, await t(), ao.currentSuite = n } function xh(e, t, n = !1, i, s) {
  if (t <= 0 || t === Number.POSITIVE_INFINITY)
    return e; const { setTimeout: l, clearTimeout: u } = Yw(); return function (...h) {
    const p = A0(); const g = i$(); return g._currentTaskStartTime = p, g._currentTaskTimeout = t, new Promise((v, y) => {
      let w; const L = l(() => { u(L), $() }, t); (w = L.unref) === null || w === void 0 || w.call(L); function $() { const M = x$(n, t, i); s == null || s(h, M), y(M) } function A(M) { if (g._currentTaskStartTime = void 0, g._currentTaskTimeout = void 0, u(L), A0() - p >= t) { $(); return }v(M) } function E(M) { g._currentTaskStartTime = void 0, g._currentTaskTimeout = void 0, u(L), y(M) } try { const M = e(...h); typeof M == 'object' && M != null && typeof M.then == 'function' ? M.then(A, E) : A(M) }
      catch (M) { E(M) }
    })
  }
} const Sh = new WeakMap(); function y$([e], t) { e && b$(e, t) } function b$(e, t) { const n = Sh.get(e); n == null || n.abort(t) } function w$(e, t) {
  let n; const i = function () { throw new Error('done() callback is deprecated, use promise instead') }; let s = Sh.get(i); s || (s = new AbortController(), Sh.set(i, s)), i.signal = s.signal, i.task = e, i.skip = (u, f) => {
    if (u !== !1)
      throw e.result ?? (e.result = { state: 'skip' }), e.result.pending = !0, new VL('test is skipped; abort execution', e, typeof u == 'string' ? u : f)
  }; async function l(u, f, h, p) {
    const g = { message: u, type: h || 'notice' }; if (p) {
      if (!p.body && !p.path)
        throw new TypeError('Test attachment requires body or path to be set. Both are missing.'); if (p.body && p.path)
        throw new TypeError('Test attachment requires only one of "body" or "path" to be set. Both are specified.'); g.attachment = p, p.body instanceof Uint8Array && (p.body = k$(p.body))
    } if (f && (g.location = f), !t.onTestAnnotate)
      throw new Error('Test runner doesn\'t support test annotations.'); await g$(t); const v = await t.onTestAnnotate(e, g); return e.annotations.push(v), v
  } return i.annotate = (u, f, h) => {
    if (e.result && e.result.state !== 'run')
      throw new Error(`Cannot annotate tests outside of the test run. The test "${e.name}" finished running with the "${e.result.state}" state already.`); let p; const g = new Error('STACK_TRACE').stack; const v = g.includes('STACK_TRACE') ? 2 : 1; const y = g.split(`
`)[v]; const w = ix(y); return w && (p = { file: w.file, line: w.line, column: w.column }), typeof f == 'object' ? L0(e, l(u, p, void 0, f)) : L0(e, l(u, p, f, h))
  }, i.onTestFailed = (u, f) => { e.onFailed || (e.onFailed = []), e.onFailed.push(xh(u, f ?? t.config.hookTimeout, !0, new Error('STACK_TRACE_ERROR'), (h, p) => s.abort(p))) }, i.onTestFinished = (u, f) => { e.onFinished || (e.onFinished = []), e.onFinished.push(xh(u, f ?? t.config.hookTimeout, !0, new Error('STACK_TRACE_ERROR'), (h, p) => s.abort(p))) }, ((n = t.extendTaskContext) === null || n === void 0 ? void 0 : n.call(t, i)) || i
} function x$(e, t, n) {
  const i = `${e ? 'Hook' : 'Test'} timed out in ${t}ms.
If this is a long-running ${e ? 'hook' : 'test'}, pass a timeout value as the last argument or configure it globally with "${e ? 'hookTimeout' : 'testTimeout'}".`; const s = new Error(i); return n != null && n.stack && (s.stack = n.stack.replace(s.message, n.message)), s
} const yx = new WeakMap(); function S$(e) {
  const t = yx.get(e); if (!t)
    throw new Error(`Cannot find file context for ${e.name}`); return t
} function _$(e, t) { yx.set(e, t) } const ur = []; for (let e = 65; e < 91; e++)ur.push(String.fromCharCode(e)); for (let e = 97; e < 123; e++)ur.push(String.fromCharCode(e)); for (let e = 0; e < 10; e++)ur.push(e.toString(10)); function k$(e) {
  let t = ''; const n = e.byteLength; for (let i = 0; i < n; i += 3) {
    if (n === i + 1) { const s = (e[i] & 252) >> 2; const l = (e[i] & 3) << 4; t += ur[s], t += ur[l], t += '==' }
    else if (n === i + 2) { const s = (e[i] & 252) >> 2; const l = (e[i] & 3) << 4 | (e[i + 1] & 240) >> 4; const u = (e[i + 1] & 15) << 2; t += ur[s], t += ur[l], t += ur[u], t += '=' }
    else { const s = (e[i] & 252) >> 2; const l = (e[i] & 3) << 4 | (e[i + 1] & 240) >> 4; const u = (e[i + 1] & 15) << 2 | (e[i + 2] & 192) >> 6; const f = e[i + 2] & 63; t += ur[s], t += ur[l], t += ur[u], t += ur[f] }
  } return t
} function L0(e, t) {
  return t = t.finally(() => {
    if (!e.promises)
      return; const n = e.promises.indexOf(t); n !== -1 && e.promises.splice(n, 1)
  }), e.promises || (e.promises = []), e.promises.push(t), t
} const $0 = 'q'; const M0 = 's'; const T$ = 6e4; function bx(e) { return e } const C$ = bx; const { clearTimeout: E$, setTimeout: A$ } = globalThis; const L$ = Math.random.bind(Math); function $$(e, t) {
  const { post: n, on: i, off: s = () => {}, eventNames: l = [], serialize: u = bx, deserialize: f = C$, resolver: h, bind: p = 'rpc', timeout: g = T$ } = t; const v = new Map(); let y; let w = !1; const L = new Proxy({}, { get(E, M) {
    if (M === '$functions')
      return e; if (M === '$close')
      return $; if (M === '$closed')
      return w; if (M === 'then' && !l.includes('then') && !('then' in e))
      return; const O = (...z) => { n(u({ m: M, a: z, t: $0 })) }; if (l.includes(M))
      return O.asEvent = O, O; const k = async (...z) => {
      if (w)
        throw new Error(`[birpc] rpc is closed, cannot call "${M}"`); if (y) {
        try { await y }
        finally { y = void 0 }
      } return new Promise((D, te) => {
        let q; const ee = N$(); let W; g >= 0 && (W = A$(() => {
          let K; try {
            if (((K = t.onTimeoutError) == null ? void 0 : K.call(t, M, z)) !== !0)
              throw new Error(`[birpc] timeout on calling "${M}"`)
          }
          catch (C) { te(C) }v.delete(ee)
        }, g), typeof W == 'object' && (W = (q = W.unref) == null ? void 0 : q.call(W))), v.set(ee, { resolve: D, reject: te, timeoutId: W, method: M }), n(u({ m: M, a: z, i: ee, t: 'q' }))
      })
    }; return k.asEvent = O, k
  } }); function $(E) { w = !0, v.forEach(({ reject: M, method: O }) => { M(E || new Error(`[birpc] rpc is closed, cannot call "${O}"`)) }), v.clear(), s(A) } async function A(E, ...M) {
    let k, z, D; let O; try { O = f(E) }
    catch (te) {
      if (((k = t.onGeneralError) == null ? void 0 : k.call(t, te)) !== !0)
        throw te; return
    } if (O.t === $0) {
      const { m: te, a: ee } = O; let W, q; const K = h ? h(te, e[te]) : e[te]; if (!K) {
        q = new Error(`[birpc] function "${te}" not found`)
      }
      else {
        try { W = await K.apply(p === 'rpc' ? L : e, ee) }
        catch (C) { q = C }
      } if (O.i) {
        if (q && t.onError && t.onError(q, te, ee), q && t.onFunctionError && t.onFunctionError(q, te, ee) === !0)
          return; if (!q) {
          try { n(u({ t: M0, i: O.i, r: W }), ...M); return }
          catch (C) {
            if (q = C, ((z = t.onGeneralError) == null ? void 0 : z.call(t, C, te, ee)) !== !0)
              throw C
          }
        } try { n(u({ t: M0, i: O.i, e: q }), ...M) }
        catch (C) {
          if (((D = t.onGeneralError) == null ? void 0 : D.call(t, C, te, ee)) !== !0)
            throw C
        }
      }
    }
    else { const { i: te, r: ee, e: W } = O; const q = v.get(te); q && (E$(q.timeoutId), W ? q.reject(W) : q.resolve(ee)), v.delete(te) }
  } return y = i(A), L
} const M$ = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'; function N$(e = 21) { let t = ''; let n = e; for (;n--;)t += M$[L$() * 64 | 0]; return t } const { parse: wx, stringify: I$ } = JSON; const { keys: P$ } = Object; const Ca = String; const xx = 'string'; const N0 = {}; const Eu = 'object'; const Sx = (e, t) => t; const O$ = e => e instanceof Ca ? Ca(e) : e; const R$ = (e, t) => typeof t === xx ? new Ca(t) : t; function _x(e, t, n, i) {
  const s = []; for (let l = P$(n), { length: u } = l, f = 0; f < u; f++) {
    const h = l[f]; const p = n[h]; if (p instanceof Ca) { const g = e[p]; typeof g === Eu && !t.has(g) ? (t.add(g), n[h] = N0, s.push({ k: h, a: [e, t, g, i] })) : n[h] = i.call(n, h, g) }
    else {
      n[h] !== N0 && (n[h] = i.call(n, h, p))
    }
  } for (let { length: l } = s, u = 0; u < l; u++) { const { k: f, a: h } = s[u]; n[f] = i.call(n, f, _x.apply(null, h)) } return n
} function I0(e, t, n) { const i = Ca(t.push(n) - 1); return e.set(n, i), i } function _h(e, t) { const n = wx(e, R$).map(O$); const i = n[0]; const s = t || Sx; const l = typeof i === Eu && i ? _x(n, new Set(), i, s) : i; return s.call({ '': l }, '', l) } function kx(e, t, n) {
  const i = t && typeof t === Eu ? (g, v) => g === '' || t.includes(g) ? v : void 0 : t || Sx; const s = new Map(); const l = []; const u = []; let f = +I0(s, l, i.call({ '': e }, '', e)); let h = !f; for (;f < l.length;)h = !0, u[f] = I$(l[f++], p, n); return `[${u.join(',')}]`; function p(g, v) {
    if (h)
      return h = !h, v; const y = i.call(this, g, v); switch (typeof y) {
      case Eu:if (y === null)
        return y; case xx:return s.get(y) || I0(s, l, y)
    } return y
  }
} const z$ = e => wx(kx(e)); class Tx {constructor() { ji(this, 'filesMap', new Map()); ji(this, 'pathsSet', new Set()); ji(this, 'idMap', new Map()) }getPaths() { return Array.from(this.pathsSet) }getFiles(t) { return t ? t.map(n => this.filesMap.get(n)).flat().filter(n => n && !n.local) : Array.from(this.filesMap.values()).flat().filter(n => !n.local) }getFilepaths() { return Array.from(this.filesMap.keys()) }getFailedFilepaths() { return this.getFiles().filter((t) => { let n; return ((n = t.result) == null ? void 0 : n.state) === 'fail' }).map(t => t.filepath) }collectPaths(t = []) { t.forEach((n) => { this.pathsSet.add(n) }) }collectFiles(t = []) { t.forEach((n) => { const i = this.filesMap.get(n.filepath) || []; const s = i.filter(u => u.projectName !== n.projectName || u.meta.typecheck !== n.meta.typecheck); const l = i.find(u => u.projectName === n.projectName); l && (n.logs = l.logs), s.push(n), this.filesMap.set(n.filepath, s), this.updateId(n) }) }clearFiles(t, n = []) { const i = t; n.forEach((s) => { const l = this.filesMap.get(s); const u = gx(s, i.config.root, i.config.name || ''); if (u.local = !0, this.idMap.set(u.id, u), !l) { this.filesMap.set(s, [u]); return } const f = l.filter(h => h.projectName !== i.config.name); f.length ? this.filesMap.set(s, [...f, u]) : this.filesMap.set(s, [u]) }) }updateId(t) { this.idMap.get(t.id) !== t && (this.idMap.set(t.id, t), t.type === 'suite' && t.tasks.forEach((n) => { this.updateId(n) })) }updateTasks(t) { for (const [n, i, s] of t) { const l = this.idMap.get(n); l && (l.result = i, l.meta = s, (i == null ? void 0 : i.state) === 'skip' && (l.mode = 'skip')) } }updateUserLog(t) { const n = t.taskId && this.idMap.get(t.taskId); n && (n.logs || (n.logs = []), n.logs.push(t)) }} function D$(e, t = {}) { const { handlers: n = {}, autoReconnect: i = !0, reconnectInterval: s = 2e3, reconnectTries: l = 10, connectTimeout: u = 6e4, reactive: f = M => M, WebSocketConstructor: h = globalThis.WebSocket } = t; let p = l; const g = f({ ws: new h(e), state: new Tx(), waitForConnection: E, reconnect: $ }, 'state'); g.state.filesMap = f(g.state.filesMap, 'filesMap'), g.state.idMap = f(g.state.idMap, 'idMap'); let v; const y = { onTestAnnotate(M, O) { let k; (k = n.onTestAnnotate) == null || k.call(n, M, O) }, onSpecsCollected(M) { let O; M == null || M.forEach(([k, z]) => { g.state.clearFiles({ config: k }, [z]) }), (O = n.onSpecsCollected) == null || O.call(n, M) }, onPathsCollected(M) { let O; g.state.collectPaths(M), (O = n.onPathsCollected) == null || O.call(n, M) }, onCollected(M) { let O; g.state.collectFiles(M), (O = n.onCollected) == null || O.call(n, M) }, onTaskUpdate(M, O) { let k; g.state.updateTasks(M), (k = n.onTaskUpdate) == null || k.call(n, M, O) }, onUserConsoleLog(M) { let O; g.state.updateUserLog(M), (O = n.onUserConsoleLog) == null || O.call(n, M) }, onFinished(M, O) { let k; (k = n.onFinished) == null || k.call(n, M, O) }, onFinishedReportCoverage() { let M; (M = n.onFinishedReportCoverage) == null || M.call(n) } }; const w = { post: M => g.ws.send(M), on: M => v = M, serialize: M => kx(M, (O, k) => k instanceof Error ? { name: k.name, message: k.message, stack: k.stack } : k), deserialize: _h, onTimeoutError(M) { throw new Error(`[vitest-ws-client]: Timeout calling "${M}"`) } }; g.rpc = $$(y, w); let L; function $(M = !1) { M && (p = l), g.ws = new h(e), A() } function A() { L = new Promise((M, O) => { let z, D; const k = (D = (z = setTimeout(() => { O(new Error(`Cannot connect to the server in ${u / 1e3} seconds`)) }, u)) == null ? void 0 : z.unref) == null ? void 0 : D.call(z); g.ws.OPEN === g.ws.readyState && M(), g.ws.addEventListener('open', () => { p = l, M(), clearTimeout(k) }) }), g.ws.addEventListener('message', (M) => { v(M.data) }), g.ws.addEventListener('close', () => { p -= 1, i && p > 0 && setTimeout($, s) }) }A(); function E() { return L } return g } function Ep(e) { return cb() ? (Dk(e), !0) : !1 } const Od = new WeakMap(); function F$(...e) {
  let t; const n = e[0]; const i = (t = Ko()) == null ? void 0 : t.proxy; if (i == null && !Kb())
    throw new Error('injectLocal must be called in setup'); return i && Od.has(i) && n in Od.get(i) ? Od.get(i)[n] : wn(...e)
} const H$ = typeof window < 'u' && typeof document < 'u'; typeof WorkerGlobalScope < 'u' && globalThis instanceof WorkerGlobalScope; const B$ = Object.prototype.toString; const W$ = e => B$.call(e) === '[object Object]'; function Au() {} function Cx(e, t) { function n(...i) { return new Promise((s, l) => { Promise.resolve(e(() => t.apply(this, i), { fn: t, thisArg: this, args: i })).then(s).catch(l) }) } return n } const Ex = e => e(); function Ax(e, t = {}) { let n; let i; let s = Au; const l = (h) => { clearTimeout(h), s(), s = Au }; let u; return (h) => { const p = Gt(e); const g = Gt(t.maxWait); return n && l(n), p <= 0 || g !== void 0 && g <= 0 ? (i && (l(i), i = null), Promise.resolve(h())) : new Promise((v, y) => { s = t.rejectOnCancel ? y : v, u = h, g && !i && (i = setTimeout(() => { n && l(n), i = null, v(u()) }, g)), n = setTimeout(() => { i && l(i), i = null, v(h()) }, p) }) } } function j$(e = Ex, t = {}) { const { initialState: n = 'active' } = t; const i = Lx(n === 'active'); function s() { i.value = !1 } function l() { i.value = !0 } const u = (...f) => { i.value && e(...f) }; return { isActive: Ra(i), pause: s, resume: l, eventFilter: u } } function P0(e, t = !1, n = 'Timeout') { return new Promise((i, s) => { setTimeout(t ? () => s(n) : i, e) }) } function O0(e) { return e.endsWith('rem') ? Number.parseFloat(e) * 16 : Number.parseFloat(e) } function q$(e) { return Ko() } function Rd(e) { return Array.isArray(e) ? e : [e] } function Lx(...e) {
  if (e.length !== 1)
    return ol(...e); const t = e[0]; return typeof t == 'function' ? Ra(Cb(() => ({ get: t, set: Au }))) : Ue(t)
} function Fc(e, t = 200, n = {}) { return Cx(Ax(t, n), e) } function $x(e, t, n = {}) { const { eventFilter: i = Ex, ...s } = n; return St(e, Cx(i, t), s) } function Mx(e, t, n = {}) { const { eventFilter: i, initialState: s = 'active', ...l } = n; const { eventFilter: u, pause: f, resume: h, isActive: p } = j$(i, { initialState: s }); return { stop: $x(e, t, { ...l, eventFilter: u }), pause: f, resume: h, isActive: p } } function Ap(e, t = !0, n) { q$() ? bo(e, n) : t ? e() : Et(e) } function kh(e, t = !1) {
  function n(v, { flush: y = 'sync', deep: w = !1, timeout: L, throwOnTimeout: $ } = {}) { let A = null; const M = [new Promise((O) => { A = St(e, (k) => { v(k) !== t && (A ? A() : Et(() => A == null ? void 0 : A()), O(k)) }, { flush: y, deep: w, immediate: !0 }) })]; return L != null && M.push(P0(L, $).then(() => Gt(e)).finally(() => A == null ? void 0 : A())), Promise.race(M) } function i(v, y) {
    if (!kt(v))
      return n(k => k === v, y); const { flush: w = 'sync', deep: L = !1, timeout: $, throwOnTimeout: A } = y ?? {}; let E = null; const O = [new Promise((k) => { E = St([e, v], ([z, D]) => { t !== (z === D) && (E ? E() : Et(() => E == null ? void 0 : E()), k(z)) }, { flush: w, deep: L, immediate: !0 }) })]; return $ != null && O.push(P0($, A).then(() => Gt(e)).finally(() => (E == null || E(), Gt(e)))), Promise.race(O)
  } function s(v) { return n(y => !!y, v) } function l(v) { return i(null, v) } function u(v) { return i(void 0, v) } function f(v) { return n(Number.isNaN, v) } function h(v, y) { return n((w) => { const L = Array.from(w); return L.includes(v) || L.includes(Gt(v)) }, y) } function p(v) { return g(1, v) } function g(v = 1, y) { let w = -1; return n(() => (w += 1, w >= v), y) } return Array.isArray(Gt(e)) ? { toMatch: n, toContains: h, changed: p, changedTimes: g, get not() { return kh(e, !t) } } : { toMatch: n, toBe: i, toBeTruthy: s, toBeNull: l, toBeNaN: f, toBeUndefined: u, changed: p, changedTimes: g, get not() { return kh(e, !t) } }
} function R0(e) { return kh(e) } function U$(e = !1, t = {}) {
  const { truthyValue: n = !0, falsyValue: i = !1 } = t; const s = kt(e); const l = rn(e); function u(f) {
    if (arguments.length)
      return l.value = f, l.value; { const h = Gt(n); return l.value = l.value === h ? Gt(i) : h, l.value }
  } return s ? u : [l, u]
} function Lp(e, t, n = {}) { const { debounce: i = 0, maxWait: s = void 0, ...l } = n; return $x(e, t, { ...l, eventFilter: Ax(i, { maxWait: s }) }) } function V$(e, t, n) { return St(e, t, { ...n, immediate: !0 }) } function G$(e, t, n) { const i = St(e, (...s) => (Et(() => i()), t(...s)), n); return i } function X$(e, t, n) {
  let i; kt(n) ? i = { evaluating: n } : i = {}; const { lazy: s = !1, evaluating: l = void 0, shallow: u = !0, onError: f = Au } = i; const h = rn(!s); const p = u ? rn(t) : Ue(t); let g = 0; return hp(async (v) => {
    if (!h.value)
      return; g++; const y = g; let w = !1; l && Promise.resolve().then(() => { l.value = !0 }); try { const L = await e(($) => { v(() => { l && (l.value = !1), w || $() }) }); y === g && (p.value = L) }
    catch (L) { f(L) }
    finally { l && y === g && (l.value = !1), w = !0 }
  }), s ? _e(() => (h.value = !0, p.value)) : p
} const Or = H$ ? window : void 0; function Lu(e) { let t; const n = Gt(e); return (t = n == null ? void 0 : n.$el) != null ? t : n } function go(...e) {
  const t = []; const n = () => { t.forEach(f => f()), t.length = 0 }; const i = (f, h, p, g) => (f.addEventListener(h, p, g), () => f.removeEventListener(h, p, g)); const s = _e(() => { const f = Rd(Gt(e[0])).filter(h => h != null); return f.every(h => typeof h != 'string') ? f : void 0 }); const l = V$(() => { let f, h; return [(h = (f = s.value) == null ? void 0 : f.map(p => Lu(p))) != null ? h : [Or].filter(p => p != null), Rd(Gt(s.value ? e[1] : e[0])), Rd(j(s.value ? e[2] : e[1])), Gt(s.value ? e[3] : e[2])] }, ([f, h, p, g]) => {
    if (n(), !(f != null && f.length) || !(h != null && h.length) || !(p != null && p.length))
      return; const v = W$(g) ? { ...g } : g; t.push(...f.flatMap(y => h.flatMap(w => p.map(L => i(y, w, L, v)))))
  }, { flush: 'post' }); const u = () => { l(), n() }; return Ep(n), u
} function K$() { const e = rn(!1); const t = Ko(); return t && bo(() => { e.value = !0 }, t), e } function Nx(e) { const t = K$(); return _e(() => (t.value, !!e())) } function J$(e) { return typeof e == 'function' ? e : typeof e == 'string' ? t => t.key === e : Array.isArray(e) ? t => e.includes(t.key) : () => !0 } function Ix(...e) { let t; let n; let i = {}; e.length === 3 ? (t = e[0], n = e[1], i = e[2]) : e.length === 2 ? typeof e[1] == 'object' ? (t = !0, n = e[0], i = e[1]) : (t = e[0], n = e[1]) : (t = !0, n = e[0]); const { target: s = Or, eventName: l = 'keydown', passive: u = !1, dedupe: f = !1 } = i; const h = J$(t); return go(s, l, (g) => { g.repeat && Gt(f) || h(g) && n(g) }, u) } function Y$(e, t = {}) {
  const { immediate: n = !0, fpsLimit: i = void 0, window: s = Or, once: l = !1 } = t; const u = rn(!1); const f = _e(() => i ? 1e3 / Gt(i) : null); let h = 0; let p = null; function g(w) {
    if (!u.value || !s)
      return; h || (h = w); const L = w - h; if (f.value && L < f.value) { p = s.requestAnimationFrame(g); return } if (h = w, e({ delta: L, timestamp: w }), l) { u.value = !1, p = null; return }p = s.requestAnimationFrame(g)
  } function v() { !u.value && s && (u.value = !0, h = 0, p = s.requestAnimationFrame(g)) } function y() { u.value = !1, p != null && s && (s.cancelAnimationFrame(p), p = null) } return n && v(), Ep(y), { isActive: Ra(u), pause: y, resume: v }
} const Z$ = Symbol('vueuse-ssr-width'); function Q$() { const e = Kb() ? F$(Z$, null) : null; return typeof e == 'number' ? e : void 0 } function Px(e, t = {}) { const { window: n = Or, ssrWidth: i = Q$() } = t; const s = Nx(() => n && 'matchMedia' in n && typeof n.matchMedia == 'function'); const l = rn(typeof i == 'number'); const u = rn(); const f = rn(!1); const h = (p) => { f.value = p.matches }; return hp(() => { if (l.value) { l.value = !s.value; const p = Gt(e).split(','); f.value = p.some((g) => { const v = g.includes('not all'); const y = g.match(/\(\s*min-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/); const w = g.match(/\(\s*max-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/); let L = !!(y || w); return y && L && (L = i >= O0(y[1])), w && L && (L = i <= O0(w[1])), v ? !L : L }); return }s.value && (u.value = n.matchMedia(Gt(e)), f.value = u.value.matches) }), go(u, 'change', h, { passive: !0 }), _e(() => f.value) } const Hc = typeof globalThis < 'u' ? globalThis : typeof window < 'u' ? window : typeof global < 'u' ? global : typeof self < 'u' ? self : {}; const Bc = '__vueuse_ssr_handlers__'; const eM = tM(); function tM() { return Bc in Hc || (Hc[Bc] = Hc[Bc] || {}), Hc[Bc] } function Ox(e, t) { return eM[e] || t } function nM(e) { return Px('(prefers-color-scheme: dark)', e) } function rM(e) { return e == null ? 'any' : e instanceof Set ? 'set' : e instanceof Map ? 'map' : e instanceof Date ? 'date' : typeof e == 'boolean' ? 'boolean' : typeof e == 'string' ? 'string' : typeof e == 'object' ? 'object' : Number.isNaN(e) ? 'any' : 'number' } const iM = { boolean: { read: e => e === 'true', write: e => String(e) }, object: { read: e => JSON.parse(e), write: e => JSON.stringify(e) }, number: { read: e => Number.parseFloat(e), write: e => String(e) }, any: { read: e => e, write: e => String(e) }, string: { read: e => e, write: e => String(e) }, map: { read: e => new Map(JSON.parse(e)), write: e => JSON.stringify(Array.from(e.entries())) }, set: { read: e => new Set(JSON.parse(e)), write: e => JSON.stringify(Array.from(e)) }, date: { read: e => new Date(e), write: e => e.toISOString() } }; const z0 = 'vueuse-storage'; function Rx(e, t, n, i = {}) {
  let s; const { flush: l = 'pre', deep: u = !0, listenToStorageChanges: f = !0, writeDefaults: h = !0, mergeDefaults: p = !1, shallow: g, window: v = Or, eventFilter: y, onError: w = (K) => { console.error(K) }, initOnMounted: L } = i; const $ = (g ? rn : Ue)(typeof t == 'function' ? t() : t); const A = _e(() => Gt(e)); if (!n) {
    try { n = Ox('getDefaultStorage', () => { let K; return (K = Or) == null ? void 0 : K.localStorage })() }
    catch (K) { w(K) }
  } if (!n)
    return $; const E = Gt(t); const M = rM(E); const O = (s = i.serializer) != null ? s : iM[M]; const { pause: k, resume: z } = Mx($, () => te($.value), { flush: l, deep: u, eventFilter: y }); St(A, () => W(), { flush: l }), v && f && Ap(() => { n instanceof Storage ? go(v, 'storage', W, { passive: !0 }) : go(v, z0, q), L && W() }), L || W(); function D(K, C) { if (v) { const P = { key: A.value, oldValue: K, newValue: C, storageArea: n }; v.dispatchEvent(n instanceof Storage ? new StorageEvent('storage', P) : new CustomEvent(z0, { detail: P })) } } function te(K) {
    try {
      const C = n.getItem(A.value); if (K == null) {
        D(C, null), n.removeItem(A.value)
      }
      else { const P = O.write(K); C !== P && (n.setItem(A.value, P), D(C, P)) }
    }
    catch (C) { w(C) }
  } function ee(K) {
    const C = K ? K.newValue : n.getItem(A.value); if (C == null)
      return h && E != null && n.setItem(A.value, O.write(E)), E; if (!K && p) { const P = O.read(C); return typeof p == 'function' ? p(P, E) : M === 'object' && !Array.isArray(P) ? { ...E, ...P } : P }
    else {
      return typeof C != 'string' ? C : O.read(C)
    }
  } function W(K) {
    if (!(K && K.storageArea !== n)) {
      if (K && K.key == null) { $.value = E; return } if (!(K && K.key !== A.value)) {
        k(); try { (K == null ? void 0 : K.newValue) !== O.write($.value) && ($.value = ee(K)) }
        catch (C) { w(C) }
        finally { K ? Et(z) : z() }
      }
    }
  } function q(K) { W(K.detail) } return $
} const oM = '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'; function sM(e = {}) {
  const { selector: t = 'html', attribute: n = 'class', initialValue: i = 'auto', window: s = Or, storage: l, storageKey: u = 'vueuse-color-scheme', listenToStorageChanges: f = !0, storageRef: h, emitAuto: p, disableTransition: g = !0 } = e; const v = { auto: '', light: 'light', dark: 'dark', ...e.modes || {} }; const y = nM({ window: s }); const w = _e(() => y.value ? 'dark' : 'light'); const L = h || (u == null ? Lx(i) : Rx(u, i, l, { window: s, listenToStorageChanges: f })); const $ = _e(() => L.value === 'auto' ? w.value : L.value); const A = Ox('updateHTMLAttrs', (k, z, D) => {
    const te = typeof k == 'string' ? s == null ? void 0 : s.document.querySelector(k) : Lu(k); if (!te)
      return; const ee = new Set(); const W = new Set(); let q = null; if (z === 'class') { const C = D.split(/\s/g); Object.values(v).flatMap(P => (P || '').split(/\s/g)).filter(Boolean).forEach((P) => { C.includes(P) ? ee.add(P) : W.add(P) }) }
    else {
      q = { key: z, value: D }
    } if (ee.size === 0 && W.size === 0 && q === null)
      return; let K; g && (K = s.document.createElement('style'), K.appendChild(document.createTextNode(oM)), s.document.head.appendChild(K)); for (const C of ee)te.classList.add(C); for (const C of W)te.classList.remove(C); q && te.setAttribute(q.key, q.value), g && (s.getComputedStyle(K).opacity, document.head.removeChild(K))
  }); function E(k) { let z; A(t, n, (z = v[k]) != null ? z : k) } function M(k) { e.onChanged ? e.onChanged(k, E) : E(k) }St($, M, { flush: 'post', immediate: !0 }), Ap(() => M($.value)); const O = _e({ get() { return p ? L.value : $.value }, set(k) { L.value = k } }); return Object.assign(O, { store: L, system: w, state: $ })
} function lM(e = {}) { const { valueDark: t = 'dark', valueLight: n = '' } = e; const i = sM({ ...e, onChanged: (u, f) => { let h; e.onChanged ? (h = e.onChanged) == null || h.call(e, u === 'dark', f, u) : f(u) }, modes: { dark: t, light: n } }); const s = _e(() => i.system.value); return _e({ get() { return i.value === 'dark' }, set(u) { const f = u ? 'dark' : 'light'; s.value === f ? i.value = 'auto' : i.value = f } }) } function zx(e, t, n = {}) { const { window: i = Or, ...s } = n; let l; const u = Nx(() => i && 'ResizeObserver' in i); const f = () => { l && (l.disconnect(), l = void 0) }; const h = _e(() => { const v = Gt(e); return Array.isArray(v) ? v.map(y => Lu(y)) : [Lu(v)] }); const p = St(h, (v) => { if (f(), u.value && i) { l = new ResizeObserver(t); for (const y of v)y && l.observe(y, s) } }, { immediate: !0, flush: 'post' }); const g = () => { f(), p() }; return Ep(g), { isSupported: u, stop: g } } function uf(e, t, n = {}) { const { window: i = Or } = n; return Rx(e, t, i == null ? void 0 : i.localStorage, n) } function aM(e = 'history', t = {}) {
  const { initialValue: n = {}, removeNullishValues: i = !0, removeFalsyValues: s = !1, write: l = !0, writeMode: u = 'replace', window: f = Or } = t; if (!f)
    return rr(n); const h = rr({}); function p() {
    if (e === 'history')
      return f.location.search || ''; if (e === 'hash') { const O = f.location.hash || ''; const k = O.indexOf('?'); return k > 0 ? O.slice(k) : '' }
    else {
      return (f.location.hash || '').replace(/^#/, '')
    }
  } function g(O) {
    const k = O.toString(); if (e === 'history')
      return `${k ? `?${k}` : ''}${f.location.hash || ''}`; if (e === 'hash-params')
      return `${f.location.search || ''}${k ? `#${k}` : ''}`; const z = f.location.hash || '#'; const D = z.indexOf('?'); return D > 0 ? `${f.location.search || ''}${z.slice(0, D)}${k ? `?${k}` : ''}` : `${f.location.search || ''}${z}${k ? `?${k}` : ''}`
  } function v() { return new URLSearchParams(p()) } function y(O) { const k = new Set(Object.keys(h)); for (const z of O.keys()) { const D = O.getAll(z); h[z] = D.length > 1 ? D : O.get(z) || '', k.delete(z) }Array.from(k).forEach(z => delete h[z]) } const { pause: w, resume: L } = Mx(h, () => { const O = new URLSearchParams(''); Object.keys(h).forEach((k) => { const z = h[k]; Array.isArray(z) ? z.forEach(D => O.append(k, D)) : i && z == null || s && !z ? O.delete(k) : O.set(k, z) }), $(O, !1) }, { deep: !0 }); function $(O, k) { w(), k && y(O), u === 'replace' ? f.history.replaceState(f.history.state, f.document.title, f.location.pathname + g(O)) : f.history.pushState(f.history.state, f.document.title, f.location.pathname + g(O)), L() } function A() { l && $(v(), !0) } const E = { passive: !0 }; go(f, 'popstate', A, E), e !== 'history' && go(f, 'hashchange', A, E); const M = v(); return M.keys().next().value ? y(M) : Object.assign(h, n), h
} function Dx(e = {}) {
  const { window: t = Or, initialWidth: n = Number.POSITIVE_INFINITY, initialHeight: i = Number.POSITIVE_INFINITY, listenOrientation: s = !0, includeScrollbar: l = !0, type: u = 'inner' } = e; const f = rn(n); const h = rn(i); const p = () => {
    if (t) {
      if (u === 'outer') {
        f.value = t.outerWidth, h.value = t.outerHeight
      }
      else if (u === 'visual' && t.visualViewport) { const { width: v, height: y, scale: w } = t.visualViewport; f.value = Math.round(v * w), h.value = Math.round(y * w) }
      else {
        l ? (f.value = t.innerWidth, h.value = t.innerHeight) : (f.value = t.document.documentElement.clientWidth, h.value = t.document.documentElement.clientHeight)
      }
    }
  }; p(), Ap(p); const g = { passive: !0 }; if (go('resize', p, g), t && u === 'visual' && t.visualViewport && go(t.visualViewport, 'resize', p, g), s) { const v = Px('(orientation: portrait)'); St(v, () => p()) } return { width: f, height: h }
} const Th = rn([]); const Jn = rn([]); const Rr = uf('vitest-ui_task-tree-opened', [], { shallow: !0 }); const $u = _e(() => new Set(Rr.value)); const pn = uf('vitest-ui_task-tree-filter', { expandAll: void 0, failed: !1, success: !1, skipped: !1, onlyTests: !1, search: '' }); const Un = Ue(pn.value.search); const cM = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }; function Fx(e) { return e.replace(/[&<>"']/g, t => cM[t]) } const uM = _e(() => { const e = Un.value.toLowerCase(); return e.length ? new RegExp(`(${Fx(e)})`, 'gi') : null }); const Hx = _e(() => Un.value.trim() !== ''); const et = rr({ failed: pn.value.failed, success: pn.value.success, skipped: pn.value.skipped, onlyTests: pn.value.onlyTests }); const Ch = _e(() => !!(et.failed || et.success || et.skipped)); const ff = rn([]); const Zs = Ue(!1); const D0 = _e(() => { const e = pn.value.expandAll; return Rr.value.length > 0 ? e !== !0 : e !== !1 }); const fM = _e(() => { const e = Hx.value; const t = Ch.value; const n = et.onlyTests; const i = Ae.summary.filesFailed; const s = Ae.summary.filesSuccess; const l = Ae.summary.filesSkipped; const u = Ae.summary.filesRunning; const f = ff.value; return Ae.collectTestsTotal(e || t, n, f, { failed: i, success: s, skipped: l, running: u }) }); function qa(e) { return Object.hasOwnProperty.call(e, 'tasks') } function dM(e, t) { return typeof e != 'string' || typeof t != 'string' ? !1 : e.toLowerCase().includes(t.toLowerCase()) } function Bx(e) {
  if (!e)
    return ''; const t = e.split('').reduce((i, s, l) => i + s.charCodeAt(0) + l, 0); const n = ['yellow', 'cyan', 'green', 'magenta']; return n[t % n.length]
} function Wx(e) { switch (e) { case 'blue':case 'green':case 'magenta':case 'black':case 'red':return 'white'; case 'yellow':case 'cyan':case 'white':default:return 'black' } } function hM(e) { return e.type === 'test' } function pM(e) { return e.mode === 'run' && e.type === 'test' } function On(e) { return e.type === 'file' } function Ci(e) { return e.type === 'file' || e.type === 'suite' } function gM(e = Ae.root.tasks) { return e.sort((t, n) => `${t.filepath}:${t.projectName}`.localeCompare(`${n.filepath}:${n.projectName}`)) } function Ea(e, t = !1) {
  let i, s, l, u, f; let n = Ae.nodes.get(e.id); if (n ? (n.typecheck = !!e.meta && 'typecheck' in e.meta, n.state = (i = e.result) == null ? void 0 : i.state, n.mode = e.mode, n.duration = (s = e.result) == null ? void 0 : s.duration, n.collectDuration = e.collectDuration, n.setupDuration = e.setupDuration, n.environmentLoad = e.environmentLoad, n.prepareDuration = e.prepareDuration) : (n = { id: e.id, parentId: 'root', name: e.name, mode: e.mode, expandable: !0, expanded: $u.value.size > 0 && $u.value.has(e.id), type: 'file', children: new Set(), tasks: [], typecheck: !!e.meta && 'typecheck' in e.meta, indent: 0, duration: ((l = e.result) == null ? void 0 : l.duration) != null ? Math.round((u = e.result) == null ? void 0 : u.duration) : void 0, filepath: e.filepath, projectName: e.projectName || '', projectNameColor: Ae.colors.get(e.projectName || '') || Bx(e.projectName), collectDuration: e.collectDuration, setupDuration: e.setupDuration, environmentLoad: e.environmentLoad, prepareDuration: e.prepareDuration, state: (f = e.result) == null ? void 0 : f.state }, Ae.nodes.set(e.id, n), Ae.root.tasks.push(n)), t) {
    for (let h = 0; h < e.tasks.length; h++)Ua(e.id, e.tasks[h], !0)
  }
} function jx(e, t) {
  const n = Ae.nodes.get(e); if (!n || !Ci(n))
    return; const i = ht.state.idMap.get(e); if (!(!i || !qa(i)))
    return Ua(n.parentId, i, t && i.tasks.length > 0), [n, i]
} function mM(e) {
  const t = Ae.nodes.get(e); if (!t)
    return; const n = ht.state.idMap.get(e); !n || !mx(n) || Ua(t.parentId, n, !1)
} function Ua(e, t, n) {
  let u, f, h, p, g; const i = Ae.nodes.get(e); let s; const l = ((u = t.result) == null ? void 0 : u.duration) != null ? Math.round((f = t.result) == null ? void 0 : f.duration) : void 0; if (i && (s = Ae.nodes.get(t.id), s ? (i.children.has(t.id) || (i.tasks.push(s), i.children.add(t.id)), s.name = t.name, s.mode = t.mode, s.duration = l, s.state = (h = t.result) == null ? void 0 : h.state) : (mx(t) ? s = { id: t.id, fileId: t.file.id, parentId: e, name: t.name, mode: t.mode, type: t.type, expandable: !1, expanded: !1, indent: i.indent + 1, duration: l, state: (p = t.result) == null ? void 0 : p.state } : s = { id: t.id, fileId: t.file.id, parentId: e, name: t.name, mode: t.mode, type: 'suite', expandable: !0, expanded: $u.value.size > 0 && $u.value.has(t.id), children: new Set(), tasks: [], indent: i.indent + 1, duration: l, state: (g = t.result) == null ? void 0 : g.state }, Ae.nodes.set(t.id, s), i.tasks.push(s), i.children.add(t.id)), s && n && qa(t))) {
    for (let v = 0; v < t.tasks.length; v++)Ua(s.id, t.tasks[v], n)
  }
} function vM(e) {
  const t = Ae.nodes.get(e); if (!t || !Ci(t))
    return; const n = new Set(Rr.value); n.delete(t.id); const i = [...bM(t)]; Rr.value = Array.from(n), Jn.value = i
} function yM() { Eh(Ae.root.tasks); const e = [...Jn.value.filter(On)]; Eh(e), Rr.value = [], pn.value.expandAll = !0, Jn.value = e } function Eh(e) { for (const t of e)Ci(t) && (t.expanded = !1, Eh(t.tasks)) } function* qx(e, t) {
  if (t && (yield e.id), Ci(e)) {
    for (let n = 0; n < e.tasks.length; n++) yield* qx(e.tasks[n], !0)
  }
} function* bM(e) { const t = e.id; const n = new Set(qx(e, !1)); for (let i = 0; i < Jn.value.length; i++) { const s = Jn.value[i]; if (s.id === t) { s.expanded = !1, yield s; continue } if (n.has(s.id)) { n.delete(s.id); continue } yield s } } const df = Ue('idle'); const $s = _e(() => df.value === 'idle'); const Zi = Ue([]); function wM(e, t, n) { return e ? Gx(e, t, n) : !1 } function $p(e, t) { const n = [...Ux(e, t)]; Jn.value = n, ff.value = n.filter(On).map(i => gr(i.id)) } function* Ux(e, t) { for (const n of gM()) yield* Vx(n, e, t) } function* Vx(e, t, n) {
  const i = new Set(); const s = new Map(); const l = []; let u; if (n.onlyTests) {
    for (const [v, y] of Ah(e, i, w => F0(w, t, n)))l.push([v, y])
  }
  else { for (const [v, y] of Ah(e, i, w => F0(w, t, n)))Ci(y) ? (s.set(y.id, v), On(y) ? (v && (u = y.id), l.push([v, y])) : l.push([v || s.get(y.parentId) === !0, y])) : l.push([v || s.get(y.parentId) === !0, y]); !u && !On(e) && 'fileId' in e && (u = e.fileId) } const f = new Set(); const h = [...SM(l, n.onlyTests, i, f, u)].reverse(); const p = Ae.nodes; const g = new Set(h.filter((v) => { let y; return On(v) || Ci(v) && ((y = p.get(v.parentId)) == null ? void 0 : y.expanded) }).map(v => v.id)); yield* h.filter((v) => { let y; return On(v) || g.has(v.parentId) && ((y = p.get(v.parentId)) == null ? void 0 : y.expanded) })
} function xM(e, t, n, i, s) {
  if (i) {
    if (On(t))
      return s.has(t.id) ? t : void 0; if (n.has(t.id)) { const l = Ae.nodes.get(t.parentId); return l && On(l) && s.add(l.id), t }
  }
  else if (e || n.has(t.id) || s.has(t.id)) { const l = Ae.nodes.get(t.parentId); return l && On(l) && s.add(l.id), t }
} function* SM(e, t, n, i, s) {
  for (let l = e.length - 1; l >= 0; l--) {
    const [u, f] = e[l]; const h = Ci(f); if (!t && s && n.has(s) && 'fileId' in f && f.fileId === s) { h && n.add(f.id); let p = Ae.nodes.get(f.parentId); for (;p;)n.add(p.id), On(p) && i.add(p.id), p = Ae.nodes.get(p.parentId); yield f; continue } if (h) { const p = xM(u, f, n, t, i); p && (yield p) }
    else if (u) { const p = Ae.nodes.get(f.parentId); p && On(p) && i.add(p.id), yield f }
  }
} function _M(e, t) { let n, i; return (t.success || t.failed) && 'result' in e && (t.success && ((n = e.result) == null ? void 0 : n.state) === 'pass' || t.failed && ((i = e.result) == null ? void 0 : i.state) === 'fail') ? !0 : t.skipped && 'mode' in e ? e.mode === 'skip' || e.mode === 'todo' : !1 } function Gx(e, t, n) {
  if (t.length === 0 || dM(e.name, t)) {
    if (n.success || n.failed || n.skipped) {
      if (_M(e, n))
        return !0
    }
    else {
      return !0
    }
  } return !1
} function* Ah(e, t, n) {
  const i = n(e); if (i) {
    if (hM(e)) { let s = Ae.nodes.get(e.parentId); for (;s;)t.add(s.id), s = Ae.nodes.get(s.parentId) }
    else if (On(e)) {
      t.add(e.id)
    }
    else { t.add(e.id); let s = Ae.nodes.get(e.parentId); for (;s;)t.add(s.id), s = Ae.nodes.get(s.parentId) }
  } if (yield [i, e], Ci(e)) {
    for (let s = 0; s < e.tasks.length; s++) yield* Ah(e.tasks[s], t, n)
  }
} function F0(e, t, n) { const i = ht.state.idMap.get(e.id); return i ? Gx(i, t, n) : !1 } function kM(e, t, n) {
  const i = jx(e, !1); if (!i)
    return; const [s, l] = i; for (const p of l.tasks)Ua(s.id, p, !1); s.expanded = !0; const u = new Set(Rr.value); u.add(s.id); const f = new Set(Vx(s, t, n)); const h = [...EM(s, f)]; Rr.value = Array.from(u), Jn.value = h
} function TM(e, t) { Mp(Ae.root.tasks, !1); const n = [...Ux(e, t)]; pn.value.expandAll = !1, Rr.value = [], Jn.value = n, ff.value = n.filter(On).map(i => gr(i.id)) } function CM(e, t) {
  if (e.size) {
    for (const n of Jn.value)e.has(n.id) && (n.expanded = !0)
  }
  else {
    t && Mp(Jn.value.filter(On), !0)
  }
} function Mp(e, t) { for (const n of e)Ci(n) && (n.expanded = !0, Mp(n.tasks, !1)); t && (pn.value.expandAll = !1, Rr.value = []) } function* EM(e, t) { const n = e.id; const i = new Set(Array.from(t).map(s => s.id)); for (const s of Jn.value)s.id === n ? (s.expanded = !0, i.has(s.id) || (yield e), yield* t) : i.has(s.id) || (yield s) } function Np(e) { return vx(e).some((t) => { let n, i; return (i = (n = t.result) == null ? void 0 : n.errors) == null ? void 0 : i.some(s => typeof (s == null ? void 0 : s.message) == 'string' && s.message.match(/Snapshot .* mismatched/)) }) } function AM(e, t, n, i) { e.map(s => [`${s.filepath}:${s.projectName || ''}`, s]).sort(([s], [l]) => s.localeCompare(l)).map(([,s]) => Ea(s, t)), Th.value = [...Ae.root.tasks], $p(n.trim(), { failed: i.failed, success: i.success, skipped: i.skipped, onlyTests: i.onlyTests }) } function LM(e) {
  queueMicrotask(() => {
    const t = Ae.pendingTasks; const n = ht.state.idMap; for (const i of e) {
      if (i[1]) { const l = n.get(i[0]); if (l) { let u = t.get(l.file.id); u || (u = new Set(), t.set(l.file.id, u)), u.add(l.id) } }
    }
  })
} function $M(e, t) { const n = Ae.pendingTasks; const s = ht.state.idMap.get(e); if ((s == null ? void 0 : s.type) === 'test') { let l = n.get(s.file.id); l || (l = new Set(), n.set(s.file.id, l)), l.add(s.id), s.annotations.push(t) } } function H0(e, t, n, i, s) { e && RM(n); const l = !e; queueMicrotask(() => { t ? IM(l) : PM(l) }), queueMicrotask(() => { zM(n) }), queueMicrotask(() => { t && (n.failedSnapshot = Th.value && Np(Th.value.map(u => gr(u.id))), n.failedSnapshotEnabled = !0) }), queueMicrotask(() => { OM(i, s, t) }) } function* MM() { yield* Jn.value.filter(pM) } function NM() { const e = ht.state.idMap; let t; for (const n of MM())t = e.get(n.parentId), t && qa(t) && t.mode === 'todo' && (t = e.get(n.id), t && (t.mode = 'todo')) } function IM(e) {
  const t = ht.state.getFiles(); const n = Ae.nodes; const i = t.filter(l => !n.has(l.id)); for (let l = 0; l < i.length; l++)Ea(i[l], e), Mu(i[l].tasks); const s = Ae.root.tasks; for (let l = 0; l < s.length; l++) {
    const u = s[l]; const f = gr(u.id); if (!f)
      continue; Ea(f, e); const h = f.tasks; h != null && h.length && Mu(f.tasks)
  }
} function PM(e) {
  const t = new Map(Ae.pendingTasks.entries()); Ae.pendingTasks.clear(); const n = Ae.nodes; const i = Array.from(t.keys()).filter(f => !n.has(f)).map(f => gr(f)).filter(Boolean); let s; for (let f = 0; f < i.length; f++)s = i[f], Ea(s, !1), Mu(s.tasks), t.delete(s.id); const l = ht.state.idMap; const u = Ae.root.tasks; for (let f = 0; f < u.length; f++) {
    const h = u[f]; const p = gr(h.id); if (!p)
      continue; const g = t.get(p.id); g && (Ea(p, e), Mu(Array.from(g).map(v => l.get(v)).filter(Boolean)))
  }
} function OM(e, t, n = !1) { const i = pn.value.expandAll; const s = i !== !0; const l = new Set(Rr.value); const u = l.size > 0 && i === !1 || s; queueMicrotask(() => { B0(e, t, n) }), Zs.value || queueMicrotask(() => { (Jn.value.length || n) && (Zs.value = !0) }), u && (queueMicrotask(() => { CM(l, n), s && (pn.value.expandAll = !1) }), queueMicrotask(() => { B0(e, t, n) })) } function B0(e, t, n) { $p(e, t), n && (NM(), df.value = 'idle') } function Mu(e) { let t; for (let n = 0; n < e.length; n++)t = e[n], qa(t) ? jx(t.id, !0) : mM(t.id) } function RM(e) { e.files = 0, e.time = '', e.filesFailed = 0, e.filesSuccess = 0, e.filesIgnore = 0, e.filesRunning = 0, e.filesSkipped = 0, e.filesTodo = 0, e.testsFailed = 0, e.testsSuccess = 0, e.testsIgnore = 0, e.testsSkipped = 0, e.testsTodo = 0, e.totalTests = 0, e.failedSnapshotEnabled = !1 } function zM(e) {
  let u, f, h, p, g, v; const t = ht.state.idMap; const n = new Map(Ae.root.tasks.filter(y => t.has(y.id)).map(y => [y.id, y])); const i = Array.from(n.values()).map(y => [y.id, gr(y.id)]); const s = { files: n.size, time: '', filesFailed: 0, filesSuccess: 0, filesIgnore: 0, filesRunning: 0, filesSkipped: 0, filesTodo: 0, testsFailed: 0, testsSuccess: 0, testsIgnore: 0, testsSkipped: 0, testsTodo: 0, totalTests: 0 }; let l = 0; for (const [y, w] of i) {
    if (!w)
      continue; const L = n.get(y); L && (L.mode = w.mode, L.setupDuration = w.setupDuration, L.prepareDuration = w.prepareDuration, L.environmentLoad = w.environmentLoad, L.collectDuration = w.collectDuration, L.duration = ((u = w.result) == null ? void 0 : u.duration) != null ? Math.round((f = w.result) == null ? void 0 : f.duration) : void 0, L.state = (h = w.result) == null ? void 0 : h.state), l += Math.max(0, w.collectDuration || 0), l += Math.max(0, w.setupDuration || 0), l += Math.max(0, ((p = w.result) == null ? void 0 : p.duration) || 0), l += Math.max(0, w.environmentLoad || 0), l += Math.max(0, w.prepareDuration || 0), s.time = l > 1e3 ? `${(l / 1e3).toFixed(2)}s` : `${Math.round(l)}ms`, ((g = w.result) == null ? void 0 : g.state) === 'fail' ? s.filesFailed++ : ((v = w.result) == null ? void 0 : v.state) === 'pass' ? s.filesSuccess++ : w.mode === 'skip' ? (s.filesIgnore++, s.filesSkipped++) : w.mode === 'todo' ? (s.filesIgnore++, s.filesTodo++) : s.filesRunning++; const { failed: $, success: A, skipped: E, total: M, ignored: O, todo: k } = Xx(w); s.totalTests += M, s.testsFailed += $, s.testsSuccess += A, s.testsSkipped += E, s.testsTodo += k, s.testsIgnore += O
  }e.files = s.files, e.time = s.time, e.filesFailed = s.filesFailed, e.filesSuccess = s.filesSuccess, e.filesIgnore = s.filesIgnore, e.filesRunning = s.filesRunning, e.filesSkipped = s.filesSkipped, e.filesTodo = s.filesTodo, e.testsFailed = s.testsFailed, e.testsSuccess = s.testsSuccess, e.testsFailed = s.testsFailed, e.testsTodo = s.testsTodo, e.testsIgnore = s.testsIgnore, e.testsSkipped = s.testsSkipped, e.totalTests = s.totalTests
} function Xx(e, t = '', n) { let s, l; const i = { failed: 0, success: 0, skipped: 0, running: 0, total: 0, ignored: 0, todo: 0 }; for (const u of Kx(e))(!n || wM(u, t, n)) && (i.total++, ((s = u.result) == null ? void 0 : s.state) === 'fail' ? i.failed++ : ((l = u.result) == null ? void 0 : l.state) === 'pass' ? i.success++ : u.mode === 'skip' ? (i.ignored++, i.skipped++) : u.mode === 'todo' && (i.ignored++, i.todo++)); return i.running = i.total - i.failed - i.success - i.ignored, i } function DM(e, t, n, i, s, l) {
  let u, f; if (t)
    return n.map(h => Xx(h, s, l)).reduce((h, { failed: p, success: g, ignored: v, running: y }) => (h.failed += p, h.success += g, h.skipped += v, h.running += y, h), { failed: 0, success: 0, skipped: 0, running: 0 }); if (e) { const h = { failed: 0, success: 0, skipped: 0, running: 0 }; const p = !l.success && !l.failed; const g = l.failed || p; const v = l.success || p; for (const y of n)((u = y.result) == null ? void 0 : u.state) === 'fail' ? h.failed += g ? 1 : 0 : ((f = y.result) == null ? void 0 : f.state) === 'pass' ? h.success += v ? 1 : 0 : y.mode === 'skip' || y.mode === 'todo' || h.running++; return h } return i
} function* Kx(e) { const t = ja(e); let n; for (let i = 0; i < t.length; i++)n = t[i], Ta(n) ? yield n : yield* Kx(n.tasks) } class FM {constructor(t = [], n = new Map(), i = !1, s = 500, l = { id: 'vitest-root-node', expandable: !0, expanded: !0, tasks: [] }, u = new Map(), f = new Map(), h = rr({ files: 0, time: '', filesFailed: 0, filesSuccess: 0, filesIgnore: 0, filesRunning: 0, filesSkipped: 0, filesSnapshotFailed: 0, filesTodo: 0, testsFailed: 0, testsSuccess: 0, testsIgnore: 0, testsSkipped: 0, testsTodo: 0, totalTests: 0, failedSnapshot: !1, failedSnapshotEnabled: !1 })) { ji(this, 'rafCollector'); ji(this, 'resumeEndRunId'); this.projects = t, this.colors = n, this.onTaskUpdateCalled = i, this.resumeEndTimeout = s, this.root = l, this.pendingTasks = u, this.nodes = f, this.summary = h, this.rafCollector = Y$(this.runCollect.bind(this), { fpsLimit: 10, immediate: !1 }) }loadFiles(t, n) { this.projects.splice(0, this.projects.length, ...n.map(i => i.name)), this.colors = new Map(n.map(i => [i.name, i.color])), AM(t, !0, Un.value.trim(), { failed: et.failed, success: et.success, skipped: et.skipped, onlyTests: et.onlyTests }) }startRun() { this.resumeEndRunId = setTimeout(() => this.endRun(), this.resumeEndTimeout), this.collect(!0, !1) }annotateTest(t, n) { $M(t, n), this.onTaskUpdateCalled || (clearTimeout(this.resumeEndRunId), this.onTaskUpdateCalled = !0, this.collect(!0, !1, !1), this.rafCollector.resume()) }resumeRun(t, n) { LM(t), this.onTaskUpdateCalled || (clearTimeout(this.resumeEndRunId), this.onTaskUpdateCalled = !0, this.collect(!0, !1, !1), this.rafCollector.resume()) }endRun() { this.rafCollector.pause(), this.onTaskUpdateCalled = !1, this.collect(!1, !0) }runCollect() { this.collect(!1, !1) }collect(t, n, i = !0) { i ? queueMicrotask(() => { H0(t, n, this.summary, Un.value.trim(), { failed: et.failed, success: et.success, skipped: et.skipped, onlyTests: et.onlyTests }) }) : H0(t, n, this.summary, Un.value.trim(), { failed: et.failed, success: et.success, skipped: et.skipped, onlyTests: et.onlyTests }) }collectTestsTotal(t, n, i, s) { return DM(t, n, i, s, Un.value.trim(), { failed: et.failed, success: et.success, skipped: et.skipped, onlyTests: et.onlyTests }) }collapseNode(t) { queueMicrotask(() => { vM(t) }) }expandNode(t) { queueMicrotask(() => { kM(t, Un.value.trim(), { failed: et.failed, success: et.success, skipped: et.skipped, onlyTests: et.onlyTests }) }) }collapseAllNodes() { queueMicrotask(() => { yM() }) }expandAllNodes() { queueMicrotask(() => { TM(Un.value.trim(), { failed: et.failed, success: et.success, skipped: et.skipped, onlyTests: et.onlyTests }) }) }filterNodes() { queueMicrotask(() => { $p(Un.value.trim(), { failed: et.failed, success: et.success, skipped: et.skipped, onlyTests: et.onlyTests }) }) }} const Ae = new FM(); const er = Ue([414, 896]); const Va = aM('hash', { initialValue: { file: '', view: null, line: null, test: null, column: null } }); const mo = ol(Va, 'file'); const jn = ol(Va, 'view'); const Jx = ol(Va, 'line'); const Yx = ol(Va, 'column'); const js = ol(Va, 'test'); const Qs = Ue(); const qs = Ue(!0); const vo = Ue(!1); const Nu = Ue(!0); const Ms = _e(() => { let e; return (e = el.value) == null ? void 0 : e.coverage }); const Lh = _e(() => { let e; return (e = Ms.value) == null ? void 0 : e.enabled }); const Ns = _e(() => Lh.value && !!Ms.value.htmlReporter); const Us = uf('vitest-ui_splitpanes-mainSizes', [33, 67]); let Qy; const co = uf('vitest-ui_splitpanes-detailSizes', [((Qy = window.__vitest_browser_runner__) == null ? void 0 : Qy.provider) === 'webdriverio' ? er.value[0] / window.outerWidth * 100 : 33, 67]); const At = rr({ navigation: Us.value[0], details: { size: Us.value[1], browser: co.value[0], main: co.value[1] } }); const W0 = _e(() => { let e; if (Ns.value) { const t = Ms.value.reportsDirectory.lastIndexOf('/'); const n = (e = Ms.value.htmlReporter) == null ? void 0 : e.subdir; return n ? `/${Ms.value.reportsDirectory.slice(t + 1)}/${n}/index.html` : `/${Ms.value.reportsDirectory.slice(t + 1)}/index.html` } }); St(df, (e) => { Nu.value = e === 'running' }, { immediate: !0 }); function HM() { const e = mo.value; if (e && e.length > 0) { const t = gr(e); t ? (Qs.value = t, qs.value = !1, vo.value = !1) : G$(() => ht.state.getFiles(), () => { Qs.value = gr(e), qs.value = !1, vo.value = !1 }) } return qs } function Iu(e) { qs.value = e, vo.value = !1, e && (Qs.value = void 0, mo.value = '') } function hf({ file: e, line: t, view: n, test: i, column: s }) { mo.value = e, Jx.value = t, Yx.value = s, jn.value = n, js.value = i, Qs.value = gr(e), Iu(!1) } function BM(e) { hf({ file: e.file.id, test: e.type === 'test' ? e.id : null, line: null, view: null, column: null }) } function WM() { vo.value = !0, qs.value = !1, Qs.value = void 0, mo.value = '' } function jM() { At.details.browser = 100, At.details.main = 0, co.value = [100, 0] } function Zx() { if ((Nt == null ? void 0 : Nt.provider) === 'webdriverio') { const e = window.outerWidth * (At.details.size / 100); return (er.value[0] + 20) / e * 100 } return 33 } function qM() { At.details.browser = Zx(), At.details.main = 100 - At.details.browser, co.value = [At.details.browser, At.details.main] } function UM() { At.navigation = 33, At.details.size = 67, Us.value = [33, 67] } function Qx() { At.details.main !== 0 && (At.details.browser = Zx(), At.details.main = 100 - At.details.browser, co.value = [At.details.browser, At.details.main]) } const VM = { setCurrentFileId(e) { mo.value = e, Qs.value = gr(e), Iu(!1) }, async setIframeViewport(e, t) { er.value = [e, t], (Nt == null ? void 0 : Nt.provider) === 'webdriverio' && Qx(), await new Promise(n => requestAnimationFrame(n)) } }; const GM = location.port; const XM = [location.hostname, GM].filter(Boolean).join(':'); const KM = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${XM}/__vitest_api__?token=${window.VITEST_API_TOKEN || '0'}`; const pr = !!window.METADATA_PATH; const zd = {}; const Tr = {}; const JM = 'Á'; const YM = 'á'; const ZM = 'Ă'; const QM = 'ă'; const eN = '∾'; const tN = '∿'; const nN = '∾̳'; const rN = 'Â'; const iN = 'â'; const oN = '´'; const sN = 'А'; const lN = 'а'; const aN = 'Æ'; const cN = 'æ'; const uN = '⁡'; const fN = '𝔄'; const dN = '𝔞'; const hN = 'À'; const pN = 'à'; const gN = 'ℵ'; const mN = 'ℵ'; const vN = 'Α'; const yN = 'α'; const bN = 'Ā'; const wN = 'ā'; const xN = '⨿'; const SN = '&'; const _N = '&'; const kN = '⩕'; const TN = '⩓'; const CN = '∧'; const EN = '⩜'; const AN = '⩘'; const LN = '⩚'; const $N = '∠'; const MN = '⦤'; const NN = '∠'; const IN = '⦨'; const PN = '⦩'; const ON = '⦪'; const RN = '⦫'; const zN = '⦬'; const DN = '⦭'; const FN = '⦮'; const HN = '⦯'; const BN = '∡'; const WN = '∟'; const jN = '⊾'; const qN = '⦝'; const UN = '∢'; const VN = 'Å'; const GN = '⍼'; const XN = 'Ą'; const KN = 'ą'; const JN = '𝔸'; const YN = '𝕒'; const ZN = '⩯'; const QN = '≈'; const e2 = '⩰'; const t2 = '≊'; const n2 = '≋'; const r2 = '\''; const i2 = '⁡'; const o2 = '≈'; const s2 = '≊'; const l2 = 'Å'; const a2 = 'å'; const c2 = '𝒜'; const u2 = '𝒶'; const f2 = '≔'; const d2 = '*'; const h2 = '≈'; const p2 = '≍'; const g2 = 'Ã'; const m2 = 'ã'; const v2 = 'Ä'; const y2 = 'ä'; const b2 = '∳'; const w2 = '⨑'; const x2 = '≌'; const S2 = '϶'; const _2 = '‵'; const k2 = '∽'; const T2 = '⋍'; const C2 = '∖'; const E2 = '⫧'; const A2 = '⊽'; const L2 = '⌅'; const $2 = '⌆'; const M2 = '⌅'; const N2 = '⎵'; const I2 = '⎶'; const P2 = '≌'; const O2 = 'Б'; const R2 = 'б'; const z2 = '„'; const D2 = '∵'; const F2 = '∵'; const H2 = '∵'; const B2 = '⦰'; const W2 = '϶'; const j2 = 'ℬ'; const q2 = 'ℬ'; const U2 = 'Β'; const V2 = 'β'; const G2 = 'ℶ'; const X2 = '≬'; const K2 = '𝔅'; const J2 = '𝔟'; const Y2 = '⋂'; const Z2 = '◯'; const Q2 = '⋃'; const eI = '⨀'; const tI = '⨁'; const nI = '⨂'; const rI = '⨆'; const iI = '★'; const oI = '▽'; const sI = '△'; const lI = '⨄'; const aI = '⋁'; const cI = '⋀'; const uI = '⤍'; const fI = '⧫'; const dI = '▪'; const hI = '▴'; const pI = '▾'; const gI = '◂'; const mI = '▸'; const vI = '␣'; const yI = '▒'; const bI = '░'; const wI = '▓'; const xI = '█'; const SI = '=⃥'; const _I = '≡⃥'; const kI = '⫭'; const TI = '⌐'; const CI = '𝔹'; const EI = '𝕓'; const AI = '⊥'; const LI = '⊥'; const $I = '⋈'; const MI = '⧉'; const NI = '┐'; const II = '╕'; const PI = '╖'; const OI = '╗'; const RI = '┌'; const zI = '╒'; const DI = '╓'; const FI = '╔'; const HI = '─'; const BI = '═'; const WI = '┬'; const jI = '╤'; const qI = '╥'; const UI = '╦'; const VI = '┴'; const GI = '╧'; const XI = '╨'; const KI = '╩'; const JI = '⊟'; const YI = '⊞'; const ZI = '⊠'; const QI = '┘'; const eP = '╛'; const tP = '╜'; const nP = '╝'; const rP = '└'; const iP = '╘'; const oP = '╙'; const sP = '╚'; const lP = '│'; const aP = '║'; const cP = '┼'; const uP = '╪'; const fP = '╫'; const dP = '╬'; const hP = '┤'; const pP = '╡'; const gP = '╢'; const mP = '╣'; const vP = '├'; const yP = '╞'; const bP = '╟'; const wP = '╠'; const xP = '‵'; const SP = '˘'; const _P = '˘'; const kP = '¦'; const TP = '𝒷'; const CP = 'ℬ'; const EP = '⁏'; const AP = '∽'; const LP = '⋍'; const $P = '⧅'; const MP = '\\'; const NP = '⟈'; const IP = '•'; const PP = '•'; const OP = '≎'; const RP = '⪮'; const zP = '≏'; const DP = '≎'; const FP = '≏'; const HP = 'Ć'; const BP = 'ć'; const WP = '⩄'; const jP = '⩉'; const qP = '⩋'; const UP = '∩'; const VP = '⋒'; const GP = '⩇'; const XP = '⩀'; const KP = 'ⅅ'; const JP = '∩︀'; const YP = '⁁'; const ZP = 'ˇ'; const QP = 'ℭ'; const eO = '⩍'; const tO = 'Č'; const nO = 'č'; const rO = 'Ç'; const iO = 'ç'; const oO = 'Ĉ'; const sO = 'ĉ'; const lO = '∰'; const aO = '⩌'; const cO = '⩐'; const uO = 'Ċ'; const fO = 'ċ'; const dO = '¸'; const hO = '¸'; const pO = '⦲'; const gO = '¢'; const mO = '·'; const vO = '·'; const yO = '𝔠'; const bO = 'ℭ'; const wO = 'Ч'; const xO = 'ч'; const SO = '✓'; const _O = '✓'; const kO = 'Χ'; const TO = 'χ'; const CO = 'ˆ'; const EO = '≗'; const AO = '↺'; const LO = '↻'; const $O = '⊛'; const MO = '⊚'; const NO = '⊝'; const IO = '⊙'; const PO = '®'; const OO = 'Ⓢ'; const RO = '⊖'; const zO = '⊕'; const DO = '⊗'; const FO = '○'; const HO = '⧃'; const BO = '≗'; const WO = '⨐'; const jO = '⫯'; const qO = '⧂'; const UO = '∲'; const VO = '”'; const GO = '’'; const XO = '♣'; const KO = '♣'; const JO = ':'; const YO = '∷'; const ZO = '⩴'; const QO = '≔'; const eR = '≔'; const tR = ','; const nR = '@'; const rR = '∁'; const iR = '∘'; const oR = '∁'; const sR = 'ℂ'; const lR = '≅'; const aR = '⩭'; const cR = '≡'; const uR = '∮'; const fR = '∯'; const dR = '∮'; const hR = '𝕔'; const pR = 'ℂ'; const gR = '∐'; const mR = '∐'; const vR = '©'; const yR = '©'; const bR = '℗'; const wR = '∳'; const xR = '↵'; const SR = '✗'; const _R = '⨯'; const kR = '𝒞'; const TR = '𝒸'; const CR = '⫏'; const ER = '⫑'; const AR = '⫐'; const LR = '⫒'; const $R = '⋯'; const MR = '⤸'; const NR = '⤵'; const IR = '⋞'; const PR = '⋟'; const OR = '↶'; const RR = '⤽'; const zR = '⩈'; const DR = '⩆'; const FR = '≍'; const HR = '∪'; const BR = '⋓'; const WR = '⩊'; const jR = '⊍'; const qR = '⩅'; const UR = '∪︀'; const VR = '↷'; const GR = '⤼'; const XR = '⋞'; const KR = '⋟'; const JR = '⋎'; const YR = '⋏'; const ZR = '¤'; const QR = '↶'; const ez = '↷'; const tz = '⋎'; const nz = '⋏'; const rz = '∲'; const iz = '∱'; const oz = '⌭'; const sz = '†'; const lz = '‡'; const az = 'ℸ'; const cz = '↓'; const uz = '↡'; const fz = '⇓'; const dz = '‐'; const hz = '⫤'; const pz = '⊣'; const gz = '⤏'; const mz = '˝'; const vz = 'Ď'; const yz = 'ď'; const bz = 'Д'; const wz = 'д'; const xz = '‡'; const Sz = '⇊'; const _z = 'ⅅ'; const kz = 'ⅆ'; const Tz = '⤑'; const Cz = '⩷'; const Ez = '°'; const Az = '∇'; const Lz = 'Δ'; const $z = 'δ'; const Mz = '⦱'; const Nz = '⥿'; const Iz = '𝔇'; const Pz = '𝔡'; const Oz = '⥥'; const Rz = '⇃'; const zz = '⇂'; const Dz = '´'; const Fz = '˙'; const Hz = '˝'; const Bz = '`'; const Wz = '˜'; const jz = '⋄'; const qz = '⋄'; const Uz = '⋄'; const Vz = '♦'; const Gz = '♦'; const Xz = '¨'; const Kz = 'ⅆ'; const Jz = 'ϝ'; const Yz = '⋲'; const Zz = '÷'; const Qz = '÷'; const eD = '⋇'; const tD = '⋇'; const nD = 'Ђ'; const rD = 'ђ'; const iD = '⌞'; const oD = '⌍'; const sD = '$'; const lD = '𝔻'; const aD = '𝕕'; const cD = '¨'; const uD = '˙'; const fD = '⃜'; const dD = '≐'; const hD = '≑'; const pD = '≐'; const gD = '∸'; const mD = '∔'; const vD = '⊡'; const yD = '⌆'; const bD = '∯'; const wD = '¨'; const xD = '⇓'; const SD = '⇐'; const _D = '⇔'; const kD = '⫤'; const TD = '⟸'; const CD = '⟺'; const ED = '⟹'; const AD = '⇒'; const LD = '⊨'; const $D = '⇑'; const MD = '⇕'; const ND = '∥'; const ID = '⤓'; const PD = '↓'; const OD = '↓'; const RD = '⇓'; const zD = '⇵'; const DD = '̑'; const FD = '⇊'; const HD = '⇃'; const BD = '⇂'; const WD = '⥐'; const jD = '⥞'; const qD = '⥖'; const UD = '↽'; const VD = '⥟'; const GD = '⥗'; const XD = '⇁'; const KD = '↧'; const JD = '⊤'; const YD = '⤐'; const ZD = '⌟'; const QD = '⌌'; const eF = '𝒟'; const tF = '𝒹'; const nF = 'Ѕ'; const rF = 'ѕ'; const iF = '⧶'; const oF = 'Đ'; const sF = 'đ'; const lF = '⋱'; const aF = '▿'; const cF = '▾'; const uF = '⇵'; const fF = '⥯'; const dF = '⦦'; const hF = 'Џ'; const pF = 'џ'; const gF = '⟿'; const mF = 'É'; const vF = 'é'; const yF = '⩮'; const bF = 'Ě'; const wF = 'ě'; const xF = 'Ê'; const SF = 'ê'; const _F = '≖'; const kF = '≕'; const TF = 'Э'; const CF = 'э'; const EF = '⩷'; const AF = 'Ė'; const LF = 'ė'; const $F = '≑'; const MF = 'ⅇ'; const NF = '≒'; const IF = '𝔈'; const PF = '𝔢'; const OF = '⪚'; const RF = 'È'; const zF = 'è'; const DF = '⪖'; const FF = '⪘'; const HF = '⪙'; const BF = '∈'; const WF = '⏧'; const jF = 'ℓ'; const qF = '⪕'; const UF = '⪗'; const VF = 'Ē'; const GF = 'ē'; const XF = '∅'; const KF = '∅'; const JF = '◻'; const YF = '∅'; const ZF = '▫'; const QF = ' '; const e3 = ' '; const t3 = ' '; const n3 = 'Ŋ'; const r3 = 'ŋ'; const i3 = ' '; const o3 = 'Ę'; const s3 = 'ę'; const l3 = '𝔼'; const a3 = '𝕖'; const c3 = '⋕'; const u3 = '⧣'; const f3 = '⩱'; const d3 = 'ε'; const h3 = 'Ε'; const p3 = 'ε'; const g3 = 'ϵ'; const m3 = '≖'; const v3 = '≕'; const y3 = '≂'; const b3 = '⪖'; const w3 = '⪕'; const x3 = '⩵'; const S3 = '='; const _3 = '≂'; const k3 = '≟'; const T3 = '⇌'; const C3 = '≡'; const E3 = '⩸'; const A3 = '⧥'; const L3 = '⥱'; const $3 = '≓'; const M3 = 'ℯ'; const N3 = 'ℰ'; const I3 = '≐'; const P3 = '⩳'; const O3 = '≂'; const R3 = 'Η'; const z3 = 'η'; const D3 = 'Ð'; const F3 = 'ð'; const H3 = 'Ë'; const B3 = 'ë'; const W3 = '€'; const j3 = '!'; const q3 = '∃'; const U3 = '∃'; const V3 = 'ℰ'; const G3 = 'ⅇ'; const X3 = 'ⅇ'; const K3 = '≒'; const J3 = 'Ф'; const Y3 = 'ф'; const Z3 = '♀'; const Q3 = 'ﬃ'; const eH = 'ﬀ'; const tH = 'ﬄ'; const nH = '𝔉'; const rH = '𝔣'; const iH = 'ﬁ'; const oH = '◼'; const sH = '▪'; const lH = 'fj'; const aH = '♭'; const cH = 'ﬂ'; const uH = '▱'; const fH = 'ƒ'; const dH = '𝔽'; const hH = '𝕗'; const pH = '∀'; const gH = '∀'; const mH = '⋔'; const vH = '⫙'; const yH = 'ℱ'; const bH = '⨍'; const wH = '½'; const xH = '⅓'; const SH = '¼'; const _H = '⅕'; const kH = '⅙'; const TH = '⅛'; const CH = '⅔'; const EH = '⅖'; const AH = '¾'; const LH = '⅗'; const $H = '⅜'; const MH = '⅘'; const NH = '⅚'; const IH = '⅝'; const PH = '⅞'; const OH = '⁄'; const RH = '⌢'; const zH = '𝒻'; const DH = 'ℱ'; const FH = 'ǵ'; const HH = 'Γ'; const BH = 'γ'; const WH = 'Ϝ'; const jH = 'ϝ'; const qH = '⪆'; const UH = 'Ğ'; const VH = 'ğ'; const GH = 'Ģ'; const XH = 'Ĝ'; const KH = 'ĝ'; const JH = 'Г'; const YH = 'г'; const ZH = 'Ġ'; const QH = 'ġ'; const eB = '≥'; const tB = '≧'; const nB = '⪌'; const rB = '⋛'; const iB = '≥'; const oB = '≧'; const sB = '⩾'; const lB = '⪩'; const aB = '⩾'; const cB = '⪀'; const uB = '⪂'; const fB = '⪄'; const dB = '⋛︀'; const hB = '⪔'; const pB = '𝔊'; const gB = '𝔤'; const mB = '≫'; const vB = '⋙'; const yB = '⋙'; const bB = 'ℷ'; const wB = 'Ѓ'; const xB = 'ѓ'; const SB = '⪥'; const _B = '≷'; const kB = '⪒'; const TB = '⪤'; const CB = '⪊'; const EB = '⪊'; const AB = '⪈'; const LB = '≩'; const $B = '⪈'; const MB = '≩'; const NB = '⋧'; const IB = '𝔾'; const PB = '𝕘'; const OB = '`'; const RB = '≥'; const zB = '⋛'; const DB = '≧'; const FB = '⪢'; const HB = '≷'; const BB = '⩾'; const WB = '≳'; const jB = '𝒢'; const qB = 'ℊ'; const UB = '≳'; const VB = '⪎'; const GB = '⪐'; const XB = '⪧'; const KB = '⩺'; const JB = '>'; const YB = '>'; const ZB = '≫'; const QB = '⋗'; const e5 = '⦕'; const t5 = '⩼'; const n5 = '⪆'; const r5 = '⥸'; const i5 = '⋗'; const o5 = '⋛'; const s5 = '⪌'; const l5 = '≷'; const a5 = '≳'; const c5 = '≩︀'; const u5 = '≩︀'; const f5 = 'ˇ'; const d5 = ' '; const h5 = '½'; const p5 = 'ℋ'; const g5 = 'Ъ'; const m5 = 'ъ'; const v5 = '⥈'; const y5 = '↔'; const b5 = '⇔'; const w5 = '↭'; const x5 = '^'; const S5 = 'ℏ'; const _5 = 'Ĥ'; const k5 = 'ĥ'; const T5 = '♥'; const C5 = '♥'; const E5 = '…'; const A5 = '⊹'; const L5 = '𝔥'; const $5 = 'ℌ'; const M5 = 'ℋ'; const N5 = '⤥'; const I5 = '⤦'; const P5 = '⇿'; const O5 = '∻'; const R5 = '↩'; const z5 = '↪'; const D5 = '𝕙'; const F5 = 'ℍ'; const H5 = '―'; const B5 = '─'; const W5 = '𝒽'; const j5 = 'ℋ'; const q5 = 'ℏ'; const U5 = 'Ħ'; const V5 = 'ħ'; const G5 = '≎'; const X5 = '≏'; const K5 = '⁃'; const J5 = '‐'; const Y5 = 'Í'; const Z5 = 'í'; const Q5 = '⁣'; const e4 = 'Î'; const t4 = 'î'; const n4 = 'И'; const r4 = 'и'; const i4 = 'İ'; const o4 = 'Е'; const s4 = 'е'; const l4 = '¡'; const a4 = '⇔'; const c4 = '𝔦'; const u4 = 'ℑ'; const f4 = 'Ì'; const d4 = 'ì'; const h4 = 'ⅈ'; const p4 = '⨌'; const g4 = '∭'; const m4 = '⧜'; const v4 = '℩'; const y4 = 'Ĳ'; const b4 = 'ĳ'; const w4 = 'Ī'; const x4 = 'ī'; const S4 = 'ℑ'; const _4 = 'ⅈ'; const k4 = 'ℐ'; const T4 = 'ℑ'; const C4 = 'ı'; const E4 = 'ℑ'; const A4 = '⊷'; const L4 = 'Ƶ'; const $4 = '⇒'; const M4 = '℅'; const N4 = '∞'; const I4 = '⧝'; const P4 = 'ı'; const O4 = '⊺'; const R4 = '∫'; const z4 = '∬'; const D4 = 'ℤ'; const F4 = '∫'; const H4 = '⊺'; const B4 = '⋂'; const W4 = '⨗'; const j4 = '⨼'; const q4 = '⁣'; const U4 = '⁢'; const V4 = 'Ё'; const G4 = 'ё'; const X4 = 'Į'; const K4 = 'į'; const J4 = '𝕀'; const Y4 = '𝕚'; const Z4 = 'Ι'; const Q4 = 'ι'; const e8 = '⨼'; const t8 = '¿'; const n8 = '𝒾'; const r8 = 'ℐ'; const i8 = '∈'; const o8 = '⋵'; const s8 = '⋹'; const l8 = '⋴'; const a8 = '⋳'; const c8 = '∈'; const u8 = '⁢'; const f8 = 'Ĩ'; const d8 = 'ĩ'; const h8 = 'І'; const p8 = 'і'; const g8 = 'Ï'; const m8 = 'ï'; const v8 = 'Ĵ'; const y8 = 'ĵ'; const b8 = 'Й'; const w8 = 'й'; const x8 = '𝔍'; const S8 = '𝔧'; const _8 = 'ȷ'; const k8 = '𝕁'; const T8 = '𝕛'; const C8 = '𝒥'; const E8 = '𝒿'; const A8 = 'Ј'; const L8 = 'ј'; const $8 = 'Є'; const M8 = 'є'; const N8 = 'Κ'; const I8 = 'κ'; const P8 = 'ϰ'; const O8 = 'Ķ'; const R8 = 'ķ'; const z8 = 'К'; const D8 = 'к'; const F8 = '𝔎'; const H8 = '𝔨'; const B8 = 'ĸ'; const W8 = 'Х'; const j8 = 'х'; const q8 = 'Ќ'; const U8 = 'ќ'; const V8 = '𝕂'; const G8 = '𝕜'; const X8 = '𝒦'; const K8 = '𝓀'; const J8 = '⇚'; const Y8 = 'Ĺ'; const Z8 = 'ĺ'; const Q8 = '⦴'; const eW = 'ℒ'; const tW = 'Λ'; const nW = 'λ'; const rW = '⟨'; const iW = '⟪'; const oW = '⦑'; const sW = '⟨'; const lW = '⪅'; const aW = 'ℒ'; const cW = '«'; const uW = '⇤'; const fW = '⤟'; const dW = '←'; const hW = '↞'; const pW = '⇐'; const gW = '⤝'; const mW = '↩'; const vW = '↫'; const yW = '⤹'; const bW = '⥳'; const wW = '↢'; const xW = '⤙'; const SW = '⤛'; const _W = '⪫'; const kW = '⪭'; const TW = '⪭︀'; const CW = '⤌'; const EW = '⤎'; const AW = '❲'; const LW = '{'; const $W = '['; const MW = '⦋'; const NW = '⦏'; const IW = '⦍'; const PW = 'Ľ'; const OW = 'ľ'; const RW = 'Ļ'; const zW = 'ļ'; const DW = '⌈'; const FW = '{'; const HW = 'Л'; const BW = 'л'; const WW = '⤶'; const jW = '“'; const qW = '„'; const UW = '⥧'; const VW = '⥋'; const GW = '↲'; const XW = '≤'; const KW = '≦'; const JW = '⟨'; const YW = '⇤'; const ZW = '←'; const QW = '←'; const ej = '⇐'; const tj = '⇆'; const nj = '↢'; const rj = '⌈'; const ij = '⟦'; const oj = '⥡'; const sj = '⥙'; const lj = '⇃'; const aj = '⌊'; const cj = '↽'; const uj = '↼'; const fj = '⇇'; const dj = '↔'; const hj = '↔'; const pj = '⇔'; const gj = '⇆'; const mj = '⇋'; const vj = '↭'; const yj = '⥎'; const bj = '↤'; const wj = '⊣'; const xj = '⥚'; const Sj = '⋋'; const _j = '⧏'; const kj = '⊲'; const Tj = '⊴'; const Cj = '⥑'; const Ej = '⥠'; const Aj = '⥘'; const Lj = '↿'; const $j = '⥒'; const Mj = '↼'; const Nj = '⪋'; const Ij = '⋚'; const Pj = '≤'; const Oj = '≦'; const Rj = '⩽'; const zj = '⪨'; const Dj = '⩽'; const Fj = '⩿'; const Hj = '⪁'; const Bj = '⪃'; const Wj = '⋚︀'; const jj = '⪓'; const qj = '⪅'; const Uj = '⋖'; const Vj = '⋚'; const Gj = '⪋'; const Xj = '⋚'; const Kj = '≦'; const Jj = '≶'; const Yj = '≶'; const Zj = '⪡'; const Qj = '≲'; const eq = '⩽'; const tq = '≲'; const nq = '⥼'; const rq = '⌊'; const iq = '𝔏'; const oq = '𝔩'; const sq = '≶'; const lq = '⪑'; const aq = '⥢'; const cq = '↽'; const uq = '↼'; const fq = '⥪'; const dq = '▄'; const hq = 'Љ'; const pq = 'љ'; const gq = '⇇'; const mq = '≪'; const vq = '⋘'; const yq = '⌞'; const bq = '⇚'; const wq = '⥫'; const xq = '◺'; const Sq = 'Ŀ'; const _q = 'ŀ'; const kq = '⎰'; const Tq = '⎰'; const Cq = '⪉'; const Eq = '⪉'; const Aq = '⪇'; const Lq = '≨'; const $q = '⪇'; const Mq = '≨'; const Nq = '⋦'; const Iq = '⟬'; const Pq = '⇽'; const Oq = '⟦'; const Rq = '⟵'; const zq = '⟵'; const Dq = '⟸'; const Fq = '⟷'; const Hq = '⟷'; const Bq = '⟺'; const Wq = '⟼'; const jq = '⟶'; const qq = '⟶'; const Uq = '⟹'; const Vq = '↫'; const Gq = '↬'; const Xq = '⦅'; const Kq = '𝕃'; const Jq = '𝕝'; const Yq = '⨭'; const Zq = '⨴'; const Qq = '∗'; const e6 = '_'; const t6 = '↙'; const n6 = '↘'; const r6 = '◊'; const i6 = '◊'; const o6 = '⧫'; const s6 = '('; const l6 = '⦓'; const a6 = '⇆'; const c6 = '⌟'; const u6 = '⇋'; const f6 = '⥭'; const d6 = '‎'; const h6 = '⊿'; const p6 = '‹'; const g6 = '𝓁'; const m6 = 'ℒ'; const v6 = '↰'; const y6 = '↰'; const b6 = '≲'; const w6 = '⪍'; const x6 = '⪏'; const S6 = '['; const _6 = '‘'; const k6 = '‚'; const T6 = 'Ł'; const C6 = 'ł'; const E6 = '⪦'; const A6 = '⩹'; const L6 = '<'; const $6 = '<'; const M6 = '≪'; const N6 = '⋖'; const I6 = '⋋'; const P6 = '⋉'; const O6 = '⥶'; const R6 = '⩻'; const z6 = '◃'; const D6 = '⊴'; const F6 = '◂'; const H6 = '⦖'; const B6 = '⥊'; const W6 = '⥦'; const j6 = '≨︀'; const q6 = '≨︀'; const U6 = '¯'; const V6 = '♂'; const G6 = '✠'; const X6 = '✠'; const K6 = '↦'; const J6 = '↦'; const Y6 = '↧'; const Z6 = '↤'; const Q6 = '↥'; const eU = '▮'; const tU = '⨩'; const nU = 'М'; const rU = 'м'; const iU = '—'; const oU = '∺'; const sU = '∡'; const lU = ' '; const aU = 'ℳ'; const cU = '𝔐'; const uU = '𝔪'; const fU = '℧'; const dU = 'µ'; const hU = '*'; const pU = '⫰'; const gU = '∣'; const mU = '·'; const vU = '⊟'; const yU = '−'; const bU = '∸'; const wU = '⨪'; const xU = '∓'; const SU = '⫛'; const _U = '…'; const kU = '∓'; const TU = '⊧'; const CU = '𝕄'; const EU = '𝕞'; const AU = '∓'; const LU = '𝓂'; const $U = 'ℳ'; const MU = '∾'; const NU = 'Μ'; const IU = 'μ'; const PU = '⊸'; const OU = '⊸'; const RU = '∇'; const zU = 'Ń'; const DU = 'ń'; const FU = '∠⃒'; const HU = '≉'; const BU = '⩰̸'; const WU = '≋̸'; const jU = 'ŉ'; const qU = '≉'; const UU = '♮'; const VU = 'ℕ'; const GU = '♮'; const XU = ' '; const KU = '≎̸'; const JU = '≏̸'; const YU = '⩃'; const ZU = 'Ň'; const QU = 'ň'; const e9 = 'Ņ'; const t9 = 'ņ'; const n9 = '≇'; const r9 = '⩭̸'; const i9 = '⩂'; const o9 = 'Н'; const s9 = 'н'; const l9 = '–'; const a9 = '⤤'; const c9 = '↗'; const u9 = '⇗'; const f9 = '↗'; const d9 = '≠'; const h9 = '≐̸'; const p9 = '​'; const g9 = '​'; const m9 = '​'; const v9 = '​'; const y9 = '≢'; const b9 = '⤨'; const w9 = '≂̸'; const x9 = '≫'; const S9 = '≪'; const _9 = `
`; const k9 = '∄'; const T9 = '∄'; const C9 = '𝔑'; const E9 = '𝔫'; const A9 = '≧̸'; const L9 = '≱'; const $9 = '≱'; const M9 = '≧̸'; const N9 = '⩾̸'; const I9 = '⩾̸'; const P9 = '⋙̸'; const O9 = '≵'; const R9 = '≫⃒'; const z9 = '≯'; const D9 = '≯'; const F9 = '≫̸'; const H9 = '↮'; const B9 = '⇎'; const W9 = '⫲'; const j9 = '∋'; const q9 = '⋼'; const U9 = '⋺'; const V9 = '∋'; const G9 = 'Њ'; const X9 = 'њ'; const K9 = '↚'; const J9 = '⇍'; const Y9 = '‥'; const Z9 = '≦̸'; const Q9 = '≰'; const eV = '↚'; const tV = '⇍'; const nV = '↮'; const rV = '⇎'; const iV = '≰'; const oV = '≦̸'; const sV = '⩽̸'; const lV = '⩽̸'; const aV = '≮'; const cV = '⋘̸'; const uV = '≴'; const fV = '≪⃒'; const dV = '≮'; const hV = '⋪'; const pV = '⋬'; const gV = '≪̸'; const mV = '∤'; const vV = '⁠'; const yV = ' '; const bV = '𝕟'; const wV = 'ℕ'; const xV = '⫬'; const SV = '¬'; const _V = '≢'; const kV = '≭'; const TV = '∦'; const CV = '∉'; const EV = '≠'; const AV = '≂̸'; const LV = '∄'; const $V = '≯'; const MV = '≱'; const NV = '≧̸'; const IV = '≫̸'; const PV = '≹'; const OV = '⩾̸'; const RV = '≵'; const zV = '≎̸'; const DV = '≏̸'; const FV = '∉'; const HV = '⋵̸'; const BV = '⋹̸'; const WV = '∉'; const jV = '⋷'; const qV = '⋶'; const UV = '⧏̸'; const VV = '⋪'; const GV = '⋬'; const XV = '≮'; const KV = '≰'; const JV = '≸'; const YV = '≪̸'; const ZV = '⩽̸'; const QV = '≴'; const eG = '⪢̸'; const tG = '⪡̸'; const nG = '∌'; const rG = '∌'; const iG = '⋾'; const oG = '⋽'; const sG = '⊀'; const lG = '⪯̸'; const aG = '⋠'; const cG = '∌'; const uG = '⧐̸'; const fG = '⋫'; const dG = '⋭'; const hG = '⊏̸'; const pG = '⋢'; const gG = '⊐̸'; const mG = '⋣'; const vG = '⊂⃒'; const yG = '⊈'; const bG = '⊁'; const wG = '⪰̸'; const xG = '⋡'; const SG = '≿̸'; const _G = '⊃⃒'; const kG = '⊉'; const TG = '≁'; const CG = '≄'; const EG = '≇'; const AG = '≉'; const LG = '∤'; const $G = '∦'; const MG = '∦'; const NG = '⫽⃥'; const IG = '∂̸'; const PG = '⨔'; const OG = '⊀'; const RG = '⋠'; const zG = '⊀'; const DG = '⪯̸'; const FG = '⪯̸'; const HG = '⤳̸'; const BG = '↛'; const WG = '⇏'; const jG = '↝̸'; const qG = '↛'; const UG = '⇏'; const VG = '⋫'; const GG = '⋭'; const XG = '⊁'; const KG = '⋡'; const JG = '⪰̸'; const YG = '𝒩'; const ZG = '𝓃'; const QG = '∤'; const e7 = '∦'; const t7 = '≁'; const n7 = '≄'; const r7 = '≄'; const i7 = '∤'; const o7 = '∦'; const s7 = '⋢'; const l7 = '⋣'; const a7 = '⊄'; const c7 = '⫅̸'; const u7 = '⊈'; const f7 = '⊂⃒'; const d7 = '⊈'; const h7 = '⫅̸'; const p7 = '⊁'; const g7 = '⪰̸'; const m7 = '⊅'; const v7 = '⫆̸'; const y7 = '⊉'; const b7 = '⊃⃒'; const w7 = '⊉'; const x7 = '⫆̸'; const S7 = '≹'; const _7 = 'Ñ'; const k7 = 'ñ'; const T7 = '≸'; const C7 = '⋪'; const E7 = '⋬'; const A7 = '⋫'; const L7 = '⋭'; const $7 = 'Ν'; const M7 = 'ν'; const N7 = '#'; const I7 = '№'; const P7 = ' '; const O7 = '≍⃒'; const R7 = '⊬'; const z7 = '⊭'; const D7 = '⊮'; const F7 = '⊯'; const H7 = '≥⃒'; const B7 = '>⃒'; const W7 = '⤄'; const j7 = '⧞'; const q7 = '⤂'; const U7 = '≤⃒'; const V7 = '<⃒'; const G7 = '⊴⃒'; const X7 = '⤃'; const K7 = '⊵⃒'; const J7 = '∼⃒'; const Y7 = '⤣'; const Z7 = '↖'; const Q7 = '⇖'; const eX = '↖'; const tX = '⤧'; const nX = 'Ó'; const rX = 'ó'; const iX = '⊛'; const oX = 'Ô'; const sX = 'ô'; const lX = '⊚'; const aX = 'О'; const cX = 'о'; const uX = '⊝'; const fX = 'Ő'; const dX = 'ő'; const hX = '⨸'; const pX = '⊙'; const gX = '⦼'; const mX = 'Œ'; const vX = 'œ'; const yX = '⦿'; const bX = '𝔒'; const wX = '𝔬'; const xX = '˛'; const SX = 'Ò'; const _X = 'ò'; const kX = '⧁'; const TX = '⦵'; const CX = 'Ω'; const EX = '∮'; const AX = '↺'; const LX = '⦾'; const $X = '⦻'; const MX = '‾'; const NX = '⧀'; const IX = 'Ō'; const PX = 'ō'; const OX = 'Ω'; const RX = 'ω'; const zX = 'Ο'; const DX = 'ο'; const FX = '⦶'; const HX = '⊖'; const BX = '𝕆'; const WX = '𝕠'; const jX = '⦷'; const qX = '“'; const UX = '‘'; const VX = '⦹'; const GX = '⊕'; const XX = '↻'; const KX = '⩔'; const JX = '∨'; const YX = '⩝'; const ZX = 'ℴ'; const QX = 'ℴ'; const eK = 'ª'; const tK = 'º'; const nK = '⊶'; const rK = '⩖'; const iK = '⩗'; const oK = '⩛'; const sK = 'Ⓢ'; const lK = '𝒪'; const aK = 'ℴ'; const cK = 'Ø'; const uK = 'ø'; const fK = '⊘'; const dK = 'Õ'; const hK = 'õ'; const pK = '⨶'; const gK = '⨷'; const mK = '⊗'; const vK = 'Ö'; const yK = 'ö'; const bK = '⌽'; const wK = '‾'; const xK = '⏞'; const SK = '⎴'; const _K = '⏜'; const kK = '¶'; const TK = '∥'; const CK = '∥'; const EK = '⫳'; const AK = '⫽'; const LK = '∂'; const $K = '∂'; const MK = 'П'; const NK = 'п'; const IK = '%'; const PK = '.'; const OK = '‰'; const RK = '⊥'; const zK = '‱'; const DK = '𝔓'; const FK = '𝔭'; const HK = 'Φ'; const BK = 'φ'; const WK = 'ϕ'; const jK = 'ℳ'; const qK = '☎'; const UK = 'Π'; const VK = 'π'; const GK = '⋔'; const XK = 'ϖ'; const KK = 'ℏ'; const JK = 'ℎ'; const YK = 'ℏ'; const ZK = '⨣'; const QK = '⊞'; const eJ = '⨢'; const tJ = '+'; const nJ = '∔'; const rJ = '⨥'; const iJ = '⩲'; const oJ = '±'; const sJ = '±'; const lJ = '⨦'; const aJ = '⨧'; const cJ = '±'; const uJ = 'ℌ'; const fJ = '⨕'; const dJ = '𝕡'; const hJ = 'ℙ'; const pJ = '£'; const gJ = '⪷'; const mJ = '⪻'; const vJ = '≺'; const yJ = '≼'; const bJ = '⪷'; const wJ = '≺'; const xJ = '≼'; const SJ = '≺'; const _J = '⪯'; const kJ = '≼'; const TJ = '≾'; const CJ = '⪯'; const EJ = '⪹'; const AJ = '⪵'; const LJ = '⋨'; const $J = '⪯'; const MJ = '⪳'; const NJ = '≾'; const IJ = '′'; const PJ = '″'; const OJ = 'ℙ'; const RJ = '⪹'; const zJ = '⪵'; const DJ = '⋨'; const FJ = '∏'; const HJ = '∏'; const BJ = '⌮'; const WJ = '⌒'; const jJ = '⌓'; const qJ = '∝'; const UJ = '∝'; const VJ = '∷'; const GJ = '∝'; const XJ = '≾'; const KJ = '⊰'; const JJ = '𝒫'; const YJ = '𝓅'; const ZJ = 'Ψ'; const QJ = 'ψ'; const eY = ' '; const tY = '𝔔'; const nY = '𝔮'; const rY = '⨌'; const iY = '𝕢'; const oY = 'ℚ'; const sY = '⁗'; const lY = '𝒬'; const aY = '𝓆'; const cY = 'ℍ'; const uY = '⨖'; const fY = '?'; const dY = '≟'; const hY = '"'; const pY = '"'; const gY = '⇛'; const mY = '∽̱'; const vY = 'Ŕ'; const yY = 'ŕ'; const bY = '√'; const wY = '⦳'; const xY = '⟩'; const SY = '⟫'; const _Y = '⦒'; const kY = '⦥'; const TY = '⟩'; const CY = '»'; const EY = '⥵'; const AY = '⇥'; const LY = '⤠'; const $Y = '⤳'; const MY = '→'; const NY = '↠'; const IY = '⇒'; const PY = '⤞'; const OY = '↪'; const RY = '↬'; const zY = '⥅'; const DY = '⥴'; const FY = '⤖'; const HY = '↣'; const BY = '↝'; const WY = '⤚'; const jY = '⤜'; const qY = '∶'; const UY = 'ℚ'; const VY = '⤍'; const GY = '⤏'; const XY = '⤐'; const KY = '❳'; const JY = '}'; const YY = ']'; const ZY = '⦌'; const QY = '⦎'; const eZ = '⦐'; const tZ = 'Ř'; const nZ = 'ř'; const rZ = 'Ŗ'; const iZ = 'ŗ'; const oZ = '⌉'; const sZ = '}'; const lZ = 'Р'; const aZ = 'р'; const cZ = '⤷'; const uZ = '⥩'; const fZ = '”'; const dZ = '”'; const hZ = '↳'; const pZ = 'ℜ'; const gZ = 'ℛ'; const mZ = 'ℜ'; const vZ = 'ℝ'; const yZ = 'ℜ'; const bZ = '▭'; const wZ = '®'; const xZ = '®'; const SZ = '∋'; const _Z = '⇋'; const kZ = '⥯'; const TZ = '⥽'; const CZ = '⌋'; const EZ = '𝔯'; const AZ = 'ℜ'; const LZ = '⥤'; const $Z = '⇁'; const MZ = '⇀'; const NZ = '⥬'; const IZ = 'Ρ'; const PZ = 'ρ'; const OZ = 'ϱ'; const RZ = '⟩'; const zZ = '⇥'; const DZ = '→'; const FZ = '→'; const HZ = '⇒'; const BZ = '⇄'; const WZ = '↣'; const jZ = '⌉'; const qZ = '⟧'; const UZ = '⥝'; const VZ = '⥕'; const GZ = '⇂'; const XZ = '⌋'; const KZ = '⇁'; const JZ = '⇀'; const YZ = '⇄'; const ZZ = '⇌'; const QZ = '⇉'; const eQ = '↝'; const tQ = '↦'; const nQ = '⊢'; const rQ = '⥛'; const iQ = '⋌'; const oQ = '⧐'; const sQ = '⊳'; const lQ = '⊵'; const aQ = '⥏'; const cQ = '⥜'; const uQ = '⥔'; const fQ = '↾'; const dQ = '⥓'; const hQ = '⇀'; const pQ = '˚'; const gQ = '≓'; const mQ = '⇄'; const vQ = '⇌'; const yQ = '‏'; const bQ = '⎱'; const wQ = '⎱'; const xQ = '⫮'; const SQ = '⟭'; const _Q = '⇾'; const kQ = '⟧'; const TQ = '⦆'; const CQ = '𝕣'; const EQ = 'ℝ'; const AQ = '⨮'; const LQ = '⨵'; const $Q = '⥰'; const MQ = ')'; const NQ = '⦔'; const IQ = '⨒'; const PQ = '⇉'; const OQ = '⇛'; const RQ = '›'; const zQ = '𝓇'; const DQ = 'ℛ'; const FQ = '↱'; const HQ = '↱'; const BQ = ']'; const WQ = '’'; const jQ = '’'; const qQ = '⋌'; const UQ = '⋊'; const VQ = '▹'; const GQ = '⊵'; const XQ = '▸'; const KQ = '⧎'; const JQ = '⧴'; const YQ = '⥨'; const ZQ = '℞'; const QQ = 'Ś'; const eee = 'ś'; const tee = '‚'; const nee = '⪸'; const ree = 'Š'; const iee = 'š'; const oee = '⪼'; const see = '≻'; const lee = '≽'; const aee = '⪰'; const cee = '⪴'; const uee = 'Ş'; const fee = 'ş'; const dee = 'Ŝ'; const hee = 'ŝ'; const pee = '⪺'; const gee = '⪶'; const mee = '⋩'; const vee = '⨓'; const yee = '≿'; const bee = 'С'; const wee = 'с'; const xee = '⊡'; const See = '⋅'; const _ee = '⩦'; const kee = '⤥'; const Tee = '↘'; const Cee = '⇘'; const Eee = '↘'; const Aee = '§'; const Lee = ';'; const $ee = '⤩'; const Mee = '∖'; const Nee = '∖'; const Iee = '✶'; const Pee = '𝔖'; const Oee = '𝔰'; const Ree = '⌢'; const zee = '♯'; const Dee = 'Щ'; const Fee = 'щ'; const Hee = 'Ш'; const Bee = 'ш'; const Wee = '↓'; const jee = '←'; const qee = '∣'; const Uee = '∥'; const Vee = '→'; const Gee = '↑'; const Xee = '­'; const Kee = 'Σ'; const Jee = 'σ'; const Yee = 'ς'; const Zee = 'ς'; const Qee = '∼'; const ete = '⩪'; const tte = '≃'; const nte = '≃'; const rte = '⪞'; const ite = '⪠'; const ote = '⪝'; const ste = '⪟'; const lte = '≆'; const ate = '⨤'; const cte = '⥲'; const ute = '←'; const fte = '∘'; const dte = '∖'; const hte = '⨳'; const pte = '⧤'; const gte = '∣'; const mte = '⌣'; const vte = '⪪'; const yte = '⪬'; const bte = '⪬︀'; const wte = 'Ь'; const xte = 'ь'; const Ste = '⌿'; const _te = '⧄'; const kte = '/'; const Tte = '𝕊'; const Cte = '𝕤'; const Ete = '♠'; const Ate = '♠'; const Lte = '∥'; const $te = '⊓'; const Mte = '⊓︀'; const Nte = '⊔'; const Ite = '⊔︀'; const Pte = '√'; const Ote = '⊏'; const Rte = '⊑'; const zte = '⊏'; const Dte = '⊑'; const Fte = '⊐'; const Hte = '⊒'; const Bte = '⊐'; const Wte = '⊒'; const jte = '□'; const qte = '□'; const Ute = '⊓'; const Vte = '⊏'; const Gte = '⊑'; const Xte = '⊐'; const Kte = '⊒'; const Jte = '⊔'; const Yte = '▪'; const Zte = '□'; const Qte = '▪'; const ene = '→'; const tne = '𝒮'; const nne = '𝓈'; const rne = '∖'; const ine = '⌣'; const one = '⋆'; const sne = '⋆'; const lne = '☆'; const ane = '★'; const cne = 'ϵ'; const une = 'ϕ'; const fne = '¯'; const dne = '⊂'; const hne = '⋐'; const pne = '⪽'; const gne = '⫅'; const mne = '⊆'; const vne = '⫃'; const yne = '⫁'; const bne = '⫋'; const wne = '⊊'; const xne = '⪿'; const Sne = '⥹'; const _ne = '⊂'; const kne = '⋐'; const Tne = '⊆'; const Cne = '⫅'; const Ene = '⊆'; const Ane = '⊊'; const Lne = '⫋'; const $ne = '⫇'; const Mne = '⫕'; const Nne = '⫓'; const Ine = '⪸'; const Pne = '≻'; const One = '≽'; const Rne = '≻'; const zne = '⪰'; const Dne = '≽'; const Fne = '≿'; const Hne = '⪰'; const Bne = '⪺'; const Wne = '⪶'; const jne = '⋩'; const qne = '≿'; const Une = '∋'; const Vne = '∑'; const Gne = '∑'; const Xne = '♪'; const Kne = '¹'; const Jne = '²'; const Yne = '³'; const Zne = '⊃'; const Qne = '⋑'; const ere = '⪾'; const tre = '⫘'; const nre = '⫆'; const rre = '⊇'; const ire = '⫄'; const ore = '⊃'; const sre = '⊇'; const lre = '⟉'; const are = '⫗'; const cre = '⥻'; const ure = '⫂'; const fre = '⫌'; const dre = '⊋'; const hre = '⫀'; const pre = '⊃'; const gre = '⋑'; const mre = '⊇'; const vre = '⫆'; const yre = '⊋'; const bre = '⫌'; const wre = '⫈'; const xre = '⫔'; const Sre = '⫖'; const _re = '⤦'; const kre = '↙'; const Tre = '⇙'; const Cre = '↙'; const Ere = '⤪'; const Are = 'ß'; const Lre = '	'; const $re = '⌖'; const Mre = 'Τ'; const Nre = 'τ'; const Ire = '⎴'; const Pre = 'Ť'; const Ore = 'ť'; const Rre = 'Ţ'; const zre = 'ţ'; const Dre = 'Т'; const Fre = 'т'; const Hre = '⃛'; const Bre = '⌕'; const Wre = '𝔗'; const jre = '𝔱'; const qre = '∴'; const Ure = '∴'; const Vre = '∴'; const Gre = 'Θ'; const Xre = 'θ'; const Kre = 'ϑ'; const Jre = 'ϑ'; const Yre = '≈'; const Zre = '∼'; const Qre = '  '; const eie = ' '; const tie = ' '; const nie = '≈'; const rie = '∼'; const iie = 'Þ'; const oie = 'þ'; const sie = '˜'; const lie = '∼'; const aie = '≃'; const cie = '≅'; const uie = '≈'; const fie = '⨱'; const die = '⊠'; const hie = '×'; const pie = '⨰'; const gie = '∭'; const mie = '⤨'; const vie = '⌶'; const yie = '⫱'; const bie = '⊤'; const wie = '𝕋'; const xie = '𝕥'; const Sie = '⫚'; const _ie = '⤩'; const kie = '‴'; const Tie = '™'; const Cie = '™'; const Eie = '▵'; const Aie = '▿'; const Lie = '◃'; const $ie = '⊴'; const Mie = '≜'; const Nie = '▹'; const Iie = '⊵'; const Pie = '◬'; const Oie = '≜'; const Rie = '⨺'; const zie = '⃛'; const Die = '⨹'; const Fie = '⧍'; const Hie = '⨻'; const Bie = '⏢'; const Wie = '𝒯'; const jie = '𝓉'; const qie = 'Ц'; const Uie = 'ц'; const Vie = 'Ћ'; const Gie = 'ћ'; const Xie = 'Ŧ'; const Kie = 'ŧ'; const Jie = '≬'; const Yie = '↞'; const Zie = '↠'; const Qie = 'Ú'; const eoe = 'ú'; const toe = '↑'; const noe = '↟'; const roe = '⇑'; const ioe = '⥉'; const ooe = 'Ў'; const soe = 'ў'; const loe = 'Ŭ'; const aoe = 'ŭ'; const coe = 'Û'; const uoe = 'û'; const foe = 'У'; const doe = 'у'; const hoe = '⇅'; const poe = 'Ű'; const goe = 'ű'; const moe = '⥮'; const voe = '⥾'; const yoe = '𝔘'; const boe = '𝔲'; const woe = 'Ù'; const xoe = 'ù'; const Soe = '⥣'; const _oe = '↿'; const koe = '↾'; const Toe = '▀'; const Coe = '⌜'; const Eoe = '⌜'; const Aoe = '⌏'; const Loe = '◸'; const $oe = 'Ū'; const Moe = 'ū'; const Noe = '¨'; const Ioe = '_'; const Poe = '⏟'; const Ooe = '⎵'; const Roe = '⏝'; const zoe = '⋃'; const Doe = '⊎'; const Foe = 'Ų'; const Hoe = 'ų'; const Boe = '𝕌'; const Woe = '𝕦'; const joe = '⤒'; const qoe = '↑'; const Uoe = '↑'; const Voe = '⇑'; const Goe = '⇅'; const Xoe = '↕'; const Koe = '↕'; const Joe = '⇕'; const Yoe = '⥮'; const Zoe = '↿'; const Qoe = '↾'; const ese = '⊎'; const tse = '↖'; const nse = '↗'; const rse = 'υ'; const ise = 'ϒ'; const ose = 'ϒ'; const sse = 'Υ'; const lse = 'υ'; const ase = '↥'; const cse = '⊥'; const use = '⇈'; const fse = '⌝'; const dse = '⌝'; const hse = '⌎'; const pse = 'Ů'; const gse = 'ů'; const mse = '◹'; const vse = '𝒰'; const yse = '𝓊'; const bse = '⋰'; const wse = 'Ũ'; const xse = 'ũ'; const Sse = '▵'; const _se = '▴'; const kse = '⇈'; const Tse = 'Ü'; const Cse = 'ü'; const Ese = '⦧'; const Ase = '⦜'; const Lse = 'ϵ'; const $se = 'ϰ'; const Mse = '∅'; const Nse = 'ϕ'; const Ise = 'ϖ'; const Pse = '∝'; const Ose = '↕'; const Rse = '⇕'; const zse = 'ϱ'; const Dse = 'ς'; const Fse = '⊊︀'; const Hse = '⫋︀'; const Bse = '⊋︀'; const Wse = '⫌︀'; const jse = 'ϑ'; const qse = '⊲'; const Use = '⊳'; const Vse = '⫨'; const Gse = '⫫'; const Xse = '⫩'; const Kse = 'В'; const Jse = 'в'; const Yse = '⊢'; const Zse = '⊨'; const Qse = '⊩'; const ele = '⊫'; const tle = '⫦'; const nle = '⊻'; const rle = '∨'; const ile = '⋁'; const ole = '≚'; const sle = '⋮'; const lle = '|'; const ale = '‖'; const cle = '|'; const ule = '‖'; const fle = '∣'; const dle = '|'; const hle = '❘'; const ple = '≀'; const gle = ' '; const mle = '𝔙'; const vle = '𝔳'; const yle = '⊲'; const ble = '⊂⃒'; const wle = '⊃⃒'; const xle = '𝕍'; const Sle = '𝕧'; const _le = '∝'; const kle = '⊳'; const Tle = '𝒱'; const Cle = '𝓋'; const Ele = '⫋︀'; const Ale = '⊊︀'; const Lle = '⫌︀'; const $le = '⊋︀'; const Mle = '⊪'; const Nle = '⦚'; const Ile = 'Ŵ'; const Ple = 'ŵ'; const Ole = '⩟'; const Rle = '∧'; const zle = '⋀'; const Dle = '≙'; const Fle = '℘'; const Hle = '𝔚'; const Ble = '𝔴'; const Wle = '𝕎'; const jle = '𝕨'; const qle = '℘'; const Ule = '≀'; const Vle = '≀'; const Gle = '𝒲'; const Xle = '𝓌'; const Kle = '⋂'; const Jle = '◯'; const Yle = '⋃'; const Zle = '▽'; const Qle = '𝔛'; const eae = '𝔵'; const tae = '⟷'; const nae = '⟺'; const rae = 'Ξ'; const iae = 'ξ'; const oae = '⟵'; const sae = '⟸'; const lae = '⟼'; const aae = '⋻'; const cae = '⨀'; const uae = '𝕏'; const fae = '𝕩'; const dae = '⨁'; const hae = '⨂'; const pae = '⟶'; const gae = '⟹'; const mae = '𝒳'; const vae = '𝓍'; const yae = '⨆'; const bae = '⨄'; const wae = '△'; const xae = '⋁'; const Sae = '⋀'; const _ae = 'Ý'; const kae = 'ý'; const Tae = 'Я'; const Cae = 'я'; const Eae = 'Ŷ'; const Aae = 'ŷ'; const Lae = 'Ы'; const $ae = 'ы'; const Mae = '¥'; const Nae = '𝔜'; const Iae = '𝔶'; const Pae = 'Ї'; const Oae = 'ї'; const Rae = '𝕐'; const zae = '𝕪'; const Dae = '𝒴'; const Fae = '𝓎'; const Hae = 'Ю'; const Bae = 'ю'; const Wae = 'ÿ'; const jae = 'Ÿ'; const qae = 'Ź'; const Uae = 'ź'; const Vae = 'Ž'; const Gae = 'ž'; const Xae = 'З'; const Kae = 'з'; const Jae = 'Ż'; const Yae = 'ż'; const Zae = 'ℨ'; const Qae = '​'; const ece = 'Ζ'; const tce = 'ζ'; const nce = '𝔷'; const rce = 'ℨ'; const ice = 'Ж'; const oce = 'ж'; const sce = '⇝'; const lce = '𝕫'; const ace = 'ℤ'; const cce = '𝒵'; const uce = '𝓏'; const fce = '‍'; const dce = '‌'; const e1 = { Aacute: JM, aacute: YM, Abreve: ZM, abreve: QM, ac: eN, acd: tN, acE: nN, Acirc: rN, acirc: iN, acute: oN, Acy: sN, acy: lN, AElig: aN, aelig: cN, af: uN, Afr: fN, afr: dN, Agrave: hN, agrave: pN, alefsym: gN, aleph: mN, Alpha: vN, alpha: yN, Amacr: bN, amacr: wN, amalg: xN, amp: SN, AMP: _N, andand: kN, And: TN, and: CN, andd: EN, andslope: AN, andv: LN, ang: $N, ange: MN, angle: NN, angmsdaa: IN, angmsdab: PN, angmsdac: ON, angmsdad: RN, angmsdae: zN, angmsdaf: DN, angmsdag: FN, angmsdah: HN, angmsd: BN, angrt: WN, angrtvb: jN, angrtvbd: qN, angsph: UN, angst: VN, angzarr: GN, Aogon: XN, aogon: KN, Aopf: JN, aopf: YN, apacir: ZN, ap: QN, apE: e2, ape: t2, apid: n2, apos: r2, ApplyFunction: i2, approx: o2, approxeq: s2, Aring: l2, aring: a2, Ascr: c2, ascr: u2, Assign: f2, ast: d2, asymp: h2, asympeq: p2, Atilde: g2, atilde: m2, Auml: v2, auml: y2, awconint: b2, awint: w2, backcong: x2, backepsilon: S2, backprime: _2, backsim: k2, backsimeq: T2, Backslash: C2, Barv: E2, barvee: A2, barwed: L2, Barwed: $2, barwedge: M2, bbrk: N2, bbrktbrk: I2, bcong: P2, Bcy: O2, bcy: R2, bdquo: z2, becaus: D2, because: F2, Because: H2, bemptyv: B2, bepsi: W2, bernou: j2, Bernoullis: q2, Beta: U2, beta: V2, beth: G2, between: X2, Bfr: K2, bfr: J2, bigcap: Y2, bigcirc: Z2, bigcup: Q2, bigodot: eI, bigoplus: tI, bigotimes: nI, bigsqcup: rI, bigstar: iI, bigtriangledown: oI, bigtriangleup: sI, biguplus: lI, bigvee: aI, bigwedge: cI, bkarow: uI, blacklozenge: fI, blacksquare: dI, blacktriangle: hI, blacktriangledown: pI, blacktriangleleft: gI, blacktriangleright: mI, blank: vI, blk12: yI, blk14: bI, blk34: wI, block: xI, bne: SI, bnequiv: _I, bNot: kI, bnot: TI, Bopf: CI, bopf: EI, bot: AI, bottom: LI, bowtie: $I, boxbox: MI, boxdl: NI, boxdL: II, boxDl: PI, boxDL: OI, boxdr: RI, boxdR: zI, boxDr: DI, boxDR: FI, boxh: HI, boxH: BI, boxhd: WI, boxHd: jI, boxhD: qI, boxHD: UI, boxhu: VI, boxHu: GI, boxhU: XI, boxHU: KI, boxminus: JI, boxplus: YI, boxtimes: ZI, boxul: QI, boxuL: eP, boxUl: tP, boxUL: nP, boxur: rP, boxuR: iP, boxUr: oP, boxUR: sP, boxv: lP, boxV: aP, boxvh: cP, boxvH: uP, boxVh: fP, boxVH: dP, boxvl: hP, boxvL: pP, boxVl: gP, boxVL: mP, boxvr: vP, boxvR: yP, boxVr: bP, boxVR: wP, bprime: xP, breve: SP, Breve: _P, brvbar: kP, bscr: TP, Bscr: CP, bsemi: EP, bsim: AP, bsime: LP, bsolb: $P, bsol: MP, bsolhsub: NP, bull: IP, bullet: PP, bump: OP, bumpE: RP, bumpe: zP, Bumpeq: DP, bumpeq: FP, Cacute: HP, cacute: BP, capand: WP, capbrcup: jP, capcap: qP, cap: UP, Cap: VP, capcup: GP, capdot: XP, CapitalDifferentialD: KP, caps: JP, caret: YP, caron: ZP, Cayleys: QP, ccaps: eO, Ccaron: tO, ccaron: nO, Ccedil: rO, ccedil: iO, Ccirc: oO, ccirc: sO, Cconint: lO, ccups: aO, ccupssm: cO, Cdot: uO, cdot: fO, cedil: dO, Cedilla: hO, cemptyv: pO, cent: gO, centerdot: mO, CenterDot: vO, cfr: yO, Cfr: bO, CHcy: wO, chcy: xO, check: SO, checkmark: _O, Chi: kO, chi: TO, circ: CO, circeq: EO, circlearrowleft: AO, circlearrowright: LO, circledast: $O, circledcirc: MO, circleddash: NO, CircleDot: IO, circledR: PO, circledS: OO, CircleMinus: RO, CirclePlus: zO, CircleTimes: DO, cir: FO, cirE: HO, cire: BO, cirfnint: WO, cirmid: jO, cirscir: qO, ClockwiseContourIntegral: UO, CloseCurlyDoubleQuote: VO, CloseCurlyQuote: GO, clubs: XO, clubsuit: KO, colon: JO, Colon: YO, Colone: ZO, colone: QO, coloneq: eR, comma: tR, commat: nR, comp: rR, compfn: iR, complement: oR, complexes: sR, cong: lR, congdot: aR, Congruent: cR, conint: uR, Conint: fR, ContourIntegral: dR, copf: hR, Copf: pR, coprod: gR, Coproduct: mR, copy: vR, COPY: yR, copysr: bR, CounterClockwiseContourIntegral: wR, crarr: xR, cross: SR, Cross: _R, Cscr: kR, cscr: TR, csub: CR, csube: ER, csup: AR, csupe: LR, ctdot: $R, cudarrl: MR, cudarrr: NR, cuepr: IR, cuesc: PR, cularr: OR, cularrp: RR, cupbrcap: zR, cupcap: DR, CupCap: FR, cup: HR, Cup: BR, cupcup: WR, cupdot: jR, cupor: qR, cups: UR, curarr: VR, curarrm: GR, curlyeqprec: XR, curlyeqsucc: KR, curlyvee: JR, curlywedge: YR, curren: ZR, curvearrowleft: QR, curvearrowright: ez, cuvee: tz, cuwed: nz, cwconint: rz, cwint: iz, cylcty: oz, dagger: sz, Dagger: lz, daleth: az, darr: cz, Darr: uz, dArr: fz, dash: dz, Dashv: hz, dashv: pz, dbkarow: gz, dblac: mz, Dcaron: vz, dcaron: yz, Dcy: bz, dcy: wz, ddagger: xz, ddarr: Sz, DD: _z, dd: kz, DDotrahd: Tz, ddotseq: Cz, deg: Ez, Del: Az, Delta: Lz, delta: $z, demptyv: Mz, dfisht: Nz, Dfr: Iz, dfr: Pz, dHar: Oz, dharl: Rz, dharr: zz, DiacriticalAcute: Dz, DiacriticalDot: Fz, DiacriticalDoubleAcute: Hz, DiacriticalGrave: Bz, DiacriticalTilde: Wz, diam: jz, diamond: qz, Diamond: Uz, diamondsuit: Vz, diams: Gz, die: Xz, DifferentialD: Kz, digamma: Jz, disin: Yz, div: Zz, divide: Qz, divideontimes: eD, divonx: tD, DJcy: nD, djcy: rD, dlcorn: iD, dlcrop: oD, dollar: sD, Dopf: lD, dopf: aD, Dot: cD, dot: uD, DotDot: fD, doteq: dD, doteqdot: hD, DotEqual: pD, dotminus: gD, dotplus: mD, dotsquare: vD, doublebarwedge: yD, DoubleContourIntegral: bD, DoubleDot: wD, DoubleDownArrow: xD, DoubleLeftArrow: SD, DoubleLeftRightArrow: _D, DoubleLeftTee: kD, DoubleLongLeftArrow: TD, DoubleLongLeftRightArrow: CD, DoubleLongRightArrow: ED, DoubleRightArrow: AD, DoubleRightTee: LD, DoubleUpArrow: $D, DoubleUpDownArrow: MD, DoubleVerticalBar: ND, DownArrowBar: ID, downarrow: PD, DownArrow: OD, Downarrow: RD, DownArrowUpArrow: zD, DownBreve: DD, downdownarrows: FD, downharpoonleft: HD, downharpoonright: BD, DownLeftRightVector: WD, DownLeftTeeVector: jD, DownLeftVectorBar: qD, DownLeftVector: UD, DownRightTeeVector: VD, DownRightVectorBar: GD, DownRightVector: XD, DownTeeArrow: KD, DownTee: JD, drbkarow: YD, drcorn: ZD, drcrop: QD, Dscr: eF, dscr: tF, DScy: nF, dscy: rF, dsol: iF, Dstrok: oF, dstrok: sF, dtdot: lF, dtri: aF, dtrif: cF, duarr: uF, duhar: fF, dwangle: dF, DZcy: hF, dzcy: pF, dzigrarr: gF, Eacute: mF, eacute: vF, easter: yF, Ecaron: bF, ecaron: wF, Ecirc: xF, ecirc: SF, ecir: _F, ecolon: kF, Ecy: TF, ecy: CF, eDDot: EF, Edot: AF, edot: LF, eDot: $F, ee: MF, efDot: NF, Efr: IF, efr: PF, eg: OF, Egrave: RF, egrave: zF, egs: DF, egsdot: FF, el: HF, Element: BF, elinters: WF, ell: jF, els: qF, elsdot: UF, Emacr: VF, emacr: GF, empty: XF, emptyset: KF, EmptySmallSquare: JF, emptyv: YF, EmptyVerySmallSquare: ZF, emsp13: QF, emsp14: e3, emsp: t3, ENG: n3, eng: r3, ensp: i3, Eogon: o3, eogon: s3, Eopf: l3, eopf: a3, epar: c3, eparsl: u3, eplus: f3, epsi: d3, Epsilon: h3, epsilon: p3, epsiv: g3, eqcirc: m3, eqcolon: v3, eqsim: y3, eqslantgtr: b3, eqslantless: w3, Equal: x3, equals: S3, EqualTilde: _3, equest: k3, Equilibrium: T3, equiv: C3, equivDD: E3, eqvparsl: A3, erarr: L3, erDot: $3, escr: M3, Escr: N3, esdot: I3, Esim: P3, esim: O3, Eta: R3, eta: z3, ETH: D3, eth: F3, Euml: H3, euml: B3, euro: W3, excl: j3, exist: q3, Exists: U3, expectation: V3, exponentiale: G3, ExponentialE: X3, fallingdotseq: K3, Fcy: J3, fcy: Y3, female: Z3, ffilig: Q3, fflig: eH, ffllig: tH, Ffr: nH, ffr: rH, filig: iH, FilledSmallSquare: oH, FilledVerySmallSquare: sH, fjlig: lH, flat: aH, fllig: cH, fltns: uH, fnof: fH, Fopf: dH, fopf: hH, forall: pH, ForAll: gH, fork: mH, forkv: vH, Fouriertrf: yH, fpartint: bH, frac12: wH, frac13: xH, frac14: SH, frac15: _H, frac16: kH, frac18: TH, frac23: CH, frac25: EH, frac34: AH, frac35: LH, frac38: $H, frac45: MH, frac56: NH, frac58: IH, frac78: PH, frasl: OH, frown: RH, fscr: zH, Fscr: DH, gacute: FH, Gamma: HH, gamma: BH, Gammad: WH, gammad: jH, gap: qH, Gbreve: UH, gbreve: VH, Gcedil: GH, Gcirc: XH, gcirc: KH, Gcy: JH, gcy: YH, Gdot: ZH, gdot: QH, ge: eB, gE: tB, gEl: nB, gel: rB, geq: iB, geqq: oB, geqslant: sB, gescc: lB, ges: aB, gesdot: cB, gesdoto: uB, gesdotol: fB, gesl: dB, gesles: hB, Gfr: pB, gfr: gB, gg: mB, Gg: vB, ggg: yB, gimel: bB, GJcy: wB, gjcy: xB, gla: SB, gl: _B, glE: kB, glj: TB, gnap: CB, gnapprox: EB, gne: AB, gnE: LB, gneq: $B, gneqq: MB, gnsim: NB, Gopf: IB, gopf: PB, grave: OB, GreaterEqual: RB, GreaterEqualLess: zB, GreaterFullEqual: DB, GreaterGreater: FB, GreaterLess: HB, GreaterSlantEqual: BB, GreaterTilde: WB, Gscr: jB, gscr: qB, gsim: UB, gsime: VB, gsiml: GB, gtcc: XB, gtcir: KB, gt: JB, GT: YB, Gt: ZB, gtdot: QB, gtlPar: e5, gtquest: t5, gtrapprox: n5, gtrarr: r5, gtrdot: i5, gtreqless: o5, gtreqqless: s5, gtrless: l5, gtrsim: a5, gvertneqq: c5, gvnE: u5, Hacek: f5, hairsp: d5, half: h5, hamilt: p5, HARDcy: g5, hardcy: m5, harrcir: v5, harr: y5, hArr: b5, harrw: w5, Hat: x5, hbar: S5, Hcirc: _5, hcirc: k5, hearts: T5, heartsuit: C5, hellip: E5, hercon: A5, hfr: L5, Hfr: $5, HilbertSpace: M5, hksearow: N5, hkswarow: I5, hoarr: P5, homtht: O5, hookleftarrow: R5, hookrightarrow: z5, hopf: D5, Hopf: F5, horbar: H5, HorizontalLine: B5, hscr: W5, Hscr: j5, hslash: q5, Hstrok: U5, hstrok: V5, HumpDownHump: G5, HumpEqual: X5, hybull: K5, hyphen: J5, Iacute: Y5, iacute: Z5, ic: Q5, Icirc: e4, icirc: t4, Icy: n4, icy: r4, Idot: i4, IEcy: o4, iecy: s4, iexcl: l4, iff: a4, ifr: c4, Ifr: u4, Igrave: f4, igrave: d4, ii: h4, iiiint: p4, iiint: g4, iinfin: m4, iiota: v4, IJlig: y4, ijlig: b4, Imacr: w4, imacr: x4, image: S4, ImaginaryI: _4, imagline: k4, imagpart: T4, imath: C4, Im: E4, imof: A4, imped: L4, Implies: $4, incare: M4, in: '∈', infin: N4, infintie: I4, inodot: P4, intcal: O4, int: R4, Int: z4, integers: D4, Integral: F4, intercal: H4, Intersection: B4, intlarhk: W4, intprod: j4, InvisibleComma: q4, InvisibleTimes: U4, IOcy: V4, iocy: G4, Iogon: X4, iogon: K4, Iopf: J4, iopf: Y4, Iota: Z4, iota: Q4, iprod: e8, iquest: t8, iscr: n8, Iscr: r8, isin: i8, isindot: o8, isinE: s8, isins: l8, isinsv: a8, isinv: c8, it: u8, Itilde: f8, itilde: d8, Iukcy: h8, iukcy: p8, Iuml: g8, iuml: m8, Jcirc: v8, jcirc: y8, Jcy: b8, jcy: w8, Jfr: x8, jfr: S8, jmath: _8, Jopf: k8, jopf: T8, Jscr: C8, jscr: E8, Jsercy: A8, jsercy: L8, Jukcy: $8, jukcy: M8, Kappa: N8, kappa: I8, kappav: P8, Kcedil: O8, kcedil: R8, Kcy: z8, kcy: D8, Kfr: F8, kfr: H8, kgreen: B8, KHcy: W8, khcy: j8, KJcy: q8, kjcy: U8, Kopf: V8, kopf: G8, Kscr: X8, kscr: K8, lAarr: J8, Lacute: Y8, lacute: Z8, laemptyv: Q8, lagran: eW, Lambda: tW, lambda: nW, lang: rW, Lang: iW, langd: oW, langle: sW, lap: lW, Laplacetrf: aW, laquo: cW, larrb: uW, larrbfs: fW, larr: dW, Larr: hW, lArr: pW, larrfs: gW, larrhk: mW, larrlp: vW, larrpl: yW, larrsim: bW, larrtl: wW, latail: xW, lAtail: SW, lat: _W, late: kW, lates: TW, lbarr: CW, lBarr: EW, lbbrk: AW, lbrace: LW, lbrack: $W, lbrke: MW, lbrksld: NW, lbrkslu: IW, Lcaron: PW, lcaron: OW, Lcedil: RW, lcedil: zW, lceil: DW, lcub: FW, Lcy: HW, lcy: BW, ldca: WW, ldquo: jW, ldquor: qW, ldrdhar: UW, ldrushar: VW, ldsh: GW, le: XW, lE: KW, LeftAngleBracket: JW, LeftArrowBar: YW, leftarrow: ZW, LeftArrow: QW, Leftarrow: ej, LeftArrowRightArrow: tj, leftarrowtail: nj, LeftCeiling: rj, LeftDoubleBracket: ij, LeftDownTeeVector: oj, LeftDownVectorBar: sj, LeftDownVector: lj, LeftFloor: aj, leftharpoondown: cj, leftharpoonup: uj, leftleftarrows: fj, leftrightarrow: dj, LeftRightArrow: hj, Leftrightarrow: pj, leftrightarrows: gj, leftrightharpoons: mj, leftrightsquigarrow: vj, LeftRightVector: yj, LeftTeeArrow: bj, LeftTee: wj, LeftTeeVector: xj, leftthreetimes: Sj, LeftTriangleBar: _j, LeftTriangle: kj, LeftTriangleEqual: Tj, LeftUpDownVector: Cj, LeftUpTeeVector: Ej, LeftUpVectorBar: Aj, LeftUpVector: Lj, LeftVectorBar: $j, LeftVector: Mj, lEg: Nj, leg: Ij, leq: Pj, leqq: Oj, leqslant: Rj, lescc: zj, les: Dj, lesdot: Fj, lesdoto: Hj, lesdotor: Bj, lesg: Wj, lesges: jj, lessapprox: qj, lessdot: Uj, lesseqgtr: Vj, lesseqqgtr: Gj, LessEqualGreater: Xj, LessFullEqual: Kj, LessGreater: Jj, lessgtr: Yj, LessLess: Zj, lesssim: Qj, LessSlantEqual: eq, LessTilde: tq, lfisht: nq, lfloor: rq, Lfr: iq, lfr: oq, lg: sq, lgE: lq, lHar: aq, lhard: cq, lharu: uq, lharul: fq, lhblk: dq, LJcy: hq, ljcy: pq, llarr: gq, ll: mq, Ll: vq, llcorner: yq, Lleftarrow: bq, llhard: wq, lltri: xq, Lmidot: Sq, lmidot: _q, lmoustache: kq, lmoust: Tq, lnap: Cq, lnapprox: Eq, lne: Aq, lnE: Lq, lneq: $q, lneqq: Mq, lnsim: Nq, loang: Iq, loarr: Pq, lobrk: Oq, longleftarrow: Rq, LongLeftArrow: zq, Longleftarrow: Dq, longleftrightarrow: Fq, LongLeftRightArrow: Hq, Longleftrightarrow: Bq, longmapsto: Wq, longrightarrow: jq, LongRightArrow: qq, Longrightarrow: Uq, looparrowleft: Vq, looparrowright: Gq, lopar: Xq, Lopf: Kq, lopf: Jq, loplus: Yq, lotimes: Zq, lowast: Qq, lowbar: e6, LowerLeftArrow: t6, LowerRightArrow: n6, loz: r6, lozenge: i6, lozf: o6, lpar: s6, lparlt: l6, lrarr: a6, lrcorner: c6, lrhar: u6, lrhard: f6, lrm: d6, lrtri: h6, lsaquo: p6, lscr: g6, Lscr: m6, lsh: v6, Lsh: y6, lsim: b6, lsime: w6, lsimg: x6, lsqb: S6, lsquo: _6, lsquor: k6, Lstrok: T6, lstrok: C6, ltcc: E6, ltcir: A6, lt: L6, LT: $6, Lt: M6, ltdot: N6, lthree: I6, ltimes: P6, ltlarr: O6, ltquest: R6, ltri: z6, ltrie: D6, ltrif: F6, ltrPar: H6, lurdshar: B6, luruhar: W6, lvertneqq: j6, lvnE: q6, macr: U6, male: V6, malt: G6, maltese: X6, Map: '⤅', map: K6, mapsto: J6, mapstodown: Y6, mapstoleft: Z6, mapstoup: Q6, marker: eU, mcomma: tU, Mcy: nU, mcy: rU, mdash: iU, mDDot: oU, measuredangle: sU, MediumSpace: lU, Mellintrf: aU, Mfr: cU, mfr: uU, mho: fU, micro: dU, midast: hU, midcir: pU, mid: gU, middot: mU, minusb: vU, minus: yU, minusd: bU, minusdu: wU, MinusPlus: xU, mlcp: SU, mldr: _U, mnplus: kU, models: TU, Mopf: CU, mopf: EU, mp: AU, mscr: LU, Mscr: $U, mstpos: MU, Mu: NU, mu: IU, multimap: PU, mumap: OU, nabla: RU, Nacute: zU, nacute: DU, nang: FU, nap: HU, napE: BU, napid: WU, napos: jU, napprox: qU, natural: UU, naturals: VU, natur: GU, nbsp: XU, nbump: KU, nbumpe: JU, ncap: YU, Ncaron: ZU, ncaron: QU, Ncedil: e9, ncedil: t9, ncong: n9, ncongdot: r9, ncup: i9, Ncy: o9, ncy: s9, ndash: l9, nearhk: a9, nearr: c9, neArr: u9, nearrow: f9, ne: d9, nedot: h9, NegativeMediumSpace: p9, NegativeThickSpace: g9, NegativeThinSpace: m9, NegativeVeryThinSpace: v9, nequiv: y9, nesear: b9, nesim: w9, NestedGreaterGreater: x9, NestedLessLess: S9, NewLine: _9, nexist: k9, nexists: T9, Nfr: C9, nfr: E9, ngE: A9, nge: L9, ngeq: $9, ngeqq: M9, ngeqslant: N9, nges: I9, nGg: P9, ngsim: O9, nGt: R9, ngt: z9, ngtr: D9, nGtv: F9, nharr: H9, nhArr: B9, nhpar: W9, ni: j9, nis: q9, nisd: U9, niv: V9, NJcy: G9, njcy: X9, nlarr: K9, nlArr: J9, nldr: Y9, nlE: Z9, nle: Q9, nleftarrow: eV, nLeftarrow: tV, nleftrightarrow: nV, nLeftrightarrow: rV, nleq: iV, nleqq: oV, nleqslant: sV, nles: lV, nless: aV, nLl: cV, nlsim: uV, nLt: fV, nlt: dV, nltri: hV, nltrie: pV, nLtv: gV, nmid: mV, NoBreak: vV, NonBreakingSpace: yV, nopf: bV, Nopf: wV, Not: xV, not: SV, NotCongruent: _V, NotCupCap: kV, NotDoubleVerticalBar: TV, NotElement: CV, NotEqual: EV, NotEqualTilde: AV, NotExists: LV, NotGreater: $V, NotGreaterEqual: MV, NotGreaterFullEqual: NV, NotGreaterGreater: IV, NotGreaterLess: PV, NotGreaterSlantEqual: OV, NotGreaterTilde: RV, NotHumpDownHump: zV, NotHumpEqual: DV, notin: FV, notindot: HV, notinE: BV, notinva: WV, notinvb: jV, notinvc: qV, NotLeftTriangleBar: UV, NotLeftTriangle: VV, NotLeftTriangleEqual: GV, NotLess: XV, NotLessEqual: KV, NotLessGreater: JV, NotLessLess: YV, NotLessSlantEqual: ZV, NotLessTilde: QV, NotNestedGreaterGreater: eG, NotNestedLessLess: tG, notni: nG, notniva: rG, notnivb: iG, notnivc: oG, NotPrecedes: sG, NotPrecedesEqual: lG, NotPrecedesSlantEqual: aG, NotReverseElement: cG, NotRightTriangleBar: uG, NotRightTriangle: fG, NotRightTriangleEqual: dG, NotSquareSubset: hG, NotSquareSubsetEqual: pG, NotSquareSuperset: gG, NotSquareSupersetEqual: mG, NotSubset: vG, NotSubsetEqual: yG, NotSucceeds: bG, NotSucceedsEqual: wG, NotSucceedsSlantEqual: xG, NotSucceedsTilde: SG, NotSuperset: _G, NotSupersetEqual: kG, NotTilde: TG, NotTildeEqual: CG, NotTildeFullEqual: EG, NotTildeTilde: AG, NotVerticalBar: LG, nparallel: $G, npar: MG, nparsl: NG, npart: IG, npolint: PG, npr: OG, nprcue: RG, nprec: zG, npreceq: DG, npre: FG, nrarrc: HG, nrarr: BG, nrArr: WG, nrarrw: jG, nrightarrow: qG, nRightarrow: UG, nrtri: VG, nrtrie: GG, nsc: XG, nsccue: KG, nsce: JG, Nscr: YG, nscr: ZG, nshortmid: QG, nshortparallel: e7, nsim: t7, nsime: n7, nsimeq: r7, nsmid: i7, nspar: o7, nsqsube: s7, nsqsupe: l7, nsub: a7, nsubE: c7, nsube: u7, nsubset: f7, nsubseteq: d7, nsubseteqq: h7, nsucc: p7, nsucceq: g7, nsup: m7, nsupE: v7, nsupe: y7, nsupset: b7, nsupseteq: w7, nsupseteqq: x7, ntgl: S7, Ntilde: _7, ntilde: k7, ntlg: T7, ntriangleleft: C7, ntrianglelefteq: E7, ntriangleright: A7, ntrianglerighteq: L7, Nu: $7, nu: M7, num: N7, numero: I7, numsp: P7, nvap: O7, nvdash: R7, nvDash: z7, nVdash: D7, nVDash: F7, nvge: H7, nvgt: B7, nvHarr: W7, nvinfin: j7, nvlArr: q7, nvle: U7, nvlt: V7, nvltrie: G7, nvrArr: X7, nvrtrie: K7, nvsim: J7, nwarhk: Y7, nwarr: Z7, nwArr: Q7, nwarrow: eX, nwnear: tX, Oacute: nX, oacute: rX, oast: iX, Ocirc: oX, ocirc: sX, ocir: lX, Ocy: aX, ocy: cX, odash: uX, Odblac: fX, odblac: dX, odiv: hX, odot: pX, odsold: gX, OElig: mX, oelig: vX, ofcir: yX, Ofr: bX, ofr: wX, ogon: xX, Ograve: SX, ograve: _X, ogt: kX, ohbar: TX, ohm: CX, oint: EX, olarr: AX, olcir: LX, olcross: $X, oline: MX, olt: NX, Omacr: IX, omacr: PX, Omega: OX, omega: RX, Omicron: zX, omicron: DX, omid: FX, ominus: HX, Oopf: BX, oopf: WX, opar: jX, OpenCurlyDoubleQuote: qX, OpenCurlyQuote: UX, operp: VX, oplus: GX, orarr: XX, Or: KX, or: JX, ord: YX, order: ZX, orderof: QX, ordf: eK, ordm: tK, origof: nK, oror: rK, orslope: iK, orv: oK, oS: sK, Oscr: lK, oscr: aK, Oslash: cK, oslash: uK, osol: fK, Otilde: dK, otilde: hK, otimesas: pK, Otimes: gK, otimes: mK, Ouml: vK, ouml: yK, ovbar: bK, OverBar: wK, OverBrace: xK, OverBracket: SK, OverParenthesis: _K, para: kK, parallel: TK, par: CK, parsim: EK, parsl: AK, part: LK, PartialD: $K, Pcy: MK, pcy: NK, percnt: IK, period: PK, permil: OK, perp: RK, pertenk: zK, Pfr: DK, pfr: FK, Phi: HK, phi: BK, phiv: WK, phmmat: jK, phone: qK, Pi: UK, pi: VK, pitchfork: GK, piv: XK, planck: KK, planckh: JK, plankv: YK, plusacir: ZK, plusb: QK, pluscir: eJ, plus: tJ, plusdo: nJ, plusdu: rJ, pluse: iJ, PlusMinus: oJ, plusmn: sJ, plussim: lJ, plustwo: aJ, pm: cJ, Poincareplane: uJ, pointint: fJ, popf: dJ, Popf: hJ, pound: pJ, prap: gJ, Pr: mJ, pr: vJ, prcue: yJ, precapprox: bJ, prec: wJ, preccurlyeq: xJ, Precedes: SJ, PrecedesEqual: _J, PrecedesSlantEqual: kJ, PrecedesTilde: TJ, preceq: CJ, precnapprox: EJ, precneqq: AJ, precnsim: LJ, pre: $J, prE: MJ, precsim: NJ, prime: IJ, Prime: PJ, primes: OJ, prnap: RJ, prnE: zJ, prnsim: DJ, prod: FJ, Product: HJ, profalar: BJ, profline: WJ, profsurf: jJ, prop: qJ, Proportional: UJ, Proportion: VJ, propto: GJ, prsim: XJ, prurel: KJ, Pscr: JJ, pscr: YJ, Psi: ZJ, psi: QJ, puncsp: eY, Qfr: tY, qfr: nY, qint: rY, qopf: iY, Qopf: oY, qprime: sY, Qscr: lY, qscr: aY, quaternions: cY, quatint: uY, quest: fY, questeq: dY, quot: hY, QUOT: pY, rAarr: gY, race: mY, Racute: vY, racute: yY, radic: bY, raemptyv: wY, rang: xY, Rang: SY, rangd: _Y, range: kY, rangle: TY, raquo: CY, rarrap: EY, rarrb: AY, rarrbfs: LY, rarrc: $Y, rarr: MY, Rarr: NY, rArr: IY, rarrfs: PY, rarrhk: OY, rarrlp: RY, rarrpl: zY, rarrsim: DY, Rarrtl: FY, rarrtl: HY, rarrw: BY, ratail: WY, rAtail: jY, ratio: qY, rationals: UY, rbarr: VY, rBarr: GY, RBarr: XY, rbbrk: KY, rbrace: JY, rbrack: YY, rbrke: ZY, rbrksld: QY, rbrkslu: eZ, Rcaron: tZ, rcaron: nZ, Rcedil: rZ, rcedil: iZ, rceil: oZ, rcub: sZ, Rcy: lZ, rcy: aZ, rdca: cZ, rdldhar: uZ, rdquo: fZ, rdquor: dZ, rdsh: hZ, real: pZ, realine: gZ, realpart: mZ, reals: vZ, Re: yZ, rect: bZ, reg: wZ, REG: xZ, ReverseElement: SZ, ReverseEquilibrium: _Z, ReverseUpEquilibrium: kZ, rfisht: TZ, rfloor: CZ, rfr: EZ, Rfr: AZ, rHar: LZ, rhard: $Z, rharu: MZ, rharul: NZ, Rho: IZ, rho: PZ, rhov: OZ, RightAngleBracket: RZ, RightArrowBar: zZ, rightarrow: DZ, RightArrow: FZ, Rightarrow: HZ, RightArrowLeftArrow: BZ, rightarrowtail: WZ, RightCeiling: jZ, RightDoubleBracket: qZ, RightDownTeeVector: UZ, RightDownVectorBar: VZ, RightDownVector: GZ, RightFloor: XZ, rightharpoondown: KZ, rightharpoonup: JZ, rightleftarrows: YZ, rightleftharpoons: ZZ, rightrightarrows: QZ, rightsquigarrow: eQ, RightTeeArrow: tQ, RightTee: nQ, RightTeeVector: rQ, rightthreetimes: iQ, RightTriangleBar: oQ, RightTriangle: sQ, RightTriangleEqual: lQ, RightUpDownVector: aQ, RightUpTeeVector: cQ, RightUpVectorBar: uQ, RightUpVector: fQ, RightVectorBar: dQ, RightVector: hQ, ring: pQ, risingdotseq: gQ, rlarr: mQ, rlhar: vQ, rlm: yQ, rmoustache: bQ, rmoust: wQ, rnmid: xQ, roang: SQ, roarr: _Q, robrk: kQ, ropar: TQ, ropf: CQ, Ropf: EQ, roplus: AQ, rotimes: LQ, RoundImplies: $Q, rpar: MQ, rpargt: NQ, rppolint: IQ, rrarr: PQ, Rrightarrow: OQ, rsaquo: RQ, rscr: zQ, Rscr: DQ, rsh: FQ, Rsh: HQ, rsqb: BQ, rsquo: WQ, rsquor: jQ, rthree: qQ, rtimes: UQ, rtri: VQ, rtrie: GQ, rtrif: XQ, rtriltri: KQ, RuleDelayed: JQ, ruluhar: YQ, rx: ZQ, Sacute: QQ, sacute: eee, sbquo: tee, scap: nee, Scaron: ree, scaron: iee, Sc: oee, sc: see, sccue: lee, sce: aee, scE: cee, Scedil: uee, scedil: fee, Scirc: dee, scirc: hee, scnap: pee, scnE: gee, scnsim: mee, scpolint: vee, scsim: yee, Scy: bee, scy: wee, sdotb: xee, sdot: See, sdote: _ee, searhk: kee, searr: Tee, seArr: Cee, searrow: Eee, sect: Aee, semi: Lee, seswar: $ee, setminus: Mee, setmn: Nee, sext: Iee, Sfr: Pee, sfr: Oee, sfrown: Ree, sharp: zee, SHCHcy: Dee, shchcy: Fee, SHcy: Hee, shcy: Bee, ShortDownArrow: Wee, ShortLeftArrow: jee, shortmid: qee, shortparallel: Uee, ShortRightArrow: Vee, ShortUpArrow: Gee, shy: Xee, Sigma: Kee, sigma: Jee, sigmaf: Yee, sigmav: Zee, sim: Qee, simdot: ete, sime: tte, simeq: nte, simg: rte, simgE: ite, siml: ote, simlE: ste, simne: lte, simplus: ate, simrarr: cte, slarr: ute, SmallCircle: fte, smallsetminus: dte, smashp: hte, smeparsl: pte, smid: gte, smile: mte, smt: vte, smte: yte, smtes: bte, SOFTcy: wte, softcy: xte, solbar: Ste, solb: _te, sol: kte, Sopf: Tte, sopf: Cte, spades: Ete, spadesuit: Ate, spar: Lte, sqcap: $te, sqcaps: Mte, sqcup: Nte, sqcups: Ite, Sqrt: Pte, sqsub: Ote, sqsube: Rte, sqsubset: zte, sqsubseteq: Dte, sqsup: Fte, sqsupe: Hte, sqsupset: Bte, sqsupseteq: Wte, square: jte, Square: qte, SquareIntersection: Ute, SquareSubset: Vte, SquareSubsetEqual: Gte, SquareSuperset: Xte, SquareSupersetEqual: Kte, SquareUnion: Jte, squarf: Yte, squ: Zte, squf: Qte, srarr: ene, Sscr: tne, sscr: nne, ssetmn: rne, ssmile: ine, sstarf: one, Star: sne, star: lne, starf: ane, straightepsilon: cne, straightphi: une, strns: fne, sub: dne, Sub: hne, subdot: pne, subE: gne, sube: mne, subedot: vne, submult: yne, subnE: bne, subne: wne, subplus: xne, subrarr: Sne, subset: _ne, Subset: kne, subseteq: Tne, subseteqq: Cne, SubsetEqual: Ene, subsetneq: Ane, subsetneqq: Lne, subsim: $ne, subsub: Mne, subsup: Nne, succapprox: Ine, succ: Pne, succcurlyeq: One, Succeeds: Rne, SucceedsEqual: zne, SucceedsSlantEqual: Dne, SucceedsTilde: Fne, succeq: Hne, succnapprox: Bne, succneqq: Wne, succnsim: jne, succsim: qne, SuchThat: Une, sum: Vne, Sum: Gne, sung: Xne, sup1: Kne, sup2: Jne, sup3: Yne, sup: Zne, Sup: Qne, supdot: ere, supdsub: tre, supE: nre, supe: rre, supedot: ire, Superset: ore, SupersetEqual: sre, suphsol: lre, suphsub: are, suplarr: cre, supmult: ure, supnE: fre, supne: dre, supplus: hre, supset: pre, Supset: gre, supseteq: mre, supseteqq: vre, supsetneq: yre, supsetneqq: bre, supsim: wre, supsub: xre, supsup: Sre, swarhk: _re, swarr: kre, swArr: Tre, swarrow: Cre, swnwar: Ere, szlig: Are, Tab: Lre, target: $re, Tau: Mre, tau: Nre, tbrk: Ire, Tcaron: Pre, tcaron: Ore, Tcedil: Rre, tcedil: zre, Tcy: Dre, tcy: Fre, tdot: Hre, telrec: Bre, Tfr: Wre, tfr: jre, there4: qre, therefore: Ure, Therefore: Vre, Theta: Gre, theta: Xre, thetasym: Kre, thetav: Jre, thickapprox: Yre, thicksim: Zre, ThickSpace: Qre, ThinSpace: eie, thinsp: tie, thkap: nie, thksim: rie, THORN: iie, thorn: oie, tilde: sie, Tilde: lie, TildeEqual: aie, TildeFullEqual: cie, TildeTilde: uie, timesbar: fie, timesb: die, times: hie, timesd: pie, tint: gie, toea: mie, topbot: vie, topcir: yie, top: bie, Topf: wie, topf: xie, topfork: Sie, tosa: _ie, tprime: kie, trade: Tie, TRADE: Cie, triangle: Eie, triangledown: Aie, triangleleft: Lie, trianglelefteq: $ie, triangleq: Mie, triangleright: Nie, trianglerighteq: Iie, tridot: Pie, trie: Oie, triminus: Rie, TripleDot: zie, triplus: Die, trisb: Fie, tritime: Hie, trpezium: Bie, Tscr: Wie, tscr: jie, TScy: qie, tscy: Uie, TSHcy: Vie, tshcy: Gie, Tstrok: Xie, tstrok: Kie, twixt: Jie, twoheadleftarrow: Yie, twoheadrightarrow: Zie, Uacute: Qie, uacute: eoe, uarr: toe, Uarr: noe, uArr: roe, Uarrocir: ioe, Ubrcy: ooe, ubrcy: soe, Ubreve: loe, ubreve: aoe, Ucirc: coe, ucirc: uoe, Ucy: foe, ucy: doe, udarr: hoe, Udblac: poe, udblac: goe, udhar: moe, ufisht: voe, Ufr: yoe, ufr: boe, Ugrave: woe, ugrave: xoe, uHar: Soe, uharl: _oe, uharr: koe, uhblk: Toe, ulcorn: Coe, ulcorner: Eoe, ulcrop: Aoe, ultri: Loe, Umacr: $oe, umacr: Moe, uml: Noe, UnderBar: Ioe, UnderBrace: Poe, UnderBracket: Ooe, UnderParenthesis: Roe, Union: zoe, UnionPlus: Doe, Uogon: Foe, uogon: Hoe, Uopf: Boe, uopf: Woe, UpArrowBar: joe, uparrow: qoe, UpArrow: Uoe, Uparrow: Voe, UpArrowDownArrow: Goe, updownarrow: Xoe, UpDownArrow: Koe, Updownarrow: Joe, UpEquilibrium: Yoe, upharpoonleft: Zoe, upharpoonright: Qoe, uplus: ese, UpperLeftArrow: tse, UpperRightArrow: nse, upsi: rse, Upsi: ise, upsih: ose, Upsilon: sse, upsilon: lse, UpTeeArrow: ase, UpTee: cse, upuparrows: use, urcorn: fse, urcorner: dse, urcrop: hse, Uring: pse, uring: gse, urtri: mse, Uscr: vse, uscr: yse, utdot: bse, Utilde: wse, utilde: xse, utri: Sse, utrif: _se, uuarr: kse, Uuml: Tse, uuml: Cse, uwangle: Ese, vangrt: Ase, varepsilon: Lse, varkappa: $se, varnothing: Mse, varphi: Nse, varpi: Ise, varpropto: Pse, varr: Ose, vArr: Rse, varrho: zse, varsigma: Dse, varsubsetneq: Fse, varsubsetneqq: Hse, varsupsetneq: Bse, varsupsetneqq: Wse, vartheta: jse, vartriangleleft: qse, vartriangleright: Use, vBar: Vse, Vbar: Gse, vBarv: Xse, Vcy: Kse, vcy: Jse, vdash: Yse, vDash: Zse, Vdash: Qse, VDash: ele, Vdashl: tle, veebar: nle, vee: rle, Vee: ile, veeeq: ole, vellip: sle, verbar: lle, Verbar: ale, vert: cle, Vert: ule, VerticalBar: fle, VerticalLine: dle, VerticalSeparator: hle, VerticalTilde: ple, VeryThinSpace: gle, Vfr: mle, vfr: vle, vltri: yle, vnsub: ble, vnsup: wle, Vopf: xle, vopf: Sle, vprop: _le, vrtri: kle, Vscr: Tle, vscr: Cle, vsubnE: Ele, vsubne: Ale, vsupnE: Lle, vsupne: $le, Vvdash: Mle, vzigzag: Nle, Wcirc: Ile, wcirc: Ple, wedbar: Ole, wedge: Rle, Wedge: zle, wedgeq: Dle, weierp: Fle, Wfr: Hle, wfr: Ble, Wopf: Wle, wopf: jle, wp: qle, wr: Ule, wreath: Vle, Wscr: Gle, wscr: Xle, xcap: Kle, xcirc: Jle, xcup: Yle, xdtri: Zle, Xfr: Qle, xfr: eae, xharr: tae, xhArr: nae, Xi: rae, xi: iae, xlarr: oae, xlArr: sae, xmap: lae, xnis: aae, xodot: cae, Xopf: uae, xopf: fae, xoplus: dae, xotime: hae, xrarr: pae, xrArr: gae, Xscr: mae, xscr: vae, xsqcup: yae, xuplus: bae, xutri: wae, xvee: xae, xwedge: Sae, Yacute: _ae, yacute: kae, YAcy: Tae, yacy: Cae, Ycirc: Eae, ycirc: Aae, Ycy: Lae, ycy: $ae, yen: Mae, Yfr: Nae, yfr: Iae, YIcy: Pae, yicy: Oae, Yopf: Rae, yopf: zae, Yscr: Dae, yscr: Fae, YUcy: Hae, yucy: Bae, yuml: Wae, Yuml: jae, Zacute: qae, zacute: Uae, Zcaron: Vae, zcaron: Gae, Zcy: Xae, zcy: Kae, Zdot: Jae, zdot: Yae, zeetrf: Zae, ZeroWidthSpace: Qae, Zeta: ece, zeta: tce, zfr: nce, Zfr: rce, ZHcy: ice, zhcy: oce, zigrarr: sce, zopf: lce, Zopf: ace, Zscr: cce, zscr: uce, zwj: fce, zwnj: dce }; const hce = 'Á'; const pce = 'á'; const gce = 'Â'; const mce = 'â'; const vce = '´'; const yce = 'Æ'; const bce = 'æ'; const wce = 'À'; const xce = 'à'; const Sce = '&'; const _ce = '&'; const kce = 'Å'; const Tce = 'å'; const Cce = 'Ã'; const Ece = 'ã'; const Ace = 'Ä'; const Lce = 'ä'; const $ce = '¦'; const Mce = 'Ç'; const Nce = 'ç'; const Ice = '¸'; const Pce = '¢'; const Oce = '©'; const Rce = '©'; const zce = '¤'; const Dce = '°'; const Fce = '÷'; const Hce = 'É'; const Bce = 'é'; const Wce = 'Ê'; const jce = 'ê'; const qce = 'È'; const Uce = 'è'; const Vce = 'Ð'; const Gce = 'ð'; const Xce = 'Ë'; const Kce = 'ë'; const Jce = '½'; const Yce = '¼'; const Zce = '¾'; const Qce = '>'; const eue = '>'; const tue = 'Í'; const nue = 'í'; const rue = 'Î'; const iue = 'î'; const oue = '¡'; const sue = 'Ì'; const lue = 'ì'; const aue = '¿'; const cue = 'Ï'; const uue = 'ï'; const fue = '«'; const due = '<'; const hue = '<'; const pue = '¯'; const gue = 'µ'; const mue = '·'; const vue = ' '; const yue = '¬'; const bue = 'Ñ'; const wue = 'ñ'; const xue = 'Ó'; const Sue = 'ó'; const _ue = 'Ô'; const kue = 'ô'; const Tue = 'Ò'; const Cue = 'ò'; const Eue = 'ª'; const Aue = 'º'; const Lue = 'Ø'; const $ue = 'ø'; const Mue = 'Õ'; const Nue = 'õ'; const Iue = 'Ö'; const Pue = 'ö'; const Oue = '¶'; const Rue = '±'; const zue = '£'; const Due = '"'; const Fue = '"'; const Hue = '»'; const Bue = '®'; const Wue = '®'; const jue = '§'; const que = '­'; const Uue = '¹'; const Vue = '²'; const Gue = '³'; const Xue = 'ß'; const Kue = 'Þ'; const Jue = 'þ'; const Yue = '×'; const Zue = 'Ú'; const Que = 'ú'; const efe = 'Û'; const tfe = 'û'; const nfe = 'Ù'; const rfe = 'ù'; const ife = '¨'; const ofe = 'Ü'; const sfe = 'ü'; const lfe = 'Ý'; const afe = 'ý'; const cfe = '¥'; const ufe = 'ÿ'; const ffe = { Aacute: hce, aacute: pce, Acirc: gce, acirc: mce, acute: vce, AElig: yce, aelig: bce, Agrave: wce, agrave: xce, amp: Sce, AMP: _ce, Aring: kce, aring: Tce, Atilde: Cce, atilde: Ece, Auml: Ace, auml: Lce, brvbar: $ce, Ccedil: Mce, ccedil: Nce, cedil: Ice, cent: Pce, copy: Oce, COPY: Rce, curren: zce, deg: Dce, divide: Fce, Eacute: Hce, eacute: Bce, Ecirc: Wce, ecirc: jce, Egrave: qce, egrave: Uce, ETH: Vce, eth: Gce, Euml: Xce, euml: Kce, frac12: Jce, frac14: Yce, frac34: Zce, gt: Qce, GT: eue, Iacute: tue, iacute: nue, Icirc: rue, icirc: iue, iexcl: oue, Igrave: sue, igrave: lue, iquest: aue, Iuml: cue, iuml: uue, laquo: fue, lt: due, LT: hue, macr: pue, micro: gue, middot: mue, nbsp: vue, not: yue, Ntilde: bue, ntilde: wue, Oacute: xue, oacute: Sue, Ocirc: _ue, ocirc: kue, Ograve: Tue, ograve: Cue, ordf: Eue, ordm: Aue, Oslash: Lue, oslash: $ue, Otilde: Mue, otilde: Nue, Ouml: Iue, ouml: Pue, para: Oue, plusmn: Rue, pound: zue, quot: Due, QUOT: Fue, raquo: Hue, reg: Bue, REG: Wue, sect: jue, shy: que, sup1: Uue, sup2: Vue, sup3: Gue, szlig: Xue, THORN: Kue, thorn: Jue, times: Yue, Uacute: Zue, uacute: Que, Ucirc: efe, ucirc: tfe, Ugrave: nfe, ugrave: rfe, uml: ife, Uuml: ofe, uuml: sfe, Yacute: lfe, yacute: afe, yen: cfe, yuml: ufe }; const dfe = '&'; const hfe = '\''; const pfe = '>'; const gfe = '<'; const mfe = '"'; const t1 = { amp: dfe, apos: hfe, gt: pfe, lt: gfe, quot: mfe }; const Ts = {}; const vfe = { 0: 65533, 128: 8364, 130: 8218, 131: 402, 132: 8222, 133: 8230, 134: 8224, 135: 8225, 136: 710, 137: 8240, 138: 352, 139: 8249, 140: 338, 142: 381, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 149: 8226, 150: 8211, 151: 8212, 152: 732, 153: 8482, 154: 353, 155: 8250, 156: 339, 158: 382, 159: 376 }; let j0; function yfe() {
  if (j0)
    return Ts; j0 = 1; const e = Ts && Ts.__importDefault || function (s) { return s && s.__esModule ? s : { default: s } }; Object.defineProperty(Ts, '__esModule', { value: !0 }); const t = e(vfe); const n = String.fromCodePoint || function (s) { let l = ''; return s > 65535 && (s -= 65536, l += String.fromCharCode(s >>> 10 & 1023 | 55296), s = 56320 | s & 1023), l += String.fromCharCode(s), l }; function i(s) { return s >= 55296 && s <= 57343 || s > 1114111 ? '�' : (s in t.default && (s = t.default[s]), n(s)) } return Ts.default = i, Ts
} let q0; function U0() {
  if (q0)
    return Tr; q0 = 1; const e = Tr && Tr.__importDefault || function (p) { return p && p.__esModule ? p : { default: p } }; Object.defineProperty(Tr, '__esModule', { value: !0 }), Tr.decodeHTML = Tr.decodeHTMLStrict = Tr.decodeXML = void 0; const t = e(e1); const n = e(ffe); const i = e(t1); const s = e(yfe()); const l = /&(?:[a-z0-9]+|#x[\da-f]+|#\d+);/gi; Tr.decodeXML = u(i.default), Tr.decodeHTMLStrict = u(t.default); function u(p) { const g = h(p); return function (v) { return String(v).replace(l, g) } } const f = function (p, g) { return p < g ? 1 : -1 }; Tr.decodeHTML = (function () { for (var p = Object.keys(n.default).sort(f), g = Object.keys(t.default).sort(f), v = 0, y = 0; v < g.length; v++)p[y] === g[v] ? (g[v] += ';?', y++) : g[v] += ';'; const w = new RegExp(`&(?:${g.join('|')}|#[xX][\\da-fA-F]+;?|#\\d+;?)`, 'g'); const L = h(t.default); function $(A) { return A.substr(-1) !== ';' && (A += ';'), L(A) } return function (A) { return String(A).replace(w, $) } }()); function h(p) { return function (v) { if (v.charAt(1) === '#') { const y = v.charAt(2); return y === 'X' || y === 'x' ? s.default(Number.parseInt(v.substr(3), 16)) : s.default(Number.parseInt(v.substr(2), 10)) } return p[v.slice(1, -1)] || v } } return Tr
} const Ln = {}; let V0; function G0() {
  if (V0)
    return Ln; V0 = 1; const e = Ln && Ln.__importDefault || function (E) { return E && E.__esModule ? E : { default: E } }; Object.defineProperty(Ln, '__esModule', { value: !0 }), Ln.escapeUTF8 = Ln.escape = Ln.encodeNonAsciiHTML = Ln.encodeHTML = Ln.encodeXML = void 0; const t = e(t1); const n = f(t.default); const i = h(n); Ln.encodeXML = A(n); const s = e(e1); const l = f(s.default); const u = h(l); Ln.encodeHTML = y(l, u), Ln.encodeNonAsciiHTML = A(l); function f(E) { return Object.keys(E).sort().reduce((M, O) => { return M[E[O]] = `&${O};`, M }, {}) } function h(E) { for (var M = [], O = [], k = 0, z = Object.keys(E); k < z.length; k++) { const D = z[k]; D.length === 1 ? M.push(`\\${D}`) : O.push(D) }M.sort(); for (let te = 0; te < M.length - 1; te++) { for (var ee = te; ee < M.length - 1 && M[ee].charCodeAt(1) + 1 === M[ee + 1].charCodeAt(1);)ee += 1; const W = 1 + ee - te; W < 3 || M.splice(te, W, `${M[te]}-${M[ee]}`) } return O.unshift(`[${M.join('')}]`), new RegExp(O.join('|'), 'g') } const p = /(?:[\x80-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/g; const g = String.prototype.codePointAt != null ? function (E) { return E.codePointAt(0) } : function (E) { return (E.charCodeAt(0) - 55296) * 1024 + E.charCodeAt(1) - 56320 + 65536 }; function v(E) { return `&#x${(E.length > 1 ? g(E) : E.charCodeAt(0)).toString(16).toUpperCase()};` } function y(E, M) { return function (O) { return O.replace(M, (k) => { return E[k] }).replace(p, v) } } const w = new RegExp(`${i.source}|${p.source}`, 'g'); function L(E) { return E.replace(w, v) }Ln.escape = L; function $(E) { return E.replace(i, v) }Ln.escapeUTF8 = $; function A(E) { return function (M) { return M.replace(w, (O) => { return E[O] || v(O) }) } } return Ln
} let X0; function bfe() { return X0 || (X0 = 1, (function (e) { Object.defineProperty(e, '__esModule', { value: !0 }), e.decodeXMLStrict = e.decodeHTML5Strict = e.decodeHTML4Strict = e.decodeHTML5 = e.decodeHTML4 = e.decodeHTMLStrict = e.decodeHTML = e.decodeXML = e.encodeHTML5 = e.encodeHTML4 = e.escapeUTF8 = e.escape = e.encodeNonAsciiHTML = e.encodeHTML = e.encodeXML = e.encode = e.decodeStrict = e.decode = void 0; const t = U0(); const n = G0(); function i(h, p) { return (!p || p <= 0 ? t.decodeXML : t.decodeHTML)(h) }e.decode = i; function s(h, p) { return (!p || p <= 0 ? t.decodeXML : t.decodeHTMLStrict)(h) }e.decodeStrict = s; function l(h, p) { return (!p || p <= 0 ? n.encodeXML : n.encodeHTML)(h) }e.encode = l; const u = G0(); Object.defineProperty(e, 'encodeXML', { enumerable: !0, get() { return u.encodeXML } }), Object.defineProperty(e, 'encodeHTML', { enumerable: !0, get() { return u.encodeHTML } }), Object.defineProperty(e, 'encodeNonAsciiHTML', { enumerable: !0, get() { return u.encodeNonAsciiHTML } }), Object.defineProperty(e, 'escape', { enumerable: !0, get() { return u.escape } }), Object.defineProperty(e, 'escapeUTF8', { enumerable: !0, get() { return u.escapeUTF8 } }), Object.defineProperty(e, 'encodeHTML4', { enumerable: !0, get() { return u.encodeHTML } }), Object.defineProperty(e, 'encodeHTML5', { enumerable: !0, get() { return u.encodeHTML } }); const f = U0(); Object.defineProperty(e, 'decodeXML', { enumerable: !0, get() { return f.decodeXML } }), Object.defineProperty(e, 'decodeHTML', { enumerable: !0, get() { return f.decodeHTML } }), Object.defineProperty(e, 'decodeHTMLStrict', { enumerable: !0, get() { return f.decodeHTMLStrict } }), Object.defineProperty(e, 'decodeHTML4', { enumerable: !0, get() { return f.decodeHTML } }), Object.defineProperty(e, 'decodeHTML5', { enumerable: !0, get() { return f.decodeHTML } }), Object.defineProperty(e, 'decodeHTML4Strict', { enumerable: !0, get() { return f.decodeHTMLStrict } }), Object.defineProperty(e, 'decodeHTML5Strict', { enumerable: !0, get() { return f.decodeHTMLStrict } }), Object.defineProperty(e, 'decodeXMLStrict', { enumerable: !0, get() { return f.decodeXML } }) }(zd))), zd } let Dd, K0; function wfe() {
  if (K0)
    return Dd; K0 = 1; function e(C, P) {
    if (!(C instanceof P))
      throw new TypeError('Cannot call a class as a function')
  } function t(C, P) { for (let I = 0; I < P.length; I++) { const S = P[I]; S.enumerable = S.enumerable || !1, S.configurable = !0, 'value' in S && (S.writable = !0), Object.defineProperty(C, S.key, S) } } function n(C, P, I) { return P && t(C.prototype, P), C } function i(C, P) {
    let I = typeof Symbol < 'u' && C[Symbol.iterator] || C['@@iterator']; if (!I) {
      if (Array.isArray(C) || (I = s(C)) || P) { I && (C = I); let S = 0; const R = function () {}; return { s: R, n() { return S >= C.length ? { done: !0 } : { done: !1, value: C[S++] } }, e(Pe) { throw Pe }, f: R } } throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
    } let B = !0; let oe = !1; let ue; return { s() { I = I.call(C) }, n() { const Pe = I.next(); return B = Pe.done, Pe }, e(Pe) { oe = !0, ue = Pe }, f() {
      try { !B && I.return != null && I.return() }
      finally {
        if (oe)
          throw ue
      }
    } }
  } function s(C, P) {
    if (C) {
      if (typeof C == 'string')
        return l(C, P); let I = Object.prototype.toString.call(C).slice(8, -1); if (I === 'Object' && C.constructor && (I = C.constructor.name), I === 'Map' || I === 'Set')
        return Array.from(C); if (I === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(I))
        return l(C, P)
    }
  } function l(C, P) { (P == null || P > C.length) && (P = C.length); for (var I = 0, S = new Array(P); I < P; I++)S[I] = C[I]; return S } const u = bfe(); const f = { fg: '#FFF', bg: '#000', newline: !1, escapeXML: !1, stream: !1, colors: h() }; function h() { const C = { 0: '#000', 1: '#A00', 2: '#0A0', 3: '#A50', 4: '#00A', 5: '#A0A', 6: '#0AA', 7: '#AAA', 8: '#555', 9: '#F55', 10: '#5F5', 11: '#FF5', 12: '#55F', 13: '#F5F', 14: '#5FF', 15: '#FFF' }; return A(0, 5).forEach((P) => { A(0, 5).forEach((I) => { A(0, 5).forEach((S) => { return p(P, I, S, C) }) }) }), A(0, 23).forEach((P) => { const I = P + 232; const S = g(P * 10 + 8); C[I] = `#${S}${S}${S}` }), C } function p(C, P, I, S) { const R = 16 + C * 36 + P * 6 + I; const B = C > 0 ? C * 40 + 55 : 0; const oe = P > 0 ? P * 40 + 55 : 0; const ue = I > 0 ? I * 40 + 55 : 0; S[R] = v([B, oe, ue]) } function g(C) { for (var P = C.toString(16); P.length < 2;)P = `0${P}`; return P } function v(C) {
    const P = []; const I = i(C); let S; try { for (I.s(); !(S = I.n()).done;) { const R = S.value; P.push(g(R)) } }
    catch (B) { I.e(B) }
    finally { I.f() } return `#${P.join('')}`
  } function y(C, P, I, S) { let R; return P === 'text' ? R = O(I, S) : P === 'display' ? R = L(C, I, S) : P === 'xterm256Foreground' ? R = D(C, S.colors[I]) : P === 'xterm256Background' ? R = te(C, S.colors[I]) : P === 'rgb' && (R = w(C, I)), R } function w(C, P) { P = P.substring(2).slice(0, -1); const I = +P.substr(0, 2); const S = P.substring(5).split(';'); const R = S.map((B) => { return (`0${Number(B).toString(16)}`).substr(-2) }).join(''); return z(C, (I === 38 ? 'color:#' : 'background-color:#') + R) } function L(C, P, I) { P = Number.parseInt(P, 10); const S = { '-1': function () { return '<br/>' }, '0': function () { return C.length && $(C) }, '1': function () { return k(C, 'b') }, '3': function () { return k(C, 'i') }, '4': function () { return k(C, 'u') }, '8': function () { return z(C, 'display:none') }, '9': function () { return k(C, 'strike') }, '22': function () { return z(C, 'font-weight:normal;text-decoration:none;font-style:normal') }, '23': function () { return ee(C, 'i') }, '24': function () { return ee(C, 'u') }, '39': function () { return D(C, I.fg) }, '49': function () { return te(C, I.bg) }, '53': function () { return z(C, 'text-decoration:overline') } }; let R; return S[P] ? R = S[P]() : P > 4 && P < 7 ? R = k(C, 'blink') : P > 29 && P < 38 ? R = D(C, I.colors[P - 30]) : P > 39 && P < 48 ? R = te(C, I.colors[P - 40]) : P > 89 && P < 98 ? R = D(C, I.colors[8 + (P - 90)]) : P > 99 && P < 108 && (R = te(C, I.colors[8 + (P - 100)])), R } function $(C) { const P = C.slice(0); return C.length = 0, P.reverse().map((I) => { return `</${I}>` }).join('') } function A(C, P) { for (var I = [], S = C; S <= P; S++)I.push(S); return I } function E(C) { return function (P) { return (C === null || P.category !== C) && C !== 'all' } } function M(C) { C = Number.parseInt(C, 10); let P = null; return C === 0 ? P = 'all' : C === 1 ? P = 'bold' : C > 2 && C < 5 ? P = 'underline' : C > 4 && C < 7 ? P = 'blink' : C === 8 ? P = 'hide' : C === 9 ? P = 'strike' : C > 29 && C < 38 || C === 39 || C > 89 && C < 98 ? P = 'foreground-color' : (C > 39 && C < 48 || C === 49 || C > 99 && C < 108) && (P = 'background-color'), P } function O(C, P) { return P.escapeXML ? u.encodeXML(C) : C } function k(C, P, I) { return I || (I = ''), C.push(P), '<'.concat(P).concat(I ? ' style="'.concat(I, '"') : '', '>') } function z(C, P) { return k(C, 'span', P) } function D(C, P) { return k(C, 'span', `color:${P}`) } function te(C, P) { return k(C, 'span', `background-color:${P}`) } function ee(C, P) {
    let I; if (C.slice(-1)[0] === P && (I = C.pop()), I)
      return `</${P}>`
  } function W(C, P, I) {
    let S = !1; const R = 3; function B() { return '' } function oe(V, Y) { return I('xterm256Foreground', Y), '' } function ue(V, Y) { return I('xterm256Background', Y), '' } function we(V) { return P.newline ? I('display', -1) : I('text', V), '' } function Pe(V, Y) {
      S = !0, Y.trim().length === 0 && (Y = '0'), Y = Y.trimRight(';').split(';'); const fe = i(Y); let pe; try { for (fe.s(); !(pe = fe.n()).done;) { const he = pe.value; I('display', he) } }
      catch (Ce) { fe.e(Ce) }
      finally { fe.f() } return ''
    } function qe(V) { return I('text', V), '' } function Ze(V) { return I('rgb', V), '' } const Ke = [{ pattern: /^\x08+/, sub: B }, { pattern: /^\x1B\[[012]?K/, sub: B }, { pattern: /^\x1B\[\(B/, sub: B }, { pattern: /^\x1B\[[34]8;2;\d+;\d+;\d+m/, sub: Ze }, { pattern: /^\x1B\[38;5;(\d+)m/, sub: oe }, { pattern: /^\x1B\[48;5;(\d+)m/, sub: ue }, { pattern: /^\n/, sub: we }, { pattern: /^\r+\n/, sub: we }, { pattern: /^\r/, sub: we }, { pattern: /^\x1B\[((?:\d{1,3};?)+|)m/, sub: Pe }, { pattern: /^\x1B\[\d?J/, sub: B }, { pattern: /^\x1B\[\d{0,3};\d{0,3}f/, sub: B }, { pattern: /^\x1B\[?[\d;]{0,3}/, sub: B }, { pattern: /^(([^\x1B\x08\r\n])+)/, sub: qe }]; function Je(V, Y) { Y > R && S || (S = !1, C = C.replace(V.pattern, V.sub)) } const ie = []; const U = C; let Q = U.length; e:for (;Q > 0;) {
      for (let J = 0, ae = 0, ge = Ke.length; ae < ge; J = ++ae) { const F = Ke[J]; if (Je(F, J), C.length !== Q) { Q = C.length; continue e } } if (C.length === Q)
        break; ie.push(0), Q = C.length
    } return ie
  } function q(C, P, I) { return P !== 'text' && (C = C.filter(E(M(I))), C.push({ token: P, data: I, category: M(I) })), C } const K = (function () { function C(P) { e(this, C), P = P || {}, P.colors && (P.colors = Object.assign({}, f.colors, P.colors)), this.options = Object.assign({}, f, P), this.stack = [], this.stickyStack = [] } return n(C, [{ key: 'toHtml', value(I) { const S = this; I = typeof I == 'string' ? [I] : I; const R = this.stack; const B = this.options; const oe = []; return this.stickyStack.forEach((ue) => { const we = y(R, ue.token, ue.data, B); we && oe.push(we) }), W(I.join(''), B, (ue, we) => { const Pe = y(R, ue, we, B); Pe && oe.push(Pe), B.stream && (S.stickyStack = q(S.stickyStack, ue, we)) }), R.length && oe.push($(R)), oe.join('') } }]), C }()); return Dd = K, Dd
} const xfe = wfe(); const Sfe = kp(xfe); function sa(e) { return e.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') } function _fe(e, t) { return t && e.endsWith(t) } async function Ip(e, t, n) { const i = encodeURI(`${e}:${t}:${n}`); await fetch(`/__open-in-editor?file=${i}`) } function Pp(e) { return new Sfe({ fg: e ? '#FFF' : '#000', bg: e ? '#000' : '#FFF' }) } function kfe(e) { return e === null || typeof e != 'function' && typeof e != 'object' } function n1(e) { let t = e; if (kfe(e) && (t = { message: String(t).split(/\n/)[0], stack: String(t), name: '' }), !e) { const n = new Error('unknown error'); t = { message: n.message, stack: n.stack, name: '' } } return t.stacks = NL(t.stack || '', { ignoreStackEntries: [] }), t } function Tfe(e, t) { let s, l; let n = ''; return (s = t.message) != null && s.includes('\x1B') && (n = `<b>${t.name}</b>: ${e.toHtml(sa(t.message))}`), ((l = t.stack) == null ? void 0 : l.includes('\x1B')) && (n.length > 0 ? n += e.toHtml(sa(t.stack)) : n = `<b>${t.name}</b>: ${t.message}${e.toHtml(sa(t.stack))}`), n.length > 0 ? n : null } function r1(e, t) {
  const n = Pp(e); return t.map((i) => {
    let u; const s = i.result; if (!s || s.htmlError)
      return i; const l = (u = s.errors) == null ? void 0 : u.map(f => Tfe(n, f)).filter(f => f != null).join('<br><br>'); return l != null && l.length && (s.htmlError = l), i
  })
} const nr = Uint8Array; const Is = Uint16Array; const Cfe = Int32Array; const i1 = new nr([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0]); const o1 = new nr([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0]); const Efe = new nr([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]); function s1(e, t) {
  for (var n = new Is(31), i = 0; i < 31; ++i)n[i] = t += 1 << e[i - 1]; for (var s = new Cfe(n[30]), i = 1; i < 30; ++i) {
    for (let l = n[i]; l < n[i + 1]; ++l)s[l] = l - n[i] << 5 | i
  } return { b: n, r: s }
} const l1 = s1(i1, 2); const a1 = l1.b; const Afe = l1.r; a1[28] = 258, Afe[258] = 28; const Lfe = s1(o1, 0); const $fe = Lfe.b; const $h = new Is(32768); for (var Lt = 0; Lt < 32768; ++Lt) { let Ui = (Lt & 43690) >> 1 | (Lt & 21845) << 1; Ui = (Ui & 52428) >> 2 | (Ui & 13107) << 2, Ui = (Ui & 61680) >> 4 | (Ui & 3855) << 4, $h[Lt] = ((Ui & 65280) >> 8 | (Ui & 255) << 8) >> 1 } function la(e, t, n) {
  for (var i = e.length, s = 0, l = new Is(t); s < i; ++s)e[s] && ++l[e[s] - 1]; const u = new Is(t); for (s = 1; s < t; ++s)u[s] = u[s - 1] + l[s - 1] << 1; let f; if (n) {
    f = new Is(1 << t); const h = 15 - t; for (s = 0; s < i; ++s) {
      if (e[s]) {
        for (let p = s << 4 | e[s], g = t - e[s], v = u[e[s] - 1]++ << g, y = v | (1 << g) - 1; v <= y; ++v)f[$h[v] >> h] = p
      }
    }
  }
  else {
    for (f = new Is(i), s = 0; s < i; ++s)e[s] && (f[s] = $h[u[e[s] - 1]++] >> 15 - e[s])
  } return f
} const Ga = new nr(288); for (var Lt = 0; Lt < 144; ++Lt)Ga[Lt] = 8; for (var Lt = 144; Lt < 256; ++Lt)Ga[Lt] = 9; for (var Lt = 256; Lt < 280; ++Lt)Ga[Lt] = 7; for (var Lt = 280; Lt < 288; ++Lt)Ga[Lt] = 8; const c1 = new nr(32); for (var Lt = 0; Lt < 32; ++Lt)c1[Lt] = 5; const Mfe = la(Ga, 9, 1); const Nfe = la(c1, 5, 1); function Fd(e) { for (var t = e[0], n = 1; n < e.length; ++n)e[n] > t && (t = e[n]); return t } function Cr(e, t, n) { const i = t / 8 | 0; return (e[i] | e[i + 1] << 8) >> (t & 7) & n } function Hd(e, t) { const n = t / 8 | 0; return (e[n] | e[n + 1] << 8 | e[n + 2] << 16) >> (t & 7) } function Ife(e) { return (e + 7) / 8 | 0 } function u1(e, t, n) { return (t == null || t < 0) && (t = 0), (n == null || n > e.length) && (n = e.length), new nr(e.subarray(t, n)) } const Pfe = ['unexpected EOF', 'invalid block type', 'invalid length/literal', 'invalid distance', 'stream finished', 'no stream handler',,'no callback', 'invalid UTF-8 data', 'extra field too long', 'date not in range 1980-2099', 'filename too long', 'stream finishing', 'invalid zip data']; function qn(e, t, n) {
  const i = new Error(t || Pfe[e]); if (i.code = e, Error.captureStackTrace && Error.captureStackTrace(i, qn), !n)
    throw i; return i
} function Op(e, t, n, i) {
  const s = e.length; const l = 0; if (!s || t.f && !t.l)
    return n || new nr(0); const u = !n; const f = u || t.i != 2; const h = t.i; u && (n = new nr(s * 3)); const p = function (ge) { const F = n.length; if (ge > F) { const V = new nr(Math.max(F * 2, ge)); V.set(n), n = V } }; let g = t.f || 0; let v = t.p || 0; let y = t.b || 0; let w = t.l; let L = t.d; let $ = t.m; let A = t.n; const E = s * 8; do {
    if (!w) {
      g = Cr(e, v, 1); const M = Cr(e, v + 1, 3); if (v += 3, M) {
        if (M == 1) {
          w = Mfe, L = Nfe, $ = 9, A = 5
        }
        else if (M == 2) {
          const D = Cr(e, v, 31) + 257; const te = Cr(e, v + 10, 15) + 4; const ee = D + Cr(e, v + 5, 31) + 1; v += 14; for (var W = new nr(ee), q = new nr(19), K = 0; K < te; ++K)q[Efe[K]] = Cr(e, v + K * 3, 7); v += te * 3; for (var C = Fd(q), P = (1 << C) - 1, I = la(q, C, 1), K = 0; K < ee;) {
            const S = I[Cr(e, v, P)]; v += S & 15; var O = S >> 4; if (O < 16) {
              W[K++] = O
            }
            else { var R = 0; let B = 0; for (O == 16 ? (B = 3 + Cr(e, v, 3), v += 2, R = W[K - 1]) : O == 17 ? (B = 3 + Cr(e, v, 7), v += 3) : O == 18 && (B = 11 + Cr(e, v, 127), v += 7); B--;)W[K++] = R }
          } const oe = W.subarray(0, D); var ue = W.subarray(D); $ = Fd(oe), A = Fd(ue), w = la(oe, $, 1), L = la(ue, A, 1)
        }
        else {
          qn(1)
        }
      }
      else { var O = Ife(v) + 4; const k = e[O - 4] | e[O - 3] << 8; const z = O + k; if (z > s) { h && qn(0); break }f && p(y + k), n.set(e.subarray(O, z), y), t.b = y += k, t.p = v = z * 8, t.f = g; continue } if (v > E) { h && qn(0); break }
    }f && p(y + 131072); for (var we = (1 << $) - 1, Pe = (1 << A) - 1, qe = v; ;qe = v) {
      var R = w[Hd(e, v) & we]; const Ze = R >> 4; if (v += R & 15, v > E) { h && qn(0); break } if (R || qn(2), Ze < 256) {
        n[y++] = Ze
      }
      else if (Ze == 256) { qe = v, w = null; break }
      else { let Ke = Ze - 254; if (Ze > 264) { var K = Ze - 257; var Je = i1[K]; Ke = Cr(e, v, (1 << Je) - 1) + a1[K], v += Je } const ie = L[Hd(e, v) & Pe]; const U = ie >> 4; ie || qn(3), v += ie & 15; var ue = $fe[U]; if (U > 3) { var Je = o1[U]; ue += Hd(e, v) & (1 << Je) - 1, v += Je } if (v > E) { h && qn(0); break }f && p(y + 131072); const Q = y + Ke; if (y < ue) { const J = l - ue; const ae = Math.min(ue, Q); for (J + y < 0 && qn(3); y < ae; ++y)n[y] = i[J + y] } for (;y < Q; ++y)n[y] = n[y - ue] }
    }t.l = w, t.p = qe, t.b = y, t.f = g, w && (g = 1, t.m = $, t.d = L, t.n = A)
  } while (!g); return y != n.length && u ? u1(n, 0, y) : n.subarray(0, y)
} const Ofe = new nr(0); function Rfe(e) { (e[0] != 31 || e[1] != 139 || e[2] != 8) && qn(6, 'invalid gzip data'); const t = e[3]; let n = 10; t & 4 && (n += (e[10] | e[11] << 8) + 2); for (let i = (t >> 3 & 1) + (t >> 4 & 1); i > 0; i -= !e[n++]);return n + (t & 2) } function zfe(e) { const t = e.length; return (e[t - 4] | e[t - 3] << 8 | e[t - 2] << 16 | e[t - 1] << 24) >>> 0 } function Dfe(e, t) { return ((e[0] & 15) != 8 || e[0] >> 4 > 7 || (e[0] << 8 | e[1]) % 31) && qn(6, 'invalid zlib data'), (e[1] >> 5 & 1) == 1 && qn(6, `invalid zlib data: ${e[1] & 32 ? 'need' : 'unexpected'} dictionary`), (e[1] >> 3 & 4) + 2 } function Ffe(e, t) { return Op(e, { i: 2 }, t, t) } function Hfe(e, t) { const n = Rfe(e); return n + 8 > e.length && qn(6, 'invalid gzip data'), Op(e.subarray(n, -8), { i: 2 }, new nr(zfe(e)), t) } function Bfe(e, t) { return Op(e.subarray(Dfe(e), -4), { i: 2 }, t, t) } function Wfe(e, t) { return e[0] == 31 && e[1] == 139 && e[2] == 8 ? Hfe(e, t) : (e[0] & 15) != 8 || e[0] >> 4 > 7 || (e[0] << 8 | e[1]) % 31 ? Ffe(e, t) : Bfe(e, t) } const Mh = typeof TextDecoder < 'u' && new TextDecoder(); let jfe = 0; try { Mh.decode(Ofe, { stream: !0 }), jfe = 1 }
catch {} function qfe(e) {
  for (let t = '', n = 0; ;) {
    let i = e[n++]; const s = (i > 127) + (i > 223) + (i > 239); if (n + s > e.length)
      return { s: t, r: u1(e, n - 1) }; s ? s == 3 ? (i = ((i & 15) << 18 | (e[n++] & 63) << 12 | (e[n++] & 63) << 6 | e[n++] & 63) - 65536, t += String.fromCharCode(55296 | i >> 10, 56320 | i & 1023)) : s & 1 ? t += String.fromCharCode((i & 31) << 6 | e[n++] & 63) : t += String.fromCharCode((i & 15) << 12 | (e[n++] & 63) << 6 | e[n++] & 63) : t += String.fromCharCode(i)
  }
} function Ufe(e, t) {
  var n; if (Mh)
    return Mh.decode(e); const i = qfe(e); const s = i.s; var n = i.r; return n.length && qn(8), s
} function Bd() {} const vn = () => Promise.resolve(); function Vfe() {
  const e = rr({ state: new Tx(), waitForConnection: u, reconnect: s, ws: new EventTarget() }); e.state.filesMap = rr(e.state.filesMap), e.state.idMap = rr(e.state.idMap); let t; const n = { getFiles: () => t.files, getPaths: () => t.paths, getConfig: () => t.config, getResolvedProjectNames: () => t.projects, getResolvedProjectLabels: () => [], getModuleGraph: async (f, h) => { let p; return (p = t.moduleGraph[f]) == null ? void 0 : p[h] }, getUnhandledErrors: () => t.unhandledErrors, getTransformResult: vn, onDone: Bd, onTaskUpdate: Bd, writeFile: vn, rerun: vn, rerunTask: vn, updateSnapshot: vn, resolveSnapshotPath: vn, snapshotSaved: vn, onAfterSuiteRun: vn, onCancel: vn, getCountOfFailedTests: () => 0, sendLog: vn, resolveSnapshotRawPath: vn, readSnapshotFile: vn, saveSnapshotFile: vn, readTestFile: async f => t.sources[f], removeSnapshotFile: vn, onUnhandledError: Bd, saveTestFile: vn, getProvidedContext: () => ({}), getTestFiles: vn }; e.rpc = n; const i = Promise.resolve(); function s() { l() } async function l() {
    let g; const f = await fetch(window.METADATA_PATH); const h = ((g = f.headers.get('content-type')) == null ? void 0 : g.toLowerCase()) || ''; if (h.includes('application/gzip') || h.includes('application/x-gzip')) { const v = new Uint8Array(await f.arrayBuffer()); const y = Ufe(Wfe(v)); t = _h(y) }
    else {
      t = _h(await f.text())
    } const p = new Event('open'); e.ws.dispatchEvent(p)
  }l(); function u() { return i } return e
} const ht = (function () { return pr ? Vfe() : D$(KM, { reactive: (t, n) => n === 'state' ? rr(t) : rn(t), handlers: { onTestAnnotate(t, n) { Ae.annotateTest(t, n) }, onTaskUpdate(t, n) { Ae.resumeRun(t, n), df.value = 'running' }, onFinished(t, n) { Ae.endRun(), Zi.value = (n || []).map(n1) }, onFinishedReportCoverage() { const t = document.querySelector('iframe#vitest-ui-coverage'); t instanceof HTMLIFrameElement && t.contentWindow && t.contentWindow.location.reload() } } }) }()); const el = rn({}); const Bo = Ue('CONNECTING'); const qt = _e(() => { const e = mo.value; return e ? gr(e) : void 0 }); const f1 = _e(() => Cp(qt.value).map(e => (e == null ? void 0 : e.logs) || []).flat() || []); function gr(e) { const t = ht.state.idMap.get(e); return t || void 0 } const Gfe = _e(() => Bo.value === 'OPEN'); const Wd = _e(() => Bo.value === 'CONNECTING'); _e(() => Bo.value === 'CLOSED'); function Xfe() { return Rp(ht.state.getFiles()) } function d1(e) {
  delete e.result; const t = Ae.nodes.get(e.id); if (t && (t.state = void 0, t.duration = void 0, qa(e))) {
    for (const n of e.tasks)d1(n)
  }
} function Kfe(e) { const t = Ae.nodes; e.forEach((n) => { delete n.result, Cp(n).forEach((s) => { if (delete s.result, t.has(s.id)) { const l = t.get(s.id); l && (l.state = void 0, l.duration = void 0) } }); const i = t.get(n.id); i && (i.state = void 0, i.duration = void 0, On(i) && (i.collectDuration = void 0)) }) } function Rp(e) { return Kfe(e), Ae.startRun(), ht.rpc.rerun(e.map(t => t.filepath), !0) } function Jfe(e) { return d1(e), Ae.startRun(), ht.rpc.rerunTask(e.id) } const Nt = window.__vitest_browser_runner__; window.__vitest_ui_api__ = VM; St(() => ht.ws, (e) => { Bo.value = pr ? 'OPEN' : 'CONNECTING', e.addEventListener('open', async () => { Bo.value = 'OPEN', ht.state.filesMap.clear(); let [t, n, i, s] = await Promise.all([ht.rpc.getFiles(), ht.rpc.getConfig(), ht.rpc.getUnhandledErrors(), ht.rpc.getResolvedProjectLabels()]); n.standalone && (t = (await ht.rpc.getTestFiles()).map(([{ name: u, root: f }, h]) => { const p = gx(h, f, u); return p.mode = 'skip', p })), Ae.loadFiles(t, s), ht.state.collectFiles(t), Ae.startRun(), Zi.value = (i || []).map(n1), el.value = n }), e.addEventListener('close', () => { setTimeout(() => { Bo.value === 'CONNECTING' && (Bo.value = 'CLOSED') }, 1e3) }) }, { immediate: !0 }); const Yfe = { 'text-2xl': '' }; const Zfe = { 'text-lg': '', 'op50': '' }; const Qfe = at({ __name: 'ConnectionOverlay', setup(e) { return (t, n) => j(Gfe) ? je('', !0) : (se(), ye('div', { 'key': 0, 'fixed': '', 'inset-0': '', 'p2': '', 'z-10': '', 'select-none': '', 'text': 'center sm', 'bg': 'overlay', 'backdrop-blur-sm': '', 'backdrop-saturate-0': '', 'onClick': n[0] || (n[0] = (...i) => j(ht).reconnect && j(ht).reconnect(...i)) }, [ne('div', { 'h-full': '', 'flex': '~ col gap-2', 'items-center': '', 'justify-center': '', 'class': ot(j(Wd) ? 'animate-pulse' : '') }, [ne('div', { text: '5xl', class: ot(j(Wd) ? 'i-carbon:renew animate-spin animate-reverse' : 'i-carbon-wifi-off') }, null, 2), ne('div', Yfe, Re(j(Wd) ? 'Connecting...' : 'Disconnected'), 1), ne('div', Zfe, ` Check your terminal or start a new server with \`${Re(j(Nt) ? `vitest --browser=${j(Nt).config.browser.name}` : 'vitest --ui')}\` `, 1)], 2)])) } }); const ede = ['aria-label', 'opacity', 'disabled', 'hover']; const ri = at({ __name: 'IconButton', props: { icon: {}, title: {}, disabled: { type: Boolean }, active: { type: Boolean } }, setup(e) { return (t, n) => (se(), ye('button', { 'aria-label': t.title, 'role': 'button', 'opacity': t.disabled ? 10 : 70, 'rounded': '', 'disabled': t.disabled, 'hover': t.disabled || t.active ? '' : 'bg-active op100', 'class': ot(['w-1.4em h-1.4em flex', [{ 'bg-gray-500:35 op100': t.active }]]) }, [xn(t.$slots, 'default', {}, () => [ne('span', { class: ot(t.icon), ma: '', block: '' }, null, 2)])], 10, ede)) } }); const tde = { h: 'full', flex: '~ col' }; const nde = { 'p': '3', 'h-10': '', 'flex': '~ gap-2', 'items-center': '', 'bg-header': '', 'border': 'b base' }; const rde = { 'p': 'l3 y2 r2', 'flex': '~ gap-2', 'items-center': '', 'bg-header': '', 'border': 'b-2 base' }; const ide = { 'class': 'pointer-events-none', 'text-sm': '' }; const ode = { key: 0 }; const sde = { id: 'tester-container', relative: '' }; const lde = ['data-scale']; const J0 = 20; const ade = 100; const cde = at({ __name: 'BrowserIframe', setup(e) {
  const t = { 'small-mobile': [320, 568], 'large-mobile': [414, 896], 'tablet': [834, 1112] }; function n(p) { const g = t[p]; return er.value[0] === g[0] && er.value[1] === g[1] } const { width: i, height: s } = Dx(); async function l(p) { er.value = t[p], (Nt == null ? void 0 : Nt.provider) === 'webdriverio' && Qx() } const u = _e(() => { if ((Nt == null ? void 0 : Nt.provider) === 'webdriverio') { const [w, L] = er.value; return { width: w, height: L } } const v = i.value * (At.details.size / 100) * (At.details.browser / 100) - J0; const y = s.value - ade; return { width: v, height: y } }); const f = _e(() => {
    if ((Nt == null ? void 0 : Nt.provider) === 'webdriverio')
      return 1; const [p, g] = er.value; const { width: v, height: y } = u.value; const w = v > p ? 1 : v / p; const L = y > g ? 1 : y / g; return Math.min(1, w, L)
  }); const h = _e(() => { const p = u.value.width; const g = er.value[0]; return `${Math.trunc((p + J0 - g) / 2)}px` }); return (p, g) => { const v = ri; const y = Dr('tooltip'); return se(), ye('div', tde, [ne('div', nde, [ct(Ie(v, { 'title': 'Show Navigation Panel', 'rotate-180': '', 'icon': 'i-carbon:side-panel-close', 'onClick': g[0] || (g[0] = w => j(UM)()) }, null, 512), [[to, j(At).navigation <= 15], [y, 'Show Navigation Panel', void 0, { bottom: !0 }]]), g[6] || (g[6] = ne('div', { class: 'i-carbon-content-delivery-network' }, null, -1)), g[7] || (g[7] = ne('span', { 'pl-1': '', 'font-bold': '', 'text-sm': '', 'flex-auto': '', 'ws-nowrap': '', 'overflow-hidden': '', 'truncate': '' }, 'Browser UI', -1)), ct(Ie(v, { 'title': 'Hide Right Panel', 'icon': 'i-carbon:side-panel-close', 'rotate-180': '', 'onClick': g[1] || (g[1] = w => j(jM)()) }, null, 512), [[to, j(At).details.main > 0], [y, 'Hide Right Panel', void 0, { bottom: !0 }]]), ct(Ie(v, { title: 'Show Right Panel', icon: 'i-carbon:side-panel-close', onClick: g[2] || (g[2] = w => j(qM)()) }, null, 512), [[to, j(At).details.main === 0], [y, 'Show Right Panel', void 0, { bottom: !0 }]])]), ne('div', rde, [ct(Ie(v, { title: 'Small mobile', icon: 'i-carbon:mobile', active: n('small-mobile'), onClick: g[3] || (g[3] = w => l('small-mobile')) }, null, 8, ['active']), [[y, 'Small mobile', void 0, { bottom: !0 }]]), ct(Ie(v, { title: 'Large mobile', icon: 'i-carbon:mobile-add', active: n('large-mobile'), onClick: g[4] || (g[4] = w => l('large-mobile')) }, null, 8, ['active']), [[y, 'Large mobile', void 0, { bottom: !0 }]]), ct(Ie(v, { title: 'Tablet', icon: 'i-carbon:tablet', active: n('tablet'), onClick: g[5] || (g[5] = w => l('tablet')) }, null, 8, ['active']), [[y, 'Tablet', void 0, { bottom: !0 }]]), ne('span', ide, [dt(`${Re(j(er)[0])}x${Re(j(er)[1])}px `, 1), j(f) < 1 ? (se(), ye('span', ode, `(${Re((j(f) * 100).toFixed(0))}%)`, 1)) : je('', !0)])]), ne('div', sde, [ne('div', { 'id': 'tester-ui', 'class': 'flex h-full justify-center items-center font-light op70', 'data-scale': j(f), 'style': nn({ '--viewport-width': `${j(er)[0]}px`, '--viewport-height': `${j(er)[1]}px`, '--tester-transform': `scale(${j(f)})`, '--tester-margin-left': j(h) }) }, ' Select a test to run ', 12, lde)])]) }
} }); const ude = ni(cde, [['__scopeId', 'data-v-9fd23e63']]); const zp = at({ __name: 'Modal', props: pa({ direction: { default: 'bottom' } }, { modelValue: { type: Boolean, default: !1 }, modelModifiers: {} }), emits: ['update:modelValue'], setup(e) { const t = ef(e, 'modelValue'); const n = _e(() => { switch (e.direction) { case 'bottom':return 'bottom-0 left-0 right-0 border-t'; case 'top':return 'top-0 left-0 right-0 border-b'; case 'left':return 'bottom-0 left-0 top-0 border-r'; case 'right':return 'bottom-0 top-0 right-0 border-l'; default:return '' } }); const i = _e(() => { switch (e.direction) { case 'bottom':return 'translateY(100%)'; case 'top':return 'translateY(-100%)'; case 'left':return 'translateX(-100%)'; case 'right':return 'translateX(100%)'; default:return '' } }); const s = () => t.value = !1; return (l, u) => (se(), ye('div', { class: ot(['fixed inset-0 z-40', t.value ? '' : 'pointer-events-none']) }, [ne('div', { class: ot(['bg-base inset-0 absolute transition-opacity duration-500 ease-out', t.value ? 'opacity-50' : 'opacity-0']), onClick: s }, null, 2), ne('div', { class: ot(['bg-base border-base absolute transition-all duration-200 ease-out scrolls', [j(n)]]), style: nn(t.value ? {} : { transform: j(i) }) }, [xn(l.$slots, 'default')], 6)], 2)) } }); const fde = { 'w-350': '', 'max-w-screen': '', 'h-full': '', 'flex': '', 'flex-col': '' }; const dde = { 'p-4': '', 'relative': '', 'border': 'base b' }; const hde = { 'op50': '', 'font-mono': '', 'text-sm': '' }; const pde = { 'op50': '', 'font-mono': '', 'text-sm': '' }; const gde = { 'class': 'scrolls', 'grid': '~ cols-1 rows-[min-content]', 'p-4': '' }; const mde = ['src', 'alt']; const vde = { key: 1 }; const yde = at({ __name: 'ScreenshotError', props: { file: {}, name: {}, url: {} }, emits: ['close'], setup(e, { emit: t }) { const n = t; return Ix('Escape', () => { n('close') }), (i, s) => { const l = ri; return se(), ye('div', fde, [ne('div', dde, [s[1] || (s[1] = ne('p', null, 'Screenshot error', -1)), ne('p', hde, Re(i.file), 1), ne('p', pde, Re(i.name), 1), Ie(l, { 'icon': 'i-carbon:close', 'title': 'Close', 'absolute': '', 'top-5px': '', 'right-5px': '', 'text-2xl': '', 'onClick': s[0] || (s[0] = u => n('close')) })]), ne('div', gde, [i.url ? (se(), ye('img', { key: 0, src: i.url, alt: `Screenshot error for '${i.name}' test in file '${i.file}'`, border: 'base t r b l dotted red-500' }, null, 8, mde)) : (se(), ye('div', vde, ' Something was wrong, the image cannot be resolved. '))])]) } } }); const h1 = ni(yde, [['__scopeId', 'data-v-93900314']]); const p1 = { 'application/andrew-inset': ['ez'], 'application/appinstaller': ['appinstaller'], 'application/applixware': ['aw'], 'application/appx': ['appx'], 'application/appxbundle': ['appxbundle'], 'application/atom+xml': ['atom'], 'application/atomcat+xml': ['atomcat'], 'application/atomdeleted+xml': ['atomdeleted'], 'application/atomsvc+xml': ['atomsvc'], 'application/atsc-dwd+xml': ['dwd'], 'application/atsc-held+xml': ['held'], 'application/atsc-rsat+xml': ['rsat'], 'application/automationml-aml+xml': ['aml'], 'application/automationml-amlx+zip': ['amlx'], 'application/bdoc': ['bdoc'], 'application/calendar+xml': ['xcs'], 'application/ccxml+xml': ['ccxml'], 'application/cdfx+xml': ['cdfx'], 'application/cdmi-capability': ['cdmia'], 'application/cdmi-container': ['cdmic'], 'application/cdmi-domain': ['cdmid'], 'application/cdmi-object': ['cdmio'], 'application/cdmi-queue': ['cdmiq'], 'application/cpl+xml': ['cpl'], 'application/cu-seeme': ['cu'], 'application/cwl': ['cwl'], 'application/dash+xml': ['mpd'], 'application/dash-patch+xml': ['mpp'], 'application/davmount+xml': ['davmount'], 'application/dicom': ['dcm'], 'application/docbook+xml': ['dbk'], 'application/dssc+der': ['dssc'], 'application/dssc+xml': ['xdssc'], 'application/ecmascript': ['ecma'], 'application/emma+xml': ['emma'], 'application/emotionml+xml': ['emotionml'], 'application/epub+zip': ['epub'], 'application/exi': ['exi'], 'application/express': ['exp'], 'application/fdf': ['fdf'], 'application/fdt+xml': ['fdt'], 'application/font-tdpfr': ['pfr'], 'application/geo+json': ['geojson'], 'application/gml+xml': ['gml'], 'application/gpx+xml': ['gpx'], 'application/gxf': ['gxf'], 'application/gzip': ['gz'], 'application/hjson': ['hjson'], 'application/hyperstudio': ['stk'], 'application/inkml+xml': ['ink', 'inkml'], 'application/ipfix': ['ipfix'], 'application/its+xml': ['its'], 'application/java-archive': ['jar', 'war', 'ear'], 'application/java-serialized-object': ['ser'], 'application/java-vm': ['class'], 'application/javascript': ['*js'], 'application/json': ['json', 'map'], 'application/json5': ['json5'], 'application/jsonml+json': ['jsonml'], 'application/ld+json': ['jsonld'], 'application/lgr+xml': ['lgr'], 'application/lost+xml': ['lostxml'], 'application/mac-binhex40': ['hqx'], 'application/mac-compactpro': ['cpt'], 'application/mads+xml': ['mads'], 'application/manifest+json': ['webmanifest'], 'application/marc': ['mrc'], 'application/marcxml+xml': ['mrcx'], 'application/mathematica': ['ma', 'nb', 'mb'], 'application/mathml+xml': ['mathml'], 'application/mbox': ['mbox'], 'application/media-policy-dataset+xml': ['mpf'], 'application/mediaservercontrol+xml': ['mscml'], 'application/metalink+xml': ['metalink'], 'application/metalink4+xml': ['meta4'], 'application/mets+xml': ['mets'], 'application/mmt-aei+xml': ['maei'], 'application/mmt-usd+xml': ['musd'], 'application/mods+xml': ['mods'], 'application/mp21': ['m21', 'mp21'], 'application/mp4': ['*mp4', '*mpg4', 'mp4s', 'm4p'], 'application/msix': ['msix'], 'application/msixbundle': ['msixbundle'], 'application/msword': ['doc', 'dot'], 'application/mxf': ['mxf'], 'application/n-quads': ['nq'], 'application/n-triples': ['nt'], 'application/node': ['cjs'], 'application/octet-stream': ['bin', 'dms', 'lrf', 'mar', 'so', 'dist', 'distz', 'pkg', 'bpk', 'dump', 'elc', 'deploy', 'exe', 'dll', 'deb', 'dmg', 'iso', 'img', 'msi', 'msp', 'msm', 'buffer'], 'application/oda': ['oda'], 'application/oebps-package+xml': ['opf'], 'application/ogg': ['ogx'], 'application/omdoc+xml': ['omdoc'], 'application/onenote': ['onetoc', 'onetoc2', 'onetmp', 'onepkg', 'one', 'onea'], 'application/oxps': ['oxps'], 'application/p2p-overlay+xml': ['relo'], 'application/patch-ops-error+xml': ['xer'], 'application/pdf': ['pdf'], 'application/pgp-encrypted': ['pgp'], 'application/pgp-keys': ['asc'], 'application/pgp-signature': ['sig', '*asc'], 'application/pics-rules': ['prf'], 'application/pkcs10': ['p10'], 'application/pkcs7-mime': ['p7m', 'p7c'], 'application/pkcs7-signature': ['p7s'], 'application/pkcs8': ['p8'], 'application/pkix-attr-cert': ['ac'], 'application/pkix-cert': ['cer'], 'application/pkix-crl': ['crl'], 'application/pkix-pkipath': ['pkipath'], 'application/pkixcmp': ['pki'], 'application/pls+xml': ['pls'], 'application/postscript': ['ai', 'eps', 'ps'], 'application/provenance+xml': ['provx'], 'application/pskc+xml': ['pskcxml'], 'application/raml+yaml': ['raml'], 'application/rdf+xml': ['rdf', 'owl'], 'application/reginfo+xml': ['rif'], 'application/relax-ng-compact-syntax': ['rnc'], 'application/resource-lists+xml': ['rl'], 'application/resource-lists-diff+xml': ['rld'], 'application/rls-services+xml': ['rs'], 'application/route-apd+xml': ['rapd'], 'application/route-s-tsid+xml': ['sls'], 'application/route-usd+xml': ['rusd'], 'application/rpki-ghostbusters': ['gbr'], 'application/rpki-manifest': ['mft'], 'application/rpki-roa': ['roa'], 'application/rsd+xml': ['rsd'], 'application/rss+xml': ['rss'], 'application/rtf': ['rtf'], 'application/sbml+xml': ['sbml'], 'application/scvp-cv-request': ['scq'], 'application/scvp-cv-response': ['scs'], 'application/scvp-vp-request': ['spq'], 'application/scvp-vp-response': ['spp'], 'application/sdp': ['sdp'], 'application/senml+xml': ['senmlx'], 'application/sensml+xml': ['sensmlx'], 'application/set-payment-initiation': ['setpay'], 'application/set-registration-initiation': ['setreg'], 'application/shf+xml': ['shf'], 'application/sieve': ['siv', 'sieve'], 'application/smil+xml': ['smi', 'smil'], 'application/sparql-query': ['rq'], 'application/sparql-results+xml': ['srx'], 'application/sql': ['sql'], 'application/srgs': ['gram'], 'application/srgs+xml': ['grxml'], 'application/sru+xml': ['sru'], 'application/ssdl+xml': ['ssdl'], 'application/ssml+xml': ['ssml'], 'application/swid+xml': ['swidtag'], 'application/tei+xml': ['tei', 'teicorpus'], 'application/thraud+xml': ['tfi'], 'application/timestamped-data': ['tsd'], 'application/toml': ['toml'], 'application/trig': ['trig'], 'application/ttml+xml': ['ttml'], 'application/ubjson': ['ubj'], 'application/urc-ressheet+xml': ['rsheet'], 'application/urc-targetdesc+xml': ['td'], 'application/voicexml+xml': ['vxml'], 'application/wasm': ['wasm'], 'application/watcherinfo+xml': ['wif'], 'application/widget': ['wgt'], 'application/winhlp': ['hlp'], 'application/wsdl+xml': ['wsdl'], 'application/wspolicy+xml': ['wspolicy'], 'application/xaml+xml': ['xaml'], 'application/xcap-att+xml': ['xav'], 'application/xcap-caps+xml': ['xca'], 'application/xcap-diff+xml': ['xdf'], 'application/xcap-el+xml': ['xel'], 'application/xcap-ns+xml': ['xns'], 'application/xenc+xml': ['xenc'], 'application/xfdf': ['xfdf'], 'application/xhtml+xml': ['xhtml', 'xht'], 'application/xliff+xml': ['xlf'], 'application/xml': ['xml', 'xsl', 'xsd', 'rng'], 'application/xml-dtd': ['dtd'], 'application/xop+xml': ['xop'], 'application/xproc+xml': ['xpl'], 'application/xslt+xml': ['*xsl', 'xslt'], 'application/xspf+xml': ['xspf'], 'application/xv+xml': ['mxml', 'xhvml', 'xvml', 'xvm'], 'application/yang': ['yang'], 'application/yin+xml': ['yin'], 'application/zip': ['zip'], 'application/zip+dotlottie': ['lottie'], 'audio/3gpp': ['*3gpp'], 'audio/aac': ['adts', 'aac'], 'audio/adpcm': ['adp'], 'audio/amr': ['amr'], 'audio/basic': ['au', 'snd'], 'audio/midi': ['mid', 'midi', 'kar', 'rmi'], 'audio/mobile-xmf': ['mxmf'], 'audio/mp3': ['*mp3'], 'audio/mp4': ['m4a', 'mp4a', 'm4b'], 'audio/mpeg': ['mpga', 'mp2', 'mp2a', 'mp3', 'm2a', 'm3a'], 'audio/ogg': ['oga', 'ogg', 'spx', 'opus'], 'audio/s3m': ['s3m'], 'audio/silk': ['sil'], 'audio/wav': ['wav'], 'audio/wave': ['*wav'], 'audio/webm': ['weba'], 'audio/xm': ['xm'], 'font/collection': ['ttc'], 'font/otf': ['otf'], 'font/ttf': ['ttf'], 'font/woff': ['woff'], 'font/woff2': ['woff2'], 'image/aces': ['exr'], 'image/apng': ['apng'], 'image/avci': ['avci'], 'image/avcs': ['avcs'], 'image/avif': ['avif'], 'image/bmp': ['bmp', 'dib'], 'image/cgm': ['cgm'], 'image/dicom-rle': ['drle'], 'image/dpx': ['dpx'], 'image/emf': ['emf'], 'image/fits': ['fits'], 'image/g3fax': ['g3'], 'image/gif': ['gif'], 'image/heic': ['heic'], 'image/heic-sequence': ['heics'], 'image/heif': ['heif'], 'image/heif-sequence': ['heifs'], 'image/hej2k': ['hej2'], 'image/ief': ['ief'], 'image/jaii': ['jaii'], 'image/jais': ['jais'], 'image/jls': ['jls'], 'image/jp2': ['jp2', 'jpg2'], 'image/jpeg': ['jpg', 'jpeg', 'jpe'], 'image/jph': ['jph'], 'image/jphc': ['jhc'], 'image/jpm': ['jpm', 'jpgm'], 'image/jpx': ['jpx', 'jpf'], 'image/jxl': ['jxl'], 'image/jxr': ['jxr'], 'image/jxra': ['jxra'], 'image/jxrs': ['jxrs'], 'image/jxs': ['jxs'], 'image/jxsc': ['jxsc'], 'image/jxsi': ['jxsi'], 'image/jxss': ['jxss'], 'image/ktx': ['ktx'], 'image/ktx2': ['ktx2'], 'image/pjpeg': ['jfif'], 'image/png': ['png'], 'image/sgi': ['sgi'], 'image/svg+xml': ['svg', 'svgz'], 'image/t38': ['t38'], 'image/tiff': ['tif', 'tiff'], 'image/tiff-fx': ['tfx'], 'image/webp': ['webp'], 'image/wmf': ['wmf'], 'message/disposition-notification': ['disposition-notification'], 'message/global': ['u8msg'], 'message/global-delivery-status': ['u8dsn'], 'message/global-disposition-notification': ['u8mdn'], 'message/global-headers': ['u8hdr'], 'message/rfc822': ['eml', 'mime', 'mht', 'mhtml'], 'model/3mf': ['3mf'], 'model/gltf+json': ['gltf'], 'model/gltf-binary': ['glb'], 'model/iges': ['igs', 'iges'], 'model/jt': ['jt'], 'model/mesh': ['msh', 'mesh', 'silo'], 'model/mtl': ['mtl'], 'model/obj': ['obj'], 'model/prc': ['prc'], 'model/step': ['step', 'stp', 'stpnc', 'p21', '210'], 'model/step+xml': ['stpx'], 'model/step+zip': ['stpz'], 'model/step-xml+zip': ['stpxz'], 'model/stl': ['stl'], 'model/u3d': ['u3d'], 'model/vrml': ['wrl', 'vrml'], 'model/x3d+binary': ['*x3db', 'x3dbz'], 'model/x3d+fastinfoset': ['x3db'], 'model/x3d+vrml': ['*x3dv', 'x3dvz'], 'model/x3d+xml': ['x3d', 'x3dz'], 'model/x3d-vrml': ['x3dv'], 'text/cache-manifest': ['appcache', 'manifest'], 'text/calendar': ['ics', 'ifb'], 'text/coffeescript': ['coffee', 'litcoffee'], 'text/css': ['css'], 'text/csv': ['csv'], 'text/html': ['html', 'htm', 'shtml'], 'text/jade': ['jade'], 'text/javascript': ['js', 'mjs'], 'text/jsx': ['jsx'], 'text/less': ['less'], 'text/markdown': ['md', 'markdown'], 'text/mathml': ['mml'], 'text/mdx': ['mdx'], 'text/n3': ['n3'], 'text/plain': ['txt', 'text', 'conf', 'def', 'list', 'log', 'in', 'ini'], 'text/richtext': ['rtx'], 'text/rtf': ['*rtf'], 'text/sgml': ['sgml', 'sgm'], 'text/shex': ['shex'], 'text/slim': ['slim', 'slm'], 'text/spdx': ['spdx'], 'text/stylus': ['stylus', 'styl'], 'text/tab-separated-values': ['tsv'], 'text/troff': ['t', 'tr', 'roff', 'man', 'me', 'ms'], 'text/turtle': ['ttl'], 'text/uri-list': ['uri', 'uris', 'urls'], 'text/vcard': ['vcard'], 'text/vtt': ['vtt'], 'text/wgsl': ['wgsl'], 'text/xml': ['*xml'], 'text/yaml': ['yaml', 'yml'], 'video/3gpp': ['3gp', '3gpp'], 'video/3gpp2': ['3g2'], 'video/h261': ['h261'], 'video/h263': ['h263'], 'video/h264': ['h264'], 'video/iso.segment': ['m4s'], 'video/jpeg': ['jpgv'], 'video/jpm': ['*jpm', '*jpgm'], 'video/mj2': ['mj2', 'mjp2'], 'video/mp2t': ['ts', 'm2t', 'm2ts', 'mts'], 'video/mp4': ['mp4', 'mp4v', 'mpg4'], 'video/mpeg': ['mpeg', 'mpg', 'mpe', 'm1v', 'm2v'], 'video/ogg': ['ogv'], 'video/quicktime': ['qt', 'mov'], 'video/webm': ['webm'] }; Object.freeze(p1); function cr(e, t, n, i) {
  if (n === 'a' && !i)
    throw new TypeError('Private accessor was defined without a getter'); if (typeof t == 'function' ? e !== t || !i : !t.has(e))
    throw new TypeError('Cannot read private member from an object whose class did not declare it'); return n === 'm' ? i : n === 'a' ? i.call(e) : i ? i.value : t.get(e)
} let As; let Xl; let Fo; class bde {
  constructor(...t) { As.set(this, new Map()), Xl.set(this, new Map()), Fo.set(this, new Map()); for (const n of t) this.define(n) }define(t, n = !1) {
    for (let [i, s] of Object.entries(t)) {
      i = i.toLowerCase(), s = s.map(f => f.toLowerCase()), cr(this, Fo, 'f').has(i) || cr(this, Fo, 'f').set(i, new Set()); const l = cr(this, Fo, 'f').get(i); let u = !0; for (let f of s) {
        const h = f.startsWith('*'); if (f = h ? f.slice(1) : f, l == null || l.add(f), u && cr(this, Xl, 'f').set(i, f), u = !1, h)
          continue; const p = cr(this, As, 'f').get(f); if (p && p != i && !n)
          throw new Error(`"${i} -> ${f}" conflicts with "${p} -> ${f}". Pass \`force=true\` to override this definition.`); cr(this, As, 'f').set(f, i)
      }
    } return this
  }

  getType(t) {
    if (typeof t != 'string')
      return null; const n = t.replace(/^.*[/\\]/s, '').toLowerCase(); const i = n.replace(/^.*\./s, '').toLowerCase(); const s = n.length < t.length; return !(i.length < n.length - 1) && s ? null : cr(this, As, 'f').get(i) ?? null
  }

  getExtension(t) { let n; return typeof t != 'string' ? null : (t = (n = t == null ? void 0 : t.split) == null ? void 0 : n.call(t, ';')[0], (t && cr(this, Xl, 'f').get(t.trim().toLowerCase())) ?? null) }getAllExtensions(t) { return typeof t != 'string' ? null : cr(this, Fo, 'f').get(t.toLowerCase()) ?? null }_freeze() { this.define = () => { throw new Error('define() not allowed for built-in Mime objects. See https://github.com/broofa/mime/blob/main/README.md#custom-mime-instances') }, Object.freeze(this); for (const t of cr(this, Fo, 'f').values())Object.freeze(t); return this }_getTestState() { return { types: cr(this, As, 'f'), extensions: cr(this, Xl, 'f') } }
}As = new WeakMap(), Xl = new WeakMap(), Fo = new WeakMap(); const wde = new bde(p1)._freeze(); function Pu(e) {
  if (pr)
    return `/data/${e.path}`; const t = e.contentType ?? 'application/octet-stream'; return e.path ? `/__vitest_attachment__?path=${encodeURIComponent(e.path)}&contentType=${t}&token=${window.VITEST_API_TOKEN}` : `data:${t};base64,${e.body}`
} function g1(e, t) { const n = t ? wde.getExtension(t) : null; return e.replace(/[\x00-\x2C\x2E\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, '-') + (n ? `.${n}` : '') } function xde(e) { const t = e.path || e.body; return typeof t == 'string' && (t.startsWith('http://') || t.startsWith('https://')) } const Sde = ['href', 'referrerPolicy']; const _de = ['src']; const kde = at({ __name: 'AnnotationAttachmentImage', props: { annotation: {} }, setup(e) { const t = e; const n = _e(() => { const i = t.annotation.attachment; const s = i.path || i.body; return typeof s == 'string' && (s.startsWith('http://') || s.startsWith('https://')) ? s : Pu(i) }); return (i, s) => { let l; return i.annotation.attachment && ((l = i.annotation.attachment.contentType) != null && l.startsWith('image/')) ? (se(), ye('a', { key: 0, target: '_blank', class: 'inline-block mt-2', style: { maxWidth: '600px' }, href: j(n), referrerPolicy: j(xde)(i.annotation.attachment) ? 'no-referrer' : void 0 }, [ne('img', { src: j(n) }, null, 8, _de)], 8, Sde)) : je('', !0) } } }); const nu = { exports: {} }; const Tde = nu.exports; let Y0; function sl() {
  return Y0 || (Y0 = 1, (function (e, t) {
    (function (n, i) { e.exports = i() })(Tde, () => {
      const n = navigator.userAgent; const i = navigator.platform; const s = /gecko\/\d/i.test(n); const l = /MSIE \d/.test(n); const u = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(n); const f = /Edge\/(\d+)/.exec(n); const h = l || u || f; const p = h && (l ? document.documentMode || 6 : +(f || u)[1]); let g = !f && /WebKit\//.test(n); const v = g && /Qt\/\d+\.\d+/.test(n); const y = !f && /Chrome\/(\d+)/.exec(n); const w = y && +y[1]; let L = /Opera\//.test(n); const $ = /Apple Computer/.test(navigator.vendor); const A = /Mac OS X 1\d\D([89]|\d\d)\D/.test(n); const E = /PhantomJS/.test(n); const M = $ && (/Mobile\/\w+/.test(n) || navigator.maxTouchPoints > 2); const O = /Android/.test(n); const k = M || O || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(n); const z = M || /Mac/.test(i); const D = /\bCrOS\b/.test(n); const te = /win/i.test(i); let ee = L && n.match(/Version\/(\d*\.\d*)/); ee && (ee = Number(ee[1])), ee && ee >= 15 && (L = !1, g = !0); const W = z && (v || L && (ee == null || ee < 12.11)); const q = s || h && p >= 9; function K(r) { return new RegExp(`(^|\\s)${r}(?:$|\\s)\\s*`) } const C = function (r, o) { const c = r.className; const a = K(o).exec(c); if (a) { const d = c.slice(a.index + a[0].length); r.className = c.slice(0, a.index) + (d ? a[1] + d : '') } }; function P(r) { for (let o = r.childNodes.length; o > 0; --o)r.removeChild(r.firstChild); return r } function I(r, o) { return P(r).appendChild(o) } function S(r, o, c, a) {
        const d = document.createElement(r); if (c && (d.className = c), a && (d.style.cssText = a), typeof o == 'string') {
          d.appendChild(document.createTextNode(o))
        }
        else if (o) {
          for (let m = 0; m < o.length; ++m)d.appendChild(o[m])
        } return d
      } function R(r, o, c, a) { const d = S(r, o, c, a); return d.setAttribute('role', 'presentation'), d } let B; document.createRange
        ? B = function (r, o, c, a) { const d = document.createRange(); return d.setEnd(a || r, c), d.setStart(r, o), d }
        : B = function (r, o, c) {
          const a = document.body.createTextRange(); try { a.moveToElementText(r.parentNode) }
          catch { return a } return a.collapse(!0), a.moveEnd('character', c), a.moveStart('character', o), a
        }; function oe(r, o) {
        if (o.nodeType == 3 && (o = o.parentNode), r.contains)
          return r.contains(o); do {
          if (o.nodeType == 11 && (o = o.host), o == r)
            return !0
        } while (o = o.parentNode)
      } function ue(r) {
        const o = r.ownerDocument || r; let c; try { c = r.activeElement }
        catch { c = o.body || null } for (;c && c.shadowRoot && c.shadowRoot.activeElement;)c = c.shadowRoot.activeElement; return c
      } function we(r, o) { const c = r.className; K(o).test(c) || (r.className += (c ? ' ' : '') + o) } function Pe(r, o) { for (let c = r.split(' '), a = 0; a < c.length; a++)c[a] && !K(c[a]).test(o) && (o += ` ${c[a]}`); return o } let qe = function (r) { r.select() }; M
        ? qe = function (r) { r.selectionStart = 0, r.selectionEnd = r.value.length }
        : h && (qe = function (r) {
          try { r.select() }
          catch {}
        }); function Ze(r) { return r.display.wrapper.ownerDocument } function Ke(r) { return Je(r.display.wrapper) } function Je(r) { return r.getRootNode ? r.getRootNode() : r.ownerDocument } function ie(r) { return Ze(r).defaultView } function U(r) { const o = Array.prototype.slice.call(arguments, 1); return function () { return r.apply(null, o) } } function Q(r, o, c) { o || (o = {}); for (const a in r)r.hasOwnProperty(a) && (c !== !1 || !o.hasOwnProperty(a)) && (o[a] = r[a]); return o } function J(r, o, c, a, d) {
        o == null && (o = r.search(/\S/), o == -1 && (o = r.length)); for (let m = a || 0, b = d || 0; ;) {
          const x = r.indexOf('	', m); if (x < 0 || x >= o)
            return b + (o - m); b += x - m, b += c - b % c, m = x + 1
        }
      } const ae = function () { this.id = null, this.f = null, this.time = 0, this.handler = U(this.onTimeout, this) }; ae.prototype.onTimeout = function (r) { r.id = 0, r.time <= +new Date() ? r.f() : setTimeout(r.handler, r.time - +new Date()) }, ae.prototype.set = function (r, o) { this.f = o; const c = +new Date() + r; (!this.id || c < this.time) && (clearTimeout(this.id), this.id = setTimeout(this.handler, r), this.time = c) }; function ge(r, o) {
        for (let c = 0; c < r.length; ++c) {
          if (r[c] == o)
            return c
        } return -1
      } const F = 50; const V = { toString() { return 'CodeMirror.Pass' } }; const Y = { scroll: !1 }; const fe = { origin: '*mouse' }; const pe = { origin: '+move' }; function he(r, o, c) {
        for (let a = 0, d = 0; ;) {
          let m = r.indexOf('	', a); m == -1 && (m = r.length); const b = m - a; if (m == r.length || d + b >= o)
            return a + Math.min(b, o - d); if (d += m - a, d += c - d % c, a = m + 1, d >= o)
            return a
        }
      } const Ce = ['']; function Ee(r) { for (;Ce.length <= r;)Ce.push(`${ve(Ce)} `); return Ce[r] } function ve(r) { return r[r.length - 1] } function be(r, o) { for (var c = [], a = 0; a < r.length; a++)c[a] = o(r[a], a); return c } function We(r, o, c) { for (var a = 0, d = c(o); a < r.length && c(r[a]) <= d;)a++; r.splice(a, 0, o) } function Me() {} function De(r, o) { let c; return Object.create ? c = Object.create(r) : (Me.prototype = r, c = new Me()), o && Q(o, c), c } const Ve = /[\u00DF\u0587\u0590-\u05F4\u0600-\u06FF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DB5\u4E00-\u9FCC\uAC00-\uD7AF]/; function rt(r) { return /\w/.test(r) || r > '' && (r.toUpperCase() != r.toLowerCase() || Ve.test(r)) } function st(r, o) { return o ? o.source.includes('\\w') && rt(r) ? !0 : o.test(r) : rt(r) } function ut(r) {
        for (const o in r) {
          if (r.hasOwnProperty(o) && r[o])
            return !1
        } return !0
      } const It = /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065E\u0670\u06D6-\u06DC\u06DE-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0900-\u0902\u093C\u0941-\u0948\u094D\u0951-\u0955\u0962\u0963\u0981\u09BC\u09BE\u09C1-\u09C4\u09CD\u09D7\u09E2\u09E3\u0A01\u0A02\u0A3C\u0A41\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81\u0A82\u0ABC\u0AC1-\u0AC5\u0AC7\u0AC8\u0ACD\u0AE2\u0AE3\u0B01\u0B3C\u0B3E\u0B3F\u0B41-\u0B44\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE\u0BC0\u0BCD\u0BD7\u0C3E-\u0C40\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0CBC\u0CBF\u0CC2\u0CC6\u0CCC\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D3E\u0D41-\u0D44\u0D4D\u0D57\u0D62\u0D63\u0DCA\u0DCF\u0DD2-\u0DD4\u0DD6\u0DDF\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F71-\u0F7E\u0F80-\u0F84\u0F86\u0F87\u0F90-\u0F97\u0F99-\u0FBC\u0FC6\u102D-\u1030\u1032-\u1037\u1039\u103A\u103D\u103E\u1058\u1059\u105E-\u1060\u1071-\u1074\u1082\u1085\u1086\u108D\u109D\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u180B-\u180D\u18A9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193B\u1A17\u1A18\u1A56\u1A58-\u1A5E\u1A60\u1A62\u1A65-\u1A6C\u1A73-\u1A7C\u1A7F\u1B00-\u1B03\u1B34\u1B36-\u1B3A\u1B3C\u1B42\u1B6B-\u1B73\u1B80\u1B81\u1BA2-\u1BA5\u1BA8\u1BA9\u1C2C-\u1C33\u1C36\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE0\u1CE2-\u1CE8\u1CED\u1DC0-\u1DE6\u1DFD-\u1DFF\u200C\u200D\u20D0-\u20F0\u2CEF-\u2CF1\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA67C\uA67D\uA6F0\uA6F1\uA802\uA806\uA80B\uA825\uA826\uA8C4\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA951\uA980-\uA982\uA9B3\uA9B6-\uA9B9\uA9BC\uAA29-\uAA2E\uAA31\uAA32\uAA35\uAA36\uAA43\uAA4C\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uABE5\uABE8\uABED\uDC00-\uDFFF\uFB1E\uFE00-\uFE0F\uFE20-\uFE26\uFF9E\uFF9F]/; function lt(r) { return r.charCodeAt(0) >= 768 && It.test(r) } function Xt(r, o, c) { for (;(c < 0 ? o > 0 : o < r.length) && lt(r.charAt(o));)o += c; return o } function Bt(r, o, c) {
        for (let a = o > c ? -1 : 1; ;) {
          if (o == c)
            return o; const d = (o + c) / 2; const m = a < 0 ? Math.ceil(d) : Math.floor(d); if (m == o)
            return r(m) ? o : c; r(m) ? c = m : o = m + a
        }
      } function Dn(r, o, c, a) {
        if (!r)
          return a(o, c, 'ltr', 0); for (var d = !1, m = 0; m < r.length; ++m) { const b = r[m]; (b.from < c && b.to > o || o == c && b.to == o) && (a(Math.max(b.from, o), Math.min(b.to, c), b.level == 1 ? 'rtl' : 'ltr', m), d = !0) }d || a(o, c, 'ltr')
      } let Hr = null; function Ft(r, o, c) {
        let a; Hr = null; for (let d = 0; d < r.length; ++d) {
          const m = r[d]; if (m.from < o && m.to > o)
            return d; m.to == o && (m.from != m.to && c == 'before' ? a = d : Hr = d), m.from == o && (m.from != m.to && c != 'before' ? a = d : Hr = d)
        } return a ?? Hr
      } const Fn = (function () {
        const r = 'bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN'; const o = 'nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111'; function c(T) { return T <= 247 ? r.charAt(T) : T >= 1424 && T <= 1524 ? 'R' : T >= 1536 && T <= 1785 ? o.charAt(T - 1536) : T >= 1774 && T <= 2220 ? 'r' : T >= 8192 && T <= 8203 ? 'w' : T == 8204 ? 'b' : 'L' } const a = /[\u0590-\u05F4\u0600-\u06FF\u0700-\u08AC]/; const d = /[stwN]/; const m = /[LRr]/; const b = /[Lb1n]/; const x = /[1n]/; function _(T, H, X) { this.level = T, this.from = H, this.to = X } return function (T, H) {
          const X = H == 'ltr' ? 'L' : 'R'; if (T.length == 0 || H == 'ltr' && !a.test(T))
            return !1; for (var re = T.length, Z = [], ce = 0; ce < re; ++ce)Z.push(c(T.charCodeAt(ce))); for (let me = 0, Se = X; me < re; ++me) { const ke = Z[me]; ke == 'm' ? Z[me] = Se : Se = ke } for (let $e = 0, Te = X; $e < re; ++$e) { const Ne = Z[$e]; Ne == '1' && Te == 'r' ? Z[$e] = 'n' : m.test(Ne) && (Te = Ne, Ne == 'r' && (Z[$e] = 'R')) } for (let Be = 1, ze = Z[0]; Be < re - 1; ++Be) { const Qe = Z[Be]; Qe == '+' && ze == '1' && Z[Be + 1] == '1' ? Z[Be] = '1' : Qe == ',' && ze == Z[Be + 1] && (ze == '1' || ze == 'n') && (Z[Be] = ze), ze = Qe } for (let xt = 0; xt < re; ++xt) {
            const Qt = Z[xt]; if (Qt == ',') {
              Z[xt] = 'N'
            }
            else if (Qt == '%') { let $t = void 0; for ($t = xt + 1; $t < re && Z[$t] == '%'; ++$t);for (let Wn = xt && Z[xt - 1] == '!' || $t < re && Z[$t] == '1' ? '1' : 'N', Cn = xt; Cn < $t; ++Cn)Z[Cn] = Wn; xt = $t - 1 }
          } for (let Wt = 0, En = X; Wt < re; ++Wt) { const sn = Z[Wt]; En == 'L' && sn == '1' ? Z[Wt] = 'L' : m.test(sn) && (En = sn) } for (let Vt = 0; Vt < re; ++Vt) {
            if (d.test(Z[Vt])) { let jt = void 0; for (jt = Vt + 1; jt < re && d.test(Z[jt]); ++jt);for (let zt = (Vt ? Z[Vt - 1] : X) == 'L', An = (jt < re ? Z[jt] : X) == 'L', Ss = zt == An ? zt ? 'L' : 'R' : X, Wi = Vt; Wi < jt; ++Wi)Z[Wi] = Ss; Vt = jt - 1 }
          } for (var dn = [], Ur, en = 0; en < re;) {
            if (b.test(Z[en])) { const dd = en; for (++en; en < re && b.test(Z[en]); ++en);dn.push(new _(0, dd, en)) }
            else {
              let di = en; let $o = dn.length; const Mo = H == 'rtl' ? 1 : 0; for (++en; en < re && Z[en] != 'L'; ++en);for (let mn = di; mn < en;) {
                if (x.test(Z[mn])) { di < mn && (dn.splice($o, 0, new _(1, di, mn)), $o += Mo); const _s = mn; for (++mn; mn < en && x.test(Z[mn]); ++mn);dn.splice($o, 0, new _(2, _s, mn)), $o += Mo, di = mn }
                else {
                  ++mn
                }
              } di < en && dn.splice($o, 0, new _(1, di, en))
            }
          } return H == 'ltr' && (dn[0].level == 1 && (Ur = T.match(/^\s+/)) && (dn[0].from = Ur[0].length, dn.unshift(new _(0, 0, Ur[0].length))), ve(dn).level == 1 && (Ur = T.match(/\s+$/)) && (ve(dn).to -= Ur[0].length, dn.push(new _(0, re - Ur[0].length, re)))), H == 'rtl' ? dn.reverse() : dn
        }
      }()); function tt(r, o) { let c = r.order; return c == null && (c = r.order = Fn(r.text, o)), c } const Ya = []; const He = function (r, o, c) {
        if (r.addEventListener) {
          r.addEventListener(o, c, !1)
        }
        else if (r.attachEvent) {
          r.attachEvent(`on${o}`, c)
        }
        else { const a = r._handlers || (r._handlers = {}); a[o] = (a[o] || Ya).concat(c) }
      }; function oi(r, o) { return r._handlers && r._handlers[o] || Ya } function cn(r, o, c) {
        if (r.removeEventListener) {
          r.removeEventListener(o, c, !1)
        }
        else if (r.detachEvent) {
          r.detachEvent(`on${o}`, c)
        }
        else { const a = r._handlers; const d = a && a[o]; if (d) { const m = ge(d, c); m > -1 && (a[o] = d.slice(0, m).concat(d.slice(m + 1))) } }
      } function Pt(r, o) {
        const c = oi(r, o); if (c.length) {
          for (let a = Array.prototype.slice.call(arguments, 2), d = 0; d < c.length; ++d)c[d].apply(null, a)
        }
      } function Ot(r, o, c) { return typeof o == 'string' && (o = { type: o, preventDefault() { this.defaultPrevented = !0 } }), Pt(r, c || o.type, r, o), Sn(o) || o.codemirrorIgnore } function sr(r) {
        const o = r._handlers && r._handlers.cursorActivity; if (o) {
          for (let c = r.curOp.cursorActivityHandlers || (r.curOp.cursorActivityHandlers = []), a = 0; a < o.length; ++a)ge(c, o[a]) == -1 && c.push(o[a])
        }
      } function Hn(r, o) { return oi(r, o).length > 0 } function mr(r) { r.prototype.on = function (o, c) { He(this, o, c) }, r.prototype.off = function (o, c) { cn(this, o, c) } } function un(r) { r.preventDefault ? r.preventDefault() : r.returnValue = !1 } function Yo(r) { r.stopPropagation ? r.stopPropagation() : r.cancelBubble = !0 } function Sn(r) { return r.defaultPrevented != null ? r.defaultPrevented : r.returnValue == !1 } function $i(r) { un(r), Yo(r) } function al(r) { return r.target || r.srcElement } function vr(r) { let o = r.which; return o == null && (r.button & 1 ? o = 1 : r.button & 2 ? o = 3 : r.button & 4 && (o = 2)), z && r.ctrlKey && o == 1 && (o = 3), o } const bf = (function () {
        if (h && p < 9)
          return !1; const r = S('div'); return 'draggable' in r || 'dragDrop' in r
      }()); let Zo; function Za(r) { if (Zo == null) { const o = S('span', '​'); I(r, S('span', [o, document.createTextNode('x')])), r.firstChild.offsetHeight != 0 && (Zo = o.offsetWidth <= 1 && o.offsetHeight > 2 && !(h && p < 8)) } const c = Zo ? S('span', '​') : S('span', ' ', null, 'display: inline-block; width: 1px; margin-right: -1px'); return c.setAttribute('cm-text', ''), c } let cl; function Mi(r) {
        if (cl != null)
          return cl; const o = I(r, document.createTextNode('AخA')); const c = B(o, 0, 1).getBoundingClientRect(); const a = B(o, 1, 2).getBoundingClientRect(); return P(r), !c || c.left == c.right ? !1 : cl = a.right - c.right < 3
      } const lr = `

b`.split(/\n/).length != 3
        ? function (r) {
          for (var o = 0, c = [], a = r.length; o <= a;) {
            let d = r.indexOf(`
`, o); d == -1 && (d = r.length); const m = r.slice(o, r.charAt(d - 1) == '\r' ? d - 1 : d); const b = m.indexOf('\r'); b != -1 ? (c.push(m.slice(0, b)), o += b + 1) : (c.push(m), o = d + 1)
          } return c
        }
        : function (r) { return r.split(/\r\n?|\n/) }; const Ni = window.getSelection
        ? function (r) {
          try { return r.selectionStart != r.selectionEnd }
          catch { return !1 }
        }
        : function (r) {
          let o; try { o = r.ownerDocument.selection.createRange() }
          catch {} return !o || o.parentElement() != r ? !1 : o.compareEndPoints('StartToEnd', o) != 0
        }; const Qa = (function () { const r = S('div'); return 'oncopy' in r ? !0 : (r.setAttribute('oncopy', 'return;'), typeof r.oncopy == 'function') }()); let yr = null; function wf(r) {
        if (yr != null)
          return yr; const o = I(r, S('span', 'x')); const c = o.getBoundingClientRect(); const a = B(o, 0, 1).getBoundingClientRect(); return yr = Math.abs(c.left - a.left) > 1
      } const Qo = {}; const br = {}; function wr(r, o) { arguments.length > 2 && (o.dependencies = Array.prototype.slice.call(arguments, 2)), Qo[r] = o } function xo(r, o) { br[r] = o } function es(r) {
        if (typeof r == 'string' && br.hasOwnProperty(r)) {
          r = br[r]
        }
        else if (r && typeof r.name == 'string' && br.hasOwnProperty(r.name)) { let o = br[r.name]; typeof o == 'string' && (o = { name: o }), r = De(o, r), r.name = o.name }
        else {
          if (typeof r == 'string' && /^[\w\-]+\/[\w\-]+\+xml$/.test(r))
            return es('application/xml'); if (typeof r == 'string' && /^[\w\-]+\/[\w\-]+\+json$/.test(r))
            return es('application/json')
        } return typeof r == 'string' ? { name: r } : r || { name: 'null' }
      } function ts(r, o) {
        o = es(o); const c = Qo[o.name]; if (!c)
          return ts(r, 'text/plain'); const a = c(r, o); if (Ii.hasOwnProperty(o.name)) { const d = Ii[o.name]; for (const m in d)d.hasOwnProperty(m) && (a.hasOwnProperty(m) && (a[`_${m}`] = a[m]), a[m] = d[m]) } if (a.name = o.name, o.helperType && (a.helperType = o.helperType), o.modeProps) {
          for (const b in o.modeProps)a[b] = o.modeProps[b]
        } return a
      } var Ii = {}; function ns(r, o) { const c = Ii.hasOwnProperty(r) ? Ii[r] : Ii[r] = {}; Q(o, c) } function Br(r, o) {
        if (o === !0)
          return o; if (r.copyState)
          return r.copyState(o); const c = {}; for (const a in o) { let d = o[a]; Array.isArray(d) && (d = d.concat([])), c[a] = d } return c
      } function ul(r, o) { for (var c; r.innerMode && (c = r.innerMode(o), !(!c || c.mode == r));)o = c.state, r = c.mode; return c || { mode: r, state: o } } function rs(r, o, c) { return r.startState ? r.startState(o, c) : !0 } const Rt = function (r, o, c) { this.pos = this.start = 0, this.string = r, this.tabSize = o || 8, this.lastColumnPos = this.lastColumnValue = 0, this.lineStart = 0, this.lineOracle = c }; Rt.prototype.eol = function () { return this.pos >= this.string.length }, Rt.prototype.sol = function () { return this.pos == this.lineStart }, Rt.prototype.peek = function () { return this.string.charAt(this.pos) || void 0 }, Rt.prototype.next = function () {
        if (this.pos < this.string.length)
          return this.string.charAt(this.pos++)
      }, Rt.prototype.eat = function (r) {
        const o = this.string.charAt(this.pos); let c; if (typeof r == 'string' ? c = o == r : c = o && (r.test ? r.test(o) : r(o)), c)
          return ++this.pos, o
      }, Rt.prototype.eatWhile = function (r) { for (var o = this.pos; this.eat(r););return this.pos > o }, Rt.prototype.eatSpace = function () { for (var r = this.pos; /\s/.test(this.string.charAt(this.pos));)++this.pos; return this.pos > r }, Rt.prototype.skipToEnd = function () { this.pos = this.string.length }, Rt.prototype.skipTo = function (r) {
        const o = this.string.indexOf(r, this.pos); if (o > -1)
          return this.pos = o, !0
      }, Rt.prototype.backUp = function (r) { this.pos -= r }, Rt.prototype.column = function () { return this.lastColumnPos < this.start && (this.lastColumnValue = J(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue), this.lastColumnPos = this.start), this.lastColumnValue - (this.lineStart ? J(this.string, this.lineStart, this.tabSize) : 0) }, Rt.prototype.indentation = function () { return J(this.string, null, this.tabSize) - (this.lineStart ? J(this.string, this.lineStart, this.tabSize) : 0) }, Rt.prototype.match = function (r, o, c) {
        if (typeof r == 'string') {
          const a = function (b) { return c ? b.toLowerCase() : b }; const d = this.string.substr(this.pos, r.length); if (a(d) == a(r))
            return o !== !1 && (this.pos += r.length), !0
        }
        else { const m = this.string.slice(this.pos).match(r); return m && m.index > 0 ? null : (m && o !== !1 && (this.pos += m[0].length), m) }
      }, Rt.prototype.current = function () { return this.string.slice(this.start, this.pos) }, Rt.prototype.hideFirstChars = function (r, o) {
        this.lineStart += r; try { return o() }
        finally { this.lineStart -= r }
      }, Rt.prototype.lookAhead = function (r) { const o = this.lineOracle; return o && o.lookAhead(r) }, Rt.prototype.baseToken = function () { const r = this.lineOracle; return r && r.baseToken(this.pos) }; function Oe(r, o) {
        if (o -= r.first, o < 0 || o >= r.size)
          throw new Error(`There is no line ${o + r.first} in the document.`); for (var c = r; !c.lines;) {
          for (let a = 0; ;++a) { const d = c.children[a]; const m = d.chunkSize(); if (o < m) { c = d; break }o -= m }
        } return c.lines[o]
      } function si(r, o, c) { const a = []; let d = o.line; return r.iter(o.line, c.line + 1, (m) => { let b = m.text; d == c.line && (b = b.slice(0, c.ch)), d == o.line && (b = b.slice(o.ch)), a.push(b), ++d }), a } function fl(r, o, c) { const a = []; return r.iter(o, c, (d) => { a.push(d.text) }), a } function Yn(r, o) {
        const c = o - r.height; if (c) {
          for (let a = r; a; a = a.parent)a.height += c
        }
      } function N(r) {
        if (r.parent == null)
          return null; for (var o = r.parent, c = ge(o.lines, r), a = o.parent; a; o = a, a = a.parent) {
          for (let d = 0; a.children[d] != o; ++d)c += a.children[d].chunkSize()
        } return c + o.first
      } function G(r, o) {
        let c = r.first; e:do { for (let a = 0; a < r.children.length; ++a) { const d = r.children[a]; const m = d.height; if (o < m) { r = d; continue e }o -= m, c += d.chunkSize() } return c } while (!r.lines); for (var b = 0; b < r.lines.length; ++b) {
          const x = r.lines[b]; const _ = x.height; if (o < _)
            break; o -= _
        } return c + b
      } function de(r, o) { return o >= r.first && o < r.first + r.size } function xe(r, o) { return String(r.lineNumberFormatter(o + r.firstLineNumber)) } function le(r, o, c) {
        if (c === void 0 && (c = null), !(this instanceof le))
          return new le(r, o, c); this.line = r, this.ch = o, this.sticky = c
      } function Le(r, o) { return r.line - o.line || r.ch - o.ch } function pt(r, o) { return r.sticky == o.sticky && Le(r, o) == 0 } function Kt(r) { return le(r.line, r.ch) } function _n(r, o) { return Le(r, o) < 0 ? o : r } function is(r, o) { return Le(r, o) < 0 ? r : o } function Qp(r, o) { return Math.max(r.first, Math.min(o, r.first + r.size - 1)) } function Xe(r, o) {
        if (o.line < r.first)
          return le(r.first, 0); const c = r.first + r.size - 1; return o.line > c ? le(c, Oe(r, c).text.length) : _S(o, Oe(r, o.line).text.length)
      } function _S(r, o) { const c = r.ch; return c == null || c > o ? le(r.line, o) : c < 0 ? le(r.line, 0) : r } function eg(r, o) { for (var c = [], a = 0; a < o.length; a++)c[a] = Xe(r, o[a]); return c } const ec = function (r, o) { this.state = r, this.lookAhead = o }; const Wr = function (r, o, c, a) { this.state = o, this.doc = r, this.line = c, this.maxLookAhead = a || 0, this.baseTokens = null, this.baseTokenPos = 1 }; Wr.prototype.lookAhead = function (r) { const o = this.doc.getLine(this.line + r); return o != null && r > this.maxLookAhead && (this.maxLookAhead = r), o }, Wr.prototype.baseToken = function (r) {
        if (!this.baseTokens)
          return null; for (;this.baseTokens[this.baseTokenPos] <= r;) this.baseTokenPos += 2; const o = this.baseTokens[this.baseTokenPos + 1]; return { type: o && o.replace(/( |^)overlay .*/, ''), size: this.baseTokens[this.baseTokenPos] - r }
      }, Wr.prototype.nextLine = function () { this.line++, this.maxLookAhead > 0 && this.maxLookAhead-- }, Wr.fromSaved = function (r, o, c) { return o instanceof ec ? new Wr(r, Br(r.mode, o.state), c, o.lookAhead) : new Wr(r, Br(r.mode, o), c) }, Wr.prototype.save = function (r) { const o = r !== !1 ? Br(this.doc.mode, this.state) : this.state; return this.maxLookAhead > 0 ? new ec(o, this.maxLookAhead) : o }; function tg(r, o, c, a) {
        const d = [r.state.modeGen]; const m = {}; lg(r, o.text, r.doc.mode, c, (T, H) => { return d.push(T, H) }, m, a); for (var b = c.state, x = function (T) {
            c.baseTokens = d; const H = r.state.overlays[T]; let X = 1; let re = 0; c.state = !0, lg(r, o.text, H.mode, c, (Z, ce) => {
              for (var me = X; re < Z;) { const Se = d[X]; Se > Z && d.splice(X, 1, Z, d[X + 1], Se), X += 2, re = Math.min(Z, Se) } if (ce) {
                if (H.opaque) {
                  d.splice(me, X - me, Z, `overlay ${ce}`), X = me + 2
                }
                else {
                  for (;me < X; me += 2) { const ke = d[me + 1]; d[me + 1] = `${ke ? `${ke} ` : ''}overlay ${ce}` }
                }
              }
            }, m), c.state = b, c.baseTokens = null, c.baseTokenPos = 1
          }, _ = 0; _ < r.state.overlays.length; ++_)x(_); return { styles: d, classes: m.bgClass || m.textClass ? m : null }
      } function ng(r, o, c) { if (!o.styles || o.styles[0] != r.state.modeGen) { const a = dl(r, N(o)); const d = o.text.length > r.options.maxHighlightLength && Br(r.doc.mode, a.state); const m = tg(r, o, a); d && (a.state = d), o.stateAfter = a.save(!d), o.styles = m.styles, m.classes ? o.styleClasses = m.classes : o.styleClasses && (o.styleClasses = null), c === r.doc.highlightFrontier && (r.doc.modeFrontier = Math.max(r.doc.modeFrontier, ++r.doc.highlightFrontier)) } return o.styles } function dl(r, o, c) {
        const a = r.doc; const d = r.display; if (!a.mode.startState)
          return new Wr(a, !0, o); const m = kS(r, o, c); const b = m > a.first && Oe(a, m - 1).stateAfter; const x = b ? Wr.fromSaved(a, b, m) : new Wr(a, rs(a.mode), m); return a.iter(m, o, (_) => { xf(r, _.text, x); const T = x.line; _.stateAfter = T == o - 1 || T % 5 == 0 || T >= d.viewFrom && T < d.viewTo ? x.save() : null, x.nextLine() }), c && (a.modeFrontier = x.line), x
      } function xf(r, o, c, a) { const d = r.doc.mode; const m = new Rt(o, r.options.tabSize, c); for (m.start = m.pos = a || 0, o == '' && rg(d, c.state); !m.eol();)Sf(d, m, c.state), m.start = m.pos } function rg(r, o) {
        if (r.blankLine)
          return r.blankLine(o); if (r.innerMode) {
          const c = ul(r, o); if (c.mode.blankLine)
            return c.mode.blankLine(c.state)
        }
      } function Sf(r, o, c, a) {
        for (let d = 0; d < 10; d++) {
          a && (a[0] = ul(r, c).mode); const m = r.token(o, c); if (o.pos > o.start)
            return m
        } throw new Error(`Mode ${r.name} failed to advance stream.`)
      } const ig = function (r, o, c) { this.start = r.start, this.end = r.pos, this.string = r.current(), this.type = o || null, this.state = c }; function og(r, o, c, a) { const d = r.doc; const m = d.mode; let b; o = Xe(d, o); const x = Oe(d, o.line); const _ = dl(r, o.line, c); const T = new Rt(x.text, r.options.tabSize, _); let H; for (a && (H = []); (a || T.pos < o.ch) && !T.eol();)T.start = T.pos, b = Sf(m, T, _.state), a && H.push(new ig(T, b, Br(d.mode, _.state))); return a ? H : new ig(T, b, _.state) } function sg(r, o) {
        if (r) {
          for (;;) {
            const c = r.match(/(?:^|\s+)line-(background-)?(\S+)/); if (!c)
              break; r = r.slice(0, c.index) + r.slice(c.index + c[0].length); const a = c[1] ? 'bgClass' : 'textClass'; o[a] == null ? o[a] = c[2] : new RegExp(`(?:^|\\s)${c[2]}(?:$|\\s)`).test(o[a]) || (o[a] += ` ${c[2]}`)
          }
        } return r
      } function lg(r, o, c, a, d, m, b) { let x = c.flattenSpans; x == null && (x = r.options.flattenSpans); let _ = 0; let T = null; const H = new Rt(o, r.options.tabSize, a); let X; const re = r.options.addModeClass && [null]; for (o == '' && sg(rg(c, a.state), m); !H.eol();) { if (H.pos > r.options.maxHighlightLength ? (x = !1, b && xf(r, o, a, H.pos), H.pos = o.length, X = null) : X = sg(Sf(c, H, a.state, re), m), re) { const Z = re[0].name; Z && (X = `m-${X ? `${Z} ${X}` : Z}`) } if (!x || T != X) { for (;_ < H.start;)_ = Math.min(H.start, _ + 5e3), d(_, T); T = X }H.start = H.pos } for (;_ < H.pos;) { const ce = Math.min(H.pos, _ + 5e3); d(ce, T), _ = ce } } function kS(r, o, c) {
        for (var a, d, m = r.doc, b = c ? -1 : o - (r.doc.mode.innerMode ? 1e3 : 100), x = o; x > b; --x) {
          if (x <= m.first)
            return m.first; const _ = Oe(m, x - 1); const T = _.stateAfter; if (T && (!c || x + (T instanceof ec ? T.lookAhead : 0) <= m.modeFrontier))
            return x; const H = J(_.text, null, r.options.tabSize); (d == null || a > H) && (d = x - 1, a = H)
        } return d
      } function TS(r, o) { if (r.modeFrontier = Math.min(r.modeFrontier, o), !(r.highlightFrontier < o - 10)) { for (var c = r.first, a = o - 1; a > c; a--) { const d = Oe(r, a).stateAfter; if (d && (!(d instanceof ec) || a + d.lookAhead < o)) { c = a + 1; break } }r.highlightFrontier = Math.min(r.highlightFrontier, c) } } let ag = !1; let li = !1; function CS() { ag = !0 } function ES() { li = !0 } function tc(r, o, c) { this.marker = r, this.from = o, this.to = c } function hl(r, o) {
        if (r) {
          for (let c = 0; c < r.length; ++c) {
            const a = r[c]; if (a.marker == o)
              return a
          }
        }
      } function AS(r, o) { for (var c, a = 0; a < r.length; ++a)r[a] != o && (c || (c = [])).push(r[a]); return c } function LS(r, o, c) { const a = c && window.WeakSet && (c.markedSpans || (c.markedSpans = new WeakSet())); a && r.markedSpans && a.has(r.markedSpans) ? r.markedSpans.push(o) : (r.markedSpans = r.markedSpans ? r.markedSpans.concat([o]) : [o], a && a.add(r.markedSpans)), o.marker.attachLine(r) } function $S(r, o, c) {
        let a; if (r) {
          for (let d = 0; d < r.length; ++d) { const m = r[d]; const b = m.marker; const x = m.from == null || (b.inclusiveLeft ? m.from <= o : m.from < o); if (x || m.from == o && b.type == 'bookmark' && (!c || !m.marker.insertLeft)) { const _ = m.to == null || (b.inclusiveRight ? m.to >= o : m.to > o); (a || (a = [])).push(new tc(b, m.from, _ ? null : m.to)) } }
        } return a
      } function MS(r, o, c) {
        let a; if (r) {
          for (let d = 0; d < r.length; ++d) { const m = r[d]; const b = m.marker; const x = m.to == null || (b.inclusiveRight ? m.to >= o : m.to > o); if (x || m.from == o && b.type == 'bookmark' && (!c || m.marker.insertLeft)) { const _ = m.from == null || (b.inclusiveLeft ? m.from <= o : m.from < o); (a || (a = [])).push(new tc(b, _ ? null : m.from - o, m.to == null ? null : m.to - o)) } }
        } return a
      } function _f(r, o) {
        if (o.full)
          return null; const c = de(r, o.from.line) && Oe(r, o.from.line).markedSpans; const a = de(r, o.to.line) && Oe(r, o.to.line).markedSpans; if (!c && !a)
          return null; const d = o.from.ch; const m = o.to.ch; const b = Le(o.from, o.to) == 0; let x = $S(c, d, b); let _ = MS(a, m, b); const T = o.text.length == 1; const H = ve(o.text).length + (T ? d : 0); if (x) {
          for (let X = 0; X < x.length; ++X) { const re = x[X]; if (re.to == null) { const Z = hl(_, re.marker); Z ? T && (re.to = Z.to == null ? null : Z.to + H) : re.to = d } }
        } if (_) {
          for (let ce = 0; ce < _.length; ++ce) {
            const me = _[ce]; if (me.to != null && (me.to += H), me.from == null) { const Se = hl(x, me.marker); Se || (me.from = H, T && (x || (x = [])).push(me)) }
            else {
              me.from += H, T && (x || (x = [])).push(me)
            }
          }
        }x && (x = cg(x)), _ && _ != x && (_ = cg(_)); const ke = [x]; if (!T) {
          const $e = o.text.length - 2; let Te; if ($e > 0 && x) {
            for (let Ne = 0; Ne < x.length; ++Ne)x[Ne].to == null && (Te || (Te = [])).push(new tc(x[Ne].marker, null, null))
          } for (let Be = 0; Be < $e; ++Be)ke.push(Te); ke.push(_)
        } return ke
      } function cg(r) { for (let o = 0; o < r.length; ++o) { const c = r[o]; c.from != null && c.from == c.to && c.marker.clearWhenEmpty !== !1 && r.splice(o--, 1) } return r.length ? r : null } function NS(r, o, c) {
        let a = null; if (r.iter(o.line, c.line + 1, (Z) => {
          if (Z.markedSpans) {
            for (let ce = 0; ce < Z.markedSpans.length; ++ce) { const me = Z.markedSpans[ce].marker; me.readOnly && (!a || ge(a, me) == -1) && (a || (a = [])).push(me) }
          }
        }), !a) {
          return null
        } for (var d = [{ from: o, to: c }], m = 0; m < a.length; ++m) {
          for (let b = a[m], x = b.find(0), _ = 0; _ < d.length; ++_) { const T = d[_]; if (!(Le(T.to, x.from) < 0 || Le(T.from, x.to) > 0)) { const H = [_, 1]; const X = Le(T.from, x.from); const re = Le(T.to, x.to); (X < 0 || !b.inclusiveLeft && !X) && H.push({ from: T.from, to: x.from }), (re > 0 || !b.inclusiveRight && !re) && H.push({ from: x.to, to: T.to }), d.splice.apply(d, H), _ += H.length - 3 } }
        } return d
      } function ug(r) { const o = r.markedSpans; if (o) { for (let c = 0; c < o.length; ++c)o[c].marker.detachLine(r); r.markedSpans = null } } function fg(r, o) { if (o) { for (let c = 0; c < o.length; ++c)o[c].marker.attachLine(r); r.markedSpans = o } } function nc(r) { return r.inclusiveLeft ? -1 : 0 } function rc(r) { return r.inclusiveRight ? 1 : 0 } function kf(r, o) {
        const c = r.lines.length - o.lines.length; if (c != 0)
          return c; const a = r.find(); const d = o.find(); const m = Le(a.from, d.from) || nc(r) - nc(o); if (m)
          return -m; const b = Le(a.to, d.to) || rc(r) - rc(o); return b || o.id - r.id
      } function dg(r, o) {
        const c = li && r.markedSpans; let a; if (c) {
          for (let d = void 0, m = 0; m < c.length; ++m)d = c[m], d.marker.collapsed && (o ? d.from : d.to) == null && (!a || kf(a, d.marker) < 0) && (a = d.marker)
        } return a
      } function hg(r) { return dg(r, !0) } function ic(r) { return dg(r, !1) } function IS(r, o) {
        const c = li && r.markedSpans; let a; if (c) {
          for (let d = 0; d < c.length; ++d) { const m = c[d]; m.marker.collapsed && (m.from == null || m.from < o) && (m.to == null || m.to > o) && (!a || kf(a, m.marker) < 0) && (a = m.marker) }
        } return a
      } function pg(r, o, c, a, d) {
        const m = Oe(r, o); const b = li && m.markedSpans; if (b) {
          for (let x = 0; x < b.length; ++x) {
            const _ = b[x]; if (_.marker.collapsed) {
              const T = _.marker.find(0); const H = Le(T.from, c) || nc(_.marker) - nc(d); const X = Le(T.to, a) || rc(_.marker) - rc(d); if (!(H >= 0 && X <= 0 || H <= 0 && X >= 0) && (H <= 0 && (_.marker.inclusiveRight && d.inclusiveLeft ? Le(T.to, c) >= 0 : Le(T.to, c) > 0) || H >= 0 && (_.marker.inclusiveRight && d.inclusiveLeft ? Le(T.from, a) <= 0 : Le(T.from, a) < 0)))
                return !0
            }
          }
        }
      } function xr(r) { for (var o; o = hg(r);)r = o.find(-1, !0).line; return r } function PS(r) { for (var o; o = ic(r);)r = o.find(1, !0).line; return r } function OS(r) { for (var o, c; o = ic(r);)r = o.find(1, !0).line, (c || (c = [])).push(r); return c } function Tf(r, o) { const c = Oe(r, o); const a = xr(c); return c == a ? o : N(a) } function gg(r, o) {
        if (o > r.lastLine())
          return o; let c = Oe(r, o); let a; if (!Pi(r, c))
          return o; for (;a = ic(c);)c = a.find(1, !0).line; return N(c) + 1
      } function Pi(r, o) {
        const c = li && o.markedSpans; if (c) {
          for (let a = void 0, d = 0; d < c.length; ++d) {
            if (a = c[d], !!a.marker.collapsed) {
              if (a.from == null)
                return !0; if (!a.marker.widgetNode && a.from == 0 && a.marker.inclusiveLeft && Cf(r, o, a))
                return !0
            }
          }
        }
      } function Cf(r, o, c) {
        if (c.to == null) { const a = c.marker.find(1, !0); return Cf(r, a.line, hl(a.line.markedSpans, c.marker)) } if (c.marker.inclusiveRight && c.to == o.text.length)
          return !0; for (let d = void 0, m = 0; m < o.markedSpans.length; ++m) {
          if (d = o.markedSpans[m], d.marker.collapsed && !d.marker.widgetNode && d.from == c.to && (d.to == null || d.to != c.from) && (d.marker.inclusiveLeft || c.marker.inclusiveRight) && Cf(r, o, d))
            return !0
        }
      } function ai(r) {
        r = xr(r); for (var o = 0, c = r.parent, a = 0; a < c.lines.length; ++a) {
          const d = c.lines[a]; if (d == r)
            break; o += d.height
        } for (let m = c.parent; m; c = m, m = c.parent) {
          for (let b = 0; b < m.children.length; ++b) {
            const x = m.children[b]; if (x == c)
              break; o += x.height
          }
        } return o
      } function oc(r) {
        if (r.height == 0)
          return 0; for (var o = r.text.length, c, a = r; c = hg(a);) { const d = c.find(0, !0); a = d.from.line, o += d.from.ch - d.to.ch } for (a = r; c = ic(a);) { const m = c.find(0, !0); o -= a.text.length - m.from.ch, a = m.to.line, o += a.text.length - m.to.ch } return o
      } function Ef(r) { const o = r.display; const c = r.doc; o.maxLine = Oe(c, c.first), o.maxLineLength = oc(o.maxLine), o.maxLineChanged = !0, c.iter((a) => { const d = oc(a); d > o.maxLineLength && (o.maxLineLength = d, o.maxLine = a) }) } const os = function (r, o, c) { this.text = r, fg(this, o), this.height = c ? c(this) : 1 }; os.prototype.lineNo = function () { return N(this) }, mr(os); function RS(r, o, c, a) { r.text = o, r.stateAfter && (r.stateAfter = null), r.styles && (r.styles = null), r.order != null && (r.order = null), ug(r), fg(r, c); const d = a ? a(r) : 1; d != r.height && Yn(r, d) } function zS(r) { r.parent = null, ug(r) } const DS = {}; const FS = {}; function mg(r, o) {
        if (!r || /^\s*$/.test(r))
          return null; const c = o.addModeClass ? FS : DS; return c[r] || (c[r] = r.replace(/\S+/g, 'cm-$&'))
      } function vg(r, o) { const c = R('span', null, null, g ? 'padding-right: .1px' : null); const a = { pre: R('pre', [c], 'CodeMirror-line'), content: c, col: 0, pos: 0, cm: r, trailingSpace: !1, splitSpaces: r.getOption('lineWrapping') }; o.measure = {}; for (let d = 0; d <= (o.rest ? o.rest.length : 0); d++) { const m = d ? o.rest[d - 1] : o.line; let b = void 0; a.pos = 0, a.addToken = BS, Mi(r.display.measure) && (b = tt(m, r.doc.direction)) && (a.addToken = jS(a.addToken, b)), a.map = []; const x = o != r.display.externalMeasured && N(m); qS(m, a, ng(r, m, x)), m.styleClasses && (m.styleClasses.bgClass && (a.bgClass = Pe(m.styleClasses.bgClass, a.bgClass || '')), m.styleClasses.textClass && (a.textClass = Pe(m.styleClasses.textClass, a.textClass || ''))), a.map.length == 0 && a.map.push(0, 0, a.content.appendChild(Za(r.display.measure))), d == 0 ? (o.measure.map = a.map, o.measure.cache = {}) : ((o.measure.maps || (o.measure.maps = [])).push(a.map), (o.measure.caches || (o.measure.caches = [])).push({})) } if (g) { const _ = a.content.lastChild; (/\bcm-tab\b/.test(_.className) || _.querySelector && _.querySelector('.cm-tab')) && (a.content.className = 'cm-tab-wrap-hack') } return Pt(r, 'renderLine', r, o.line, a.pre), a.pre.className && (a.textClass = Pe(a.pre.className, a.textClass || '')), a } function HS(r) { const o = S('span', '•', 'cm-invalidchar'); return o.title = `\\u${r.charCodeAt(0).toString(16)}`, o.setAttribute('aria-label', o.title), o } function BS(r, o, c, a, d, m, b) {
        if (o) {
          const x = r.splitSpaces ? WS(o, r.trailingSpace) : o; const _ = r.cm.state.specialChars; let T = !1; let H; if (!_.test(o)) {
            r.col += o.length, H = document.createTextNode(x), r.map.push(r.pos, r.pos + o.length, H), h && p < 9 && (T = !0), r.pos += o.length
          }
          else {
            H = document.createDocumentFragment(); for (let X = 0; ;) {
              _.lastIndex = X; const re = _.exec(o); const Z = re ? re.index - X : o.length - X; if (Z) { const ce = document.createTextNode(x.slice(X, X + Z)); h && p < 9 ? H.appendChild(S('span', [ce])) : H.appendChild(ce), r.map.push(r.pos, r.pos + Z, ce), r.col += Z, r.pos += Z } if (!re)
                break; X += Z + 1; let me = void 0; if (re[0] == '	') { const Se = r.cm.options.tabSize; const ke = Se - r.col % Se; me = H.appendChild(S('span', Ee(ke), 'cm-tab')), me.setAttribute('role', 'presentation'), me.setAttribute('cm-text', '	'), r.col += ke }
              else {
                re[0] == '\r' || re[0] == `
`
                  ? (me = H.appendChild(S('span', re[0] == '\r' ? '␍' : '␤', 'cm-invalidchar')), me.setAttribute('cm-text', re[0]), r.col += 1)
                  : (me = r.cm.options.specialCharPlaceholder(re[0]), me.setAttribute('cm-text', re[0]), h && p < 9 ? H.appendChild(S('span', [me])) : H.appendChild(me), r.col += 1)
              }r.map.push(r.pos, r.pos + 1, me), r.pos++
            }
          } if (r.trailingSpace = x.charCodeAt(o.length - 1) == 32, c || a || d || T || m || b) {
            let $e = c || ''; a && ($e += a), d && ($e += d); const Te = S('span', [H], $e, m); if (b) {
              for (const Ne in b)b.hasOwnProperty(Ne) && Ne != 'style' && Ne != 'class' && Te.setAttribute(Ne, b[Ne])
            } return r.content.appendChild(Te)
          }r.content.appendChild(H)
        }
      } function WS(r, o) {
        if (r.length > 1 && !/ {2}/.test(r))
          return r; for (var c = o, a = '', d = 0; d < r.length; d++) { let m = r.charAt(d); m == ' ' && c && (d == r.length - 1 || r.charCodeAt(d + 1) == 32) && (m = ' '), a += m, c = m == ' ' } return a
      } function jS(r, o) {
        return function (c, a, d, m, b, x, _) {
          d = d ? `${d} cm-force-border` : 'cm-force-border'; for (let T = c.pos, H = T + a.length; ;) {
            for (var X = void 0, re = 0; re < o.length && (X = o[re], !(X.to > T && X.from <= T)); re++);if (X.to >= H)
              return r(c, a, d, m, b, x, _); r(c, a.slice(0, X.to - T), d, m, null, x, _), m = null, a = a.slice(X.to - T), T = X.to
          }
        }
      } function yg(r, o, c, a) { let d = !a && c.widgetNode; d && r.map.push(r.pos, r.pos + o, d), !a && r.cm.display.input.needsContentAttribute && (d || (d = r.content.appendChild(document.createElement('span'))), d.setAttribute('cm-marker', c.id)), d && (r.cm.display.input.setUneditable(d), r.content.appendChild(d)), r.pos += o, r.trailingSpace = !1 } function qS(r, o, c) {
        const a = r.markedSpans; const d = r.text; let m = 0; if (!a) { for (let b = 1; b < c.length; b += 2)o.addToken(o, d.slice(m, m = c[b]), mg(c[b + 1], o.cm.options)); return } for (var x = d.length, _ = 0, T = 1, H = '', X, re, Z = 0, ce, me, Se, ke, $e; ;) {
          if (Z == _) {
            ce = me = Se = re = '', $e = null, ke = null, Z = 1 / 0; for (var Te = [], Ne = void 0, Be = 0; Be < a.length; ++Be) {
              const ze = a[Be]; const Qe = ze.marker; if (Qe.type == 'bookmark' && ze.from == _ && Qe.widgetNode) {
                Te.push(Qe)
              }
              else if (ze.from <= _ && (ze.to == null || ze.to > _ || Qe.collapsed && ze.to == _ && ze.from == _)) {
                if (ze.to != null && ze.to != _ && Z > ze.to && (Z = ze.to, me = ''), Qe.className && (ce += ` ${Qe.className}`), Qe.css && (re = (re ? `${re};` : '') + Qe.css), Qe.startStyle && ze.from == _ && (Se += ` ${Qe.startStyle}`), Qe.endStyle && ze.to == Z && (Ne || (Ne = [])).push(Qe.endStyle, ze.to), Qe.title && (($e || ($e = {})).title = Qe.title), Qe.attributes) {
                  for (const xt in Qe.attributes)($e || ($e = {}))[xt] = Qe.attributes[xt]
                } Qe.collapsed && (!ke || kf(ke.marker, Qe) < 0) && (ke = ze)
              }
              else {
                ze.from > _ && Z > ze.from && (Z = ze.from)
              }
            } if (Ne) {
              for (let Qt = 0; Qt < Ne.length; Qt += 2)Ne[Qt + 1] == Z && (me += ` ${Ne[Qt]}`)
            } if (!ke || ke.from == _) {
              for (let $t = 0; $t < Te.length; ++$t)yg(o, 0, Te[$t])
            } if (ke && (ke.from || 0) == _) {
              if (yg(o, (ke.to == null ? x + 1 : ke.to) - _, ke.marker, ke.from == null), ke.to == null)
                return; ke.to == _ && (ke = !1)
            }
          } if (_ >= x)
            break; for (let Wn = Math.min(x, Z); ;) { if (H) { const Cn = _ + H.length; if (!ke) { const Wt = Cn > Wn ? H.slice(0, Wn - _) : H; o.addToken(o, Wt, X ? X + ce : ce, Se, _ + Wt.length == Z ? me : '', re, $e) } if (Cn >= Wn) { H = H.slice(Wn - _), _ = Wn; break }_ = Cn, Se = '' }H = d.slice(m, m = c[T++]), X = mg(c[T++], o.cm.options) }
        }
      } function bg(r, o, c) { this.line = o, this.rest = OS(o), this.size = this.rest ? N(ve(this.rest)) - c + 1 : 1, this.node = this.text = null, this.hidden = Pi(r, o) } function sc(r, o, c) { for (var a = [], d, m = o; m < c; m = d) { const b = new bg(r.doc, Oe(r.doc, m), m); d = m + b.size, a.push(b) } return a } let ss = null; function US(r) { ss ? ss.ops.push(r) : r.ownsGroup = ss = { ops: [r], delayedCallbacks: [] } } function VS(r) {
        const o = r.delayedCallbacks; let c = 0; do {
          for (;c < o.length; c++)o[c].call(null); for (let a = 0; a < r.ops.length; a++) {
            const d = r.ops[a]; if (d.cursorActivityHandlers) {
              for (;d.cursorActivityCalled < d.cursorActivityHandlers.length;)d.cursorActivityHandlers[d.cursorActivityCalled++].call(null, d.cm)
            }
          }
        } while (c < o.length)
      } function GS(r, o) {
        const c = r.ownsGroup; if (c) {
          try { VS(c) }
          finally { ss = null, o(c) }
        }
      } let pl = null; function Jt(r, o) { const c = oi(r, o); if (c.length) { const a = Array.prototype.slice.call(arguments, 2); let d; ss ? d = ss.delayedCallbacks : pl ? d = pl : (d = pl = [], setTimeout(XS, 0)); for (let m = function (x) { d.push(() => { return c[x].apply(null, a) }) }, b = 0; b < c.length; ++b)m(b) } } function XS() { const r = pl; pl = null; for (let o = 0; o < r.length; ++o)r[o]() } function wg(r, o, c, a) { for (let d = 0; d < o.changes.length; d++) { const m = o.changes[d]; m == 'text' ? JS(r, o) : m == 'gutter' ? Sg(r, o, c, a) : m == 'class' ? Af(r, o) : m == 'widget' && YS(r, o, a) }o.changes = null } function gl(r) { return r.node == r.text && (r.node = S('div', null, null, 'position: relative'), r.text.parentNode && r.text.parentNode.replaceChild(r.node, r.text), r.node.appendChild(r.text), h && p < 8 && (r.node.style.zIndex = 2)), r.node } function KS(r, o) {
        let c = o.bgClass ? `${o.bgClass} ${o.line.bgClass || ''}` : o.line.bgClass; if (c && (c += ' CodeMirror-linebackground'), o.background) {
          c ? o.background.className = c : (o.background.parentNode.removeChild(o.background), o.background = null)
        }
        else if (c) { const a = gl(o); o.background = a.insertBefore(S('div', null, c), a.firstChild), r.display.input.setUneditable(o.background) }
      } function xg(r, o) { const c = r.display.externalMeasured; return c && c.line == o.line ? (r.display.externalMeasured = null, o.measure = c.measure, c.built) : vg(r, o) } function JS(r, o) { const c = o.text.className; const a = xg(r, o); o.text == o.node && (o.node = a.pre), o.text.parentNode.replaceChild(a.pre, o.text), o.text = a.pre, a.bgClass != o.bgClass || a.textClass != o.textClass ? (o.bgClass = a.bgClass, o.textClass = a.textClass, Af(r, o)) : c && (o.text.className = c) } function Af(r, o) { KS(r, o), o.line.wrapClass ? gl(o).className = o.line.wrapClass : o.node != o.text && (o.node.className = ''); const c = o.textClass ? `${o.textClass} ${o.line.textClass || ''}` : o.line.textClass; o.text.className = c || '' } function Sg(r, o, c, a) {
        if (o.gutter && (o.node.removeChild(o.gutter), o.gutter = null), o.gutterBackground && (o.node.removeChild(o.gutterBackground), o.gutterBackground = null), o.line.gutterClass) { const d = gl(o); o.gutterBackground = S('div', null, `CodeMirror-gutter-background ${o.line.gutterClass}`, `left: ${r.options.fixedGutter ? a.fixedPos : -a.gutterTotalWidth}px; width: ${a.gutterTotalWidth}px`), r.display.input.setUneditable(o.gutterBackground), d.insertBefore(o.gutterBackground, o.text) } const m = o.line.gutterMarkers; if (r.options.lineNumbers || m) {
          const b = gl(o); const x = o.gutter = S('div', null, 'CodeMirror-gutter-wrapper', `left: ${r.options.fixedGutter ? a.fixedPos : -a.gutterTotalWidth}px`); if (x.setAttribute('aria-hidden', 'true'), r.display.input.setUneditable(x), b.insertBefore(x, o.text), o.line.gutterClass && (x.className += ` ${o.line.gutterClass}`), r.options.lineNumbers && (!m || !m['CodeMirror-linenumbers']) && (o.lineNumber = x.appendChild(S('div', xe(r.options, c), 'CodeMirror-linenumber CodeMirror-gutter-elt', `left: ${a.gutterLeft['CodeMirror-linenumbers']}px; width: ${r.display.lineNumInnerWidth}px`))), m) {
            for (let _ = 0; _ < r.display.gutterSpecs.length; ++_) { const T = r.display.gutterSpecs[_].className; const H = m.hasOwnProperty(T) && m[T]; H && x.appendChild(S('div', [H], 'CodeMirror-gutter-elt', `left: ${a.gutterLeft[T]}px; width: ${a.gutterWidth[T]}px`)) }
          }
        }
      } function YS(r, o, c) { o.alignable && (o.alignable = null); for (let a = K('CodeMirror-linewidget'), d = o.node.firstChild, m = void 0; d; d = m)m = d.nextSibling, a.test(d.className) && o.node.removeChild(d); _g(r, o, c) } function ZS(r, o, c, a) { const d = xg(r, o); return o.text = o.node = d.pre, d.bgClass && (o.bgClass = d.bgClass), d.textClass && (o.textClass = d.textClass), Af(r, o), Sg(r, o, c, a), _g(r, o, a), o.node } function _g(r, o, c) {
        if (kg(r, o.line, o, c, !0), o.rest) {
          for (let a = 0; a < o.rest.length; a++)kg(r, o.rest[a], o, c, !1)
        }
      } function kg(r, o, c, a, d) {
        if (o.widgets) {
          for (let m = gl(c), b = 0, x = o.widgets; b < x.length; ++b) { const _ = x[b]; const T = S('div', [_.node], `CodeMirror-linewidget${_.className ? ` ${_.className}` : ''}`); _.handleMouseEvents || T.setAttribute('cm-ignore-events', 'true'), QS(_, T, c, a), r.display.input.setUneditable(T), d && _.above ? m.insertBefore(T, c.gutter || c.text) : m.appendChild(T), Jt(_, 'redraw') }
        }
      } function QS(r, o, c, a) { if (r.noHScroll) { (c.alignable || (c.alignable = [])).push(o); let d = a.wrapperWidth; o.style.left = `${a.fixedPos}px`, r.coverGutter || (d -= a.gutterTotalWidth, o.style.paddingLeft = `${a.gutterTotalWidth}px`), o.style.width = `${d}px` }r.coverGutter && (o.style.zIndex = 5, o.style.position = 'relative', r.noHScroll || (o.style.marginLeft = `${-a.gutterTotalWidth}px`)) } function ml(r) {
        if (r.height != null)
          return r.height; const o = r.doc.cm; if (!o)
          return 0; if (!oe(document.body, r.node)) { let c = 'position: relative;'; r.coverGutter && (c += `margin-left: -${o.display.gutters.offsetWidth}px;`), r.noHScroll && (c += `width: ${o.display.wrapper.clientWidth}px;`), I(o.display.measure, S('div', [r.node], null, c)) } return r.height = r.node.parentNode.offsetHeight
      } function ci(r, o) {
        for (let c = al(o); c != r.wrapper; c = c.parentNode) {
          if (!c || c.nodeType == 1 && c.getAttribute('cm-ignore-events') == 'true' || c.parentNode == r.sizer && c != r.mover)
            return !0
        }
      } function lc(r) { return r.lineSpace.offsetTop } function Lf(r) { return r.mover.offsetHeight - r.lineSpace.offsetHeight } function Tg(r) {
        if (r.cachedPaddingH)
          return r.cachedPaddingH; const o = I(r.measure, S('pre', 'x', 'CodeMirror-line-like')); const c = window.getComputedStyle ? window.getComputedStyle(o) : o.currentStyle; const a = { left: Number.parseInt(c.paddingLeft), right: Number.parseInt(c.paddingRight) }; return !isNaN(a.left) && !isNaN(a.right) && (r.cachedPaddingH = a), a
      } function jr(r) { return F - r.display.nativeBarWidth } function So(r) { return r.display.scroller.clientWidth - jr(r) - r.display.barWidth } function $f(r) { return r.display.scroller.clientHeight - jr(r) - r.display.barHeight } function e_(r, o, c) { const a = r.options.lineWrapping; const d = a && So(r); if (!o.measure.heights || a && o.measure.width != d) { const m = o.measure.heights = []; if (a) { o.measure.width = d; for (let b = o.text.firstChild.getClientRects(), x = 0; x < b.length - 1; x++) { const _ = b[x]; const T = b[x + 1]; Math.abs(_.bottom - T.bottom) > 2 && m.push((_.bottom + T.top) / 2 - c.top) } }m.push(c.bottom - c.top) } } function Cg(r, o, c) {
        if (r.line == o)
          return { map: r.measure.map, cache: r.measure.cache }; if (r.rest) {
          for (let a = 0; a < r.rest.length; a++) {
            if (r.rest[a] == o)
              return { map: r.measure.maps[a], cache: r.measure.caches[a] }
          } for (let d = 0; d < r.rest.length; d++) {
            if (N(r.rest[d]) > c)
              return { map: r.measure.maps[d], cache: r.measure.caches[d], before: !0 }
          }
        }
      } function t_(r, o) { o = xr(o); const c = N(o); const a = r.display.externalMeasured = new bg(r.doc, o, c); a.lineN = c; const d = a.built = vg(r, a); return a.text = d.pre, I(r.display.lineMeasure, d.pre), a } function Eg(r, o, c, a) { return qr(r, ls(r, o), c, a) } function Mf(r, o) {
        if (o >= r.display.viewFrom && o < r.display.viewTo)
          return r.display.view[To(r, o)]; const c = r.display.externalMeasured; if (c && o >= c.lineN && o < c.lineN + c.size)
          return c
      } function ls(r, o) { const c = N(o); let a = Mf(r, c); a && !a.text ? a = null : a && a.changes && (wg(r, a, c, Rf(r)), r.curOp.forceUpdate = !0), a || (a = t_(r, o)); const d = Cg(a, o, c); return { line: o, view: a, rect: null, map: d.map, cache: d.cache, before: d.before, hasHeights: !1 } } function qr(r, o, c, a, d) { o.before && (c = -1); const m = c + (a || ''); let b; return o.cache.hasOwnProperty(m) ? b = o.cache[m] : (o.rect || (o.rect = o.view.text.getBoundingClientRect()), o.hasHeights || (e_(r, o.view, o.rect), o.hasHeights = !0), b = r_(r, o, c, a), b.bogus || (o.cache[m] = b)), { left: b.left, right: b.right, top: d ? b.rtop : b.top, bottom: d ? b.rbottom : b.bottom } } const Ag = { left: 0, right: 0, top: 0, bottom: 0 }; function Lg(r, o, c) {
        for (var a, d, m, b, x, _, T = 0; T < r.length; T += 3) {
          if (x = r[T], _ = r[T + 1], o < x ? (d = 0, m = 1, b = 'left') : o < _ ? (d = o - x, m = d + 1) : (T == r.length - 3 || o == _ && r[T + 3] > o) && (m = _ - x, d = m - 1, o >= _ && (b = 'right')), d != null) {
            if (a = r[T + 2], x == _ && c == (a.insertLeft ? 'left' : 'right') && (b = c), c == 'left' && d == 0) {
              for (;T && r[T - 2] == r[T - 3] && r[T - 1].insertLeft;)a = r[(T -= 3) + 2], b = 'left'
            } if (c == 'right' && d == _ - x) {
              for (;T < r.length - 3 && r[T + 3] == r[T + 4] && !r[T + 5].insertLeft;)a = r[(T += 3) + 2], b = 'right'
            } break
          }
        } return { node: a, start: d, end: m, collapse: b, coverStart: x, coverEnd: _ }
      } function n_(r, o) {
        let c = Ag; if (o == 'left') {
          for (let a = 0; a < r.length && (c = r[a]).left == c.right; a++);
        }
        else {
          for (let d = r.length - 1; d >= 0 && (c = r[d]).left == c.right; d--);
        } return c
      } function r_(r, o, c, a) {
        const d = Lg(o.map, c, a); const m = d.node; let b = d.start; let x = d.end; let _ = d.collapse; let T; if (m.nodeType == 3) {
          for (let H = 0; H < 4; H++) {
            for (;b && lt(o.line.text.charAt(d.coverStart + b));)--b; for (;d.coverStart + x < d.coverEnd && lt(o.line.text.charAt(d.coverStart + x));)++x; if (h && p < 9 && b == 0 && x == d.coverEnd - d.coverStart ? T = m.parentNode.getBoundingClientRect() : T = n_(B(m, b, x).getClientRects(), a), T.left || T.right || b == 0)
              break; x = b, b = b - 1, _ = 'right'
          }h && p < 11 && (T = i_(r.display.measure, T))
        }
        else { b > 0 && (_ = a = 'right'); let X; r.options.lineWrapping && (X = m.getClientRects()).length > 1 ? T = X[a == 'right' ? X.length - 1 : 0] : T = m.getBoundingClientRect() } if (h && p < 9 && !b && (!T || !T.left && !T.right)) { const re = m.parentNode.getClientRects()[0]; re ? T = { left: re.left, right: re.left + cs(r.display), top: re.top, bottom: re.bottom } : T = Ag } for (var Z = T.top - o.rect.top, ce = T.bottom - o.rect.top, me = (Z + ce) / 2, Se = o.view.measure.heights, ke = 0; ke < Se.length - 1 && !(me < Se[ke]); ke++);const $e = ke ? Se[ke - 1] : 0; const Te = Se[ke]; const Ne = { left: (_ == 'right' ? T.right : T.left) - o.rect.left, right: (_ == 'left' ? T.left : T.right) - o.rect.left, top: $e, bottom: Te }; return !T.left && !T.right && (Ne.bogus = !0), r.options.singleCursorHeightPerLine || (Ne.rtop = Z, Ne.rbottom = ce), Ne
      } function i_(r, o) {
        if (!window.screen || screen.logicalXDPI == null || screen.logicalXDPI == screen.deviceXDPI || !wf(r))
          return o; const c = screen.logicalXDPI / screen.deviceXDPI; const a = screen.logicalYDPI / screen.deviceYDPI; return { left: o.left * c, right: o.right * c, top: o.top * a, bottom: o.bottom * a }
      } function $g(r) {
        if (r.measure && (r.measure.cache = {}, r.measure.heights = null, r.rest)) {
          for (let o = 0; o < r.rest.length; o++)r.measure.caches[o] = {}
        }
      } function Mg(r) { r.display.externalMeasure = null, P(r.display.lineMeasure); for (let o = 0; o < r.display.view.length; o++)$g(r.display.view[o]) } function vl(r) { Mg(r), r.display.cachedCharWidth = r.display.cachedTextHeight = r.display.cachedPaddingH = null, r.options.lineWrapping || (r.display.maxLineChanged = !0), r.display.lineNumChars = null } function Ng(r) { return y && O ? -(r.body.getBoundingClientRect().left - Number.parseInt(getComputedStyle(r.body).marginLeft)) : r.defaultView.pageXOffset || (r.documentElement || r.body).scrollLeft } function Ig(r) { return y && O ? -(r.body.getBoundingClientRect().top - Number.parseInt(getComputedStyle(r.body).marginTop)) : r.defaultView.pageYOffset || (r.documentElement || r.body).scrollTop } function Nf(r) {
        const o = xr(r); const c = o.widgets; let a = 0; if (c) {
          for (let d = 0; d < c.length; ++d)c[d].above && (a += ml(c[d]))
        } return a
      } function ac(r, o, c, a, d) {
        if (!d) { const m = Nf(o); c.top += m, c.bottom += m } if (a == 'line')
          return c; a || (a = 'local'); let b = ai(o); if (a == 'local' ? b += lc(r.display) : b -= r.display.viewOffset, a == 'page' || a == 'window') { const x = r.display.lineSpace.getBoundingClientRect(); b += x.top + (a == 'window' ? 0 : Ig(Ze(r))); const _ = x.left + (a == 'window' ? 0 : Ng(Ze(r))); c.left += _, c.right += _ } return c.top += b, c.bottom += b, c
      } function Pg(r, o, c) {
        if (c == 'div')
          return o; let a = o.left; let d = o.top; if (c == 'page') {
          a -= Ng(Ze(r)), d -= Ig(Ze(r))
        }
        else if (c == 'local' || !c) { const m = r.display.sizer.getBoundingClientRect(); a += m.left, d += m.top } const b = r.display.lineSpace.getBoundingClientRect(); return { left: a - b.left, top: d - b.top }
      } function cc(r, o, c, a, d) { return a || (a = Oe(r.doc, o.line)), ac(r, a, Eg(r, a, o.ch, d), c) } function Sr(r, o, c, a, d, m) {
        a = a || Oe(r.doc, o.line), d || (d = ls(r, a)); function b(ce, me) { const Se = qr(r, d, ce, me ? 'right' : 'left', m); return me ? Se.left = Se.right : Se.right = Se.left, ac(r, a, Se, c) } const x = tt(a, r.doc.direction); let _ = o.ch; let T = o.sticky; if (_ >= a.text.length ? (_ = a.text.length, T = 'before') : _ <= 0 && (_ = 0, T = 'after'), !x)
          return b(T == 'before' ? _ - 1 : _, T == 'before'); function H(ce, me, Se) { const ke = x[me]; const $e = ke.level == 1; return b(Se ? ce - 1 : ce, $e != Se) } const X = Ft(x, _, T); const re = Hr; const Z = H(_, X, T == 'before'); return re != null && (Z.other = H(_, re, T != 'before')), Z
      } function Og(r, o) { let c = 0; o = Xe(r.doc, o), r.options.lineWrapping || (c = cs(r.display) * o.ch); const a = Oe(r.doc, o.line); const d = ai(a) + lc(r.display); return { left: c, right: c, top: d, bottom: d + a.height } } function If(r, o, c, a, d) { const m = le(r, o, c); return m.xRel = d, a && (m.outside = a), m } function Pf(r, o, c) {
        const a = r.doc; if (c += r.display.viewOffset, c < 0)
          return If(a.first, 0, null, -1, -1); let d = G(a, c); const m = a.first + a.size - 1; if (d > m)
          return If(a.first + a.size - 1, Oe(a, m).text.length, null, 1, 1); o < 0 && (o = 0); for (let b = Oe(a, d); ;) {
          const x = o_(r, b, d, o, c); const _ = IS(b, x.ch + (x.xRel > 0 || x.outside > 0 ? 1 : 0)); if (!_)
            return x; const T = _.find(1); if (T.line == d)
            return T; b = Oe(a, d = T.line)
        }
      } function Rg(r, o, c, a) { a -= Nf(o); let d = o.text.length; const m = Bt((b) => { return qr(r, c, b - 1).bottom <= a }, d, 0); return d = Bt((b) => { return qr(r, c, b).top > a }, m, d), { begin: m, end: d } } function zg(r, o, c, a) { c || (c = ls(r, o)); const d = ac(r, o, qr(r, c, a), 'line').top; return Rg(r, o, c, d) } function Of(r, o, c, a) { return r.bottom <= c ? !1 : r.top > c ? !0 : (a ? r.left : r.right) > o } function o_(r, o, c, a, d) {
        d -= ai(o); const m = ls(r, o); const b = Nf(o); let x = 0; let _ = o.text.length; let T = !0; const H = tt(o, r.doc.direction); if (H) { const X = (r.options.lineWrapping ? l_ : s_)(r, o, c, m, H, a, d); T = X.level != 1, x = T ? X.from : X.to - 1, _ = T ? X.to : X.from - 1 } let re = null; let Z = null; let ce = Bt((Be) => { const ze = qr(r, m, Be); return ze.top += b, ze.bottom += b, Of(ze, a, d, !1) ? (ze.top <= d && ze.left <= a && (re = Be, Z = ze), !0) : !1 }, x, _); let me; let Se; let ke = !1; if (Z) { const $e = a - Z.left < Z.right - a; const Te = $e == T; ce = re + (Te ? 0 : 1), Se = Te ? 'after' : 'before', me = $e ? Z.left : Z.right }
        else { !T && (ce == _ || ce == x) && ce++, Se = ce == 0 ? 'after' : ce == o.text.length ? 'before' : qr(r, m, ce - (T ? 1 : 0)).bottom + b <= d == T ? 'after' : 'before'; const Ne = Sr(r, le(c, ce, Se), 'line', o, m); me = Ne.left, ke = d < Ne.top ? -1 : d >= Ne.bottom ? 1 : 0 } return ce = Xt(o.text, ce, 1), If(c, ce, Se, ke, a - me)
      } function s_(r, o, c, a, d, m, b) { const x = Bt((X) => { const re = d[X]; const Z = re.level != 1; return Of(Sr(r, le(c, Z ? re.to : re.from, Z ? 'before' : 'after'), 'line', o, a), m, b, !0) }, 0, d.length - 1); let _ = d[x]; if (x > 0) { const T = _.level != 1; const H = Sr(r, le(c, T ? _.from : _.to, T ? 'after' : 'before'), 'line', o, a); Of(H, m, b, !0) && H.top > b && (_ = d[x - 1]) } return _ } function l_(r, o, c, a, d, m, b) { const x = Rg(r, o, a, b); const _ = x.begin; let T = x.end; /\s/.test(o.text.charAt(T - 1)) && T--; for (var H = null, X = null, re = 0; re < d.length; re++) { const Z = d[re]; if (!(Z.from >= T || Z.to <= _)) { const ce = Z.level != 1; const me = qr(r, a, ce ? Math.min(T, Z.to) - 1 : Math.max(_, Z.from)).right; const Se = me < m ? m - me + 1e9 : me - m; (!H || X > Se) && (H = Z, X = Se) } } return H || (H = d[d.length - 1]), H.from < _ && (H = { from: _, to: H.to, level: H.level }), H.to > T && (H = { from: H.from, to: T, level: H.level }), H } let _o; function as(r) {
        if (r.cachedTextHeight != null)
          return r.cachedTextHeight; if (_o == null) { _o = S('pre', null, 'CodeMirror-line-like'); for (let o = 0; o < 49; ++o)_o.appendChild(document.createTextNode('x')), _o.appendChild(S('br')); _o.appendChild(document.createTextNode('x')) }I(r.measure, _o); const c = _o.offsetHeight / 50; return c > 3 && (r.cachedTextHeight = c), P(r.measure), c || 1
      } function cs(r) {
        if (r.cachedCharWidth != null)
          return r.cachedCharWidth; const o = S('span', 'xxxxxxxxxx'); const c = S('pre', [o], 'CodeMirror-line-like'); I(r.measure, c); const a = o.getBoundingClientRect(); const d = (a.right - a.left) / 10; return d > 2 && (r.cachedCharWidth = d), d || 10
      } function Rf(r) { for (var o = r.display, c = {}, a = {}, d = o.gutters.clientLeft, m = o.gutters.firstChild, b = 0; m; m = m.nextSibling, ++b) { const x = r.display.gutterSpecs[b].className; c[x] = m.offsetLeft + m.clientLeft + d, a[x] = m.clientWidth } return { fixedPos: zf(o), gutterTotalWidth: o.gutters.offsetWidth, gutterLeft: c, gutterWidth: a, wrapperWidth: o.wrapper.clientWidth } } function zf(r) { return r.scroller.getBoundingClientRect().left - r.sizer.getBoundingClientRect().left } function Dg(r) {
        const o = as(r.display); const c = r.options.lineWrapping; const a = c && Math.max(5, r.display.scroller.clientWidth / cs(r.display) - 3); return function (d) {
          if (Pi(r.doc, d))
            return 0; let m = 0; if (d.widgets) {
            for (let b = 0; b < d.widgets.length; b++)d.widgets[b].height && (m += d.widgets[b].height)
          } return c ? m + (Math.ceil(d.text.length / a) || 1) * o : m + o
        }
      } function Df(r) { const o = r.doc; const c = Dg(r); o.iter((a) => { const d = c(a); d != a.height && Yn(a, d) }) } function ko(r, o, c, a) {
        const d = r.display; if (!c && al(o).getAttribute('cm-not-content') == 'true')
          return null; let m; let b; const x = d.lineSpace.getBoundingClientRect(); try { m = o.clientX - x.left, b = o.clientY - x.top }
        catch { return null } let _ = Pf(r, m, b); let T; if (a && _.xRel > 0 && (T = Oe(r.doc, _.line).text).length == _.ch) { const H = J(T, T.length, r.options.tabSize) - T.length; _ = le(_.line, Math.max(0, Math.round((m - Tg(r.display).left) / cs(r.display)) - H)) } return _
      } function To(r, o) {
        if (o >= r.display.viewTo || (o -= r.display.viewFrom, o < 0))
          return null; for (let c = r.display.view, a = 0; a < c.length; a++) {
          if (o -= c[a].size, o < 0)
            return a
        }
      } function kn(r, o, c, a) {
        o == null && (o = r.doc.first), c == null && (c = r.doc.first + r.doc.size), a || (a = 0); const d = r.display; if (a && c < d.viewTo && (d.updateLineNumbers == null || d.updateLineNumbers > o) && (d.updateLineNumbers = o), r.curOp.viewChanged = !0, o >= d.viewTo) {
          li && Tf(r.doc, o) < d.viewTo && Ri(r)
        }
        else if (c <= d.viewFrom) {
          li && gg(r.doc, c + a) > d.viewFrom ? Ri(r) : (d.viewFrom += a, d.viewTo += a)
        }
        else if (o <= d.viewFrom && c >= d.viewTo) {
          Ri(r)
        }
        else if (o <= d.viewFrom) { const m = uc(r, c, c + a, 1); m ? (d.view = d.view.slice(m.index), d.viewFrom = m.lineN, d.viewTo += a) : Ri(r) }
        else if (c >= d.viewTo) { const b = uc(r, o, o, -1); b ? (d.view = d.view.slice(0, b.index), d.viewTo = b.lineN) : Ri(r) }
        else { const x = uc(r, o, o, -1); const _ = uc(r, c, c + a, 1); x && _ ? (d.view = d.view.slice(0, x.index).concat(sc(r, x.lineN, _.lineN)).concat(d.view.slice(_.index)), d.viewTo += a) : Ri(r) } const T = d.externalMeasured; T && (c < T.lineN ? T.lineN += a : o < T.lineN + T.size && (d.externalMeasured = null))
      } function Oi(r, o, c) { r.curOp.viewChanged = !0; const a = r.display; const d = r.display.externalMeasured; if (d && o >= d.lineN && o < d.lineN + d.size && (a.externalMeasured = null), !(o < a.viewFrom || o >= a.viewTo)) { const m = a.view[To(r, o)]; if (m.node != null) { const b = m.changes || (m.changes = []); ge(b, c) == -1 && b.push(c) } } } function Ri(r) { r.display.viewFrom = r.display.viewTo = r.doc.first, r.display.view = [], r.display.viewOffset = 0 } function uc(r, o, c, a) {
        let d = To(r, o); let m; const b = r.display.view; if (!li || c == r.doc.first + r.doc.size)
          return { index: d, lineN: c }; for (var x = r.display.viewFrom, _ = 0; _ < d; _++)x += b[_].size; if (x != o) {
          if (a > 0) {
            if (d == b.length - 1)
              return null; m = x + b[d].size - o, d++
          }
          else {
            m = x - o
          }o += m, c += m
        } for (;Tf(r.doc, c) != c;) {
          if (d == (a < 0 ? 0 : b.length - 1))
            return null; c += a * b[d - (a < 0 ? 1 : 0)].size, d += a
        } return { index: d, lineN: c }
      } function a_(r, o, c) { const a = r.display; const d = a.view; d.length == 0 || o >= a.viewTo || c <= a.viewFrom ? (a.view = sc(r, o, c), a.viewFrom = o) : (a.viewFrom > o ? a.view = sc(r, o, a.viewFrom).concat(a.view) : a.viewFrom < o && (a.view = a.view.slice(To(r, o))), a.viewFrom = o, a.viewTo < c ? a.view = a.view.concat(sc(r, a.viewTo, c)) : a.viewTo > c && (a.view = a.view.slice(0, To(r, c)))), a.viewTo = c } function Fg(r) { for (var o = r.display.view, c = 0, a = 0; a < o.length; a++) { const d = o[a]; !d.hidden && (!d.node || d.changes) && ++c } return c } function yl(r) { r.display.input.showSelection(r.display.input.prepareSelection()) } function Hg(r, o) {
        o === void 0 && (o = !0); const c = r.doc; const a = {}; const d = a.cursors = document.createDocumentFragment(); const m = a.selection = document.createDocumentFragment(); const b = r.options.$customCursor; b && (o = !0); for (let x = 0; x < c.sel.ranges.length; x++) {
          if (!(!o && x == c.sel.primIndex)) {
            const _ = c.sel.ranges[x]; if (!(_.from().line >= r.display.viewTo || _.to().line < r.display.viewFrom)) {
              const T = _.empty(); if (b) { const H = b(r, _); H && Ff(r, H, d) }
              else {
                (T || r.options.showCursorWhenSelecting) && Ff(r, _.head, d)
              } T || c_(r, _, m)
            }
          }
        } return a
      } function Ff(r, o, c) { const a = Sr(r, o, 'div', null, null, !r.options.singleCursorHeightPerLine); const d = c.appendChild(S('div', ' ', 'CodeMirror-cursor')); if (d.style.left = `${a.left}px`, d.style.top = `${a.top}px`, d.style.height = `${Math.max(0, a.bottom - a.top) * r.options.cursorHeight}px`, /\bcm-fat-cursor\b/.test(r.getWrapperElement().className)) { const m = cc(r, o, 'div', null, null); const b = m.right - m.left; d.style.width = `${b > 0 ? b : r.defaultCharWidth()}px` } if (a.other) { const x = c.appendChild(S('div', ' ', 'CodeMirror-cursor CodeMirror-secondarycursor')); x.style.display = '', x.style.left = `${a.other.left}px`, x.style.top = `${a.other.top}px`, x.style.height = `${(a.other.bottom - a.other.top) * 0.85}px` } } function fc(r, o) { return r.top - o.top || r.left - o.left } function c_(r, o, c) {
        const a = r.display; const d = r.doc; const m = document.createDocumentFragment(); const b = Tg(r.display); const x = b.left; const _ = Math.max(a.sizerWidth, So(r) - a.sizer.offsetLeft) - b.right; const T = d.direction == 'ltr'; function H(Te, Ne, Be, ze) {
          Ne < 0 && (Ne = 0), Ne = Math.round(Ne), ze = Math.round(ze), m.appendChild(S('div', null, 'CodeMirror-selected', `position: absolute; left: ${Te}px;
  top: ${Ne}px; width: ${Be ?? _ - Te}px;
height: ${ze - Ne}px`))
        } function X(Te, Ne, Be) {
          const ze = Oe(d, Te); const Qe = ze.text.length; let xt; let Qt; function $t(Wt, En) { return cc(r, le(Te, Wt), 'div', ze, En) } function Wn(Wt, En, sn) { const Vt = zg(r, ze, null, Wt); const jt = En == 'ltr' == (sn == 'after') ? 'left' : 'right'; const zt = sn == 'after' ? Vt.begin : Vt.end - (/\s/.test(ze.text.charAt(Vt.end - 1)) ? 2 : 1); return $t(zt, jt)[jt] } const Cn = tt(ze, d.direction); return Dn(Cn, Ne || 0, Be ?? Qe, (Wt, En, sn, Vt) => {
            const jt = sn == 'ltr'; const zt = $t(Wt, jt ? 'left' : 'right'); const An = $t(En - 1, jt ? 'right' : 'left'); const Ss = Ne == null && Wt == 0; const Wi = Be == null && En == Qe; const dn = Vt == 0; const Ur = !Cn || Vt == Cn.length - 1; if (An.top - zt.top <= 3) { const en = (T ? Ss : Wi) && dn; const dd = (T ? Wi : Ss) && Ur; const di = en ? x : (jt ? zt : An).left; const $o = dd ? _ : (jt ? An : zt).right; H(di, zt.top, $o - di, zt.bottom) }
            else { let Mo, mn, _s, hd; jt ? (Mo = T && Ss && dn ? x : zt.left, mn = T ? _ : Wn(Wt, sn, 'before'), _s = T ? x : Wn(En, sn, 'after'), hd = T && Wi && Ur ? _ : An.right) : (Mo = T ? Wn(Wt, sn, 'before') : x, mn = !T && Ss && dn ? _ : zt.right, _s = !T && Wi && Ur ? x : An.left, hd = T ? Wn(En, sn, 'after') : _), H(Mo, zt.top, mn - Mo, zt.bottom), zt.bottom < An.top && H(x, zt.bottom, null, An.top), H(_s, An.top, hd - _s, An.bottom) }(!xt || fc(zt, xt) < 0) && (xt = zt), fc(An, xt) < 0 && (xt = An), (!Qt || fc(zt, Qt) < 0) && (Qt = zt), fc(An, Qt) < 0 && (Qt = An)
          }), { start: xt, end: Qt }
        } const re = o.from(); const Z = o.to(); if (re.line == Z.line) {
          X(re.line, re.ch, Z.ch)
        }
        else { const ce = Oe(d, re.line); const me = Oe(d, Z.line); const Se = xr(ce) == xr(me); const ke = X(re.line, re.ch, Se ? ce.text.length + 1 : null).end; const $e = X(Z.line, Se ? 0 : null, Z.ch).start; Se && (ke.top < $e.top - 2 ? (H(ke.right, ke.top, null, ke.bottom), H(x, $e.top, $e.left, $e.bottom)) : H(ke.right, ke.top, $e.left - ke.right, ke.bottom)), ke.bottom < $e.top && H(x, ke.bottom, null, $e.top) }c.appendChild(m)
      } function Hf(r) { if (r.state.focused) { const o = r.display; clearInterval(o.blinker); let c = !0; o.cursorDiv.style.visibility = '', r.options.cursorBlinkRate > 0 ? o.blinker = setInterval(() => { r.hasFocus() || us(r), o.cursorDiv.style.visibility = (c = !c) ? '' : 'hidden' }, r.options.cursorBlinkRate) : r.options.cursorBlinkRate < 0 && (o.cursorDiv.style.visibility = 'hidden') } } function Bg(r) { r.hasFocus() || (r.display.input.focus(), r.state.focused || Wf(r)) } function Bf(r) { r.state.delayingBlurEvent = !0, setTimeout(() => { r.state.delayingBlurEvent && (r.state.delayingBlurEvent = !1, r.state.focused && us(r)) }, 100) } function Wf(r, o) { r.state.delayingBlurEvent && !r.state.draggingText && (r.state.delayingBlurEvent = !1), r.options.readOnly != 'nocursor' && (r.state.focused || (Pt(r, 'focus', r, o), r.state.focused = !0, we(r.display.wrapper, 'CodeMirror-focused'), !r.curOp && r.display.selForContextMenu != r.doc.sel && (r.display.input.reset(), g && setTimeout(() => { return r.display.input.reset(!0) }, 20)), r.display.input.receivedFocus()), Hf(r)) } function us(r, o) { r.state.delayingBlurEvent || (r.state.focused && (Pt(r, 'blur', r, o), r.state.focused = !1, C(r.display.wrapper, 'CodeMirror-focused')), clearInterval(r.display.blinker), setTimeout(() => { r.state.focused || (r.display.shift = !1) }, 150)) } function dc(r) {
        for (var o = r.display, c = o.lineDiv.offsetTop, a = Math.max(0, o.scroller.getBoundingClientRect().top), d = o.lineDiv.getBoundingClientRect().top, m = 0, b = 0; b < o.view.length; b++) {
          const x = o.view[b]; const _ = r.options.lineWrapping; let T = void 0; let H = 0; if (!x.hidden) {
            if (d += x.line.height, h && p < 8) { const X = x.node.offsetTop + x.node.offsetHeight; T = X - c, c = X }
            else { const re = x.node.getBoundingClientRect(); T = re.bottom - re.top, !_ && x.text.firstChild && (H = x.text.firstChild.getBoundingClientRect().right - re.left - 1) } const Z = x.line.height - T; if ((Z > 0.005 || Z < -0.005) && (d < a && (m -= Z), Yn(x.line, T), Wg(x.line), x.rest)) {
              for (let ce = 0; ce < x.rest.length; ce++)Wg(x.rest[ce])
            } if (H > r.display.sizerWidth) { const me = Math.ceil(H / cs(r.display)); me > r.display.maxLineLength && (r.display.maxLineLength = me, r.display.maxLine = x.line, r.display.maxLineChanged = !0) }
          }
        }Math.abs(m) > 2 && (o.scroller.scrollTop += m)
      } function Wg(r) {
        if (r.widgets) {
          for (let o = 0; o < r.widgets.length; ++o) { const c = r.widgets[o]; const a = c.node.parentNode; a && (c.height = a.offsetHeight) }
        }
      } function hc(r, o, c) { let a = c && c.top != null ? Math.max(0, c.top) : r.scroller.scrollTop; a = Math.floor(a - lc(r)); const d = c && c.bottom != null ? c.bottom : a + r.wrapper.clientHeight; let m = G(o, a); let b = G(o, d); if (c && c.ensure) { const x = c.ensure.from.line; const _ = c.ensure.to.line; x < m ? (m = x, b = G(o, ai(Oe(o, x)) + r.wrapper.clientHeight)) : Math.min(_, o.lastLine()) >= b && (m = G(o, ai(Oe(o, _)) - r.wrapper.clientHeight), b = _) } return { from: m, to: Math.max(b, m + 1) } } function u_(r, o) {
        if (!Ot(r, 'scrollCursorIntoView')) {
          const c = r.display; const a = c.sizer.getBoundingClientRect(); let d = null; const m = c.wrapper.ownerDocument; if (o.top + a.top < 0 ? d = !0 : o.bottom + a.top > (m.defaultView.innerHeight || m.documentElement.clientHeight) && (d = !1), d != null && !E) {
            const b = S('div', '​', null, `position: absolute;
                             top: ${o.top - c.viewOffset - lc(r.display)}px;
                         height: ${o.bottom - o.top + jr(r) + c.barHeight}px;
                         left: ${o.left}px; width: ${Math.max(2, o.right - o.left)}px;`); r.display.lineSpace.appendChild(b), b.scrollIntoView(d), r.display.lineSpace.removeChild(b)
          }
        }
      } function f_(r, o, c, a) {
        a == null && (a = 0); let d; !r.options.lineWrapping && o == c && (c = o.sticky == 'before' ? le(o.line, o.ch + 1, 'before') : o, o = o.ch ? le(o.line, o.sticky == 'before' ? o.ch - 1 : o.ch, 'after') : o); for (let m = 0; m < 5; m++) {
          let b = !1; const x = Sr(r, o); const _ = !c || c == o ? x : Sr(r, c); d = { left: Math.min(x.left, _.left), top: Math.min(x.top, _.top) - a, right: Math.max(x.left, _.left), bottom: Math.max(x.bottom, _.bottom) + a }; const T = jf(r, d); const H = r.doc.scrollTop; const X = r.doc.scrollLeft; if (T.scrollTop != null && (wl(r, T.scrollTop), Math.abs(r.doc.scrollTop - H) > 1 && (b = !0)), T.scrollLeft != null && (Co(r, T.scrollLeft), Math.abs(r.doc.scrollLeft - X) > 1 && (b = !0)), !b)
            break
        } return d
      } function d_(r, o) { const c = jf(r, o); c.scrollTop != null && wl(r, c.scrollTop), c.scrollLeft != null && Co(r, c.scrollLeft) } function jf(r, o) {
        const c = r.display; const a = as(r.display); o.top < 0 && (o.top = 0); const d = r.curOp && r.curOp.scrollTop != null ? r.curOp.scrollTop : c.scroller.scrollTop; const m = $f(r); const b = {}; o.bottom - o.top > m && (o.bottom = o.top + m); const x = r.doc.height + Lf(c); const _ = o.top < a; const T = o.bottom > x - a; if (o.top < d) {
          b.scrollTop = _ ? 0 : o.top
        }
        else if (o.bottom > d + m) { const H = Math.min(o.top, (T ? x : o.bottom) - m); H != d && (b.scrollTop = H) } const X = r.options.fixedGutter ? 0 : c.gutters.offsetWidth; const re = r.curOp && r.curOp.scrollLeft != null ? r.curOp.scrollLeft : c.scroller.scrollLeft - X; const Z = So(r) - c.gutters.offsetWidth; const ce = o.right - o.left > Z; return ce && (o.right = o.left + Z), o.left < 10 ? b.scrollLeft = 0 : o.left < re ? b.scrollLeft = Math.max(0, o.left + X - (ce ? 0 : 10)) : o.right > Z + re - 3 && (b.scrollLeft = o.right + (ce ? 0 : 10) - Z), b
      } function qf(r, o) { o != null && (pc(r), r.curOp.scrollTop = (r.curOp.scrollTop == null ? r.doc.scrollTop : r.curOp.scrollTop) + o) } function fs(r) { pc(r); const o = r.getCursor(); r.curOp.scrollToPos = { from: o, to: o, margin: r.options.cursorScrollMargin } } function bl(r, o, c) { (o != null || c != null) && pc(r), o != null && (r.curOp.scrollLeft = o), c != null && (r.curOp.scrollTop = c) } function h_(r, o) { pc(r), r.curOp.scrollToPos = o } function pc(r) { const o = r.curOp.scrollToPos; if (o) { r.curOp.scrollToPos = null; const c = Og(r, o.from); const a = Og(r, o.to); jg(r, c, a, o.margin) } } function jg(r, o, c, a) { const d = jf(r, { left: Math.min(o.left, c.left), top: Math.min(o.top, c.top) - a, right: Math.max(o.right, c.right), bottom: Math.max(o.bottom, c.bottom) + a }); bl(r, d.scrollLeft, d.scrollTop) } function wl(r, o) { Math.abs(r.doc.scrollTop - o) < 2 || (s || Vf(r, { top: o }), qg(r, o, !0), s && Vf(r), _l(r, 100)) } function qg(r, o, c) { o = Math.max(0, Math.min(r.display.scroller.scrollHeight - r.display.scroller.clientHeight, o)), !(r.display.scroller.scrollTop == o && !c) && (r.doc.scrollTop = o, r.display.scrollbars.setScrollTop(o), r.display.scroller.scrollTop != o && (r.display.scroller.scrollTop = o)) } function Co(r, o, c, a) { o = Math.max(0, Math.min(o, r.display.scroller.scrollWidth - r.display.scroller.clientWidth)), !((c ? o == r.doc.scrollLeft : Math.abs(r.doc.scrollLeft - o) < 2) && !a) && (r.doc.scrollLeft = o, Kg(r), r.display.scroller.scrollLeft != o && (r.display.scroller.scrollLeft = o), r.display.scrollbars.setScrollLeft(o)) } function xl(r) { const o = r.display; const c = o.gutters.offsetWidth; const a = Math.round(r.doc.height + Lf(r.display)); return { clientHeight: o.scroller.clientHeight, viewHeight: o.wrapper.clientHeight, scrollWidth: o.scroller.scrollWidth, clientWidth: o.scroller.clientWidth, viewWidth: o.wrapper.clientWidth, barLeft: r.options.fixedGutter ? c : 0, docHeight: a, scrollHeight: a + jr(r) + o.barHeight, nativeBarWidth: o.nativeBarWidth, gutterWidth: c } } const Eo = function (r, o, c) { this.cm = c; const a = this.vert = S('div', [S('div', null, null, 'min-width: 1px')], 'CodeMirror-vscrollbar'); const d = this.horiz = S('div', [S('div', null, null, 'height: 100%; min-height: 1px')], 'CodeMirror-hscrollbar'); a.tabIndex = d.tabIndex = -1, r(a), r(d), He(a, 'scroll', () => { a.clientHeight && o(a.scrollTop, 'vertical') }), He(d, 'scroll', () => { d.clientWidth && o(d.scrollLeft, 'horizontal') }), this.checkedZeroWidth = !1, h && p < 8 && (this.horiz.style.minHeight = this.vert.style.minWidth = '18px') }; Eo.prototype.update = function (r) {
        const o = r.scrollWidth > r.clientWidth + 1; const c = r.scrollHeight > r.clientHeight + 1; const a = r.nativeBarWidth; if (c) { this.vert.style.display = 'block', this.vert.style.bottom = o ? `${a}px` : '0'; const d = r.viewHeight - (o ? a : 0); this.vert.firstChild.style.height = `${Math.max(0, r.scrollHeight - r.clientHeight + d)}px` }
        else {
          this.vert.scrollTop = 0, this.vert.style.display = '', this.vert.firstChild.style.height = '0'
        } if (o) { this.horiz.style.display = 'block', this.horiz.style.right = c ? `${a}px` : '0', this.horiz.style.left = `${r.barLeft}px`; const m = r.viewWidth - r.barLeft - (c ? a : 0); this.horiz.firstChild.style.width = `${Math.max(0, r.scrollWidth - r.clientWidth + m)}px` }
        else {
          this.horiz.style.display = '', this.horiz.firstChild.style.width = '0'
        } return !this.checkedZeroWidth && r.clientHeight > 0 && (a == 0 && this.zeroWidthHack(), this.checkedZeroWidth = !0), { right: c ? a : 0, bottom: o ? a : 0 }
      }, Eo.prototype.setScrollLeft = function (r) { this.horiz.scrollLeft != r && (this.horiz.scrollLeft = r), this.disableHoriz && this.enableZeroWidthBar(this.horiz, this.disableHoriz, 'horiz') }, Eo.prototype.setScrollTop = function (r) { this.vert.scrollTop != r && (this.vert.scrollTop = r), this.disableVert && this.enableZeroWidthBar(this.vert, this.disableVert, 'vert') }, Eo.prototype.zeroWidthHack = function () { const r = z && !A ? '12px' : '18px'; this.horiz.style.height = this.vert.style.width = r, this.horiz.style.visibility = this.vert.style.visibility = 'hidden', this.disableHoriz = new ae(), this.disableVert = new ae() }, Eo.prototype.enableZeroWidthBar = function (r, o, c) { r.style.visibility = ''; function a() { const d = r.getBoundingClientRect(); const m = c == 'vert' ? document.elementFromPoint(d.right - 1, (d.top + d.bottom) / 2) : document.elementFromPoint((d.right + d.left) / 2, d.bottom - 1); m != r ? r.style.visibility = 'hidden' : o.set(1e3, a) }o.set(1e3, a) }, Eo.prototype.clear = function () { const r = this.horiz.parentNode; r.removeChild(this.horiz), r.removeChild(this.vert) }; const Sl = function () {}; Sl.prototype.update = function () { return { bottom: 0, right: 0 } }, Sl.prototype.setScrollLeft = function () {}, Sl.prototype.setScrollTop = function () {}, Sl.prototype.clear = function () {}; function ds(r, o) { o || (o = xl(r)); let c = r.display.barWidth; let a = r.display.barHeight; Ug(r, o); for (let d = 0; d < 4 && c != r.display.barWidth || a != r.display.barHeight; d++)c != r.display.barWidth && r.options.lineWrapping && dc(r), Ug(r, xl(r)), c = r.display.barWidth, a = r.display.barHeight } function Ug(r, o) { const c = r.display; const a = c.scrollbars.update(o); c.sizer.style.paddingRight = `${c.barWidth = a.right}px`, c.sizer.style.paddingBottom = `${c.barHeight = a.bottom}px`, c.heightForcer.style.borderBottom = `${a.bottom}px solid transparent`, a.right && a.bottom ? (c.scrollbarFiller.style.display = 'block', c.scrollbarFiller.style.height = `${a.bottom}px`, c.scrollbarFiller.style.width = `${a.right}px`) : c.scrollbarFiller.style.display = '', a.bottom && r.options.coverGutterNextToScrollbar && r.options.fixedGutter ? (c.gutterFiller.style.display = 'block', c.gutterFiller.style.height = `${a.bottom}px`, c.gutterFiller.style.width = `${o.gutterWidth}px`) : c.gutterFiller.style.display = '' } const Vg = { native: Eo, null: Sl }; function Gg(r) { r.display.scrollbars && (r.display.scrollbars.clear(), r.display.scrollbars.addClass && C(r.display.wrapper, r.display.scrollbars.addClass)), r.display.scrollbars = new Vg[r.options.scrollbarStyle]((o) => { r.display.wrapper.insertBefore(o, r.display.scrollbarFiller), He(o, 'mousedown', () => { r.state.focused && setTimeout(() => { return r.display.input.focus() }, 0) }), o.setAttribute('cm-not-content', 'true') }, (o, c) => { c == 'horizontal' ? Co(r, o) : wl(r, o) }, r), r.display.scrollbars.addClass && we(r.display.wrapper, r.display.scrollbars.addClass) } let p_ = 0; function Ao(r) { r.curOp = { cm: r, viewChanged: !1, startHeight: r.doc.height, forceUpdate: !1, updateInput: 0, typing: !1, changeObjs: null, cursorActivityHandlers: null, cursorActivityCalled: 0, selectionChanged: !1, updateMaxLine: !1, scrollLeft: null, scrollTop: null, scrollToPos: null, focus: !1, id: ++p_, markArrays: null }, US(r.curOp) } function Lo(r) { const o = r.curOp; o && GS(o, (c) => { for (let a = 0; a < c.ops.length; a++)c.ops[a].cm.curOp = null; g_(c) }) } function g_(r) { for (var o = r.ops, c = 0; c < o.length; c++)m_(o[c]); for (let a = 0; a < o.length; a++)v_(o[a]); for (let d = 0; d < o.length; d++)y_(o[d]); for (let m = 0; m < o.length; m++)b_(o[m]); for (let b = 0; b < o.length; b++)w_(o[b]) } function m_(r) { const o = r.cm; const c = o.display; S_(o), r.updateMaxLine && Ef(o), r.mustUpdate = r.viewChanged || r.forceUpdate || r.scrollTop != null || r.scrollToPos && (r.scrollToPos.from.line < c.viewFrom || r.scrollToPos.to.line >= c.viewTo) || c.maxLineChanged && o.options.lineWrapping, r.update = r.mustUpdate && new gc(o, r.mustUpdate && { top: r.scrollTop, ensure: r.scrollToPos }, r.forceUpdate) } function v_(r) { r.updatedDisplay = r.mustUpdate && Uf(r.cm, r.update) } function y_(r) { const o = r.cm; const c = o.display; r.updatedDisplay && dc(o), r.barMeasure = xl(o), c.maxLineChanged && !o.options.lineWrapping && (r.adjustWidthTo = Eg(o, c.maxLine, c.maxLine.text.length).left + 3, o.display.sizerWidth = r.adjustWidthTo, r.barMeasure.scrollWidth = Math.max(c.scroller.clientWidth, c.sizer.offsetLeft + r.adjustWidthTo + jr(o) + o.display.barWidth), r.maxScrollLeft = Math.max(0, c.sizer.offsetLeft + r.adjustWidthTo - So(o))), (r.updatedDisplay || r.selectionChanged) && (r.preparedSelection = c.input.prepareSelection()) } function b_(r) { const o = r.cm; r.adjustWidthTo != null && (o.display.sizer.style.minWidth = `${r.adjustWidthTo}px`, r.maxScrollLeft < o.doc.scrollLeft && Co(o, Math.min(o.display.scroller.scrollLeft, r.maxScrollLeft), !0), o.display.maxLineChanged = !1); const c = r.focus && r.focus == ue(Ke(o)); r.preparedSelection && o.display.input.showSelection(r.preparedSelection, c), (r.updatedDisplay || r.startHeight != o.doc.height) && ds(o, r.barMeasure), r.updatedDisplay && Xf(o, r.barMeasure), r.selectionChanged && Hf(o), o.state.focused && r.updateInput && o.display.input.reset(r.typing), c && Bg(r.cm) } function w_(r) {
        const o = r.cm; const c = o.display; const a = o.doc; if (r.updatedDisplay && Xg(o, r.update), c.wheelStartX != null && (r.scrollTop != null || r.scrollLeft != null || r.scrollToPos) && (c.wheelStartX = c.wheelStartY = null), r.scrollTop != null && qg(o, r.scrollTop, r.forceScroll), r.scrollLeft != null && Co(o, r.scrollLeft, !0, !0), r.scrollToPos) { const d = f_(o, Xe(a, r.scrollToPos.from), Xe(a, r.scrollToPos.to), r.scrollToPos.margin); u_(o, d) } const m = r.maybeHiddenMarkers; const b = r.maybeUnhiddenMarkers; if (m) {
          for (let x = 0; x < m.length; ++x)m[x].lines.length || Pt(m[x], 'hide')
        } if (b) {
          for (let _ = 0; _ < b.length; ++_)b[_].lines.length && Pt(b[_], 'unhide')
        } c.wrapper.offsetHeight && (a.scrollTop = o.display.scroller.scrollTop), r.changeObjs && Pt(o, 'changes', o, r.changeObjs), r.update && r.update.finish()
      } function Bn(r, o) {
        if (r.curOp)
          return o(); Ao(r); try { return o() }
        finally { Lo(r) }
      } function Yt(r, o) {
        return function () {
          if (r.curOp)
            return o.apply(r, arguments); Ao(r); try { return o.apply(r, arguments) }
          finally { Lo(r) }
        }
      } function gn(r) {
        return function () {
          if (this.curOp)
            return r.apply(this, arguments); Ao(this); try { return r.apply(this, arguments) }
          finally { Lo(this) }
        }
      } function Zt(r) {
        return function () {
          const o = this.cm; if (!o || o.curOp)
            return r.apply(this, arguments); Ao(o); try { return r.apply(this, arguments) }
          finally { Lo(o) }
        }
      } function _l(r, o) { r.doc.highlightFrontier < r.display.viewTo && r.state.highlight.set(o, U(x_, r)) } function x_(r) {
        const o = r.doc; if (!(o.highlightFrontier >= r.display.viewTo)) {
          const c = +new Date() + r.options.workTime; const a = dl(r, o.highlightFrontier); const d = []; o.iter(a.line, Math.min(o.first + o.size, r.display.viewTo + 500), (m) => {
            if (a.line >= r.display.viewFrom) { const b = m.styles; const x = m.text.length > r.options.maxHighlightLength ? Br(o.mode, a.state) : null; const _ = tg(r, m, a, !0); x && (a.state = x), m.styles = _.styles; const T = m.styleClasses; const H = _.classes; H ? m.styleClasses = H : T && (m.styleClasses = null); for (var X = !b || b.length != m.styles.length || T != H && (!T || !H || T.bgClass != H.bgClass || T.textClass != H.textClass), re = 0; !X && re < b.length; ++re)X = b[re] != m.styles[re]; X && d.push(a.line), m.stateAfter = a.save(), a.nextLine() }
            else {
              m.text.length <= r.options.maxHighlightLength && xf(r, m.text, a), m.stateAfter = a.line % 5 == 0 ? a.save() : null, a.nextLine()
            } if (+new Date() > c)
              return _l(r, r.options.workDelay), !0
          }), o.highlightFrontier = a.line, o.modeFrontier = Math.max(o.modeFrontier, a.line), d.length && Bn(r, () => { for (let m = 0; m < d.length; m++)Oi(r, d[m], 'text') })
        }
      } var gc = function (r, o, c) { const a = r.display; this.viewport = o, this.visible = hc(a, r.doc, o), this.editorIsHidden = !a.wrapper.offsetWidth, this.wrapperHeight = a.wrapper.clientHeight, this.wrapperWidth = a.wrapper.clientWidth, this.oldDisplayWidth = So(r), this.force = c, this.dims = Rf(r), this.events = [] }; gc.prototype.signal = function (r, o) { Hn(r, o) && this.events.push(arguments) }, gc.prototype.finish = function () { for (let r = 0; r < this.events.length; r++)Pt.apply(null, this.events[r]) }; function S_(r) { const o = r.display; !o.scrollbarsClipped && o.scroller.offsetWidth && (o.nativeBarWidth = o.scroller.offsetWidth - o.scroller.clientWidth, o.heightForcer.style.height = `${jr(r)}px`, o.sizer.style.marginBottom = `${-o.nativeBarWidth}px`, o.sizer.style.borderRightWidth = `${jr(r)}px`, o.scrollbarsClipped = !0) } function __(r) {
        if (r.hasFocus())
          return null; const o = ue(Ke(r)); if (!o || !oe(r.display.lineDiv, o))
          return null; const c = { activeElt: o }; if (window.getSelection) { const a = ie(r).getSelection(); a.anchorNode && a.extend && oe(r.display.lineDiv, a.anchorNode) && (c.anchorNode = a.anchorNode, c.anchorOffset = a.anchorOffset, c.focusNode = a.focusNode, c.focusOffset = a.focusOffset) } return c
      } function k_(r) { if (!(!r || !r.activeElt || r.activeElt == ue(Je(r.activeElt))) && (r.activeElt.focus(), !/^(INPUT|TEXTAREA)$/.test(r.activeElt.nodeName) && r.anchorNode && oe(document.body, r.anchorNode) && oe(document.body, r.focusNode))) { const o = r.activeElt.ownerDocument; const c = o.defaultView.getSelection(); const a = o.createRange(); a.setEnd(r.anchorNode, r.anchorOffset), a.collapse(!1), c.removeAllRanges(), c.addRange(a), c.extend(r.focusNode, r.focusOffset) } } function Uf(r, o) {
        const c = r.display; const a = r.doc; if (o.editorIsHidden)
          return Ri(r), !1; if (!o.force && o.visible.from >= c.viewFrom && o.visible.to <= c.viewTo && (c.updateLineNumbers == null || c.updateLineNumbers >= c.viewTo) && c.renderedView == c.view && Fg(r) == 0)
          return !1; Jg(r) && (Ri(r), o.dims = Rf(r)); const d = a.first + a.size; let m = Math.max(o.visible.from - r.options.viewportMargin, a.first); let b = Math.min(d, o.visible.to + r.options.viewportMargin); c.viewFrom < m && m - c.viewFrom < 20 && (m = Math.max(a.first, c.viewFrom)), c.viewTo > b && c.viewTo - b < 20 && (b = Math.min(d, c.viewTo)), li && (m = Tf(r.doc, m), b = gg(r.doc, b)); const x = m != c.viewFrom || b != c.viewTo || c.lastWrapHeight != o.wrapperHeight || c.lastWrapWidth != o.wrapperWidth; a_(r, m, b), c.viewOffset = ai(Oe(r.doc, c.viewFrom)), r.display.mover.style.top = `${c.viewOffset}px`; const _ = Fg(r); if (!x && _ == 0 && !o.force && c.renderedView == c.view && (c.updateLineNumbers == null || c.updateLineNumbers >= c.viewTo))
          return !1; const T = __(r); return _ > 4 && (c.lineDiv.style.display = 'none'), T_(r, c.updateLineNumbers, o.dims), _ > 4 && (c.lineDiv.style.display = ''), c.renderedView = c.view, k_(T), P(c.cursorDiv), P(c.selectionDiv), c.gutters.style.height = c.sizer.style.minHeight = 0, x && (c.lastWrapHeight = o.wrapperHeight, c.lastWrapWidth = o.wrapperWidth, _l(r, 400)), c.updateLineNumbers = null, !0
      } function Xg(r, o) {
        for (let c = o.viewport, a = !0; ;a = !1) {
          if (!a || !r.options.lineWrapping || o.oldDisplayWidth == So(r)) {
            if (c && c.top != null && (c = { top: Math.min(r.doc.height + Lf(r.display) - $f(r), c.top) }), o.visible = hc(r.display, r.doc, c), o.visible.from >= r.display.viewFrom && o.visible.to <= r.display.viewTo)
              break
          }
          else {
            a && (o.visible = hc(r.display, r.doc, c))
          } if (!Uf(r, o))
            break; dc(r); const d = xl(r); yl(r), ds(r, d), Xf(r, d), o.force = !1
        }o.signal(r, 'update', r), (r.display.viewFrom != r.display.reportedViewFrom || r.display.viewTo != r.display.reportedViewTo) && (o.signal(r, 'viewportChange', r, r.display.viewFrom, r.display.viewTo), r.display.reportedViewFrom = r.display.viewFrom, r.display.reportedViewTo = r.display.viewTo)
      } function Vf(r, o) { const c = new gc(r, o); if (Uf(r, c)) { dc(r), Xg(r, c); const a = xl(r); yl(r), ds(r, a), Xf(r, a), c.finish() } } function T_(r, o, c) {
        const a = r.display; const d = r.options.lineNumbers; const m = a.lineDiv; let b = m.firstChild; function x(ce) { const me = ce.nextSibling; return g && z && r.display.currentWheelTarget == ce ? ce.style.display = 'none' : ce.parentNode.removeChild(ce), me } for (let _ = a.view, T = a.viewFrom, H = 0; H < _.length; H++) {
          const X = _[H]; if (!X.hidden) {
            if (!X.node || X.node.parentNode != m) { const re = ZS(r, X, T, c); m.insertBefore(re, b) }
            else { for (;b != X.node;)b = x(b); let Z = d && o != null && o <= T && X.lineNumber; X.changes && (ge(X.changes, 'gutter') > -1 && (Z = !1), wg(r, X, T, c)), Z && (P(X.lineNumber), X.lineNumber.appendChild(document.createTextNode(xe(r.options, T)))), b = X.node.nextSibling }
          }T += X.size
        } for (;b;)b = x(b)
      } function Gf(r) { const o = r.gutters.offsetWidth; r.sizer.style.marginLeft = `${o}px`, Jt(r, 'gutterChanged', r) } function Xf(r, o) { r.display.sizer.style.minHeight = `${o.docHeight}px`, r.display.heightForcer.style.top = `${o.docHeight}px`, r.display.gutters.style.height = `${o.docHeight + r.display.barHeight + jr(r)}px` } function Kg(r) {
        const o = r.display; const c = o.view; if (!(!o.alignWidgets && (!o.gutters.firstChild || !r.options.fixedGutter))) {
          for (var a = zf(o) - o.scroller.scrollLeft + r.doc.scrollLeft, d = o.gutters.offsetWidth, m = `${a}px`, b = 0; b < c.length; b++) {
            if (!c[b].hidden) {
              r.options.fixedGutter && (c[b].gutter && (c[b].gutter.style.left = m), c[b].gutterBackground && (c[b].gutterBackground.style.left = m)); const x = c[b].alignable; if (x) {
                for (let _ = 0; _ < x.length; _++)x[_].style.left = m
              }
            }
          }r.options.fixedGutter && (o.gutters.style.left = `${a + d}px`)
        }
      } function Jg(r) {
        if (!r.options.lineNumbers)
          return !1; const o = r.doc; const c = xe(r.options, o.first + o.size - 1); const a = r.display; if (c.length != a.lineNumChars) { const d = a.measure.appendChild(S('div', [S('div', c)], 'CodeMirror-linenumber CodeMirror-gutter-elt')); const m = d.firstChild.offsetWidth; const b = d.offsetWidth - m; return a.lineGutter.style.width = '', a.lineNumInnerWidth = Math.max(m, a.lineGutter.offsetWidth - b) + 1, a.lineNumWidth = a.lineNumInnerWidth + b, a.lineNumChars = a.lineNumInnerWidth ? c.length : -1, a.lineGutter.style.width = `${a.lineNumWidth}px`, Gf(r.display), !0 } return !1
      } function Kf(r, o) {
        for (var c = [], a = !1, d = 0; d < r.length; d++) {
          let m = r[d]; let b = null; if (typeof m != 'string' && (b = m.style, m = m.className), m == 'CodeMirror-linenumbers') {
            if (o)
              a = !0; else continue
          } c.push({ className: m, style: b })
        } return o && !a && c.push({ className: 'CodeMirror-linenumbers', style: null }), c
      } function Yg(r) { const o = r.gutters; const c = r.gutterSpecs; P(o), r.lineGutter = null; for (let a = 0; a < c.length; ++a) { const d = c[a]; const m = d.className; const b = d.style; const x = o.appendChild(S('div', null, `CodeMirror-gutter ${m}`)); b && (x.style.cssText = b), m == 'CodeMirror-linenumbers' && (r.lineGutter = x, x.style.width = `${r.lineNumWidth || 1}px`) }o.style.display = c.length ? '' : 'none', Gf(r) } function kl(r) { Yg(r.display), kn(r), Kg(r) } function C_(r, o, c, a) { const d = this; this.input = c, d.scrollbarFiller = S('div', null, 'CodeMirror-scrollbar-filler'), d.scrollbarFiller.setAttribute('cm-not-content', 'true'), d.gutterFiller = S('div', null, 'CodeMirror-gutter-filler'), d.gutterFiller.setAttribute('cm-not-content', 'true'), d.lineDiv = R('div', null, 'CodeMirror-code'), d.selectionDiv = S('div', null, null, 'position: relative; z-index: 1'), d.cursorDiv = S('div', null, 'CodeMirror-cursors'), d.measure = S('div', null, 'CodeMirror-measure'), d.lineMeasure = S('div', null, 'CodeMirror-measure'), d.lineSpace = R('div', [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv], null, 'position: relative; outline: none'); const m = R('div', [d.lineSpace], 'CodeMirror-lines'); d.mover = S('div', [m], null, 'position: relative'), d.sizer = S('div', [d.mover], 'CodeMirror-sizer'), d.sizerWidth = null, d.heightForcer = S('div', null, null, `position: absolute; height: ${F}px; width: 1px;`), d.gutters = S('div', null, 'CodeMirror-gutters'), d.lineGutter = null, d.scroller = S('div', [d.sizer, d.heightForcer, d.gutters], 'CodeMirror-scroll'), d.scroller.setAttribute('tabIndex', '-1'), d.wrapper = S('div', [d.scrollbarFiller, d.gutterFiller, d.scroller], 'CodeMirror'), y && w >= 105 && (d.wrapper.style.clipPath = 'inset(0px)'), d.wrapper.setAttribute('translate', 'no'), h && p < 8 && (d.gutters.style.zIndex = -1, d.scroller.style.paddingRight = 0), !g && !(s && k) && (d.scroller.draggable = !0), r && (r.appendChild ? r.appendChild(d.wrapper) : r(d.wrapper)), d.viewFrom = d.viewTo = o.first, d.reportedViewFrom = d.reportedViewTo = o.first, d.view = [], d.renderedView = null, d.externalMeasured = null, d.viewOffset = 0, d.lastWrapHeight = d.lastWrapWidth = 0, d.updateLineNumbers = null, d.nativeBarWidth = d.barHeight = d.barWidth = 0, d.scrollbarsClipped = !1, d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null, d.alignWidgets = !1, d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null, d.maxLine = null, d.maxLineLength = 0, d.maxLineChanged = !1, d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null, d.shift = !1, d.selForContextMenu = null, d.activeTouch = null, d.gutterSpecs = Kf(a.gutters, a.lineNumbers), Yg(d), c.init(d) } let mc = 0; let ui = null; h ? ui = -0.53 : s ? ui = 15 : y ? ui = -0.7 : $ && (ui = -1 / 3); function Zg(r) { let o = r.wheelDeltaX; let c = r.wheelDeltaY; return o == null && r.detail && r.axis == r.HORIZONTAL_AXIS && (o = r.detail), c == null && r.detail && r.axis == r.VERTICAL_AXIS ? c = r.detail : c == null && (c = r.wheelDelta), { x: o, y: c } } function E_(r) { const o = Zg(r); return o.x *= ui, o.y *= ui, o } function Qg(r, o) {
        y && w == 102 && (r.display.chromeScrollHack == null ? r.display.sizer.style.pointerEvents = 'none' : clearTimeout(r.display.chromeScrollHack), r.display.chromeScrollHack = setTimeout(() => { r.display.chromeScrollHack = null, r.display.sizer.style.pointerEvents = '' }, 100)); const c = Zg(o); let a = c.x; let d = c.y; let m = ui; o.deltaMode === 0 && (a = o.deltaX, d = o.deltaY, m = 1); const b = r.display; const x = b.scroller; const _ = x.scrollWidth > x.clientWidth; const T = x.scrollHeight > x.clientHeight; if (a && _ || d && T) {
          if (d && z && g) {
            e:for (let H = o.target, X = b.view; H != x; H = H.parentNode) {
              for (let re = 0; re < X.length; re++) {
                if (X[re].node == H) { r.display.currentWheelTarget = H; break e }
              }
            }
          } if (a && !s && !L && m != null) { d && T && wl(r, Math.max(0, x.scrollTop + d * m)), Co(r, Math.max(0, x.scrollLeft + a * m)), (!d || d && T) && un(o), b.wheelStartX = null; return } if (d && m != null) { const Z = d * m; let ce = r.doc.scrollTop; let me = ce + b.wrapper.clientHeight; Z < 0 ? ce = Math.max(0, ce + Z - 50) : me = Math.min(r.doc.height, me + Z + 50), Vf(r, { top: ce, bottom: me }) }mc < 20 && o.deltaMode !== 0 && (b.wheelStartX == null ? (b.wheelStartX = x.scrollLeft, b.wheelStartY = x.scrollTop, b.wheelDX = a, b.wheelDY = d, setTimeout(() => { if (b.wheelStartX != null) { const Se = x.scrollLeft - b.wheelStartX; const ke = x.scrollTop - b.wheelStartY; const $e = ke && b.wheelDY && ke / b.wheelDY || Se && b.wheelDX && Se / b.wheelDX; b.wheelStartX = b.wheelStartY = null, $e && (ui = (ui * mc + $e) / (mc + 1), ++mc) } }, 200)) : (b.wheelDX += a, b.wheelDY += d))
        }
      } const Zn = function (r, o) { this.ranges = r, this.primIndex = o }; Zn.prototype.primary = function () { return this.ranges[this.primIndex] }, Zn.prototype.equals = function (r) {
        if (r == this)
          return !0; if (r.primIndex != this.primIndex || r.ranges.length != this.ranges.length)
          return !1; for (let o = 0; o < this.ranges.length; o++) {
          const c = this.ranges[o]; const a = r.ranges[o]; if (!pt(c.anchor, a.anchor) || !pt(c.head, a.head))
            return !1
        } return !0
      }, Zn.prototype.deepCopy = function () { for (var r = [], o = 0; o < this.ranges.length; o++)r[o] = new gt(Kt(this.ranges[o].anchor), Kt(this.ranges[o].head)); return new Zn(r, this.primIndex) }, Zn.prototype.somethingSelected = function () {
        for (let r = 0; r < this.ranges.length; r++) {
          if (!this.ranges[r].empty())
            return !0
        } return !1
      }, Zn.prototype.contains = function (r, o) {
        o || (o = r); for (let c = 0; c < this.ranges.length; c++) {
          const a = this.ranges[c]; if (Le(o, a.from()) >= 0 && Le(r, a.to()) <= 0)
            return c
        } return -1
      }; var gt = function (r, o) { this.anchor = r, this.head = o }; gt.prototype.from = function () { return is(this.anchor, this.head) }, gt.prototype.to = function () { return _n(this.anchor, this.head) }, gt.prototype.empty = function () { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch }; function _r(r, o, c) { const a = r && r.options.selectionsMayTouch; const d = o[c]; o.sort((re, Z) => { return Le(re.from(), Z.from()) }), c = ge(o, d); for (let m = 1; m < o.length; m++) { const b = o[m]; const x = o[m - 1]; const _ = Le(x.to(), b.from()); if (a && !b.empty() ? _ > 0 : _ >= 0) { const T = is(x.from(), b.from()); const H = _n(x.to(), b.to()); const X = x.empty() ? b.from() == b.head : x.from() == x.head; m <= c && --c, o.splice(--m, 2, new gt(X ? H : T, X ? T : H)) } } return new Zn(o, c) } function zi(r, o) { return new Zn([new gt(r, o || r)], 0) } function Di(r) { return r.text ? le(r.from.line + r.text.length - 1, ve(r.text).length + (r.text.length == 1 ? r.from.ch : 0)) : r.to } function em(r, o) {
        if (Le(r, o.from) < 0)
          return r; if (Le(r, o.to) <= 0)
          return Di(o); const c = r.line + o.text.length - (o.to.line - o.from.line) - 1; let a = r.ch; return r.line == o.to.line && (a += Di(o).ch - o.to.ch), le(c, a)
      } function Jf(r, o) { for (var c = [], a = 0; a < r.sel.ranges.length; a++) { const d = r.sel.ranges[a]; c.push(new gt(em(d.anchor, o), em(d.head, o))) } return _r(r.cm, c, r.sel.primIndex) } function tm(r, o, c) { return r.line == o.line ? le(c.line, r.ch - o.ch + c.ch) : le(c.line + (r.line - o.line), r.ch) } function A_(r, o, c) {
        for (var a = [], d = le(r.first, 0), m = d, b = 0; b < o.length; b++) {
          const x = o[b]; const _ = tm(x.from, d, m); const T = tm(Di(x), d, m); if (d = x.to, m = T, c == 'around') { const H = r.sel.ranges[b]; const X = Le(H.head, H.anchor) < 0; a[b] = new gt(X ? T : _, X ? _ : T) }
          else {
            a[b] = new gt(_, _)
          }
        } return new Zn(a, r.sel.primIndex)
      } function Yf(r) { r.doc.mode = ts(r.options, r.doc.modeOption), Tl(r) } function Tl(r) { r.doc.iter((o) => { o.stateAfter && (o.stateAfter = null), o.styles && (o.styles = null) }), r.doc.modeFrontier = r.doc.highlightFrontier = r.doc.first, _l(r, 100), r.state.modeGen++, r.curOp && kn(r) } function nm(r, o) { return o.from.ch == 0 && o.to.ch == 0 && ve(o.text) == '' && (!r.cm || r.cm.options.wholeLineUpdateBefore) } function Zf(r, o, c, a) {
        function d($e) { return c ? c[$e] : null } function m($e, Te, Ne) { RS($e, Te, Ne, a), Jt($e, 'change', $e, o) } function b($e, Te) { for (var Ne = [], Be = $e; Be < Te; ++Be)Ne.push(new os(T[Be], d(Be), a)); return Ne } const x = o.from; const _ = o.to; var T = o.text; const H = Oe(r, x.line); const X = Oe(r, _.line); const re = ve(T); const Z = d(T.length - 1); const ce = _.line - x.line; if (o.full) {
          r.insert(0, b(0, T.length)), r.remove(T.length, r.size - T.length)
        }
        else if (nm(r, o)) { const me = b(0, T.length - 1); m(X, X.text, Z), ce && r.remove(x.line, ce), me.length && r.insert(x.line, me) }
        else if (H == X) {
          if (T.length == 1) {
            m(H, H.text.slice(0, x.ch) + re + H.text.slice(_.ch), Z)
          }
          else { const Se = b(1, T.length - 1); Se.push(new os(re + H.text.slice(_.ch), Z, a)), m(H, H.text.slice(0, x.ch) + T[0], d(0)), r.insert(x.line + 1, Se) }
        }
        else if (T.length == 1) {
          m(H, H.text.slice(0, x.ch) + T[0] + X.text.slice(_.ch), d(0)), r.remove(x.line + 1, ce)
        }
        else { m(H, H.text.slice(0, x.ch) + T[0], d(0)), m(X, re + X.text.slice(_.ch), Z); const ke = b(1, T.length - 1); ce > 1 && r.remove(x.line + 1, ce - 1), r.insert(x.line + 1, ke) }Jt(r, 'change', r, o)
      } function Fi(r, o, c) {
        function a(d, m, b) {
          if (d.linked) {
            for (let x = 0; x < d.linked.length; ++x) { const _ = d.linked[x]; if (_.doc != m) { const T = b && _.sharedHist; c && !T || (o(_.doc, T), a(_.doc, d, T)) } }
          }
        }a(r, null, !0)
      } function rm(r, o) {
        if (o.cm)
          throw new Error('This document is already in use.'); r.doc = o, o.cm = r, Df(r), Yf(r), im(r), r.options.direction = o.direction, r.options.lineWrapping || Ef(r), r.options.mode = o.modeOption, kn(r)
      } function im(r) { (r.doc.direction == 'rtl' ? we : C)(r.display.lineDiv, 'CodeMirror-rtl') } function L_(r) { Bn(r, () => { im(r), kn(r) }) } function vc(r) { this.done = [], this.undone = [], this.undoDepth = r ? r.undoDepth : 1 / 0, this.lastModTime = this.lastSelTime = 0, this.lastOp = this.lastSelOp = null, this.lastOrigin = this.lastSelOrigin = null, this.generation = this.maxGeneration = r ? r.maxGeneration : 1 } function Qf(r, o) { const c = { from: Kt(o.from), to: Di(o), text: si(r, o.from, o.to) }; return lm(r, c, o.from.line, o.to.line + 1), Fi(r, (a) => { return lm(a, c, o.from.line, o.to.line + 1) }, !0), c } function om(r) {
        for (;r.length;) {
          const o = ve(r); if (o.ranges)
            r.pop(); else break
        }
      } function $_(r, o) {
        if (o)
          return om(r.done), ve(r.done); if (r.done.length && !ve(r.done).ranges)
          return ve(r.done); if (r.done.length > 1 && !r.done[r.done.length - 2].ranges)
          return r.done.pop(), ve(r.done)
      } function sm(r, o, c, a) {
        const d = r.history; d.undone.length = 0; const m = +new Date(); let b; let x; if ((d.lastOp == a || d.lastOrigin == o.origin && o.origin && (o.origin.charAt(0) == '+' && d.lastModTime > m - (r.cm ? r.cm.options.historyEventDelay : 500) || o.origin.charAt(0) == '*')) && (b = $_(d, d.lastOp == a))) {
          x = ve(b.changes), Le(o.from, o.to) == 0 && Le(o.from, x.to) == 0 ? x.to = Di(o) : b.changes.push(Qf(r, o))
        }
        else { const _ = ve(d.done); for ((!_ || !_.ranges) && yc(r.sel, d.done), b = { changes: [Qf(r, o)], generation: d.generation }, d.done.push(b); d.done.length > d.undoDepth;)d.done.shift(), d.done[0].ranges || d.done.shift() }d.done.push(c), d.generation = ++d.maxGeneration, d.lastModTime = d.lastSelTime = m, d.lastOp = d.lastSelOp = a, d.lastOrigin = d.lastSelOrigin = o.origin, x || Pt(r, 'historyAdded')
      } function M_(r, o, c, a) { const d = o.charAt(0); return d == '*' || d == '+' && c.ranges.length == a.ranges.length && c.somethingSelected() == a.somethingSelected() && new Date() - r.history.lastSelTime <= (r.cm ? r.cm.options.historyEventDelay : 500) } function N_(r, o, c, a) { const d = r.history; const m = a && a.origin; c == d.lastSelOp || m && d.lastSelOrigin == m && (d.lastModTime == d.lastSelTime && d.lastOrigin == m || M_(r, m, ve(d.done), o)) ? d.done[d.done.length - 1] = o : yc(o, d.done), d.lastSelTime = +new Date(), d.lastSelOrigin = m, d.lastSelOp = c, a && a.clearRedo !== !1 && om(d.undone) } function yc(r, o) { const c = ve(o); c && c.ranges && c.equals(r) || o.push(r) } function lm(r, o, c, a) { let d = o[`spans_${r.id}`]; let m = 0; r.iter(Math.max(r.first, c), Math.min(r.first + r.size, a), (b) => { b.markedSpans && ((d || (d = o[`spans_${r.id}`] = {}))[m] = b.markedSpans), ++m }) } function I_(r) {
        if (!r)
          return null; for (var o, c = 0; c < r.length; ++c)r[c].marker.explicitlyCleared ? o || (o = r.slice(0, c)) : o && o.push(r[c]); return o ? o.length ? o : null : r
      } function P_(r, o) {
        const c = o[`spans_${r.id}`]; if (!c)
          return null; for (var a = [], d = 0; d < o.text.length; ++d)a.push(I_(c[d])); return a
      } function am(r, o) {
        const c = P_(r, o); const a = _f(r, o); if (!c)
          return a; if (!a)
          return c; for (let d = 0; d < c.length; ++d) {
          const m = c[d]; const b = a[d]; if (m && b) {
            e:for (let x = 0; x < b.length; ++x) {
              for (var _ = b[x], T = 0; T < m.length; ++T) {
                if (m[T].marker == _.marker)
                  continue e
              } m.push(_)
            }
          }
          else {
            b && (c[d] = b)
          }
        } return c
      } function hs(r, o, c) {
        for (var a = [], d = 0; d < r.length; ++d) {
          const m = r[d]; if (m.ranges) { a.push(c ? Zn.prototype.deepCopy.call(m) : m); continue } const b = m.changes; const x = []; a.push({ changes: x }); for (let _ = 0; _ < b.length; ++_) {
            const T = b[_]; let H = void 0; if (x.push({ from: T.from, to: T.to, text: T.text }), o) {
              for (const X in T)(H = X.match(/^spans_(\d+)$/)) && ge(o, Number(H[1])) > -1 && (ve(x)[X] = T[X], delete T[X])
            }
          }
        } return a
      } function ed(r, o, c, a) {
        if (a) { let d = r.anchor; if (c) { const m = Le(o, d) < 0; m != Le(c, d) < 0 ? (d = o, o = c) : m != Le(o, c) < 0 && (o = c) } return new gt(d, o) }
        else {
          return new gt(c || o, o)
        }
      } function bc(r, o, c, a, d) { d == null && (d = r.cm && (r.cm.display.shift || r.extend)), fn(r, new Zn([ed(r.sel.primary(), o, c, d)], 0), a) } function cm(r, o, c) { for (var a = [], d = r.cm && (r.cm.display.shift || r.extend), m = 0; m < r.sel.ranges.length; m++)a[m] = ed(r.sel.ranges[m], o[m], null, d); const b = _r(r.cm, a, r.sel.primIndex); fn(r, b, c) } function td(r, o, c, a) { const d = r.sel.ranges.slice(0); d[o] = c, fn(r, _r(r.cm, d, r.sel.primIndex), a) } function um(r, o, c, a) { fn(r, zi(o, c), a) } function O_(r, o, c) { const a = { ranges: o.ranges, update(d) { this.ranges = []; for (let m = 0; m < d.length; m++) this.ranges[m] = new gt(Xe(r, d[m].anchor), Xe(r, d[m].head)) }, origin: c && c.origin }; return Pt(r, 'beforeSelectionChange', r, a), r.cm && Pt(r.cm, 'beforeSelectionChange', r.cm, a), a.ranges != o.ranges ? _r(r.cm, a.ranges, a.ranges.length - 1) : o } function fm(r, o, c) { const a = r.history.done; const d = ve(a); d && d.ranges ? (a[a.length - 1] = o, wc(r, o, c)) : fn(r, o, c) } function fn(r, o, c) { wc(r, o, c), N_(r, r.sel, r.cm ? r.cm.curOp.id : Number.NaN, c) } function wc(r, o, c) { (Hn(r, 'beforeSelectionChange') || r.cm && Hn(r.cm, 'beforeSelectionChange')) && (o = O_(r, o, c)); const a = c && c.bias || (Le(o.primary().head, r.sel.primary().head) < 0 ? -1 : 1); dm(r, pm(r, o, a, !0)), !(c && c.scroll === !1) && r.cm && r.cm.getOption('readOnly') != 'nocursor' && fs(r.cm) } function dm(r, o) { o.equals(r.sel) || (r.sel = o, r.cm && (r.cm.curOp.updateInput = 1, r.cm.curOp.selectionChanged = !0, sr(r.cm)), Jt(r, 'cursorActivity', r)) } function hm(r) { dm(r, pm(r, r.sel, null, !1)) } function pm(r, o, c, a) { for (var d, m = 0; m < o.ranges.length; m++) { const b = o.ranges[m]; const x = o.ranges.length == r.sel.ranges.length && r.sel.ranges[m]; const _ = xc(r, b.anchor, x && x.anchor, c, a); const T = b.head == b.anchor ? _ : xc(r, b.head, x && x.head, c, a); (d || _ != b.anchor || T != b.head) && (d || (d = o.ranges.slice(0, m)), d[m] = new gt(_, T)) } return d ? _r(r.cm, d, o.primIndex) : o } function ps(r, o, c, a, d) {
        const m = Oe(r, o.line); if (m.markedSpans) {
          for (let b = 0; b < m.markedSpans.length; ++b) {
            const x = m.markedSpans[b]; const _ = x.marker; const T = 'selectLeft' in _ ? !_.selectLeft : _.inclusiveLeft; const H = 'selectRight' in _ ? !_.selectRight : _.inclusiveRight; if ((x.from == null || (T ? x.from <= o.ch : x.from < o.ch)) && (x.to == null || (H ? x.to >= o.ch : x.to > o.ch))) {
              if (d && (Pt(_, 'beforeCursorEnter'), _.explicitlyCleared)) {
                if (m.markedSpans) { --b; continue }
                else {
                  break
                }
              } if (!_.atomic)
                continue; if (c) {
                let X = _.find(a < 0 ? 1 : -1); let re = void 0; if ((a < 0 ? H : T) && (X = gm(r, X, -a, X && X.line == o.line ? m : null)), X && X.line == o.line && (re = Le(X, c)) && (a < 0 ? re < 0 : re > 0))
                  return ps(r, X, o, a, d)
              } let Z = _.find(a < 0 ? -1 : 1); return (a < 0 ? T : H) && (Z = gm(r, Z, a, Z.line == o.line ? m : null)), Z ? ps(r, Z, o, a, d) : null
            }
          }
        } return o
      } function xc(r, o, c, a, d) { const m = a || 1; const b = ps(r, o, c, m, d) || !d && ps(r, o, c, m, !0) || ps(r, o, c, -m, d) || !d && ps(r, o, c, -m, !0); return b || (r.cantEdit = !0, le(r.first, 0)) } function gm(r, o, c, a) { return c < 0 && o.ch == 0 ? o.line > r.first ? Xe(r, le(o.line - 1)) : null : c > 0 && o.ch == (a || Oe(r, o.line)).text.length ? o.line < r.first + r.size - 1 ? le(o.line + 1, 0) : null : new le(o.line, o.ch + c) } function mm(r) { r.setSelection(le(r.firstLine(), 0), le(r.lastLine()), Y) } function vm(r, o, c) { var a = { canceled: !1, from: o.from, to: o.to, text: o.text, origin: o.origin, cancel() { return a.canceled = !0 } }; return c && (a.update = function (d, m, b, x) { d && (a.from = Xe(r, d)), m && (a.to = Xe(r, m)), b && (a.text = b), x !== void 0 && (a.origin = x) }), Pt(r, 'beforeChange', r, a), r.cm && Pt(r.cm, 'beforeChange', r.cm, a), a.canceled ? (r.cm && (r.cm.curOp.updateInput = 2), null) : { from: a.from, to: a.to, text: a.text, origin: a.origin } } function gs(r, o, c) {
        if (r.cm) {
          if (!r.cm.curOp)
            return Yt(r.cm, gs)(r, o, c); if (r.cm.state.suppressEdits)
            return
        } if (!((Hn(r, 'beforeChange') || r.cm && Hn(r.cm, 'beforeChange')) && (o = vm(r, o, !0), !o))) {
          const a = ag && !c && NS(r, o.from, o.to); if (a) {
            for (let d = a.length - 1; d >= 0; --d)ym(r, { from: a[d].from, to: a[d].to, text: d ? [''] : o.text, origin: o.origin })
          }
          else {
            ym(r, o)
          }
        }
      } function ym(r, o) { if (!(o.text.length == 1 && o.text[0] == '' && Le(o.from, o.to) == 0)) { const c = Jf(r, o); sm(r, o, c, r.cm ? r.cm.curOp.id : Number.NaN), Cl(r, o, c, _f(r, o)); const a = []; Fi(r, (d, m) => { !m && ge(a, d.history) == -1 && (Sm(d.history, o), a.push(d.history)), Cl(d, o, null, _f(d, o)) }) } } function Sc(r, o, c) {
        const a = r.cm && r.cm.state.suppressEdits; if (!(a && !c)) {
          for (var d = r.history, m, b = r.sel, x = o == 'undo' ? d.done : d.undone, _ = o == 'undo' ? d.undone : d.done, T = 0; T < x.length && (m = x[T], !(c ? m.ranges && !m.equals(r.sel) : !m.ranges)); T++);if (T != x.length) {
            for (d.lastOrigin = d.lastSelOrigin = null; ;) {
              if (m = x.pop(), m.ranges) { if (yc(m, _), c && !m.equals(r.sel)) { fn(r, m, { clearRedo: !1 }); return }b = m }
              else if (a) { x.push(m); return }
              else {
                break
              }
            } const H = []; yc(b, _), _.push({ changes: H, generation: d.generation }), d.generation = m.generation || ++d.maxGeneration; for (var X = Hn(r, 'beforeChange') || r.cm && Hn(r.cm, 'beforeChange'), re = function (me) {
                const Se = m.changes[me]; if (Se.origin = o, X && !vm(r, Se, !1))
                  return x.length = 0, {}; H.push(Qf(r, Se)); const ke = me ? Jf(r, Se) : ve(x); Cl(r, Se, ke, am(r, Se)), !me && r.cm && r.cm.scrollIntoView({ from: Se.from, to: Di(Se) }); const $e = []; Fi(r, (Te, Ne) => { !Ne && ge($e, Te.history) == -1 && (Sm(Te.history, Se), $e.push(Te.history)), Cl(Te, Se, null, am(Te, Se)) })
              }, Z = m.changes.length - 1; Z >= 0; --Z) {
              const ce = re(Z); if (ce)
                return ce.v
            }
          }
        }
      } function bm(r, o) { if (o != 0 && (r.first += o, r.sel = new Zn(be(r.sel.ranges, (d) => { return new gt(le(d.anchor.line + o, d.anchor.ch), le(d.head.line + o, d.head.ch)) }), r.sel.primIndex), r.cm)) { kn(r.cm, r.first, r.first - o, o); for (let c = r.cm.display, a = c.viewFrom; a < c.viewTo; a++)Oi(r.cm, a, 'gutter') } } function Cl(r, o, c, a) {
        if (r.cm && !r.cm.curOp)
          return Yt(r.cm, Cl)(r, o, c, a); if (o.to.line < r.first) { bm(r, o.text.length - 1 - (o.to.line - o.from.line)); return } if (!(o.from.line > r.lastLine())) { if (o.from.line < r.first) { const d = o.text.length - 1 - (r.first - o.from.line); bm(r, d), o = { from: le(r.first, 0), to: le(o.to.line + d, o.to.ch), text: [ve(o.text)], origin: o.origin } } const m = r.lastLine(); o.to.line > m && (o = { from: o.from, to: le(m, Oe(r, m).text.length), text: [o.text[0]], origin: o.origin }), o.removed = si(r, o.from, o.to), c || (c = Jf(r, o)), r.cm ? R_(r.cm, o, a) : Zf(r, o, a), wc(r, c, Y), r.cantEdit && xc(r, le(r.firstLine(), 0)) && (r.cantEdit = !1) }
      } function R_(r, o, c) {
        const a = r.doc; const d = r.display; const m = o.from; const b = o.to; let x = !1; let _ = m.line; r.options.lineWrapping || (_ = N(xr(Oe(a, m.line))), a.iter(_, b.line + 1, (Z) => {
          if (Z == d.maxLine)
            return x = !0, !0
        })), a.sel.contains(o.from, o.to) > -1 && sr(r), Zf(a, o, c, Dg(r)), r.options.lineWrapping || (a.iter(_, m.line + o.text.length, (Z) => { const ce = oc(Z); ce > d.maxLineLength && (d.maxLine = Z, d.maxLineLength = ce, d.maxLineChanged = !0, x = !1) }), x && (r.curOp.updateMaxLine = !0)), TS(a, m.line), _l(r, 400); const T = o.text.length - (b.line - m.line) - 1; o.full ? kn(r) : m.line == b.line && o.text.length == 1 && !nm(r.doc, o) ? Oi(r, m.line, 'text') : kn(r, m.line, b.line + 1, T); const H = Hn(r, 'changes'); const X = Hn(r, 'change'); if (X || H) { const re = { from: m, to: b, text: o.text, removed: o.removed, origin: o.origin }; X && Jt(r, 'change', r, re), H && (r.curOp.changeObjs || (r.curOp.changeObjs = [])).push(re) }r.display.selForContextMenu = null
      } function ms(r, o, c, a, d) { let m; a || (a = c), Le(a, c) < 0 && (m = [a, c], c = m[0], a = m[1]), typeof o == 'string' && (o = r.splitLines(o)), gs(r, { from: c, to: a, text: o, origin: d }) } function wm(r, o, c, a) { c < r.line ? r.line += a : o < r.line && (r.line = o, r.ch = 0) } function xm(r, o, c, a) {
        for (let d = 0; d < r.length; ++d) {
          let m = r[d]; let b = !0; if (m.ranges) { m.copied || (m = r[d] = m.deepCopy(), m.copied = !0); for (let x = 0; x < m.ranges.length; x++)wm(m.ranges[x].anchor, o, c, a), wm(m.ranges[x].head, o, c, a); continue } for (let _ = 0; _ < m.changes.length; ++_) {
            const T = m.changes[_]; if (c < T.from.line) {
              T.from = le(T.from.line + a, T.from.ch), T.to = le(T.to.line + a, T.to.ch)
            }
            else if (o <= T.to.line) { b = !1; break }
          }b || (r.splice(0, d + 1), d = 0)
        }
      } function Sm(r, o) { const c = o.from.line; const a = o.to.line; const d = o.text.length - (a - c) - 1; xm(r.done, c, a, d), xm(r.undone, c, a, d) } function El(r, o, c, a) { let d = o; let m = o; return typeof o == 'number' ? m = Oe(r, Qp(r, o)) : d = N(o), d == null ? null : (a(m, d) && r.cm && Oi(r.cm, d, c), m) } function Al(r) { this.lines = r, this.parent = null; for (var o = 0, c = 0; c < r.length; ++c)r[c].parent = this, o += r[c].height; this.height = o }Al.prototype = { chunkSize() { return this.lines.length }, removeInner(r, o) { for (let c = r, a = r + o; c < a; ++c) { const d = this.lines[c]; this.height -= d.height, zS(d), Jt(d, 'delete') } this.lines.splice(r, o) }, collapse(r) { r.push.apply(r, this.lines) }, insertInner(r, o, c) { this.height += c, this.lines = this.lines.slice(0, r).concat(o).concat(this.lines.slice(r)); for (let a = 0; a < o.length; ++a)o[a].parent = this }, iterN(r, o, c) {
        for (let a = r + o; r < a; ++r) {
          if (c(this.lines[r]))
            return !0
        }
      } }; function Ll(r) { this.children = r; for (var o = 0, c = 0, a = 0; a < r.length; ++a) { const d = r[a]; o += d.chunkSize(), c += d.height, d.parent = this } this.size = o, this.height = c, this.parent = null }Ll.prototype = { chunkSize() { return this.size }, removeInner(r, o) {
        this.size -= o; for (let c = 0; c < this.children.length; ++c) {
          const a = this.children[c]; const d = a.chunkSize(); if (r < d) {
            const m = Math.min(o, d - r); const b = a.height; if (a.removeInner(r, m), this.height -= b - a.height, d == m && (this.children.splice(c--, 1), a.parent = null), (o -= m) == 0)
              break; r = 0
          }
          else {
            r -= d
          }
        } if (this.size - o < 25 && (this.children.length > 1 || !(this.children[0] instanceof Al))) { const x = []; this.collapse(x), this.children = [new Al(x)], this.children[0].parent = this }
      }, collapse(r) { for (let o = 0; o < this.children.length; ++o) this.children[o].collapse(r) }, insertInner(r, o, c) { this.size += o.length, this.height += c; for (let a = 0; a < this.children.length; ++a) { const d = this.children[a]; const m = d.chunkSize(); if (r <= m) { if (d.insertInner(r, o, c), d.lines && d.lines.length > 50) { for (var b = d.lines.length % 25 + 25, x = b; x < d.lines.length;) { const _ = new Al(d.lines.slice(x, x += 25)); d.height -= _.height, this.children.splice(++a, 0, _), _.parent = this }d.lines = d.lines.slice(0, b), this.maybeSpill() } break }r -= m } }, maybeSpill() {
        if (!(this.children.length <= 10)) {
          let r = this; do {
            const o = r.children.splice(r.children.length - 5, 5); const c = new Ll(o); if (r.parent) { r.size -= c.size, r.height -= c.height; const d = ge(r.parent.children, r); r.parent.children.splice(d + 1, 0, c) }
            else { const a = new Ll(r.children); a.parent = r, r.children = [a, c], r = a }c.parent = r.parent
          } while (r.children.length > 10); r.parent.maybeSpill()
        }
      }, iterN(r, o, c) {
        for (let a = 0; a < this.children.length; ++a) {
          const d = this.children[a]; const m = d.chunkSize(); if (r < m) {
            const b = Math.min(o, m - r); if (d.iterN(r, b, c))
              return !0; if ((o -= b) == 0)
              break; r = 0
          }
          else {
            r -= m
          }
        }
      } }; const $l = function (r, o, c) {
        if (c) {
          for (const a in c)c.hasOwnProperty(a) && (this[a] = c[a])
        } this.doc = r, this.node = o
      }; $l.prototype.clear = function () { const r = this.doc.cm; const o = this.line.widgets; const c = this.line; const a = N(c); if (!(a == null || !o)) { for (let d = 0; d < o.length; ++d)o[d] == this && o.splice(d--, 1); o.length || (c.widgets = null); const m = ml(this); Yn(c, Math.max(0, c.height - m)), r && (Bn(r, () => { _m(r, c, -m), Oi(r, a, 'widget') }), Jt(r, 'lineWidgetCleared', r, this, a)) } }, $l.prototype.changed = function () { const r = this; const o = this.height; const c = this.doc.cm; const a = this.line; this.height = null; const d = ml(this) - o; d && (Pi(this.doc, a) || Yn(a, a.height + d), c && Bn(c, () => { c.curOp.forceUpdate = !0, _m(c, a, d), Jt(c, 'lineWidgetChanged', c, r, N(a)) })) }, mr($l); function _m(r, o, c) { ai(o) < (r.curOp && r.curOp.scrollTop || r.doc.scrollTop) && qf(r, c) } function z_(r, o, c, a) { const d = new $l(r, c, a); const m = r.cm; return m && d.noHScroll && (m.display.alignWidgets = !0), El(r, o, 'widget', (b) => { const x = b.widgets || (b.widgets = []); if (d.insertAt == null ? x.push(d) : x.splice(Math.min(x.length, Math.max(0, d.insertAt)), 0, d), d.line = b, m && !Pi(r, b)) { const _ = ai(b) < r.scrollTop; Yn(b, b.height + ml(d)), _ && qf(m, d.height), m.curOp.forceUpdate = !0 } return !0 }), m && Jt(m, 'lineWidgetAdded', m, d, typeof o == 'number' ? o : N(o)), d } let km = 0; const Hi = function (r, o) { this.lines = [], this.type = o, this.doc = r, this.id = ++km }; Hi.prototype.clear = function () {
        if (!this.explicitlyCleared) {
          const r = this.doc.cm; const o = r && !r.curOp; if (o && Ao(r), Hn(this, 'clear')) { const c = this.find(); c && Jt(this, 'clear', c.from, c.to) } for (var a = null, d = null, m = 0; m < this.lines.length; ++m) { const b = this.lines[m]; const x = hl(b.markedSpans, this); r && !this.collapsed ? Oi(r, N(b), 'text') : r && (x.to != null && (d = N(b)), x.from != null && (a = N(b))), b.markedSpans = AS(b.markedSpans, x), x.from == null && this.collapsed && !Pi(this.doc, b) && r && Yn(b, as(r.display)) } if (r && this.collapsed && !r.options.lineWrapping) {
            for (let _ = 0; _ < this.lines.length; ++_) { const T = xr(this.lines[_]); const H = oc(T); H > r.display.maxLineLength && (r.display.maxLine = T, r.display.maxLineLength = H, r.display.maxLineChanged = !0) }
          }a != null && r && this.collapsed && kn(r, a, d + 1), this.lines.length = 0, this.explicitlyCleared = !0, this.atomic && this.doc.cantEdit && (this.doc.cantEdit = !1, r && hm(r.doc)), r && Jt(r, 'markerCleared', r, this, a, d), o && Lo(r), this.parent && this.parent.clear()
        }
      }, Hi.prototype.find = function (r, o) {
        r == null && this.type == 'bookmark' && (r = 1); for (var c, a, d = 0; d < this.lines.length; ++d) {
          const m = this.lines[d]; const b = hl(m.markedSpans, this); if (b.from != null && (c = le(o ? m : N(m), b.from), r == -1))
            return c; if (b.to != null && (a = le(o ? m : N(m), b.to), r == 1))
            return a
        } return c && { from: c, to: a }
      }, Hi.prototype.changed = function () { const r = this; const o = this.find(-1, !0); const c = this; const a = this.doc.cm; !o || !a || Bn(a, () => { const d = o.line; const m = N(o.line); const b = Mf(a, m); if (b && ($g(b), a.curOp.selectionChanged = a.curOp.forceUpdate = !0), a.curOp.updateMaxLine = !0, !Pi(c.doc, d) && c.height != null) { const x = c.height; c.height = null; const _ = ml(c) - x; _ && Yn(d, d.height + _) }Jt(a, 'markerChanged', a, r) }) }, Hi.prototype.attachLine = function (r) { if (!this.lines.length && this.doc.cm) { const o = this.doc.cm.curOp; (!o.maybeHiddenMarkers || ge(o.maybeHiddenMarkers, this) == -1) && (o.maybeUnhiddenMarkers || (o.maybeUnhiddenMarkers = [])).push(this) } this.lines.push(r) }, Hi.prototype.detachLine = function (r) { if (this.lines.splice(ge(this.lines, r), 1), !this.lines.length && this.doc.cm) { const o = this.doc.cm.curOp; (o.maybeHiddenMarkers || (o.maybeHiddenMarkers = [])).push(this) } }, mr(Hi); function vs(r, o, c, a, d) {
        if (a && a.shared)
          return D_(r, o, c, a, d); if (r.cm && !r.cm.curOp)
          return Yt(r.cm, vs)(r, o, c, a, d); const m = new Hi(r, d); const b = Le(o, c); if (a && Q(a, m, !1), b > 0 || b == 0 && m.clearWhenEmpty !== !1)
          return m; if (m.replacedWith && (m.collapsed = !0, m.widgetNode = R('span', [m.replacedWith], 'CodeMirror-widget'), a.handleMouseEvents || m.widgetNode.setAttribute('cm-ignore-events', 'true'), a.insertLeft && (m.widgetNode.insertLeft = !0)), m.collapsed) {
          if (pg(r, o.line, o, c, m) || o.line != c.line && pg(r, c.line, o, c, m))
            throw new Error('Inserting collapsed marker partially overlapping an existing one'); ES()
        }m.addToHistory && sm(r, { from: o, to: c, origin: 'markText' }, r.sel, Number.NaN); let x = o.line; const _ = r.cm; let T; if (r.iter(x, c.line + 1, (X) => { _ && m.collapsed && !_.options.lineWrapping && xr(X) == _.display.maxLine && (T = !0), m.collapsed && x != o.line && Yn(X, 0), LS(X, new tc(m, x == o.line ? o.ch : null, x == c.line ? c.ch : null), r.cm && r.cm.curOp), ++x }), m.collapsed && r.iter(o.line, c.line + 1, (X) => { Pi(r, X) && Yn(X, 0) }), m.clearOnEnter && He(m, 'beforeCursorEnter', () => { return m.clear() }), m.readOnly && (CS(), (r.history.done.length || r.history.undone.length) && r.clearHistory()), m.collapsed && (m.id = ++km, m.atomic = !0), _) {
          if (T && (_.curOp.updateMaxLine = !0), m.collapsed) {
            kn(_, o.line, c.line + 1)
          }
          else if (m.className || m.startStyle || m.endStyle || m.css || m.attributes || m.title) {
            for (let H = o.line; H <= c.line; H++)Oi(_, H, 'text')
          } m.atomic && hm(_.doc), Jt(_, 'markerAdded', _, m)
        } return m
      } const Ml = function (r, o) { this.markers = r, this.primary = o; for (let c = 0; c < r.length; ++c)r[c].parent = this }; Ml.prototype.clear = function () { if (!this.explicitlyCleared) { this.explicitlyCleared = !0; for (let r = 0; r < this.markers.length; ++r) this.markers[r].clear(); Jt(this, 'clear') } }, Ml.prototype.find = function (r, o) { return this.primary.find(r, o) }, mr(Ml); function D_(r, o, c, a, d) {
        a = Q(a), a.shared = !1; const m = [vs(r, o, c, a, d)]; let b = m[0]; const x = a.widgetNode; return Fi(r, (_) => {
          x && (a.widgetNode = x.cloneNode(!0)), m.push(vs(_, Xe(_, o), Xe(_, c), a, d)); for (let T = 0; T < _.linked.length; ++T) {
            if (_.linked[T].isParent)
              return
          } b = ve(m)
        }), new Ml(m, b)
      } function Tm(r) { return r.findMarks(le(r.first, 0), r.clipPos(le(r.lastLine())), (o) => { return o.parent }) } function F_(r, o) { for (let c = 0; c < o.length; c++) { const a = o[c]; const d = a.find(); const m = r.clipPos(d.from); const b = r.clipPos(d.to); if (Le(m, b)) { const x = vs(r, m, b, a.primary, a.primary.type); a.markers.push(x), x.parent = a } } } function H_(r) { for (let o = function (a) { const d = r[a]; const m = [d.primary.doc]; Fi(d.primary.doc, (_) => { return m.push(_) }); for (let b = 0; b < d.markers.length; b++) { const x = d.markers[b]; ge(m, x.doc) == -1 && (x.parent = null, d.markers.splice(b--, 1)) } }, c = 0; c < r.length; c++)o(c) } let B_ = 0; const Tn = function (r, o, c, a, d) {
        if (!(this instanceof Tn))
          return new Tn(r, o, c, a, d); c == null && (c = 0), Ll.call(this, [new Al([new os('', null)])]), this.first = c, this.scrollTop = this.scrollLeft = 0, this.cantEdit = !1, this.cleanGeneration = 1, this.modeFrontier = this.highlightFrontier = c; const m = le(c, 0); this.sel = zi(m), this.history = new vc(null), this.id = ++B_, this.modeOption = o, this.lineSep = a, this.direction = d == 'rtl' ? 'rtl' : 'ltr', this.extend = !1, typeof r == 'string' && (r = this.splitLines(r)), Zf(this, { from: m, to: m, text: r }), fn(this, zi(m), Y)
      }; Tn.prototype = De(Ll.prototype, { constructor: Tn, iter(r, o, c) { c ? this.iterN(r - this.first, o - r, c) : this.iterN(this.first, this.first + this.size, r) }, insert(r, o) { for (var c = 0, a = 0; a < o.length; ++a)c += o[a].height; this.insertInner(r - this.first, o, c) }, remove(r, o) { this.removeInner(r - this.first, o) }, getValue(r) { const o = fl(this, this.first, this.first + this.size); return r === !1 ? o : o.join(r || this.lineSeparator()) }, setValue: Zt(function (r) { const o = le(this.first, 0); const c = this.first + this.size - 1; gs(this, { from: o, to: le(c, Oe(this, c).text.length), text: this.splitLines(r), origin: 'setValue', full: !0 }, !0), this.cm && bl(this.cm, 0, 0), fn(this, zi(o), Y) }), replaceRange(r, o, c, a) { o = Xe(this, o), c = c ? Xe(this, c) : o, ms(this, r, o, c, a) }, getRange(r, o, c) { const a = si(this, Xe(this, r), Xe(this, o)); return c === !1 ? a : c === '' ? a.join('') : a.join(c || this.lineSeparator()) }, getLine(r) { const o = this.getLineHandle(r); return o && o.text }, getLineHandle(r) {
        if (de(this, r))
          return Oe(this, r)
      }, getLineNumber(r) { return N(r) }, getLineHandleVisualStart(r) { return typeof r == 'number' && (r = Oe(this, r)), xr(r) }, lineCount() { return this.size }, firstLine() { return this.first }, lastLine() { return this.first + this.size - 1 }, clipPos(r) { return Xe(this, r) }, getCursor(r) { const o = this.sel.primary(); let c; return r == null || r == 'head' ? c = o.head : r == 'anchor' ? c = o.anchor : r == 'end' || r == 'to' || r === !1 ? c = o.to() : c = o.from(), c }, listSelections() { return this.sel.ranges }, somethingSelected() { return this.sel.somethingSelected() }, setCursor: Zt(function (r, o, c) { um(this, Xe(this, typeof r == 'number' ? le(r, o || 0) : r), null, c) }), setSelection: Zt(function (r, o, c) { um(this, Xe(this, r), Xe(this, o || r), c) }), extendSelection: Zt(function (r, o, c) { bc(this, Xe(this, r), o && Xe(this, o), c) }), extendSelections: Zt(function (r, o) { cm(this, eg(this, r), o) }), extendSelectionsBy: Zt(function (r, o) { const c = be(this.sel.ranges, r); cm(this, eg(this, c), o) }), setSelections: Zt(function (r, o, c) { if (r.length) { for (var a = [], d = 0; d < r.length; d++)a[d] = new gt(Xe(this, r[d].anchor), Xe(this, r[d].head || r[d].anchor)); o == null && (o = Math.min(r.length - 1, this.sel.primIndex)), fn(this, _r(this.cm, a, o), c) } }), addSelection: Zt(function (r, o, c) { const a = this.sel.ranges.slice(0); a.push(new gt(Xe(this, r), Xe(this, o || r))), fn(this, _r(this.cm, a, a.length - 1), c) }), getSelection(r) { for (var o = this.sel.ranges, c, a = 0; a < o.length; a++) { const d = si(this, o[a].from(), o[a].to()); c = c ? c.concat(d) : d } return r === !1 ? c : c.join(r || this.lineSeparator()) }, getSelections(r) { for (var o = [], c = this.sel.ranges, a = 0; a < c.length; a++) { let d = si(this, c[a].from(), c[a].to()); r !== !1 && (d = d.join(r || this.lineSeparator())), o[a] = d } return o }, replaceSelection(r, o, c) { for (var a = [], d = 0; d < this.sel.ranges.length; d++)a[d] = r; this.replaceSelections(a, o, c || '+input') }, replaceSelections: Zt(function (r, o, c) { for (var a = [], d = this.sel, m = 0; m < d.ranges.length; m++) { const b = d.ranges[m]; a[m] = { from: b.from(), to: b.to(), text: this.splitLines(r[m]), origin: c } } for (var x = o && o != 'end' && A_(this, a, o), _ = a.length - 1; _ >= 0; _--)gs(this, a[_]); x ? fm(this, x) : this.cm && fs(this.cm) }), undo: Zt(function () { Sc(this, 'undo') }), redo: Zt(function () { Sc(this, 'redo') }), undoSelection: Zt(function () { Sc(this, 'undo', !0) }), redoSelection: Zt(function () { Sc(this, 'redo', !0) }), setExtending(r) { this.extend = r }, getExtending() { return this.extend }, historySize() { for (var r = this.history, o = 0, c = 0, a = 0; a < r.done.length; a++)r.done[a].ranges || ++o; for (let d = 0; d < r.undone.length; d++)r.undone[d].ranges || ++c; return { undo: o, redo: c } }, clearHistory() { const r = this; this.history = new vc(this.history), Fi(this, (o) => { return o.history = r.history }, !0) }, markClean() { this.cleanGeneration = this.changeGeneration(!0) }, changeGeneration(r) { return r && (this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null), this.history.generation }, isClean(r) { return this.history.generation == (r || this.cleanGeneration) }, getHistory() { return { done: hs(this.history.done), undone: hs(this.history.undone) } }, setHistory(r) { const o = this.history = new vc(this.history); o.done = hs(r.done.slice(0), null, !0), o.undone = hs(r.undone.slice(0), null, !0) }, setGutterMarker: Zt(function (r, o, c) { return El(this, r, 'gutter', (a) => { const d = a.gutterMarkers || (a.gutterMarkers = {}); return d[o] = c, !c && ut(d) && (a.gutterMarkers = null), !0 }) }), clearGutter: Zt(function (r) { const o = this; this.iter((c) => { c.gutterMarkers && c.gutterMarkers[r] && El(o, c, 'gutter', () => { return c.gutterMarkers[r] = null, ut(c.gutterMarkers) && (c.gutterMarkers = null), !0 }) }) }), lineInfo(r) {
        let o; if (typeof r == 'number') {
          if (!de(this, r) || (o = r, r = Oe(this, r), !r))
            return null
        }
        else if (o = N(r), o == null) {
          return null
        } return { line: o, handle: r, text: r.text, gutterMarkers: r.gutterMarkers, textClass: r.textClass, bgClass: r.bgClass, wrapClass: r.wrapClass, widgets: r.widgets }
      }, addLineClass: Zt(function (r, o, c) {
        return El(this, r, o == 'gutter' ? 'gutter' : 'class', (a) => {
          const d = o == 'text' ? 'textClass' : o == 'background' ? 'bgClass' : o == 'gutter' ? 'gutterClass' : 'wrapClass'; if (!a[d]) {
            a[d] = c
          }
          else {
            if (K(c).test(a[d]))
              return !1; a[d] += ` ${c}`
          } return !0
        })
      }), removeLineClass: Zt(function (r, o, c) {
        return El(this, r, o == 'gutter' ? 'gutter' : 'class', (a) => {
          const d = o == 'text' ? 'textClass' : o == 'background' ? 'bgClass' : o == 'gutter' ? 'gutterClass' : 'wrapClass'; const m = a[d]; if (m) {
            if (c == null) {
              a[d] = null
            }
            else {
              const b = m.match(K(c)); if (!b)
                return !1; const x = b.index + b[0].length; a[d] = m.slice(0, b.index) + (!b.index || x == m.length ? '' : ' ') + m.slice(x) || null
            }
          }
          else {
            return !1
          } return !0
        })
      }), addLineWidget: Zt(function (r, o, c) { return z_(this, r, o, c) }), removeLineWidget(r) { r.clear() }, markText(r, o, c) { return vs(this, Xe(this, r), Xe(this, o), c, c && c.type || 'range') }, setBookmark(r, o) { const c = { replacedWith: o && (o.nodeType == null ? o.widget : o), insertLeft: o && o.insertLeft, clearWhenEmpty: !1, shared: o && o.shared, handleMouseEvents: o && o.handleMouseEvents }; return r = Xe(this, r), vs(this, r, r, c, 'bookmark') }, findMarksAt(r) {
        r = Xe(this, r); const o = []; const c = Oe(this, r.line).markedSpans; if (c) {
          for (let a = 0; a < c.length; ++a) { const d = c[a]; (d.from == null || d.from <= r.ch) && (d.to == null || d.to >= r.ch) && o.push(d.marker.parent || d.marker) }
        } return o
      }, findMarks(r, o, c) {
        r = Xe(this, r), o = Xe(this, o); const a = []; let d = r.line; return this.iter(r.line, o.line + 1, (m) => {
          const b = m.markedSpans; if (b) {
            for (let x = 0; x < b.length; x++) { const _ = b[x]; !(_.to != null && d == r.line && r.ch >= _.to || _.from == null && d != r.line || _.from != null && d == o.line && _.from >= o.ch) && (!c || c(_.marker)) && a.push(_.marker.parent || _.marker) }
          }++d
        }), a
      }, getAllMarks() {
        const r = []; return this.iter((o) => {
          const c = o.markedSpans; if (c) {
            for (let a = 0; a < c.length; ++a)c[a].from != null && r.push(c[a].marker)
          }
        }), r
      }, posFromIndex(r) {
        let o; let c = this.first; const a = this.lineSeparator().length; return this.iter((d) => {
          const m = d.text.length + a; if (m > r)
            return o = r, !0; r -= m, ++c
        }), Xe(this, le(c, o))
      }, indexFromPos(r) {
        r = Xe(this, r); let o = r.ch; if (r.line < this.first || r.ch < 0)
          return 0; const c = this.lineSeparator().length; return this.iter(this.first, r.line, (a) => { o += a.text.length + c }), o
      }, copy(r) { const o = new Tn(fl(this, this.first, this.first + this.size), this.modeOption, this.first, this.lineSep, this.direction); return o.scrollTop = this.scrollTop, o.scrollLeft = this.scrollLeft, o.sel = this.sel, o.extend = !1, r && (o.history.undoDepth = this.history.undoDepth, o.setHistory(this.getHistory())), o }, linkedDoc(r) { r || (r = {}); let o = this.first; let c = this.first + this.size; r.from != null && r.from > o && (o = r.from), r.to != null && r.to < c && (c = r.to); const a = new Tn(fl(this, o, c), r.mode || this.modeOption, o, this.lineSep, this.direction); return r.sharedHist && (a.history = this.history), (this.linked || (this.linked = [])).push({ doc: a, sharedHist: r.sharedHist }), a.linked = [{ doc: this, isParent: !0, sharedHist: r.sharedHist }], F_(a, Tm(this)), a }, unlinkDoc(r) {
        if (r instanceof Ct && (r = r.doc), this.linked) {
          for (let o = 0; o < this.linked.length; ++o) { const c = this.linked[o]; if (c.doc == r) { this.linked.splice(o, 1), r.unlinkDoc(this), H_(Tm(this)); break } }
        } if (r.history == this.history) { const a = [r.id]; Fi(r, (d) => { return a.push(d.id) }, !0), r.history = new vc(null), r.history.done = hs(this.history.done, a), r.history.undone = hs(this.history.undone, a) }
      }, iterLinkedDocs(r) { Fi(this, r) }, getMode() { return this.mode }, getEditor() { return this.cm }, splitLines(r) { return this.lineSep ? r.split(this.lineSep) : lr(r) }, lineSeparator() {
        return this.lineSep || `
`
      }, setDirection: Zt(function (r) { r != 'rtl' && (r = 'ltr'), r != this.direction && (this.direction = r, this.iter((o) => { return o.order = null }), this.cm && L_(this.cm)) }) }), Tn.prototype.eachLine = Tn.prototype.iter; let Cm = 0; function W_(r) {
        const o = this; if (Em(o), !(Ot(o, r) || ci(o.display, r))) {
          un(r), h && (Cm = +new Date()); let c = ko(o, r, !0); const a = r.dataTransfer.files; if (!(!c || o.isReadOnly())) {
            if (a && a.length && window.FileReader && window.File) {
              for (var d = a.length, m = new Array(d), b = 0, x = function () { ++b == d && Yt(o, () => { c = Xe(o.doc, c); const Z = { from: c, to: c, text: o.doc.splitLines(m.filter((ce) => { return ce != null }).join(o.doc.lineSeparator())), origin: 'paste' }; gs(o.doc, Z), fm(o.doc, zi(Xe(o.doc, c), Xe(o.doc, Di(Z)))) })() }, _ = function (Z, ce) { if (o.options.allowDropFileTypes && ge(o.options.allowDropFileTypes, Z.type) == -1) { x(); return } const me = new FileReader(); me.onerror = function () { return x() }, me.onload = function () { const Se = me.result; if (/[\x00-\x08\x0E-\x1F]{2}/.test(Se)) { x(); return }m[ce] = Se, x() }, me.readAsText(Z) }, T = 0; T < a.length; T++)_(a[T], T)
            }
            else {
              if (o.state.draggingText && o.doc.sel.contains(c) > -1) { o.state.draggingText(r), setTimeout(() => { return o.display.input.focus() }, 20); return } try {
                const H = r.dataTransfer.getData('Text'); if (H) {
                  let X; if (o.state.draggingText && !o.state.draggingText.copy && (X = o.listSelections()), wc(o.doc, zi(c, c)), X) {
                    for (let re = 0; re < X.length; ++re)ms(o.doc, '', X[re].anchor, X[re].head, 'drag')
                  } o.replaceSelection(H, 'around', 'paste'), o.display.input.focus()
                }
              }
              catch {}
            }
          }
        }
      } function j_(r, o) { if (h && (!r.state.draggingText || +new Date() - Cm < 100)) { $i(o); return } if (!(Ot(r, o) || ci(r.display, o)) && (o.dataTransfer.setData('Text', r.getSelection()), o.dataTransfer.effectAllowed = 'copyMove', o.dataTransfer.setDragImage && !$)) { const c = S('img', null, null, 'position: fixed; left: 0; top: 0;'); c.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', L && (c.width = c.height = 1, r.display.wrapper.appendChild(c), c._top = c.offsetTop), o.dataTransfer.setDragImage(c, 0, 0), L && c.parentNode.removeChild(c) } } function q_(r, o) { const c = ko(r, o); if (c) { const a = document.createDocumentFragment(); Ff(r, c, a), r.display.dragCursor || (r.display.dragCursor = S('div', null, 'CodeMirror-cursors CodeMirror-dragcursors'), r.display.lineSpace.insertBefore(r.display.dragCursor, r.display.cursorDiv)), I(r.display.dragCursor, a) } } function Em(r) { r.display.dragCursor && (r.display.lineSpace.removeChild(r.display.dragCursor), r.display.dragCursor = null) } function Am(r) { if (document.getElementsByClassName) { for (var o = document.getElementsByClassName('CodeMirror'), c = [], a = 0; a < o.length; a++) { const d = o[a].CodeMirror; d && c.push(d) }c.length && c[0].operation(() => { for (let m = 0; m < c.length; m++)r(c[m]) }) } } let Lm = !1; function U_() { Lm || (V_(), Lm = !0) } function V_() { let r; He(window, 'resize', () => { r == null && (r = setTimeout(() => { r = null, Am(G_) }, 100)) }), He(window, 'blur', () => { return Am(us) }) } function G_(r) { const o = r.display; o.cachedCharWidth = o.cachedTextHeight = o.cachedPaddingH = null, o.scrollbarsClipped = !1, r.setSize() } for (var Bi = { 3: 'Pause', 8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 19: 'Pause', 20: 'CapsLock', 27: 'Esc', 32: 'Space', 33: 'PageUp', 34: 'PageDown', 35: 'End', 36: 'Home', 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down', 44: 'PrintScrn', 45: 'Insert', 46: 'Delete', 59: ';', 61: '=', 91: 'Mod', 92: 'Mod', 93: 'Mod', 106: '*', 107: '=', 109: '-', 110: '.', 111: '/', 145: 'ScrollLock', 173: '-', 186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: '\'', 224: 'Mod', 63232: 'Up', 63233: 'Down', 63234: 'Left', 63235: 'Right', 63272: 'Delete', 63273: 'Home', 63275: 'End', 63276: 'PageUp', 63277: 'PageDown', 63302: 'Insert' }, Nl = 0; Nl < 10; Nl++)Bi[Nl + 48] = Bi[Nl + 96] = String(Nl); for (let _c = 65; _c <= 90; _c++)Bi[_c] = String.fromCharCode(_c); for (let Il = 1; Il <= 12; Il++)Bi[Il + 111] = Bi[Il + 63235] = `F${Il}`; const fi = {}; fi.basic = { 'Left': 'goCharLeft', 'Right': 'goCharRight', 'Up': 'goLineUp', 'Down': 'goLineDown', 'End': 'goLineEnd', 'Home': 'goLineStartSmart', 'PageUp': 'goPageUp', 'PageDown': 'goPageDown', 'Delete': 'delCharAfter', 'Backspace': 'delCharBefore', 'Shift-Backspace': 'delCharBefore', 'Tab': 'defaultTab', 'Shift-Tab': 'indentAuto', 'Enter': 'newlineAndIndent', 'Insert': 'toggleOverwrite', 'Esc': 'singleSelection' }, fi.pcDefault = { 'Ctrl-A': 'selectAll', 'Ctrl-D': 'deleteLine', 'Ctrl-Z': 'undo', 'Shift-Ctrl-Z': 'redo', 'Ctrl-Y': 'redo', 'Ctrl-Home': 'goDocStart', 'Ctrl-End': 'goDocEnd', 'Ctrl-Up': 'goLineUp', 'Ctrl-Down': 'goLineDown', 'Ctrl-Left': 'goGroupLeft', 'Ctrl-Right': 'goGroupRight', 'Alt-Left': 'goLineStart', 'Alt-Right': 'goLineEnd', 'Ctrl-Backspace': 'delGroupBefore', 'Ctrl-Delete': 'delGroupAfter', 'Ctrl-S': 'save', 'Ctrl-F': 'find', 'Ctrl-G': 'findNext', 'Shift-Ctrl-G': 'findPrev', 'Shift-Ctrl-F': 'replace', 'Shift-Ctrl-R': 'replaceAll', 'Ctrl-[': 'indentLess', 'Ctrl-]': 'indentMore', 'Ctrl-U': 'undoSelection', 'Shift-Ctrl-U': 'redoSelection', 'Alt-U': 'redoSelection', 'fallthrough': 'basic' }, fi.emacsy = { 'Ctrl-F': 'goCharRight', 'Ctrl-B': 'goCharLeft', 'Ctrl-P': 'goLineUp', 'Ctrl-N': 'goLineDown', 'Ctrl-A': 'goLineStart', 'Ctrl-E': 'goLineEnd', 'Ctrl-V': 'goPageDown', 'Shift-Ctrl-V': 'goPageUp', 'Ctrl-D': 'delCharAfter', 'Ctrl-H': 'delCharBefore', 'Alt-Backspace': 'delWordBefore', 'Ctrl-K': 'killLine', 'Ctrl-T': 'transposeChars', 'Ctrl-O': 'openLine' }, fi.macDefault = { 'Cmd-A': 'selectAll', 'Cmd-D': 'deleteLine', 'Cmd-Z': 'undo', 'Shift-Cmd-Z': 'redo', 'Cmd-Y': 'redo', 'Cmd-Home': 'goDocStart', 'Cmd-Up': 'goDocStart', 'Cmd-End': 'goDocEnd', 'Cmd-Down': 'goDocEnd', 'Alt-Left': 'goGroupLeft', 'Alt-Right': 'goGroupRight', 'Cmd-Left': 'goLineLeft', 'Cmd-Right': 'goLineRight', 'Alt-Backspace': 'delGroupBefore', 'Ctrl-Alt-Backspace': 'delGroupAfter', 'Alt-Delete': 'delGroupAfter', 'Cmd-S': 'save', 'Cmd-F': 'find', 'Cmd-G': 'findNext', 'Shift-Cmd-G': 'findPrev', 'Cmd-Alt-F': 'replace', 'Shift-Cmd-Alt-F': 'replaceAll', 'Cmd-[': 'indentLess', 'Cmd-]': 'indentMore', 'Cmd-Backspace': 'delWrappedLineLeft', 'Cmd-Delete': 'delWrappedLineRight', 'Cmd-U': 'undoSelection', 'Shift-Cmd-U': 'redoSelection', 'Ctrl-Up': 'goDocStart', 'Ctrl-Down': 'goDocEnd', 'fallthrough': ['basic', 'emacsy'] }, fi.default = z ? fi.macDefault : fi.pcDefault; function X_(r) {
        const o = r.split(/-(?!$)/); r = o[o.length - 1]; for (var c, a, d, m, b = 0; b < o.length - 1; b++) {
          const x = o[b]; if (/^(cmd|meta|m)$/i.test(x))
            m = !0; else if (/^a(lt)?$/i.test(x))
            c = !0; else if (/^(c|ctrl|control)$/i.test(x))
            a = !0; else if (/^s(hift)?$/i.test(x))
            d = !0; else throw new Error(`Unrecognized modifier name: ${x}`)
        } return c && (r = `Alt-${r}`), a && (r = `Ctrl-${r}`), m && (r = `Cmd-${r}`), d && (r = `Shift-${r}`), r
      } function K_(r) {
        const o = {}; for (const c in r) {
          if (r.hasOwnProperty(c)) {
            const a = r[c]; if (/^(name|fallthrough|(de|at)tach)$/.test(c))
              continue; if (a == '...') { delete r[c]; continue } for (let d = be(c.split(' '), X_), m = 0; m < d.length; m++) {
              let b = void 0; let x = void 0; m == d.length - 1 ? (x = d.join(' '), b = a) : (x = d.slice(0, m + 1).join(' '), b = '...'); const _ = o[x]; if (!_)
                o[x] = b; else if (_ != b)
                throw new Error(`Inconsistent bindings for ${x}`)
            } delete r[c]
          }
        } for (const T in o)r[T] = o[T]; return r
      } function ys(r, o, c, a) {
        o = kc(o); const d = o.call ? o.call(r, a) : o[r]; if (d === !1)
          return 'nothing'; if (d === '...')
          return 'multi'; if (d != null && c(d))
          return 'handled'; if (o.fallthrough) {
          if (Object.prototype.toString.call(o.fallthrough) != '[object Array]')
            return ys(r, o.fallthrough, c, a); for (let m = 0; m < o.fallthrough.length; m++) {
            const b = ys(r, o.fallthrough[m], c, a); if (b)
              return b
          }
        }
      } function $m(r) { const o = typeof r == 'string' ? r : Bi[r.keyCode]; return o == 'Ctrl' || o == 'Alt' || o == 'Shift' || o == 'Mod' } function Mm(r, o, c) { const a = r; return o.altKey && a != 'Alt' && (r = `Alt-${r}`), (W ? o.metaKey : o.ctrlKey) && a != 'Ctrl' && (r = `Ctrl-${r}`), (W ? o.ctrlKey : o.metaKey) && a != 'Mod' && (r = `Cmd-${r}`), !c && o.shiftKey && a != 'Shift' && (r = `Shift-${r}`), r } function Nm(r, o) {
        if (L && r.keyCode == 34 && r.char)
          return !1; let c = Bi[r.keyCode]; return c == null || r.altGraphKey ? !1 : (r.keyCode == 3 && r.code && (c = r.code), Mm(c, r, o))
      } function kc(r) { return typeof r == 'string' ? fi[r] : r } function bs(r, o) { for (var c = r.doc.sel.ranges, a = [], d = 0; d < c.length; d++) { for (var m = o(c[d]); a.length && Le(m.from, ve(a).to) <= 0;) { const b = a.pop(); if (Le(b.from, m.from) < 0) { m.from = b.from; break } }a.push(m) }Bn(r, () => { for (let x = a.length - 1; x >= 0; x--)ms(r.doc, '', a[x].from, a[x].to, '+delete'); fs(r) }) } function nd(r, o, c) { const a = Xt(r.text, o + c, c); return a < 0 || a > r.text.length ? null : a } function rd(r, o, c) { const a = nd(r, o.ch, c); return a == null ? null : new le(o.line, a, c < 0 ? 'after' : 'before') } function id(r, o, c, a, d) {
        if (r) {
          o.doc.direction == 'rtl' && (d = -d); const m = tt(c, o.doc.direction); if (m) {
            const b = d < 0 ? ve(m) : m[0]; const x = d < 0 == (b.level == 1); const _ = x ? 'after' : 'before'; let T; if (b.level > 0 || o.doc.direction == 'rtl') { const H = ls(o, c); T = d < 0 ? c.text.length - 1 : 0; const X = qr(o, H, T).top; T = Bt((re) => { return qr(o, H, re).top == X }, d < 0 == (b.level == 1) ? b.from : b.to - 1, T), _ == 'before' && (T = nd(c, T, 1)) }
            else {
              T = d < 0 ? b.to : b.from
            } return new le(a, T, _)
          }
        } return new le(a, d < 0 ? c.text.length : 0, d < 0 ? 'before' : 'after')
      } function J_(r, o, c, a) {
        const d = tt(o, r.doc.direction); if (!d)
          return rd(o, c, a); c.ch >= o.text.length ? (c.ch = o.text.length, c.sticky = 'before') : c.ch <= 0 && (c.ch = 0, c.sticky = 'after'); const m = Ft(d, c.ch, c.sticky); const b = d[m]; if (r.doc.direction == 'ltr' && b.level % 2 == 0 && (a > 0 ? b.to > c.ch : b.from < c.ch))
          return rd(o, c, a); const x = function (ke, $e) { return nd(o, ke instanceof le ? ke.ch : ke, $e) }; let _; const T = function (ke) { return r.options.lineWrapping ? (_ = _ || ls(r, o), zg(r, o, _, ke)) : { begin: 0, end: o.text.length } }; const H = T(c.sticky == 'before' ? x(c, -1) : c.ch); if (r.doc.direction == 'rtl' || b.level == 1) { const X = b.level == 1 == a < 0; const re = x(c, X ? 1 : -1); if (re != null && (X ? re <= b.to && re <= H.end : re >= b.from && re >= H.begin)) { const Z = X ? 'before' : 'after'; return new le(c.line, re, Z) } } const ce = function (ke, $e, Te) {
          for (let Ne = function (xt, Qt) { return Qt ? new le(c.line, x(xt, 1), 'before') : new le(c.line, xt, 'after') }; ke >= 0 && ke < d.length; ke += $e) {
            const Be = d[ke]; const ze = $e > 0 == (Be.level != 1); let Qe = ze ? Te.begin : x(Te.end, -1); if (Be.from <= Qe && Qe < Be.to || (Qe = ze ? Be.from : x(Be.to, -1), Te.begin <= Qe && Qe < Te.end))
              return Ne(Qe, ze)
          }
        }; let me = ce(m + a, a, H); if (me)
          return me; const Se = a > 0 ? H.end : x(H.begin, -1); return Se != null && !(a > 0 && Se == o.text.length) && (me = ce(a > 0 ? 0 : d.length - 1, a, T(Se)), me) ? me : null
      } const Pl = { selectAll: mm, singleSelection(r) { return r.setSelection(r.getCursor('anchor'), r.getCursor('head'), Y) }, killLine(r) {
        return bs(r, (o) => {
          if (o.empty()) { const c = Oe(r.doc, o.head.line).text.length; return o.head.ch == c && o.head.line < r.lastLine() ? { from: o.head, to: le(o.head.line + 1, 0) } : { from: o.head, to: le(o.head.line, c) } }
          else {
            return { from: o.from(), to: o.to() }
          }
        })
      }, deleteLine(r) { return bs(r, (o) => { return { from: le(o.from().line, 0), to: Xe(r.doc, le(o.to().line + 1, 0)) } }) }, delLineLeft(r) { return bs(r, (o) => { return { from: le(o.from().line, 0), to: o.from() } }) }, delWrappedLineLeft(r) { return bs(r, (o) => { const c = r.charCoords(o.head, 'div').top + 5; const a = r.coordsChar({ left: 0, top: c }, 'div'); return { from: a, to: o.from() } }) }, delWrappedLineRight(r) { return bs(r, (o) => { const c = r.charCoords(o.head, 'div').top + 5; const a = r.coordsChar({ left: r.display.lineDiv.offsetWidth + 100, top: c }, 'div'); return { from: o.from(), to: a } }) }, undo(r) { return r.undo() }, redo(r) { return r.redo() }, undoSelection(r) { return r.undoSelection() }, redoSelection(r) { return r.redoSelection() }, goDocStart(r) { return r.extendSelection(le(r.firstLine(), 0)) }, goDocEnd(r) { return r.extendSelection(le(r.lastLine())) }, goLineStart(r) { return r.extendSelectionsBy((o) => { return Im(r, o.head.line) }, { origin: '+move', bias: 1 }) }, goLineStartSmart(r) { return r.extendSelectionsBy((o) => { return Pm(r, o.head) }, { origin: '+move', bias: 1 }) }, goLineEnd(r) { return r.extendSelectionsBy((o) => { return Y_(r, o.head.line) }, { origin: '+move', bias: -1 }) }, goLineRight(r) { return r.extendSelectionsBy((o) => { const c = r.cursorCoords(o.head, 'div').top + 5; return r.coordsChar({ left: r.display.lineDiv.offsetWidth + 100, top: c }, 'div') }, pe) }, goLineLeft(r) { return r.extendSelectionsBy((o) => { const c = r.cursorCoords(o.head, 'div').top + 5; return r.coordsChar({ left: 0, top: c }, 'div') }, pe) }, goLineLeftSmart(r) { return r.extendSelectionsBy((o) => { const c = r.cursorCoords(o.head, 'div').top + 5; const a = r.coordsChar({ left: 0, top: c }, 'div'); return a.ch < r.getLine(a.line).search(/\S/) ? Pm(r, o.head) : a }, pe) }, goLineUp(r) { return r.moveV(-1, 'line') }, goLineDown(r) { return r.moveV(1, 'line') }, goPageUp(r) { return r.moveV(-1, 'page') }, goPageDown(r) { return r.moveV(1, 'page') }, goCharLeft(r) { return r.moveH(-1, 'char') }, goCharRight(r) { return r.moveH(1, 'char') }, goColumnLeft(r) { return r.moveH(-1, 'column') }, goColumnRight(r) { return r.moveH(1, 'column') }, goWordLeft(r) { return r.moveH(-1, 'word') }, goGroupRight(r) { return r.moveH(1, 'group') }, goGroupLeft(r) { return r.moveH(-1, 'group') }, goWordRight(r) { return r.moveH(1, 'word') }, delCharBefore(r) { return r.deleteH(-1, 'codepoint') }, delCharAfter(r) { return r.deleteH(1, 'char') }, delWordBefore(r) { return r.deleteH(-1, 'word') }, delWordAfter(r) { return r.deleteH(1, 'word') }, delGroupBefore(r) { return r.deleteH(-1, 'group') }, delGroupAfter(r) { return r.deleteH(1, 'group') }, indentAuto(r) { return r.indentSelection('smart') }, indentMore(r) { return r.indentSelection('add') }, indentLess(r) { return r.indentSelection('subtract') }, insertTab(r) { return r.replaceSelection('	') }, insertSoftTab(r) { for (var o = [], c = r.listSelections(), a = r.options.tabSize, d = 0; d < c.length; d++) { const m = c[d].from(); const b = J(r.getLine(m.line), m.ch, a); o.push(Ee(a - b % a)) }r.replaceSelections(o) }, defaultTab(r) { r.somethingSelected() ? r.indentSelection('add') : r.execCommand('insertTab') }, transposeChars(r) {
        return Bn(r, () => {
          for (var o = r.listSelections(), c = [], a = 0; a < o.length; a++) {
            if (o[a].empty()) {
              let d = o[a].head; const m = Oe(r.doc, d.line).text; if (m) {
                if (d.ch == m.length && (d = new le(d.line, d.ch - 1)), d.ch > 0) {
                  d = new le(d.line, d.ch + 1), r.replaceRange(m.charAt(d.ch - 1) + m.charAt(d.ch - 2), le(d.line, d.ch - 2), d, '+transpose')
                }
                else if (d.line > r.doc.first) { const b = Oe(r.doc, d.line - 1).text; b && (d = new le(d.line, 1), r.replaceRange(m.charAt(0) + r.doc.lineSeparator() + b.charAt(b.length - 1), le(d.line - 1, b.length - 1), d, '+transpose')) }
              }c.push(new gt(d, d))
            }
          }r.setSelections(c)
        })
      }, newlineAndIndent(r) { return Bn(r, () => { for (var o = r.listSelections(), c = o.length - 1; c >= 0; c--)r.replaceRange(r.doc.lineSeparator(), o[c].anchor, o[c].head, '+input'); o = r.listSelections(); for (let a = 0; a < o.length; a++)r.indentLine(o[a].from().line, null, !0); fs(r) }) }, openLine(r) {
        return r.replaceSelection(`
`, 'start')
      }, toggleOverwrite(r) { return r.toggleOverwrite() } }; function Im(r, o) { const c = Oe(r.doc, o); const a = xr(c); return a != c && (o = N(a)), id(!0, r, a, o, 1) } function Y_(r, o) { const c = Oe(r.doc, o); const a = PS(c); return a != c && (o = N(a)), id(!0, r, c, o, -1) } function Pm(r, o) { const c = Im(r, o.line); const a = Oe(r.doc, c.line); const d = tt(a, r.doc.direction); if (!d || d[0].level == 0) { const m = Math.max(c.ch, a.text.search(/\S/)); const b = o.line == c.line && o.ch <= m && o.ch; return le(c.line, b ? 0 : m, c.sticky) } return c } function Tc(r, o, c) {
        if (typeof o == 'string' && (o = Pl[o], !o))
          return !1; r.display.input.ensurePolled(); const a = r.display.shift; let d = !1; try { r.isReadOnly() && (r.state.suppressEdits = !0), c && (r.display.shift = !1), d = o(r) != V }
        finally { r.display.shift = a, r.state.suppressEdits = !1 } return d
      } function Z_(r, o, c) {
        for (let a = 0; a < r.state.keyMaps.length; a++) {
          const d = ys(o, r.state.keyMaps[a], c, r); if (d)
            return d
        } return r.options.extraKeys && ys(o, r.options.extraKeys, c, r) || ys(o, r.options.keyMap, c, r)
      } const Q_ = new ae(); function Ol(r, o, c, a) {
        const d = r.state.keySeq; if (d) {
          if ($m(o))
            return 'handled'; if (o.endsWith('\'') ? r.state.keySeq = null : Q_.set(50, () => { r.state.keySeq == d && (r.state.keySeq = null, r.display.input.reset()) }), Om(r, `${d} ${o}`, c, a))
            return !0
        } return Om(r, o, c, a)
      } function Om(r, o, c, a) { const d = Z_(r, o, a); return d == 'multi' && (r.state.keySeq = o), d == 'handled' && Jt(r, 'keyHandled', r, o, c), (d == 'handled' || d == 'multi') && (un(c), Hf(r)), !!d } function Rm(r, o) {
        const c = Nm(o, !0); return c
          ? o.shiftKey && !r.state.keySeq
            ? Ol(r, `Shift-${c}`, o, (a) => { return Tc(r, a, !0) }) || Ol(r, c, o, (a) => {
              if (typeof a == 'string' ? /^go[A-Z]/.test(a) : a.motion)
                return Tc(r, a)
            })
            : Ol(r, c, o, (a) => { return Tc(r, a) })
          : !1
      } function ek(r, o, c) { return Ol(r, `'${c}'`, o, (a) => { return Tc(r, a, !0) }) } let od = null; function zm(r) { const o = this; if (!(r.target && r.target != o.display.input.getField()) && (o.curOp.focus = ue(Ke(o)), !Ot(o, r))) { h && p < 11 && r.keyCode == 27 && (r.returnValue = !1); const c = r.keyCode; o.display.shift = c == 16 || r.shiftKey; const a = Rm(o, r); L && (od = a ? c : null, !a && c == 88 && !Qa && (z ? r.metaKey : r.ctrlKey) && o.replaceSelection('', null, 'cut')), s && !z && !a && c == 46 && r.shiftKey && !r.ctrlKey && document.execCommand && document.execCommand('cut'), c == 18 && !/\bCodeMirror-crosshair\b/.test(o.display.lineDiv.className) && tk(o) } } function tk(r) { const o = r.display.lineDiv; we(o, 'CodeMirror-crosshair'); function c(a) { (a.keyCode == 18 || !a.altKey) && (C(o, 'CodeMirror-crosshair'), cn(document, 'keyup', c), cn(document, 'mouseover', c)) }He(document, 'keyup', c), He(document, 'mouseover', c) } function Dm(r) { r.keyCode == 16 && (this.doc.sel.shift = !1), Ot(this, r) } function Fm(r) { const o = this; if (!(r.target && r.target != o.display.input.getField()) && !(ci(o.display, r) || Ot(o, r) || r.ctrlKey && !r.altKey || z && r.metaKey)) { const c = r.keyCode; const a = r.charCode; if (L && c == od) { od = null, un(r); return } if (!(L && (!r.which || r.which < 10) && Rm(o, r))) { const d = String.fromCharCode(a ?? c); d != '\b' && (ek(o, r, d) || o.display.input.onKeyPress(r)) } } } const nk = 400; const sd = function (r, o, c) { this.time = r, this.pos = o, this.button = c }; sd.prototype.compare = function (r, o, c) { return this.time + nk > r && Le(o, this.pos) == 0 && c == this.button }; let Rl, zl; function rk(r, o) { const c = +new Date(); return zl && zl.compare(c, r, o) ? (Rl = zl = null, 'triple') : Rl && Rl.compare(c, r, o) ? (zl = new sd(c, r, o), Rl = null, 'double') : (Rl = new sd(c, r, o), zl = null, 'single') } function Hm(r) { const o = this; const c = o.display; if (!(Ot(o, r) || c.activeTouch && c.input.supportsTouch())) { if (c.input.ensurePolled(), c.shift = r.shiftKey, ci(c, r)) { g || (c.scroller.draggable = !1, setTimeout(() => { return c.scroller.draggable = !0 }, 100)); return } if (!ld(o, r)) { const a = ko(o, r); const d = vr(r); const m = a ? rk(a, d) : 'single'; ie(o).focus(), d == 1 && o.state.selectingText && o.state.selectingText(r), !(a && ik(o, d, a, m, r)) && (d == 1 ? a ? sk(o, a, m, r) : al(r) == c.scroller && un(r) : d == 2 ? (a && bc(o.doc, a), setTimeout(() => { return c.input.focus() }, 20)) : d == 3 && (q ? o.display.input.onContextMenu(r) : Bf(o))) } } } function ik(r, o, c, a, d) {
        let m = 'Click'; return a == 'double' ? m = `Double${m}` : a == 'triple' && (m = `Triple${m}`), m = (o == 1 ? 'Left' : o == 2 ? 'Middle' : 'Right') + m, Ol(r, Mm(m, d), d, (b) => {
          if (typeof b == 'string' && (b = Pl[b]), !b)
            return !1; let x = !1; try { r.isReadOnly() && (r.state.suppressEdits = !0), x = b(r, c) != V }
          finally { r.state.suppressEdits = !1 } return x
        })
      } function ok(r, o, c) { const a = r.getOption('configureMouse'); const d = a ? a(r, o, c) : {}; if (d.unit == null) { const m = D ? c.shiftKey && c.metaKey : c.altKey; d.unit = m ? 'rectangle' : o == 'single' ? 'char' : o == 'double' ? 'word' : 'line' } return (d.extend == null || r.doc.extend) && (d.extend = r.doc.extend || c.shiftKey), d.addNew == null && (d.addNew = z ? c.metaKey : c.ctrlKey), d.moveOnDrag == null && (d.moveOnDrag = !(z ? c.altKey : c.ctrlKey)), d } function sk(r, o, c, a) { h ? setTimeout(U(Bg, r), 0) : r.curOp.focus = ue(Ke(r)); const d = ok(r, c, a); const m = r.doc.sel; let b; r.options.dragDrop && bf && !r.isReadOnly() && c == 'single' && (b = m.contains(o)) > -1 && (Le((b = m.ranges[b]).from(), o) < 0 || o.xRel > 0) && (Le(b.to(), o) > 0 || o.xRel < 0) ? lk(r, a, o, d) : ak(r, a, o, d) } function lk(r, o, c, a) { const d = r.display; let m = !1; var b = Yt(r, (T) => { g && (d.scroller.draggable = !1), r.state.draggingText = !1, r.state.delayingBlurEvent && (r.hasFocus() ? r.state.delayingBlurEvent = !1 : Bf(r)), cn(d.wrapper.ownerDocument, 'mouseup', b), cn(d.wrapper.ownerDocument, 'mousemove', x), cn(d.scroller, 'dragstart', _), cn(d.scroller, 'drop', b), m || (un(T), a.addNew || bc(r.doc, c, null, null, a.extend), g && !$ || h && p == 9 ? setTimeout(() => { d.wrapper.ownerDocument.body.focus({ preventScroll: !0 }), d.input.focus() }, 20) : d.input.focus()) }); var x = function (T) { m = m || Math.abs(o.clientX - T.clientX) + Math.abs(o.clientY - T.clientY) >= 10 }; var _ = function () { return m = !0 }; g && (d.scroller.draggable = !0), r.state.draggingText = b, b.copy = !a.moveOnDrag, He(d.wrapper.ownerDocument, 'mouseup', b), He(d.wrapper.ownerDocument, 'mousemove', x), He(d.scroller, 'dragstart', _), He(d.scroller, 'drop', b), r.state.delayingBlurEvent = !0, setTimeout(() => { return d.input.focus() }, 20), d.scroller.dragDrop && d.scroller.dragDrop() } function Bm(r, o, c) {
        if (c == 'char')
          return new gt(o, o); if (c == 'word')
          return r.findWordAt(o); if (c == 'line')
          return new gt(le(o.line, 0), Xe(r.doc, le(o.line + 1, 0))); const a = c(r, o); return new gt(a.from, a.to)
      } function ak(r, o, c, a) {
        h && Bf(r); const d = r.display; const m = r.doc; un(o); let b; let x; let _ = m.sel; const T = _.ranges; if (a.addNew && !a.extend ? (x = m.sel.contains(c), x > -1 ? b = T[x] : b = new gt(c, c)) : (b = m.sel.primary(), x = m.sel.primIndex), a.unit == 'rectangle') {
          a.addNew || (b = new gt(c, c)), c = ko(r, o, !0, !0), x = -1
        }
        else { const H = Bm(r, c, a.unit); a.extend ? b = ed(b, H.anchor, H.head, a.extend) : b = H }a.addNew ? x == -1 ? (x = T.length, fn(m, _r(r, T.concat([b]), x), { scroll: !1, origin: '*mouse' })) : T.length > 1 && T[x].empty() && a.unit == 'char' && !a.extend ? (fn(m, _r(r, T.slice(0, x).concat(T.slice(x + 1)), 0), { scroll: !1, origin: '*mouse' }), _ = m.sel) : td(m, x, b, fe) : (x = 0, fn(m, new Zn([b], 0), fe), _ = m.sel); let X = c; function re(Te) {
          if (Le(X, Te) != 0) {
            if (X = Te, a.unit == 'rectangle') { for (var Ne = [], Be = r.options.tabSize, ze = J(Oe(m, c.line).text, c.ch, Be), Qe = J(Oe(m, Te.line).text, Te.ch, Be), xt = Math.min(ze, Qe), Qt = Math.max(ze, Qe), $t = Math.min(c.line, Te.line), Wn = Math.min(r.lastLine(), Math.max(c.line, Te.line)); $t <= Wn; $t++) { const Cn = Oe(m, $t).text; const Wt = he(Cn, xt, Be); xt == Qt ? Ne.push(new gt(le($t, Wt), le($t, Wt))) : Cn.length > Wt && Ne.push(new gt(le($t, Wt), le($t, he(Cn, Qt, Be)))) }Ne.length || Ne.push(new gt(c, c)), fn(m, _r(r, _.ranges.slice(0, x).concat(Ne), x), { origin: '*mouse', scroll: !1 }), r.scrollIntoView(Te) }
            else { const En = b; const sn = Bm(r, Te, a.unit); let Vt = En.anchor; let jt; Le(sn.anchor, Vt) > 0 ? (jt = sn.head, Vt = is(En.from(), sn.anchor)) : (jt = sn.anchor, Vt = _n(En.to(), sn.head)); const zt = _.ranges.slice(0); zt[x] = ck(r, new gt(Xe(m, Vt), jt)), fn(m, _r(r, zt, x), fe) }
          }
        } const Z = d.wrapper.getBoundingClientRect(); let ce = 0; function me(Te) {
          const Ne = ++ce; const Be = ko(r, Te, !0, a.unit == 'rectangle'); if (Be) {
            if (Le(Be, X) != 0) { r.curOp.focus = ue(Ke(r)), re(Be); const ze = hc(d, m); (Be.line >= ze.to || Be.line < ze.from) && setTimeout(Yt(r, () => { ce == Ne && me(Te) }), 150) }
            else { const Qe = Te.clientY < Z.top ? -20 : Te.clientY > Z.bottom ? 20 : 0; Qe && setTimeout(Yt(r, () => { ce == Ne && (d.scroller.scrollTop += Qe, me(Te)) }), 50) }
          }
        } function Se(Te) { r.state.selectingText = !1, ce = 1 / 0, Te && (un(Te), d.input.focus()), cn(d.wrapper.ownerDocument, 'mousemove', ke), cn(d.wrapper.ownerDocument, 'mouseup', $e), m.history.lastSelOrigin = null } var ke = Yt(r, (Te) => { Te.buttons === 0 || !vr(Te) ? Se(Te) : me(Te) }); var $e = Yt(r, Se); r.state.selectingText = $e, He(d.wrapper.ownerDocument, 'mousemove', ke), He(d.wrapper.ownerDocument, 'mouseup', $e)
      } function ck(r, o) {
        const c = o.anchor; const a = o.head; const d = Oe(r.doc, c.line); if (Le(c, a) == 0 && c.sticky == a.sticky)
          return o; const m = tt(d); if (!m)
          return o; const b = Ft(m, c.ch, c.sticky); const x = m[b]; if (x.from != c.ch && x.to != c.ch)
          return o; const _ = b + (x.from == c.ch == (x.level != 1) ? 0 : 1); if (_ == 0 || _ == m.length)
          return o; let T; if (a.line != c.line) {
          T = (a.line - c.line) * (r.doc.direction == 'ltr' ? 1 : -1) > 0
        }
        else { const H = Ft(m, a.ch, a.sticky); const X = H - b || (a.ch - c.ch) * (x.level == 1 ? -1 : 1); H == _ - 1 || H == _ ? T = X < 0 : T = X > 0 } const re = m[_ + (T ? -1 : 0)]; const Z = T == (re.level == 1); const ce = Z ? re.from : re.to; const me = Z ? 'after' : 'before'; return c.ch == ce && c.sticky == me ? o : new gt(new le(c.line, ce, me), a)
      } function Wm(r, o, c, a) {
        let d, m; if (o.touches) {
          d = o.touches[0].clientX, m = o.touches[0].clientY
        }
        else {
          try { d = o.clientX, m = o.clientY }
          catch { return !1 }
        } if (d >= Math.floor(r.display.gutters.getBoundingClientRect().right))
          return !1; a && un(o); const b = r.display; const x = b.lineDiv.getBoundingClientRect(); if (m > x.bottom || !Hn(r, c))
          return Sn(o); m -= x.top - b.viewOffset; for (let _ = 0; _ < r.display.gutterSpecs.length; ++_) { const T = b.gutters.childNodes[_]; if (T && T.getBoundingClientRect().right >= d) { const H = G(r.doc, m); const X = r.display.gutterSpecs[_]; return Pt(r, c, r, H, X.className, o), Sn(o) } }
      } function ld(r, o) { return Wm(r, o, 'gutterClick', !0) } function jm(r, o) { ci(r.display, o) || uk(r, o) || Ot(r, o, 'contextmenu') || q || r.display.input.onContextMenu(o) } function uk(r, o) { return Hn(r, 'gutterContextMenu') ? Wm(r, o, 'gutterContextMenu', !1) : !1 } function qm(r) { r.display.wrapper.className = r.display.wrapper.className.replace(/\s*cm-s-\S+/g, '') + r.options.theme.replace(/(^|\s)\s*/g, ' cm-s-'), vl(r) } const ws = { toString() { return 'CodeMirror.Init' } }; const Um = {}; const Cc = {}; function fk(r) {
        const o = r.optionHandlers; function c(a, d, m, b) { r.defaults[a] = d, m && (o[a] = b ? function (x, _, T) { T != ws && m(x, _, T) } : m) }r.defineOption = c, r.Init = ws, c('value', '', (a, d) => { return a.setValue(d) }, !0), c('mode', null, (a, d) => { a.doc.modeOption = d, Yf(a) }, !0), c('indentUnit', 2, Yf, !0), c('indentWithTabs', !1), c('smartIndent', !0), c('tabSize', 4, (a) => { Tl(a), vl(a), kn(a) }, !0), c('lineSeparator', null, (a, d) => {
          if (a.doc.lineSep = d, !!d) {
            const m = []; let b = a.doc.first; a.doc.iter((_) => {
              for (let T = 0; ;) {
                const H = _.text.indexOf(d, T); if (H == -1)
                  break; T = H + d.length, m.push(le(b, H))
              }b++
            }); for (let x = m.length - 1; x >= 0; x--)ms(a.doc, d, m[x], le(m[x].line, m[x].ch + d.length))
          }
        }), c('specialChars', /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u200B\u200E\u200F\u2028\u2029\u202D\u202E\u2066\u2067\u2069\uFEFF\uFFF9-\uFFFC]/g, (a, d, m) => { a.state.specialChars = new RegExp(d.source + (d.test('	') ? '' : '|	'), 'g'), m != ws && a.refresh() }), c('specialCharPlaceholder', HS, (a) => { return a.refresh() }, !0), c('electricChars', !0), c('inputStyle', k ? 'contenteditable' : 'textarea', () => { throw new Error('inputStyle can not (yet) be changed in a running editor') }, !0), c('spellcheck', !1, (a, d) => { return a.getInputField().spellcheck = d }, !0), c('autocorrect', !1, (a, d) => { return a.getInputField().autocorrect = d }, !0), c('autocapitalize', !1, (a, d) => { return a.getInputField().autocapitalize = d }, !0), c('rtlMoveVisually', !te), c('wholeLineUpdateBefore', !0), c('theme', 'default', (a) => { qm(a), kl(a) }, !0), c('keyMap', 'default', (a, d, m) => { const b = kc(d); const x = m != ws && kc(m); x && x.detach && x.detach(a, b), b.attach && b.attach(a, x || null) }), c('extraKeys', null), c('configureMouse', null), c('lineWrapping', !1, hk, !0), c('gutters', [], (a, d) => { a.display.gutterSpecs = Kf(d, a.options.lineNumbers), kl(a) }, !0), c('fixedGutter', !0, (a, d) => { a.display.gutters.style.left = d ? `${zf(a.display)}px` : '0', a.refresh() }, !0), c('coverGutterNextToScrollbar', !1, (a) => { return ds(a) }, !0), c('scrollbarStyle', 'native', (a) => { Gg(a), ds(a), a.display.scrollbars.setScrollTop(a.doc.scrollTop), a.display.scrollbars.setScrollLeft(a.doc.scrollLeft) }, !0), c('lineNumbers', !1, (a, d) => { a.display.gutterSpecs = Kf(a.options.gutters, d), kl(a) }, !0), c('firstLineNumber', 1, kl, !0), c('lineNumberFormatter', (a) => { return a }, kl, !0), c('showCursorWhenSelecting', !1, yl, !0), c('resetSelectionOnContextMenu', !0), c('lineWiseCopyCut', !0), c('pasteLinesPerSelection', !0), c('selectionsMayTouch', !1), c('readOnly', !1, (a, d) => { d == 'nocursor' && (us(a), a.display.input.blur()), a.display.input.readOnlyChanged(d) }), c('screenReaderLabel', null, (a, d) => { d = d === '' ? null : d, a.display.input.screenReaderLabelChanged(d) }), c('disableInput', !1, (a, d) => { d || a.display.input.reset() }, !0), c('dragDrop', !0, dk), c('allowDropFileTypes', null), c('cursorBlinkRate', 530), c('cursorScrollMargin', 0), c('cursorHeight', 1, yl, !0), c('singleCursorHeightPerLine', !0, yl, !0), c('workTime', 100), c('workDelay', 100), c('flattenSpans', !0, Tl, !0), c('addModeClass', !1, Tl, !0), c('pollInterval', 100), c('undoDepth', 200, (a, d) => { return a.doc.history.undoDepth = d }), c('historyEventDelay', 1250), c('viewportMargin', 10, (a) => { return a.refresh() }, !0), c('maxHighlightLength', 1e4, Tl, !0), c('moveInputWithCursor', !0, (a, d) => { d || a.display.input.resetPosition() }), c('tabindex', null, (a, d) => { return a.display.input.getField().tabIndex = d || '' }), c('autofocus', null), c('direction', 'ltr', (a, d) => { return a.doc.setDirection(d) }, !0), c('phrases', null)
      } function dk(r, o, c) { const a = c && c != ws; if (!o != !a) { const d = r.display.dragFunctions; const m = o ? He : cn; m(r.display.scroller, 'dragstart', d.start), m(r.display.scroller, 'dragenter', d.enter), m(r.display.scroller, 'dragover', d.over), m(r.display.scroller, 'dragleave', d.leave), m(r.display.scroller, 'drop', d.drop) } } function hk(r) { r.options.lineWrapping ? (we(r.display.wrapper, 'CodeMirror-wrap'), r.display.sizer.style.minWidth = '', r.display.sizerWidth = null) : (C(r.display.wrapper, 'CodeMirror-wrap'), Ef(r)), Df(r), kn(r), vl(r), setTimeout(() => { return ds(r) }, 100) } function Ct(r, o) {
        const c = this; if (!(this instanceof Ct))
          return new Ct(r, o); this.options = o = o ? Q(o) : {}, Q(Um, o, !1); let a = o.value; typeof a == 'string' ? a = new Tn(a, o.mode, null, o.lineSeparator, o.direction) : o.mode && (a.modeOption = o.mode), this.doc = a; const d = new Ct.inputStyles[o.inputStyle](this); const m = this.display = new C_(r, a, d, o); m.wrapper.CodeMirror = this, qm(this), o.lineWrapping && (this.display.wrapper.className += ' CodeMirror-wrap'), Gg(this), this.state = { keyMaps: [], overlays: [], modeGen: 0, overwrite: !1, delayingBlurEvent: !1, focused: !1, suppressEdits: !1, pasteIncoming: -1, cutIncoming: -1, selectingText: !1, draggingText: !1, highlight: new ae(), keySeq: null, specialChars: null }, o.autofocus && !k && m.input.focus(), h && p < 11 && setTimeout(() => { return c.display.input.reset(!0) }, 20), pk(this), U_(), Ao(this), this.curOp.forceUpdate = !0, rm(this, a), o.autofocus && !k || this.hasFocus() ? setTimeout(() => { c.hasFocus() && !c.state.focused && Wf(c) }, 20) : us(this); for (const b in Cc)Cc.hasOwnProperty(b) && Cc[b](this, o[b], ws); Jg(this), o.finishInit && o.finishInit(this); for (let x = 0; x < ad.length; ++x)ad[x](this); Lo(this), g && o.lineWrapping && getComputedStyle(m.lineDiv).textRendering == 'optimizelegibility' && (m.lineDiv.style.textRendering = 'auto')
      }Ct.defaults = Um, Ct.optionHandlers = Cc; function pk(r) {
        const o = r.display; He(o.scroller, 'mousedown', Yt(r, Hm)), h && p < 11 ? He(o.scroller, 'dblclick', Yt(r, (_) => { if (!Ot(r, _)) { const T = ko(r, _); if (!(!T || ld(r, _) || ci(r.display, _))) { un(_); const H = r.findWordAt(T); bc(r.doc, H.anchor, H.head) } } })) : He(o.scroller, 'dblclick', (_) => { return Ot(r, _) || un(_) }), He(o.scroller, 'contextmenu', (_) => { return jm(r, _) }), He(o.input.getField(), 'contextmenu', (_) => { o.scroller.contains(_.target) || jm(r, _) }); let c; let a = { end: 0 }; function d() { o.activeTouch && (c = setTimeout(() => { return o.activeTouch = null }, 1e3), a = o.activeTouch, a.end = +new Date()) } function m(_) {
          if (_.touches.length != 1)
            return !1; const T = _.touches[0]; return T.radiusX <= 1 && T.radiusY <= 1
        } function b(_, T) {
          if (T.left == null)
            return !0; const H = T.left - _.left; const X = T.top - _.top; return H * H + X * X > 20 * 20
        }He(o.scroller, 'touchstart', (_) => { if (!Ot(r, _) && !m(_) && !ld(r, _)) { o.input.ensurePolled(), clearTimeout(c); const T = +new Date(); o.activeTouch = { start: T, moved: !1, prev: T - a.end <= 300 ? a : null }, _.touches.length == 1 && (o.activeTouch.left = _.touches[0].pageX, o.activeTouch.top = _.touches[0].pageY) } }), He(o.scroller, 'touchmove', () => { o.activeTouch && (o.activeTouch.moved = !0) }), He(o.scroller, 'touchend', (_) => { const T = o.activeTouch; if (T && !ci(o, _) && T.left != null && !T.moved && new Date() - T.start < 300) { const H = r.coordsChar(o.activeTouch, 'page'); let X; !T.prev || b(T, T.prev) ? X = new gt(H, H) : !T.prev.prev || b(T, T.prev.prev) ? X = r.findWordAt(H) : X = new gt(le(H.line, 0), Xe(r.doc, le(H.line + 1, 0))), r.setSelection(X.anchor, X.head), r.focus(), un(_) }d() }), He(o.scroller, 'touchcancel', d), He(o.scroller, 'scroll', () => { o.scroller.clientHeight && (wl(r, o.scroller.scrollTop), Co(r, o.scroller.scrollLeft, !0), Pt(r, 'scroll', r)) }), He(o.scroller, 'mousewheel', (_) => { return Qg(r, _) }), He(o.scroller, 'DOMMouseScroll', (_) => { return Qg(r, _) }), He(o.wrapper, 'scroll', () => { return o.wrapper.scrollTop = o.wrapper.scrollLeft = 0 }), o.dragFunctions = { enter(_) { Ot(r, _) || $i(_) }, over(_) { Ot(r, _) || (q_(r, _), $i(_)) }, start(_) { return j_(r, _) }, drop: Yt(r, W_), leave(_) { Ot(r, _) || Em(r) } }; const x = o.input.getField(); He(x, 'keyup', (_) => { return Dm.call(r, _) }), He(x, 'keydown', Yt(r, zm)), He(x, 'keypress', Yt(r, Fm)), He(x, 'focus', (_) => { return Wf(r, _) }), He(x, 'blur', (_) => { return us(r, _) })
      } var ad = []; Ct.defineInitHook = function (r) { return ad.push(r) }; function Dl(r, o, c, a) {
        const d = r.doc; let m; c == null && (c = 'add'), c == 'smart' && (d.mode.indent ? m = dl(r, o).state : c = 'prev'); const b = r.options.tabSize; const x = Oe(d, o); const _ = J(x.text, null, b); x.stateAfter && (x.stateAfter = null); const T = x.text.match(/^\s*/)[0]; let H; if (!a && !/\S/.test(x.text)) {
          H = 0, c = 'not'
        }
        else if (c == 'smart' && (H = d.mode.indent(m, x.text.slice(T.length), x.text), H == V || H > 150)) {
          if (!a)
            return; c = 'prev'
        }c == 'prev' ? o > d.first ? H = J(Oe(d, o - 1).text, null, b) : H = 0 : c == 'add' ? H = _ + r.options.indentUnit : c == 'subtract' ? H = _ - r.options.indentUnit : typeof c == 'number' && (H = _ + c), H = Math.max(0, H); let X = ''; let re = 0; if (r.options.indentWithTabs) {
          for (let Z = Math.floor(H / b); Z; --Z)re += b, X += '	'
        } if (re < H && (X += Ee(H - re)), X != T)
          return ms(d, X, le(o, 0), le(o, T.length), '+input'), x.stateAfter = null, !0; for (let ce = 0; ce < d.sel.ranges.length; ce++) { const me = d.sel.ranges[ce]; if (me.head.line == o && me.head.ch < T.length) { const Se = le(o, T.length); td(d, ce, new gt(Se, Se)); break } }
      } let kr = null; function Ec(r) { kr = r } function cd(r, o, c, a, d) {
        const m = r.doc; r.display.shift = !1, a || (a = m.sel); const b = +new Date() - 200; const x = d == 'paste' || r.state.pasteIncoming > b; const _ = lr(o); let T = null; if (x && a.ranges.length > 1) {
          if (kr && kr.text.join(`
`) == o) { if (a.ranges.length % kr.text.length == 0) { T = []; for (let H = 0; H < kr.text.length; H++)T.push(m.splitLines(kr.text[H])) } }
          else {
            _.length == a.ranges.length && r.options.pasteLinesPerSelection && (T = be(_, (ke) => { return [ke] }))
          }
        } for (var X = r.curOp.updateInput, re = a.ranges.length - 1; re >= 0; re--) {
          const Z = a.ranges[re]; let ce = Z.from(); let me = Z.to(); Z.empty() && (c && c > 0
            ? ce = le(ce.line, ce.ch - c)
            : r.state.overwrite && !x
              ? me = le(me.line, Math.min(Oe(m, me.line).text.length, me.ch + ve(_).length))
              : x && kr && kr.lineWise && kr.text.join(`
`) == _.join(`
`) && (ce = me = le(ce.line, 0))); const Se = { from: ce, to: me, text: T ? T[re % T.length] : _, origin: d || (x ? 'paste' : r.state.cutIncoming > b ? 'cut' : '+input') }; gs(r.doc, Se), Jt(r, 'inputRead', r, Se)
        }o && !x && Gm(r, o), fs(r), r.curOp.updateInput < 2 && (r.curOp.updateInput = X), r.curOp.typing = !0, r.state.pasteIncoming = r.state.cutIncoming = -1
      } function Vm(r, o) {
        const c = r.clipboardData && r.clipboardData.getData('Text'); if (c)
          return r.preventDefault(), !o.isReadOnly() && !o.options.disableInput && o.hasFocus() && Bn(o, () => { return cd(o, c, 0, null, 'paste') }), !0
      } function Gm(r, o) {
        if (!(!r.options.electricChars || !r.options.smartIndent)) {
          for (let c = r.doc.sel, a = c.ranges.length - 1; a >= 0; a--) {
            const d = c.ranges[a]; if (!(d.head.ch > 100 || a && c.ranges[a - 1].head.line == d.head.line)) {
              const m = r.getModeAt(d.head); let b = !1; if (m.electricChars) {
                for (let x = 0; x < m.electricChars.length; x++) {
                  if (o.includes(m.electricChars.charAt(x))) { b = Dl(r, d.head.line, 'smart'); break }
                }
              }
              else {
                m.electricInput && m.electricInput.test(Oe(r.doc, d.head.line).text.slice(0, d.head.ch)) && (b = Dl(r, d.head.line, 'smart'))
              }b && Jt(r, 'electricInput', r, d.head.line)
            }
          }
        }
      } function Xm(r) { for (var o = [], c = [], a = 0; a < r.doc.sel.ranges.length; a++) { const d = r.doc.sel.ranges[a].head.line; const m = { anchor: le(d, 0), head: le(d + 1, 0) }; c.push(m), o.push(r.getRange(m.anchor, m.head)) } return { text: o, ranges: c } } function ud(r, o, c, a) { r.setAttribute('autocorrect', c ? 'on' : 'off'), r.setAttribute('autocapitalize', a ? 'on' : 'off'), r.setAttribute('spellcheck', !!o) } function Km() { const r = S('textarea', null, null, 'position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; min-height: 1em; outline: none'); const o = S('div', [r], null, 'overflow: hidden; position: relative; width: 3px; height: 0px;'); return g ? r.style.width = '1000px' : r.setAttribute('wrap', 'off'), M && (r.style.border = '1px solid black'), o } function gk(r) {
        const o = r.optionHandlers; const c = r.helpers = {}; r.prototype = { constructor: r, focus() { ie(this).focus(), this.display.input.focus() }, setOption(a, d) { const m = this.options; const b = m[a]; m[a] == d && a != 'mode' || (m[a] = d, o.hasOwnProperty(a) && Yt(this, o[a])(this, d, b), Pt(this, 'optionChange', this, a)) }, getOption(a) { return this.options[a] }, getDoc() { return this.doc }, addKeyMap(a, d) { this.state.keyMaps[d ? 'push' : 'unshift'](kc(a)) }, removeKeyMap(a) {
          for (let d = this.state.keyMaps, m = 0; m < d.length; ++m) {
            if (d[m] == a || d[m].name == a)
              return d.splice(m, 1), !0
          }
        }, addOverlay: gn(function (a, d) {
          const m = a.token ? a : r.getMode(this.options, a); if (m.startState)
            throw new Error('Overlays may not be stateful.'); We(this.state.overlays, { mode: m, modeSpec: a, opaque: d && d.opaque, priority: d && d.priority || 0 }, (b) => { return b.priority }), this.state.modeGen++, kn(this)
        }), removeOverlay: gn(function (a) { for (let d = this.state.overlays, m = 0; m < d.length; ++m) { const b = d[m].modeSpec; if (b == a || typeof a == 'string' && b.name == a) { d.splice(m, 1), this.state.modeGen++, kn(this); return } } }), indentLine: gn(function (a, d, m) { typeof d != 'string' && typeof d != 'number' && (d == null ? d = this.options.smartIndent ? 'smart' : 'prev' : d = d ? 'add' : 'subtract'), de(this.doc, a) && Dl(this, a, d, m) }), indentSelection: gn(function (a) {
          for (let d = this.doc.sel.ranges, m = -1, b = 0; b < d.length; b++) {
            const x = d[b]; if (x.empty()) {
              x.head.line > m && (Dl(this, x.head.line, a, !0), m = x.head.line, b == this.doc.sel.primIndex && fs(this))
            }
            else { const _ = x.from(); const T = x.to(); const H = Math.max(m, _.line); m = Math.min(this.lastLine(), T.line - (T.ch ? 0 : 1)) + 1; for (let X = H; X < m; ++X)Dl(this, X, a); const re = this.doc.sel.ranges; _.ch == 0 && d.length == re.length && re[b].from().ch > 0 && td(this.doc, b, new gt(_, re[b].to()), Y) }
          }
        }), getTokenAt(a, d) { return og(this, a, d) }, getLineTokens(a, d) { return og(this, le(a), d, !0) }, getTokenTypeAt(a) {
          a = Xe(this.doc, a); const d = ng(this, Oe(this.doc, a.line)); let m = 0; let b = (d.length - 1) / 2; const x = a.ch; let _; if (x == 0) {
            _ = d[2]
          }
          else {
            for (;;) {
              const T = m + b >> 1; if ((T ? d[T * 2 - 1] : 0) >= x) {
                b = T
              }
              else if (d[T * 2 + 1] < x) {
                m = T + 1
              }
              else { _ = d[T * 2 + 2]; break }
            }
          } const H = _ ? _.indexOf('overlay ') : -1; return H < 0 ? _ : H == 0 ? null : _.slice(0, H - 1)
        }, getModeAt(a) { const d = this.doc.mode; return d.innerMode ? r.innerMode(d, this.getTokenAt(a).state).mode : d }, getHelper(a, d) { return this.getHelpers(a, d)[0] }, getHelpers(a, d) {
          const m = []; if (!c.hasOwnProperty(d))
            return m; const b = c[d]; const x = this.getModeAt(a); if (typeof x[d] == 'string') {
            b[x[d]] && m.push(b[x[d]])
          }
          else if (x[d]) {
            for (let _ = 0; _ < x[d].length; _++) { const T = b[x[d][_]]; T && m.push(T) }
          }
          else {
            x.helperType && b[x.helperType] ? m.push(b[x.helperType]) : b[x.name] && m.push(b[x.name])
          } for (let H = 0; H < b._global.length; H++) { const X = b._global[H]; X.pred(x, this) && ge(m, X.val) == -1 && m.push(X.val) } return m
        }, getStateAfter(a, d) { const m = this.doc; return a = Qp(m, a ?? m.first + m.size - 1), dl(this, a + 1, d).state }, cursorCoords(a, d) { let m; const b = this.doc.sel.primary(); return a == null ? m = b.head : typeof a == 'object' ? m = Xe(this.doc, a) : m = a ? b.from() : b.to(), Sr(this, m, d || 'page') }, charCoords(a, d) { return cc(this, Xe(this.doc, a), d || 'page') }, coordsChar(a, d) { return a = Pg(this, a, d || 'page'), Pf(this, a.left, a.top) }, lineAtHeight(a, d) { return a = Pg(this, { top: a, left: 0 }, d || 'page').top, G(this.doc, a + this.display.viewOffset) }, heightAtLine(a, d, m) {
          let b = !1; let x; if (typeof a == 'number') { const _ = this.doc.first + this.doc.size - 1; a < this.doc.first ? a = this.doc.first : a > _ && (a = _, b = !0), x = Oe(this.doc, a) }
          else {
            x = a
          } return ac(this, x, { top: 0, left: 0 }, d || 'page', m || b).top + (b ? this.doc.height - ai(x) : 0)
        }, defaultTextHeight() { return as(this.display) }, defaultCharWidth() { return cs(this.display) }, getViewport() { return { from: this.display.viewFrom, to: this.display.viewTo } }, addWidget(a, d, m, b, x) {
          const _ = this.display; a = Sr(this, Xe(this.doc, a)); let T = a.bottom; let H = a.left; if (d.style.position = 'absolute', d.setAttribute('cm-ignore-events', 'true'), this.display.input.setUneditable(d), _.sizer.appendChild(d), b == 'over') {
            T = a.top
          }
          else if (b == 'above' || b == 'near') { const X = Math.max(_.wrapper.clientHeight, this.doc.height); const re = Math.max(_.sizer.clientWidth, _.lineSpace.clientWidth); (b == 'above' || a.bottom + d.offsetHeight > X) && a.top > d.offsetHeight ? T = a.top - d.offsetHeight : a.bottom + d.offsetHeight <= X && (T = a.bottom), H + d.offsetWidth > re && (H = re - d.offsetWidth) }d.style.top = `${T}px`, d.style.left = d.style.right = '', x == 'right' ? (H = _.sizer.clientWidth - d.offsetWidth, d.style.right = '0px') : (x == 'left' ? H = 0 : x == 'middle' && (H = (_.sizer.clientWidth - d.offsetWidth) / 2), d.style.left = `${H}px`), m && d_(this, { left: H, top: T, right: H + d.offsetWidth, bottom: T + d.offsetHeight })
        }, triggerOnKeyDown: gn(zm), triggerOnKeyPress: gn(Fm), triggerOnKeyUp: Dm, triggerOnMouseDown: gn(Hm), execCommand(a) {
          if (Pl.hasOwnProperty(a))
            return Pl[a].call(null, this)
        }, triggerElectric: gn(function (a) { Gm(this, a) }), findPosH(a, d, m, b) { let x = 1; d < 0 && (x = -1, d = -d); for (var _ = Xe(this.doc, a), T = 0; T < d && (_ = fd(this.doc, _, x, m, b), !_.hitSide); ++T);return _ }, moveH: gn(function (a, d) { const m = this; this.extendSelectionsBy((b) => { return m.display.shift || m.doc.extend || b.empty() ? fd(m.doc, b.head, a, d, m.options.rtlMoveVisually) : a < 0 ? b.from() : b.to() }, pe) }), deleteH: gn(function (a, d) { const m = this.doc.sel; const b = this.doc; m.somethingSelected() ? b.replaceSelection('', null, '+delete') : bs(this, (x) => { const _ = fd(b, x.head, a, d, !1); return a < 0 ? { from: _, to: x.head } : { from: x.head, to: _ } }) }), findPosV(a, d, m, b) {
          let x = 1; let _ = b; d < 0 && (x = -1, d = -d); for (var T = Xe(this.doc, a), H = 0; H < d; ++H) {
            const X = Sr(this, T, 'div'); if (_ == null ? _ = X.left : X.left = _, T = Jm(this, X, x, m), T.hitSide)
              break
          } return T
        }, moveV: gn(function (a, d) {
          const m = this; const b = this.doc; const x = []; const _ = !this.display.shift && !b.extend && b.sel.somethingSelected(); if (b.extendSelectionsBy((H) => {
            if (_)
              return a < 0 ? H.from() : H.to(); const X = Sr(m, H.head, 'div'); H.goalColumn != null && (X.left = H.goalColumn), x.push(X.left); const re = Jm(m, X, a, d); return d == 'page' && H == b.sel.primary() && qf(m, cc(m, re, 'div').top - X.top), re
          }, pe), x.length) {
            for (let T = 0; T < b.sel.ranges.length; T++)b.sel.ranges[T].goalColumn = x[T]
          }
        }), findWordAt(a) { const d = this.doc; const m = Oe(d, a.line).text; let b = a.ch; let x = a.ch; if (m) { const _ = this.getHelper(a, 'wordChars'); (a.sticky == 'before' || x == m.length) && b ? --b : ++x; for (var T = m.charAt(b), H = st(T, _) ? function (X) { return st(X, _) } : /\s/.test(T) ? function (X) { return /\s/.test(X) } : function (X) { return !/\s/.test(X) && !st(X) }; b > 0 && H(m.charAt(b - 1));)--b; for (;x < m.length && H(m.charAt(x));)++x } return new gt(le(a.line, b), le(a.line, x)) }, toggleOverwrite(a) { a != null && a == this.state.overwrite || ((this.state.overwrite = !this.state.overwrite) ? we(this.display.cursorDiv, 'CodeMirror-overwrite') : C(this.display.cursorDiv, 'CodeMirror-overwrite'), Pt(this, 'overwriteToggle', this, this.state.overwrite)) }, hasFocus() { return this.display.input.getField() == ue(Ke(this)) }, isReadOnly() { return !!(this.options.readOnly || this.doc.cantEdit) }, scrollTo: gn(function (a, d) { bl(this, a, d) }), getScrollInfo() { const a = this.display.scroller; return { left: a.scrollLeft, top: a.scrollTop, height: a.scrollHeight - jr(this) - this.display.barHeight, width: a.scrollWidth - jr(this) - this.display.barWidth, clientHeight: $f(this), clientWidth: So(this) } }, scrollIntoView: gn(function (a, d) { a == null ? (a = { from: this.doc.sel.primary().head, to: null }, d == null && (d = this.options.cursorScrollMargin)) : typeof a == 'number' ? a = { from: le(a, 0), to: null } : a.from == null && (a = { from: a, to: null }), a.to || (a.to = a.from), a.margin = d || 0, a.from.line != null ? h_(this, a) : jg(this, a.from, a.to, a.margin) }), setSize: gn(function (a, d) {
          const m = this; const b = function (_) { return typeof _ == 'number' || /^\d+$/.test(String(_)) ? `${_}px` : _ }; a != null && (this.display.wrapper.style.width = b(a)), d != null && (this.display.wrapper.style.height = b(d)), this.options.lineWrapping && Mg(this); let x = this.display.viewFrom; this.doc.iter(x, this.display.viewTo, (_) => {
            if (_.widgets) {
              for (let T = 0; T < _.widgets.length; T++) {
                if (_.widgets[T].noHScroll) { Oi(m, x, 'widget'); break }
              }
            }++x
          }), this.curOp.forceUpdate = !0, Pt(this, 'refresh', this)
        }), operation(a) { return Bn(this, a) }, startOperation() { return Ao(this) }, endOperation() { return Lo(this) }, refresh: gn(function () { const a = this.display.cachedTextHeight; kn(this), this.curOp.forceUpdate = !0, vl(this), bl(this, this.doc.scrollLeft, this.doc.scrollTop), Gf(this.display), (a == null || Math.abs(a - as(this.display)) > 0.5 || this.options.lineWrapping) && Df(this), Pt(this, 'refresh', this) }), swapDoc: gn(function (a) { const d = this.doc; return d.cm = null, this.state.selectingText && this.state.selectingText(), rm(this, a), vl(this), this.display.input.reset(), bl(this, a.scrollLeft, a.scrollTop), this.curOp.forceScroll = !0, Jt(this, 'swapDoc', this, d), d }), phrase(a) { const d = this.options.phrases; return d && Object.prototype.hasOwnProperty.call(d, a) ? d[a] : a }, getInputField() { return this.display.input.getField() }, getWrapperElement() { return this.display.wrapper }, getScrollerElement() { return this.display.scroller }, getGutterElement() { return this.display.gutters } }, mr(r), r.registerHelper = function (a, d, m) { c.hasOwnProperty(a) || (c[a] = r[a] = { _global: [] }), c[a][d] = m }, r.registerGlobalHelper = function (a, d, m, b) { r.registerHelper(a, d, b), c[a]._global.push({ pred: m, val: b }) }
      } function fd(r, o, c, a, d) {
        const m = o; const b = c; let x = Oe(r, o.line); const _ = d && r.direction == 'rtl' ? -c : c; function T() { const $e = o.line + _; return $e < r.first || $e >= r.first + r.size ? !1 : (o = new le($e, o.ch, o.sticky), x = Oe(r, $e)) } function H($e) {
          let Te; if (a == 'codepoint') {
            const Ne = x.text.charCodeAt(o.ch + (c > 0 ? 0 : -1)); if (isNaN(Ne)) {
              Te = null
            }
            else { const Be = c > 0 ? Ne >= 55296 && Ne < 56320 : Ne >= 56320 && Ne < 57343; Te = new le(o.line, Math.max(0, Math.min(x.text.length, o.ch + c * (Be ? 2 : 1))), -c) }
          }
          else {
            d ? Te = J_(r.cm, x, o, c) : Te = rd(x, o, c)
          } if (Te == null) {
            if (!$e && T())
              o = id(d, r.cm, x, o.line, _); else return !1
          }
          else {
            o = Te
          } return !0
        } if (a == 'char' || a == 'codepoint') {
          H()
        }
        else if (a == 'column') {
          H(!0)
        }
        else if (a == 'word' || a == 'group') {
          for (let X = null, re = a == 'group', Z = r.cm && r.cm.getHelper(o, 'wordChars'), ce = !0; !(c < 0 && !H(!ce)); ce = !1) {
            const me = x.text.charAt(o.ch) || `
`; let Se = st(me, Z)
              ? 'w'
              : re && me == `
`
                ? 'n'
                : !re || /\s/.test(me) ? null : 'p'; if (re && !ce && !Se && (Se = 's'), X && X != Se) { c < 0 && (c = 1, H(), o.sticky = 'after'); break } if (Se && (X = Se), c > 0 && !H(!ce))
              break
          }
        } const ke = xc(r, o, m, b, !0); return pt(m, ke) && (ke.hitSide = !0), ke
      } function Jm(r, o, c, a) {
        const d = r.doc; const m = o.left; let b; if (a == 'page') { const x = Math.min(r.display.wrapper.clientHeight, ie(r).innerHeight || d(r).documentElement.clientHeight); const _ = Math.max(x - 0.5 * as(r.display), 3); b = (c > 0 ? o.bottom : o.top) + c * _ }
        else {
          a == 'line' && (b = c > 0 ? o.bottom + 3 : o.top - 3)
        } for (var T; T = Pf(r, m, b), !!T.outside;) { if (c < 0 ? b <= 0 : b >= d.height) { T.hitSide = !0; break }b += c * 5 } return T
      } const yt = function (r) { this.cm = r, this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null, this.polling = new ae(), this.composing = null, this.gracePeriod = !1, this.readDOMTimeout = null }; yt.prototype.init = function (r) {
        const o = this; const c = this; const a = c.cm; const d = c.div = r.lineDiv; d.contentEditable = !0, ud(d, a.options.spellcheck, a.options.autocorrect, a.options.autocapitalize); function m(x) {
          for (let _ = x.target; _; _ = _.parentNode) {
            if (_ == d)
              return !0; if (/\bCodeMirror-(?:line)?widget\b/.test(_.className))
              break
          } return !1
        }He(d, 'paste', (x) => { !m(x) || Ot(a, x) || Vm(x, a) || p <= 11 && setTimeout(Yt(a, () => { return o.updateFromDOM() }), 20) }), He(d, 'compositionstart', (x) => { o.composing = { data: x.data, done: !1 } }), He(d, 'compositionupdate', (x) => { o.composing || (o.composing = { data: x.data, done: !1 }) }), He(d, 'compositionend', (x) => { o.composing && (x.data != o.composing.data && o.readFromDOMSoon(), o.composing.done = !0) }), He(d, 'touchstart', () => { return c.forceCompositionEnd() }), He(d, 'input', () => { o.composing || o.readFromDOMSoon() }); function b(x) {
          if (!(!m(x) || Ot(a, x))) {
            if (a.somethingSelected()) {
              Ec({ lineWise: !1, text: a.getSelections() }), x.type == 'cut' && a.replaceSelection('', null, 'cut')
            }
            else if (a.options.lineWiseCopyCut) { const _ = Xm(a); Ec({ lineWise: !0, text: _.text }), x.type == 'cut' && a.operation(() => { a.setSelections(_.ranges, 0, Y), a.replaceSelection('', null, 'cut') }) }
            else {
              return
            } if (x.clipboardData) {
              x.clipboardData.clearData(); const T = kr.text.join(`
`); if (x.clipboardData.setData('Text', T), x.clipboardData.getData('Text') == T) { x.preventDefault(); return }
            } const H = Km(); const X = H.firstChild; ud(X), a.display.lineSpace.insertBefore(H, a.display.lineSpace.firstChild), X.value = kr.text.join(`
`); const re = ue(Je(d)); qe(X), setTimeout(() => { a.display.lineSpace.removeChild(H), re.focus(), re == d && c.showPrimarySelection() }, 50)
          }
        }He(d, 'copy', b), He(d, 'cut', b)
      }, yt.prototype.screenReaderLabelChanged = function (r) { r ? this.div.setAttribute('aria-label', r) : this.div.removeAttribute('aria-label') }, yt.prototype.prepareSelection = function () { const r = Hg(this.cm, !1); return r.focus = ue(Je(this.div)) == this.div, r }, yt.prototype.showSelection = function (r, o) { !r || !this.cm.display.view.length || ((r.focus || o) && this.showPrimarySelection(), this.showMultipleSelections(r)) }, yt.prototype.getSelection = function () { return this.cm.display.wrapper.ownerDocument.getSelection() }, yt.prototype.showPrimarySelection = function () {
        const r = this.getSelection(); const o = this.cm; const c = o.doc.sel.primary(); const a = c.from(); const d = c.to(); if (o.display.viewTo == o.display.viewFrom || a.line >= o.display.viewTo || d.line < o.display.viewFrom) { r.removeAllRanges(); return } const m = Ac(o, r.anchorNode, r.anchorOffset); const b = Ac(o, r.focusNode, r.focusOffset); if (!(m && !m.bad && b && !b.bad && Le(is(m, b), a) == 0 && Le(_n(m, b), d) == 0)) {
          const x = o.display.view; const _ = a.line >= o.display.viewFrom && Ym(o, a) || { node: x[0].measure.map[2], offset: 0 }; let T = d.line < o.display.viewTo && Ym(o, d); if (!T) { const H = x[x.length - 1].measure; const X = H.maps ? H.maps[H.maps.length - 1] : H.map; T = { node: X[X.length - 1], offset: X[X.length - 2] - X[X.length - 3] } } if (!_ || !T) { r.removeAllRanges(); return } const re = r.rangeCount && r.getRangeAt(0); let Z; try { Z = B(_.node, _.offset, T.offset, T.node) }
          catch {}Z && (!s && o.state.focused ? (r.collapse(_.node, _.offset), Z.collapsed || (r.removeAllRanges(), r.addRange(Z))) : (r.removeAllRanges(), r.addRange(Z)), re && r.anchorNode == null ? r.addRange(re) : s && this.startGracePeriod()), this.rememberSelection()
        }
      }, yt.prototype.startGracePeriod = function () { const r = this; clearTimeout(this.gracePeriod), this.gracePeriod = setTimeout(() => { r.gracePeriod = !1, r.selectionChanged() && r.cm.operation(() => { return r.cm.curOp.selectionChanged = !0 }) }, 20) }, yt.prototype.showMultipleSelections = function (r) { I(this.cm.display.cursorDiv, r.cursors), I(this.cm.display.selectionDiv, r.selection) }, yt.prototype.rememberSelection = function () { const r = this.getSelection(); this.lastAnchorNode = r.anchorNode, this.lastAnchorOffset = r.anchorOffset, this.lastFocusNode = r.focusNode, this.lastFocusOffset = r.focusOffset }, yt.prototype.selectionInEditor = function () {
        const r = this.getSelection(); if (!r.rangeCount)
          return !1; const o = r.getRangeAt(0).commonAncestorContainer; return oe(this.div, o)
      }, yt.prototype.focus = function () { this.cm.options.readOnly != 'nocursor' && ((!this.selectionInEditor() || ue(Je(this.div)) != this.div) && this.showSelection(this.prepareSelection(), !0), this.div.focus()) }, yt.prototype.blur = function () { this.div.blur() }, yt.prototype.getField = function () { return this.div }, yt.prototype.supportsTouch = function () { return !0 }, yt.prototype.receivedFocus = function () { const r = this; const o = this; this.selectionInEditor() ? setTimeout(() => { return r.pollSelection() }, 20) : Bn(this.cm, () => { return o.cm.curOp.selectionChanged = !0 }); function c() { o.cm.state.focused && (o.pollSelection(), o.polling.set(o.cm.options.pollInterval, c)) } this.polling.set(this.cm.options.pollInterval, c) }, yt.prototype.selectionChanged = function () { const r = this.getSelection(); return r.anchorNode != this.lastAnchorNode || r.anchorOffset != this.lastAnchorOffset || r.focusNode != this.lastFocusNode || r.focusOffset != this.lastFocusOffset }, yt.prototype.pollSelection = function () { if (!(this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged())) { const r = this.getSelection(); const o = this.cm; if (O && y && this.cm.display.gutterSpecs.length && mk(r.anchorNode)) { this.cm.triggerOnKeyDown({ type: 'keydown', keyCode: 8, preventDefault: Math.abs }), this.blur(), this.focus(); return } if (!this.composing) { this.rememberSelection(); const c = Ac(o, r.anchorNode, r.anchorOffset); const a = Ac(o, r.focusNode, r.focusOffset); c && a && Bn(o, () => { fn(o.doc, zi(c, a), Y), (c.bad || a.bad) && (o.curOp.selectionChanged = !0) }) } } }, yt.prototype.pollContent = function () {
        this.readDOMTimeout != null && (clearTimeout(this.readDOMTimeout), this.readDOMTimeout = null); const r = this.cm; const o = r.display; const c = r.doc.sel.primary(); let a = c.from(); let d = c.to(); if (a.ch == 0 && a.line > r.firstLine() && (a = le(a.line - 1, Oe(r.doc, a.line - 1).length)), d.ch == Oe(r.doc, d.line).text.length && d.line < r.lastLine() && (d = le(d.line + 1, 0)), a.line < o.viewFrom || d.line > o.viewTo - 1)
          return !1; let m, b, x; a.line == o.viewFrom || (m = To(r, a.line)) == 0 ? (b = N(o.view[0].line), x = o.view[0].node) : (b = N(o.view[m].line), x = o.view[m - 1].node.nextSibling); const _ = To(r, d.line); let T; let H; if (_ == o.view.length - 1 ? (T = o.viewTo - 1, H = o.lineDiv.lastChild) : (T = N(o.view[_ + 1].line) - 1, H = o.view[_ + 1].node.previousSibling), !x)
          return !1; for (var X = r.doc.splitLines(vk(r, x, H, b, T)), re = si(r.doc, le(b, 0), le(T, Oe(r.doc, T).text.length)); X.length > 1 && re.length > 1;) {
          if (ve(X) == ve(re))
            X.pop(), re.pop(), T--; else if (X[0] == re[0])
            X.shift(), re.shift(), b++; else break
        } for (var Z = 0, ce = 0, me = X[0], Se = re[0], ke = Math.min(me.length, Se.length); Z < ke && me.charCodeAt(Z) == Se.charCodeAt(Z);)++Z; for (var $e = ve(X), Te = ve(re), Ne = Math.min($e.length - (X.length == 1 ? Z : 0), Te.length - (re.length == 1 ? Z : 0)); ce < Ne && $e.charCodeAt($e.length - ce - 1) == Te.charCodeAt(Te.length - ce - 1);)++ce; if (X.length == 1 && re.length == 1 && b == a.line) {
          for (;Z && Z > a.ch && $e.charCodeAt($e.length - ce - 1) == Te.charCodeAt(Te.length - ce - 1);)Z--, ce++
        } X[X.length - 1] = $e.slice(0, $e.length - ce).replace(/^\u200B+/, ''), X[0] = X[0].slice(Z).replace(/\u200B+$/, ''); const Be = le(b, Z); const ze = le(T, re.length ? ve(re).length - ce : 0); if (X.length > 1 || X[0] || Le(Be, ze))
          return ms(r.doc, X, Be, ze, '+input'), !0
      }, yt.prototype.ensurePolled = function () { this.forceCompositionEnd() }, yt.prototype.reset = function () { this.forceCompositionEnd() }, yt.prototype.forceCompositionEnd = function () { this.composing && (clearTimeout(this.readDOMTimeout), this.composing = null, this.updateFromDOM(), this.div.blur(), this.div.focus()) }, yt.prototype.readFromDOMSoon = function () {
        const r = this; this.readDOMTimeout == null && (this.readDOMTimeout = setTimeout(() => {
          if (r.readDOMTimeout = null, r.composing) {
            if (r.composing.done)
              r.composing = null; else return
          } r.updateFromDOM()
        }, 80))
      }, yt.prototype.updateFromDOM = function () { const r = this; (this.cm.isReadOnly() || !this.pollContent()) && Bn(this.cm, () => { return kn(r.cm) }) }, yt.prototype.setUneditable = function (r) { r.contentEditable = 'false' }, yt.prototype.onKeyPress = function (r) { r.charCode == 0 || this.composing || (r.preventDefault(), this.cm.isReadOnly() || Yt(this.cm, cd)(this.cm, String.fromCharCode(r.charCode == null ? r.keyCode : r.charCode), 0)) }, yt.prototype.readOnlyChanged = function (r) { this.div.contentEditable = String(r != 'nocursor') }, yt.prototype.onContextMenu = function () {}, yt.prototype.resetPosition = function () {}, yt.prototype.needsContentAttribute = !0; function Ym(r, o) {
        const c = Mf(r, o.line); if (!c || c.hidden)
          return null; const a = Oe(r.doc, o.line); const d = Cg(c, a, o.line); const m = tt(a, r.doc.direction); let b = 'left'; if (m) { const x = Ft(m, o.ch); b = x % 2 ? 'right' : 'left' } const _ = Lg(d.map, o.ch, b); return _.offset = _.collapse == 'right' ? _.end : _.start, _
      } function mk(r) {
        for (let o = r; o; o = o.parentNode) {
          if (/CodeMirror-gutter-wrapper/.test(o.className))
            return !0
        } return !1
      } function xs(r, o) { return o && (r.bad = !0), r } function vk(r, o, c, a, d) {
        let m = ''; let b = !1; const x = r.doc.lineSeparator(); let _ = !1; function T(Z) { return function (ce) { return ce.id == Z } } function H() { b && (m += x, _ && (m += x), b = _ = !1) } function X(Z) { Z && (H(), m += Z) } function re(Z) {
          if (Z.nodeType == 1) {
            const ce = Z.getAttribute('cm-text'); if (ce) { X(ce); return } const me = Z.getAttribute('cm-marker'); let Se; if (me) { const ke = r.findMarks(le(a, 0), le(d + 1, 0), T(+me)); ke.length && (Se = ke[0].find(0)) && X(si(r.doc, Se.from, Se.to).join(x)); return } if (Z.getAttribute('contenteditable') == 'false')
              return; const $e = /^(pre|div|p|li|table|br)$/i.test(Z.nodeName); if (!/^br$/i.test(Z.nodeName) && Z.textContent.length == 0)
              return; $e && H(); for (let Te = 0; Te < Z.childNodes.length; Te++)re(Z.childNodes[Te]); /^(pre|p)$/i.test(Z.nodeName) && (_ = !0), $e && (b = !0)
          }
          else {
            Z.nodeType == 3 && X(Z.nodeValue.replace(/\u200B/g, '').replace(/\u00A0/g, ' '))
          }
        } for (;re(o), o != c;)o = o.nextSibling, _ = !1; return m
      } function Ac(r, o, c) {
        let a; if (o == r.display.lineDiv) {
          if (a = r.display.lineDiv.childNodes[c], !a)
            return xs(r.clipPos(le(r.display.viewTo - 1)), !0); o = null, c = 0
        }
        else {
          for (a = o; ;a = a.parentNode) {
            if (!a || a == r.display.lineDiv)
              return null; if (a.parentNode && a.parentNode == r.display.lineDiv)
              break
          }
        } for (let d = 0; d < r.display.view.length; d++) {
          const m = r.display.view[d]; if (m.node == a)
            return yk(m, o, c)
        }
      } function yk(r, o, c) {
        const a = r.text.firstChild; let d = !1; if (!o || !oe(a, o))
          return xs(le(N(r.line), 0), !0); if (o == a && (d = !0, o = a.childNodes[c], c = 0, !o)) { const m = r.rest ? ve(r.rest) : r.line; return xs(le(N(m), m.text.length), d) } let b = o.nodeType == 3 ? o : null; let x = o; for (!b && o.childNodes.length == 1 && o.firstChild.nodeType == 3 && (b = o.firstChild, c && (c = b.nodeValue.length)); x.parentNode != a;)x = x.parentNode; const _ = r.measure; const T = _.maps; function H(Se, ke, $e) {
          for (let Te = -1; Te < (T ? T.length : 0); Te++) {
            for (let Ne = Te < 0 ? _.map : T[Te], Be = 0; Be < Ne.length; Be += 3) { const ze = Ne[Be + 2]; if (ze == Se || ze == ke) { const Qe = N(Te < 0 ? r.line : r.rest[Te]); let xt = Ne[Be] + $e; return ($e < 0 || ze != Se) && (xt = Ne[Be + ($e ? 1 : 0)]), le(Qe, xt) } }
          }
        } let X = H(b, x, c); if (X)
          return xs(X, d); for (let re = x.nextSibling, Z = b ? b.nodeValue.length - c : 0; re; re = re.nextSibling) {
          if (X = H(re, re.firstChild, 0), X)
            return xs(le(X.line, X.ch - Z), d); Z += re.textContent.length
        } for (let ce = x.previousSibling, me = c; ce; ce = ce.previousSibling) {
          if (X = H(ce, ce.firstChild, -1), X)
            return xs(le(X.line, X.ch + me), d); me += ce.textContent.length
        }
      } const Ht = function (r) { this.cm = r, this.prevInput = '', this.pollingFast = !1, this.polling = new ae(), this.hasSelection = !1, this.composing = null, this.resetting = !1 }; Ht.prototype.init = function (r) {
        const o = this; const c = this; const a = this.cm; this.createField(r); const d = this.textarea; r.wrapper.insertBefore(this.wrapper, r.wrapper.firstChild), M && (d.style.width = '0px'), He(d, 'input', () => { h && p >= 9 && o.hasSelection && (o.hasSelection = null), c.poll() }), He(d, 'paste', (b) => { Ot(a, b) || Vm(b, a) || (a.state.pasteIncoming = +new Date(), c.fastPoll()) }); function m(b) {
          if (!Ot(a, b)) {
            if (a.somethingSelected()) {
              Ec({ lineWise: !1, text: a.getSelections() })
            }
            else if (a.options.lineWiseCopyCut) {
              const x = Xm(a); Ec({ lineWise: !0, text: x.text }), b.type == 'cut'
                ? a.setSelections(x.ranges, null, Y)
                : (c.prevInput = '', d.value = x.text.join(`
`), qe(d))
            }
            else {
              return
            }b.type == 'cut' && (a.state.cutIncoming = +new Date())
          }
        }He(d, 'cut', m), He(d, 'copy', m), He(r.scroller, 'paste', (b) => { if (!(ci(r, b) || Ot(a, b))) { if (!d.dispatchEvent) { a.state.pasteIncoming = +new Date(), c.focus(); return } const x = new Event('paste'); x.clipboardData = b.clipboardData, d.dispatchEvent(x) } }), He(r.lineSpace, 'selectstart', (b) => { ci(r, b) || un(b) }), He(d, 'compositionstart', () => { const b = a.getCursor('from'); c.composing && c.composing.range.clear(), c.composing = { start: b, range: a.markText(b, a.getCursor('to'), { className: 'CodeMirror-composing' }) } }), He(d, 'compositionend', () => { c.composing && (c.poll(), c.composing.range.clear(), c.composing = null) })
      }, Ht.prototype.createField = function (r) { this.wrapper = Km(), this.textarea = this.wrapper.firstChild; const o = this.cm.options; ud(this.textarea, o.spellcheck, o.autocorrect, o.autocapitalize) }, Ht.prototype.screenReaderLabelChanged = function (r) { r ? this.textarea.setAttribute('aria-label', r) : this.textarea.removeAttribute('aria-label') }, Ht.prototype.prepareSelection = function () { const r = this.cm; const o = r.display; const c = r.doc; const a = Hg(r); if (r.options.moveInputWithCursor) { const d = Sr(r, c.sel.primary().head, 'div'); const m = o.wrapper.getBoundingClientRect(); const b = o.lineDiv.getBoundingClientRect(); a.teTop = Math.max(0, Math.min(o.wrapper.clientHeight - 10, d.top + b.top - m.top)), a.teLeft = Math.max(0, Math.min(o.wrapper.clientWidth - 10, d.left + b.left - m.left)) } return a }, Ht.prototype.showSelection = function (r) { const o = this.cm; const c = o.display; I(c.cursorDiv, r.cursors), I(c.selectionDiv, r.selection), r.teTop != null && (this.wrapper.style.top = `${r.teTop}px`, this.wrapper.style.left = `${r.teLeft}px`) }, Ht.prototype.reset = function (r) {
        if (!(this.contextMenuPending || this.composing && r)) {
          const o = this.cm; if (this.resetting = !0, o.somethingSelected()) { this.prevInput = ''; const c = o.getSelection(); this.textarea.value = c, o.state.focused && qe(this.textarea), h && p >= 9 && (this.hasSelection = c) }
          else {
            r || (this.prevInput = this.textarea.value = '', h && p >= 9 && (this.hasSelection = null))
          } this.resetting = !1
        }
      }, Ht.prototype.getField = function () { return this.textarea }, Ht.prototype.supportsTouch = function () { return !1 }, Ht.prototype.focus = function () {
        if (this.cm.options.readOnly != 'nocursor' && (!k || ue(Je(this.textarea)) != this.textarea)) {
          try { this.textarea.focus() }
          catch {}
        }
      }, Ht.prototype.blur = function () { this.textarea.blur() }, Ht.prototype.resetPosition = function () { this.wrapper.style.top = this.wrapper.style.left = 0 }, Ht.prototype.receivedFocus = function () { this.slowPoll() }, Ht.prototype.slowPoll = function () { const r = this; this.pollingFast || this.polling.set(this.cm.options.pollInterval, () => { r.poll(), r.cm.state.focused && r.slowPoll() }) }, Ht.prototype.fastPoll = function () { let r = !1; const o = this; o.pollingFast = !0; function c() { const a = o.poll(); !a && !r ? (r = !0, o.polling.set(60, c)) : (o.pollingFast = !1, o.slowPoll()) }o.polling.set(20, c) }, Ht.prototype.poll = function () {
        const r = this; const o = this.cm; const c = this.textarea; let a = this.prevInput; if (this.contextMenuPending || this.resetting || !o.state.focused || Ni(c) && !a && !this.composing || o.isReadOnly() || o.options.disableInput || o.state.keySeq)
          return !1; const d = c.value; if (d == a && !o.somethingSelected())
          return !1; if (h && p >= 9 && this.hasSelection === d || z && /[\uF700-\uF7FF]/.test(d))
          return o.display.input.reset(), !1; if (o.doc.sel == o.display.selForContextMenu) {
          const m = d.charCodeAt(0); if (m == 8203 && !a && (a = '​'), m == 8666)
            return this.reset(), this.cm.execCommand('undo')
        } for (var b = 0, x = Math.min(a.length, d.length); b < x && a.charCodeAt(b) == d.charCodeAt(b);)++b; return Bn(o, () => {
          cd(o, d.slice(b), a.length - b, null, r.composing ? '*compose' : null), d.length > 1e3 || d.includes(`
`)
            ? c.value = r.prevInput = ''
            : r.prevInput = d, r.composing && (r.composing.range.clear(), r.composing.range = o.markText(r.composing.start, o.getCursor('to'), { className: 'CodeMirror-composing' }))
        }), !0
      }, Ht.prototype.ensurePolled = function () { this.pollingFast && this.poll() && (this.pollingFast = !1) }, Ht.prototype.onKeyPress = function () { h && p >= 9 && (this.hasSelection = null), this.fastPoll() }, Ht.prototype.onContextMenu = function (r) {
        const o = this; const c = o.cm; const a = c.display; const d = o.textarea; o.contextMenuPending && o.contextMenuPending(); const m = ko(c, r); const b = a.scroller.scrollTop; if (!m || L)
          return; const x = c.options.resetSelectionOnContextMenu; x && c.doc.sel.contains(m) == -1 && Yt(c, fn)(c.doc, zi(m), Y); const _ = d.style.cssText; const T = o.wrapper.style.cssText; const H = o.wrapper.offsetParent.getBoundingClientRect(); o.wrapper.style.cssText = 'position: static', d.style.cssText = `position: absolute; width: 30px; height: 30px;
  top: ${r.clientY - H.top - 5}px; left: ${r.clientX - H.left - 5}px;
      z-index: 1000; background: ${h ? 'rgba(255, 255, 255, .05)' : 'transparent'};
      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);`;let X; g && (X = d.ownerDocument.defaultView.scrollY), a.input.focus(), g && d.ownerDocument.defaultView.scrollTo(null, X), a.input.reset(), c.somethingSelected() || (d.value = o.prevInput = ' '), o.contextMenuPending = Z, a.selForContextMenu = c.doc.sel, clearTimeout(a.detectingSelectAll); function re() { if (d.selectionStart != null) { const me = c.somethingSelected(); const Se = `​${me ? d.value : ''}`; d.value = '⇚', d.value = Se, o.prevInput = me ? '' : '​', d.selectionStart = 1, d.selectionEnd = Se.length, a.selForContextMenu = c.doc.sel } } function Z() { if (o.contextMenuPending == Z && (o.contextMenuPending = !1, o.wrapper.style.cssText = T, d.style.cssText = _, h && p < 9 && a.scrollbars.setScrollTop(a.scroller.scrollTop = b), d.selectionStart != null)) { (!h || h && p < 9) && re(); let me = 0; const Se = function () { a.selForContextMenu == c.doc.sel && d.selectionStart == 0 && d.selectionEnd > 0 && o.prevInput == '​' ? Yt(c, mm)(c) : me++ < 10 ? a.detectingSelectAll = setTimeout(Se, 500) : (a.selForContextMenu = null, a.input.reset()) }; a.detectingSelectAll = setTimeout(Se, 200) } } if (h && p >= 9 && re(), q) { $i(r); const ce = function () { cn(window, 'mouseup', ce), setTimeout(Z, 20) }; He(window, 'mouseup', ce) }
        else {
          setTimeout(Z, 50)
        }
      }, Ht.prototype.readOnlyChanged = function (r) { r || this.reset(), this.textarea.disabled = r == 'nocursor', this.textarea.readOnly = !!r }, Ht.prototype.setUneditable = function () {}, Ht.prototype.needsContentAttribute = !1; function bk(r, o) {
        if (o = o ? Q(o) : {}, o.value = r.value, !o.tabindex && r.tabIndex && (o.tabindex = r.tabIndex), !o.placeholder && r.placeholder && (o.placeholder = r.placeholder), o.autofocus == null) { const c = ue(Je(r)); o.autofocus = c == r || r.getAttribute('autofocus') != null && c == document.body } function a() { r.value = x.getValue() } let d; if (r.form && (He(r.form, 'submit', a), !o.leaveSubmitMethodAlone)) {
          const m = r.form; d = m.submit; try { var b = m.submit = function () { a(), m.submit = d, m.submit(), m.submit = b } }
          catch {}
        }o.finishInit = function (_) { _.save = a, _.getTextArea = function () { return r }, _.toTextArea = function () { _.toTextArea = isNaN, a(), r.parentNode.removeChild(_.getWrapperElement()), r.style.display = '', r.form && (cn(r.form, 'submit', a), !o.leaveSubmitMethodAlone && typeof r.form.submit == 'function' && (r.form.submit = d)) } }, r.style.display = 'none'; var x = Ct((_) => { return r.parentNode.insertBefore(_, r.nextSibling) }, o); return x
      } function wk(r) { r.off = cn, r.on = He, r.wheelEventPixels = E_, r.Doc = Tn, r.splitLines = lr, r.countColumn = J, r.findColumn = he, r.isWordChar = rt, r.Pass = V, r.signal = Pt, r.Line = os, r.changeEnd = Di, r.scrollbarModel = Vg, r.Pos = le, r.cmpPos = Le, r.modes = Qo, r.mimeModes = br, r.resolveMode = es, r.getMode = ts, r.modeExtensions = Ii, r.extendMode = ns, r.copyState = Br, r.startState = rs, r.innerMode = ul, r.commands = Pl, r.keyMap = fi, r.keyName = Nm, r.isModifierKey = $m, r.lookupKey = ys, r.normalizeKeyMap = K_, r.StringStream = Rt, r.SharedTextMarker = Ml, r.TextMarker = Hi, r.LineWidget = $l, r.e_preventDefault = un, r.e_stopPropagation = Yo, r.e_stop = $i, r.addClass = we, r.contains = oe, r.rmClass = C, r.keyNames = Bi }fk(Ct), gk(Ct); const xk = 'iter insert remove copy getEditor constructor'.split(' '); for (const Lc in Tn.prototype)Tn.prototype.hasOwnProperty(Lc) && ge(xk, Lc) < 0 && (Ct.prototype[Lc] = (function (r) { return function () { return r.apply(this.doc, arguments) } }(Tn.prototype[Lc]))); return mr(Tn), Ct.inputStyles = { textarea: Ht, contenteditable: yt }, Ct.defineMode = function (r) { !Ct.defaults.mode && r != 'null' && (Ct.defaults.mode = r), wr.apply(this, arguments) }, Ct.defineMIME = xo, Ct.defineMode('null', () => { return { token(r) { return r.skipToEnd() } } }), Ct.defineMIME('text/plain', 'null'), Ct.defineExtension = function (r, o) { Ct.prototype[r] = o }, Ct.defineDocExtension = function (r, o) { Tn.prototype[r] = o }, Ct.fromTextArea = bk, wk(Ct), Ct.version = '5.65.18', Ct
    })
  }(nu))), nu.exports
} const Cde = sl(); const Ede = kp(Cde); const Z0 = { exports: {} }; let Q0; function m1() {
  return Q0 || (Q0 = 1, (function (e, t) {
    (function (n) { n(sl()) })((n) => {
      n.defineMode('javascript', (i, s) => {
        const l = i.indentUnit; const u = s.statementIndent; const f = s.jsonld; const h = s.json || f; const p = s.trackScope !== !1; const g = s.typescript; const v = s.wordCharacters || /[\w$\xA1-\uFFFF]/; const y = (function () { function N(Kt) { return { type: Kt, style: 'keyword' } } const G = N('keyword a'); const de = N('keyword b'); const xe = N('keyword c'); const le = N('keyword d'); const Le = N('operator'); const pt = { type: 'atom', style: 'atom' }; return { if: N('if'), while: G, with: G, else: de, do: de, try: de, finally: de, return: le, break: le, continue: le, new: N('new'), delete: xe, void: xe, throw: xe, debugger: N('debugger'), var: N('var'), const: N('var'), let: N('var'), function: N('function'), catch: N('catch'), for: N('for'), switch: N('switch'), case: N('case'), default: N('default'), in: Le, typeof: Le, instanceof: Le, true: pt, false: pt, null: pt, undefined: pt, NaN: pt, Infinity: pt, this: N('this'), class: N('class'), super: N('atom'), yield: xe, export: N('export'), import: N('import'), extends: xe, await: xe } }()); const w = /[+\-*&%=<>!?|~^@]/; const L = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/; function $(N) {
          for (var G = !1, de, xe = !1; (de = N.next()) != null;) {
            if (!G) {
              if (de == '/' && !xe)
                return; de == '[' ? xe = !0 : xe && de == ']' && (xe = !1)
            }G = !G && de == '\\'
          }
        } let A, E; function M(N, G, de) { return A = N, E = de, G } function O(N, G) {
          const de = N.next(); if (de == '"' || de == '\'')
            return G.tokenize = k(de), G.tokenize(N, G); if (de == '.' && N.match(/^\d[\d_]*(?:e[+\-]?[\d_]+)?/i))
            return M('number', 'number'); if (de == '.' && N.match('..'))
            return M('spread', 'meta'); if (/[[\]{}(),;:.]/.test(de))
            return M(de); if (de == '=' && N.eat('>'))
            return M('=>', 'operator'); if (de == '0' && N.match(/^(?:x[\dA-Fa-f_]+|o[0-7_]+|b[01_]+)n?/))
            return M('number', 'number'); if (/\d/.test(de))
            return N.match(/^[\d_]*(?:n|(?:\.[\d_]*)?(?:[eE][+\-]?[\d_]+)?)?/), M('number', 'number'); if (de == '/')
            return N.eat('*') ? (G.tokenize = z, z(N, G)) : N.eat('/') ? (N.skipToEnd(), M('comment', 'comment')) : Yn(N, G, 1) ? ($(N), N.match(/^\b(([gimyus])(?![gimyus]*\2))+\b/), M('regexp', 'string-2')) : (N.eat('='), M('operator', 'operator', N.current())); if (de == '`')
            return G.tokenize = D, D(N, G); if (de == '#' && N.peek() == '!')
            return N.skipToEnd(), M('meta', 'meta'); if (de == '#' && N.eatWhile(v))
            return M('variable', 'property'); if (de == '<' && N.match('!--') || de == '-' && N.match('->') && !/\S/.test(N.string.slice(0, N.start)))
            return N.skipToEnd(), M('comment', 'comment'); if (w.test(de))
            return (de != '>' || !G.lexical || G.lexical.type != '>') && (N.eat('=') ? (de == '!' || de == '=') && N.eat('=') : /[<>*+\-|&?]/.test(de) && (N.eat(de), de == '>' && N.eat(de))), de == '?' && N.eat('.') ? M('.') : M('operator', 'operator', N.current()); if (v.test(de)) {
            N.eatWhile(v); const xe = N.current(); if (G.lastType != '.') {
              if (y.propertyIsEnumerable(xe)) { const le = y[xe]; return M(le.type, le.style, xe) } if (xe == 'async' && N.match(/^(\s|\/\*([^*]|\*(?!\/))*?\*\/)*[[(\w]/, !1))
                return M('async', 'keyword', xe)
            } return M('variable', 'variable', xe)
          }
        } function k(N) {
          return function (G, de) {
            let xe = !1; let le; if (f && G.peek() == '@' && G.match(L))
              return de.tokenize = O, M('jsonld-keyword', 'meta'); for (;(le = G.next()) != null && !(le == N && !xe);)xe = !xe && le == '\\'; return xe || (de.tokenize = O), M('string', 'string')
          }
        } function z(N, G) { for (var de = !1, xe; xe = N.next();) { if (xe == '/' && de) { G.tokenize = O; break }de = xe == '*' } return M('comment', 'comment') } function D(N, G) { for (var de = !1, xe; (xe = N.next()) != null;) { if (!de && (xe == '`' || xe == '$' && N.eat('{'))) { G.tokenize = O; break }de = !de && xe == '\\' } return M('quasi', 'string-2', N.current()) } const te = '([{}])'; function ee(N, G) {
          G.fatArrowAt && (G.fatArrowAt = null); let de = N.string.indexOf('=>', N.start); if (!(de < 0)) {
            if (g) { const xe = /:\s*(?:\w+(?:<[^>]*>|\[\])?|\{[^}]*\})\s*$/.exec(N.string.slice(N.start, de)); xe && (de = xe.index) } for (var le = 0, Le = !1, pt = de - 1; pt >= 0; --pt) {
              const Kt = N.string.charAt(pt); const _n = te.indexOf(Kt); if (_n >= 0 && _n < 3) { if (!le) { ++pt; break } if (--le == 0) { Kt == '(' && (Le = !0); break } }
              else if (_n >= 3 && _n < 6) {
                ++le
              }
              else if (v.test(Kt)) {
                Le = !0
              }
              else if (/["'/`]/.test(Kt)) {
                for (;;--pt) {
                  if (pt == 0)
                    return; const is = N.string.charAt(pt - 1); if (is == Kt && N.string.charAt(pt - 2) != '\\') { pt--; break }
                }
              }
              else if (Le && !le) { ++pt; break }
            }Le && !le && (G.fatArrowAt = pt)
          }
        } const W = { 'atom': !0, 'number': !0, 'variable': !0, 'string': !0, 'regexp': !0, 'this': !0, 'import': !0, 'jsonld-keyword': !0 }; function q(N, G, de, xe, le, Le) { this.indented = N, this.column = G, this.type = de, this.prev = le, this.info = Le, xe != null && (this.align = xe) } function K(N, G) {
          if (!p)
            return !1; for (var de = N.localVars; de; de = de.next) {
            if (de.name == G)
              return !0
          } for (let xe = N.context; xe; xe = xe.prev) {
            for (var de = xe.vars; de; de = de.next) {
              if (de.name == G)
                return !0
            }
          }
        } function C(N, G, de, xe, le) { const Le = N.cc; for (P.state = N, P.stream = le, P.marked = null, P.cc = Le, P.style = G, N.lexical.hasOwnProperty('align') || (N.lexical.align = !0); ;) { const pt = Le.length ? Le.pop() : h ? ge : J; if (pt(de, xe)) { for (;Le.length && Le[Le.length - 1].lex;)Le.pop()(); return P.marked ? P.marked : de == 'variable' && K(N, xe) ? 'variable-2' : G } } } var P = { state: null, marked: null, cc: null }; function I() { for (let N = arguments.length - 1; N >= 0; N--)P.cc.push(arguments[N]) } function S() { return I.apply(null, arguments), !0 } function R(N, G) {
          for (let de = G; de; de = de.next) {
            if (de.name == N)
              return !0
          } return !1
        } function B(N) {
          const G = P.state; if (P.marked = 'def', !!p) {
            if (G.context) {
              if (G.lexical.info == 'var' && G.context && G.context.block) { const de = oe(N, G.context); if (de != null) { G.context = de; return } }
              else if (!R(N, G.localVars)) { G.localVars = new Pe(N, G.localVars); return }
            }s.globalVars && !R(N, G.globalVars) && (G.globalVars = new Pe(N, G.globalVars))
          }
        } function oe(N, G) {
          if (G) {
            if (G.block) { const de = oe(N, G.prev); return de ? de == G.prev ? G : new we(de, G.vars, !0) : null }
            else {
              return R(N, G.vars) ? G : new we(G.prev, new Pe(N, G.vars), !1)
            }
          }
          else {
            return null
          }
        } function ue(N) { return N == 'public' || N == 'private' || N == 'protected' || N == 'abstract' || N == 'readonly' } function we(N, G, de) { this.prev = N, this.vars = G, this.block = de } function Pe(N, G) { this.name = N, this.next = G } const qe = new Pe('this', new Pe('arguments', null)); function Ze() { P.state.context = new we(P.state.context, P.state.localVars, !1), P.state.localVars = qe } function Ke() { P.state.context = new we(P.state.context, P.state.localVars, !0), P.state.localVars = null }Ze.lex = Ke.lex = !0; function Je() { P.state.localVars = P.state.context.vars, P.state.context = P.state.context.prev }Je.lex = !0; function ie(N, G) {
          const de = function () {
            const xe = P.state; let le = xe.indented; if (xe.lexical.type == 'stat') {
              le = xe.lexical.indented
            }
            else {
              for (let Le = xe.lexical; Le && Le.type == ')' && Le.align; Le = Le.prev)le = Le.indented
            }xe.lexical = new q(le, P.stream.column(), N, null, xe.lexical, G)
          }; return de.lex = !0, de
        } function U() { const N = P.state; N.lexical.prev && (N.lexical.type == ')' && (N.indented = N.lexical.indented), N.lexical = N.lexical.prev) }U.lex = !0; function Q(N) { function G(de) { return de == N ? S() : N == ';' || de == '}' || de == ')' || de == ']' ? I() : S(G) } return G } function J(N, G) { return N == 'var' ? S(ie('vardef', G), Yo, Q(';'), U) : N == 'keyword a' ? S(ie('form'), V, J, U) : N == 'keyword b' ? S(ie('form'), J, U) : N == 'keyword d' ? P.stream.match(/^\s*$/, !1) ? S() : S(ie('stat'), fe, Q(';'), U) : N == 'debugger' ? S(Q(';')) : N == '{' ? S(ie('}'), Ke, Bt, U, Je) : N == ';' ? S() : N == 'if' ? (P.state.lexical.info == 'else' && P.state.cc[P.state.cc.length - 1] == U && P.state.cc.pop()(), S(ie('form'), V, J, U, Zo)) : N == 'function' ? S(lr) : N == 'for' ? S(ie('form'), Ke, Za, J, Je, U) : N == 'class' || g && G == 'interface' ? (P.marked = 'keyword', S(ie('form', N == 'class' ? N : G), Qo, U)) : N == 'variable' ? g && G == 'declare' ? (P.marked = 'keyword', S(J)) : g && (G == 'module' || G == 'enum' || G == 'type') && P.stream.match(/^\s*\w/, !1) ? (P.marked = 'keyword', G == 'enum' ? S(Oe) : G == 'type' ? S(Qa, Q('operator'), tt, Q(';')) : S(ie('form'), Sn, Q('{'), ie('}'), Bt, U, U)) : g && G == 'namespace' ? (P.marked = 'keyword', S(ie('form'), ge, J, U)) : g && G == 'abstract' ? (P.marked = 'keyword', S(J)) : S(ie('stat'), Ve) : N == 'switch' ? S(ie('form'), V, Q('{'), ie('}', 'switch'), Ke, Bt, U, U, Je) : N == 'case' ? S(ge, Q(':')) : N == 'default' ? S(Q(':')) : N == 'catch' ? S(ie('form'), Ze, ae, J, U, Je) : N == 'export' ? S(ie('stat'), es, U) : N == 'import' ? S(ie('stat'), Ii, U) : N == 'async' ? S(J) : G == '@' ? S(ge, J) : I(ie('stat'), ge, Q(';'), U) } function ae(N) {
          if (N == '(')
            return S(yr, Q(')'))
        } function ge(N, G) { return Y(N, G, !1) } function F(N, G) { return Y(N, G, !0) } function V(N) { return N != '(' ? I() : S(ie(')'), fe, Q(')'), U) } function Y(N, G, de) {
          if (P.state.fatArrowAt == P.stream.start) {
            const xe = de ? be : ve; if (N == '(')
              return S(Ze, ie(')'), lt(yr, ')'), U, Q('=>'), xe, Je); if (N == 'variable')
              return I(Ze, Sn, Q('=>'), xe, Je)
          } const le = de ? he : pe; return W.hasOwnProperty(N) ? S(le) : N == 'function' ? S(lr, le) : N == 'class' || g && G == 'interface' ? (P.marked = 'keyword', S(ie('form'), wf, U)) : N == 'keyword c' || N == 'async' ? S(de ? F : ge) : N == '(' ? S(ie(')'), fe, Q(')'), U, le) : N == 'operator' || N == 'spread' ? S(de ? F : ge) : N == '[' ? S(ie(']'), Rt, U, le) : N == '{' ? Xt(st, '}', null, le) : N == 'quasi' ? I(Ce, le) : N == 'new' ? S(We(de)) : S()
        } function fe(N) { return N.match(/[;})\],]/) ? I() : I(ge) } function pe(N, G) { return N == ',' ? S(fe) : he(N, G, !1) } function he(N, G, de) {
          const xe = de == !1 ? pe : he; const le = de == !1 ? ge : F; if (N == '=>')
            return S(Ze, de ? be : ve, Je); if (N == 'operator')
            return /\+\+|--/.test(G) || g && G == '!' ? S(xe) : g && G == '<' && P.stream.match(/^([^<>]|<[^<>]*>)*>\s*\(/, !1) ? S(ie('>'), lt(tt, '>'), U, xe) : G == '?' ? S(ge, Q(':'), le) : S(le); if (N == 'quasi')
            return I(Ce, xe); if (N != ';') {
            if (N == '(')
              return Xt(F, ')', 'call', xe); if (N == '.')
              return S(rt, xe); if (N == '[')
              return S(ie(']'), fe, Q(']'), U, xe); if (g && G == 'as')
              return P.marked = 'keyword', S(tt, xe); if (N == 'regexp')
              return P.state.lastType = P.marked = 'operator', P.stream.backUp(P.stream.pos - P.stream.start - 1), S(le)
          }
        } function Ce(N, G) { return N != 'quasi' ? I() : G.slice(G.length - 2) != '${' ? S(Ce) : S(fe, Ee) } function Ee(N) {
          if (N == '}')
            return P.marked = 'string-2', P.state.tokenize = D, S(Ce)
        } function ve(N) { return ee(P.stream, P.state), I(N == '{' ? J : ge) } function be(N) { return ee(P.stream, P.state), I(N == '{' ? J : F) } function We(N) { return function (G) { return G == '.' ? S(N ? De : Me) : G == 'variable' && g ? S(Hn, N ? he : pe) : I(N ? F : ge) } } function Me(N, G) {
          if (G == 'target')
            return P.marked = 'keyword', S(pe)
        } function De(N, G) {
          if (G == 'target')
            return P.marked = 'keyword', S(he)
        } function Ve(N) { return N == ':' ? S(U, J) : I(pe, Q(';'), U) } function rt(N) {
          if (N == 'variable')
            return P.marked = 'property', S()
        } function st(N, G) {
          if (N == 'async')
            return P.marked = 'property', S(st); if (N == 'variable' || P.style == 'keyword') {
            if (P.marked = 'property', G == 'get' || G == 'set')
              return S(ut); let de; return g && P.state.fatArrowAt == P.stream.start && (de = P.stream.match(/^\s*:\s*/, !1)) && (P.state.fatArrowAt = P.stream.pos + de[0].length), S(It)
          }
          else {
            if (N == 'number' || N == 'string')
              return P.marked = f ? 'property' : `${P.style} property`, S(It); if (N == 'jsonld-keyword')
              return S(It); if (g && ue(G))
              return P.marked = 'keyword', S(st); if (N == '[')
              return S(ge, Dn, Q(']'), It); if (N == 'spread')
              return S(F, It); if (G == '*')
              return P.marked = 'keyword', S(st); if (N == ':')
              return I(It)
          }
        } function ut(N) { return N != 'variable' ? I(It) : (P.marked = 'property', S(lr)) } function It(N) {
          if (N == ':')
            return S(F); if (N == '(')
            return I(lr)
        } function lt(N, G, de) { function xe(le, Le) { if (de ? de.includes(le) : le == ',') { const pt = P.state.lexical; return pt.info == 'call' && (pt.pos = (pt.pos || 0) + 1), S((Kt, _n) => { return Kt == G || _n == G ? I() : I(N) }, xe) } return le == G || Le == G ? S() : de && de.includes(';') ? I(N) : S(Q(G)) } return function (le, Le) { return le == G || Le == G ? S() : I(N, xe) } } function Xt(N, G, de) { for (let xe = 3; xe < arguments.length; xe++)P.cc.push(arguments[xe]); return S(ie(G, de), lt(N, G), U) } function Bt(N) { return N == '}' ? S() : I(J, Bt) } function Dn(N, G) {
          if (g) {
            if (N == ':')
              return S(tt); if (G == '?')
              return S(Dn)
          }
        } function Hr(N, G) {
          if (g && (N == ':' || G == 'in'))
            return S(tt)
        } function Ft(N) {
          if (g && N == ':')
            return P.stream.match(/^\s*\w+\s+is\b/, !1) ? S(ge, Fn, tt) : S(tt)
        } function Fn(N, G) {
          if (G == 'is')
            return P.marked = 'keyword', S()
        } function tt(N, G) {
          if (G == 'keyof' || G == 'typeof' || G == 'infer' || G == 'readonly')
            return P.marked = 'keyword', S(G == 'typeof' ? F : tt); if (N == 'variable' || G == 'void')
            return P.marked = 'type', S(sr); if (G == '|' || G == '&')
            return S(tt); if (N == 'string' || N == 'number' || N == 'atom')
            return S(sr); if (N == '[')
            return S(ie(']'), lt(tt, ']', ','), U, sr); if (N == '{')
            return S(ie('}'), He, U, sr); if (N == '(')
            return S(lt(Ot, ')'), Ya, sr); if (N == '<')
            return S(lt(tt, '>'), tt); if (N == 'quasi')
            return I(cn, sr)
        } function Ya(N) {
          if (N == '=>')
            return S(tt)
        } function He(N) { return N.match(/[})\]]/) ? S() : N == ',' || N == ';' ? S(He) : I(oi, He) } function oi(N, G) {
          if (N == 'variable' || P.style == 'keyword')
            return P.marked = 'property', S(oi); if (G == '?' || N == 'number' || N == 'string')
            return S(oi); if (N == ':')
            return S(tt); if (N == '[')
            return S(Q('variable'), Hr, Q(']'), oi); if (N == '(')
            return I(Ni, oi); if (!N.match(/[;})\],]/))
            return S()
        } function cn(N, G) { return N != 'quasi' ? I() : G.slice(G.length - 2) != '${' ? S(cn) : S(tt, Pt) } function Pt(N) {
          if (N == '}')
            return P.marked = 'string-2', P.state.tokenize = D, S(cn)
        } function Ot(N, G) { return N == 'variable' && P.stream.match(/^\s*[?:]/, !1) || G == '?' ? S(Ot) : N == ':' ? S(tt) : N == 'spread' ? S(Ot) : I(tt) } function sr(N, G) {
          if (G == '<')
            return S(ie('>'), lt(tt, '>'), U, sr); if (G == '|' || N == '.' || G == '&')
            return S(tt); if (N == '[')
            return S(tt, Q(']'), sr); if (G == 'extends' || G == 'implements')
            return P.marked = 'keyword', S(tt); if (G == '?')
            return S(tt, Q(':'), tt)
        } function Hn(N, G) {
          if (G == '<')
            return S(ie('>'), lt(tt, '>'), U, sr)
        } function mr() { return I(tt, un) } function un(N, G) {
          if (G == '=')
            return S(tt)
        } function Yo(N, G) { return G == 'enum' ? (P.marked = 'keyword', S(Oe)) : I(Sn, Dn, vr, bf) } function Sn(N, G) {
          if (g && ue(G))
            return P.marked = 'keyword', S(Sn); if (N == 'variable')
            return B(G), S(); if (N == 'spread')
            return S(Sn); if (N == '[')
            return Xt(al, ']'); if (N == '{')
            return Xt($i, '}')
        } function $i(N, G) { return N == 'variable' && !P.stream.match(/^\s*:/, !1) ? (B(G), S(vr)) : (N == 'variable' && (P.marked = 'property'), N == 'spread' ? S(Sn) : N == '}' ? I() : N == '[' ? S(ge, Q(']'), Q(':'), $i) : S(Q(':'), Sn, vr)) } function al() { return I(Sn, vr) } function vr(N, G) {
          if (G == '=')
            return S(F)
        } function bf(N) {
          if (N == ',')
            return S(Yo)
        } function Zo(N, G) {
          if (N == 'keyword b' && G == 'else')
            return S(ie('form', 'else'), J, U)
        } function Za(N, G) {
          if (G == 'await')
            return S(Za); if (N == '(')
            return S(ie(')'), cl, U)
        } function cl(N) { return N == 'var' ? S(Yo, Mi) : N == 'variable' ? S(Mi) : I(Mi) } function Mi(N, G) { return N == ')' ? S() : N == ';' ? S(Mi) : G == 'in' || G == 'of' ? (P.marked = 'keyword', S(ge, Mi)) : I(ge, Mi) } function lr(N, G) {
          if (G == '*')
            return P.marked = 'keyword', S(lr); if (N == 'variable')
            return B(G), S(lr); if (N == '(')
            return S(Ze, ie(')'), lt(yr, ')'), U, Ft, J, Je); if (g && G == '<')
            return S(ie('>'), lt(mr, '>'), U, lr)
        } function Ni(N, G) {
          if (G == '*')
            return P.marked = 'keyword', S(Ni); if (N == 'variable')
            return B(G), S(Ni); if (N == '(')
            return S(Ze, ie(')'), lt(yr, ')'), U, Ft, Je); if (g && G == '<')
            return S(ie('>'), lt(mr, '>'), U, Ni)
        } function Qa(N, G) {
          if (N == 'keyword' || N == 'variable')
            return P.marked = 'type', S(Qa); if (G == '<')
            return S(ie('>'), lt(mr, '>'), U)
        } function yr(N, G) { return G == '@' && S(ge, yr), N == 'spread' ? S(yr) : g && ue(G) ? (P.marked = 'keyword', S(yr)) : g && N == 'this' ? S(Dn, vr) : I(Sn, Dn, vr) } function wf(N, G) { return N == 'variable' ? Qo(N, G) : br(N, G) } function Qo(N, G) {
          if (N == 'variable')
            return B(G), S(br)
        } function br(N, G) {
          if (G == '<')
            return S(ie('>'), lt(mr, '>'), U, br); if (G == 'extends' || G == 'implements' || g && N == ',')
            return G == 'implements' && (P.marked = 'keyword'), S(g ? tt : ge, br); if (N == '{')
            return S(ie('}'), wr, U)
        } function wr(N, G) {
          if (N == 'async' || N == 'variable' && (G == 'static' || G == 'get' || G == 'set' || g && ue(G)) && P.stream.match(/^\s+#?[\w$\xA1-\uFFFF]/, !1))
            return P.marked = 'keyword', S(wr); if (N == 'variable' || P.style == 'keyword')
            return P.marked = 'property', S(xo, wr); if (N == 'number' || N == 'string')
            return S(xo, wr); if (N == '[')
            return S(ge, Dn, Q(']'), xo, wr); if (G == '*')
            return P.marked = 'keyword', S(wr); if (g && N == '(')
            return I(Ni, wr); if (N == ';' || N == ',')
            return S(wr); if (N == '}')
            return S(); if (G == '@')
            return S(ge, wr)
        } function xo(N, G) {
          if (G == '!' || G == '?')
            return S(xo); if (N == ':')
            return S(tt, vr); if (G == '=')
            return S(F); const de = P.state.lexical.prev; const xe = de && de.info == 'interface'; return I(xe ? Ni : lr)
        } function es(N, G) { return G == '*' ? (P.marked = 'keyword', S(rs, Q(';'))) : G == 'default' ? (P.marked = 'keyword', S(ge, Q(';'))) : N == '{' ? S(lt(ts, '}'), rs, Q(';')) : I(J) } function ts(N, G) {
          if (G == 'as')
            return P.marked = 'keyword', S(Q('variable')); if (N == 'variable')
            return I(F, ts)
        } function Ii(N) { return N == 'string' ? S() : N == '(' ? I(ge) : N == '.' ? I(pe) : I(ns, Br, rs) } function ns(N, G) { return N == '{' ? Xt(ns, '}') : (N == 'variable' && B(G), G == '*' && (P.marked = 'keyword'), S(ul)) } function Br(N) {
          if (N == ',')
            return S(ns, Br)
        } function ul(N, G) {
          if (G == 'as')
            return P.marked = 'keyword', S(ns)
        } function rs(N, G) {
          if (G == 'from')
            return P.marked = 'keyword', S(ge)
        } function Rt(N) { return N == ']' ? S() : I(lt(F, ']')) } function Oe() { return I(ie('form'), Sn, Q('{'), ie('}'), lt(si, '}'), U, U) } function si() { return I(Sn, vr) } function fl(N, G) { return N.lastType == 'operator' || N.lastType == ',' || w.test(G.charAt(0)) || /[,.]/.test(G.charAt(0)) } function Yn(N, G, de) { return G.tokenize == O && /^(?:operator|sof|keyword [bcd]|case|new|export|default|spread|[[{}(,;:]|=>)$/.test(G.lastType) || G.lastType == 'quasi' && /\{\s*$/.test(N.string.slice(0, N.pos - (de || 0))) } return { startState(N) { const G = { tokenize: O, lastType: 'sof', cc: [], lexical: new q((N || 0) - l, 0, 'block', !1), localVars: s.localVars, context: s.localVars && new we(null, null, !1), indented: N || 0 }; return s.globalVars && typeof s.globalVars == 'object' && (G.globalVars = s.globalVars), G }, token(N, G) {
          if (N.sol() && (G.lexical.hasOwnProperty('align') || (G.lexical.align = !1), G.indented = N.indentation(), ee(N, G)), G.tokenize != z && N.eatSpace())
            return null; const de = G.tokenize(N, G); return A == 'comment' ? de : (G.lastType = A == 'operator' && (E == '++' || E == '--') ? 'incdec' : A, C(G, de, A, E, N))
        }, indent(N, G) {
          if (N.tokenize == z || N.tokenize == D)
            return n.Pass; if (N.tokenize != O)
            return 0; const de = G && G.charAt(0); let xe = N.lexical; let le; if (!/^\s*else\b/.test(G)) {
            for (let Le = N.cc.length - 1; Le >= 0; --Le) {
              const pt = N.cc[Le]; if (pt == U)
                xe = xe.prev; else if (pt != Zo && pt != Je)
                break
            }
          } for (;(xe.type == 'stat' || xe.type == 'form') && (de == '}' || (le = N.cc[N.cc.length - 1]) && (le == pe || le == he) && !/^[,.=+\-*:?[(]/.test(G));)xe = xe.prev; u && xe.type == ')' && xe.prev.type == 'stat' && (xe = xe.prev); const Kt = xe.type; const _n = de == Kt; return Kt == 'vardef' ? xe.indented + (N.lastType == 'operator' || N.lastType == ',' ? xe.info.length + 1 : 0) : Kt == 'form' && de == '{' ? xe.indented : Kt == 'form' ? xe.indented + l : Kt == 'stat' ? xe.indented + (fl(N, G) ? u || l : 0) : xe.info == 'switch' && !_n && s.doubleIndentSwitch != !1 ? xe.indented + (/^(?:case|default)\b/.test(G) ? l : 2 * l) : xe.align ? xe.column + (_n ? 0 : 1) : xe.indented + (_n ? 0 : l)
        }, electricInput: /^\s*(?:case .*?:|default:|\{|\})$/, blockCommentStart: h ? null : '/*', blockCommentEnd: h ? null : '*/', blockCommentContinue: h ? null : ' * ', lineComment: h ? null : '//', fold: 'brace', closeBrackets: '()[]{}\'\'""``', helperType: h ? 'json' : 'javascript', jsonldMode: f, jsonMode: h, expressionAllowed: Yn, skipExpression(N) { C(N, 'atom', 'atom', 'true', new n.StringStream('', 2, null)) } }
      }), n.registerHelper('wordChars', 'javascript', /[\w$]/), n.defineMIME('text/javascript', 'javascript'), n.defineMIME('text/ecmascript', 'javascript'), n.defineMIME('application/javascript', 'javascript'), n.defineMIME('application/x-javascript', 'javascript'), n.defineMIME('application/ecmascript', 'javascript'), n.defineMIME('application/json', { name: 'javascript', json: !0 }), n.defineMIME('application/x-json', { name: 'javascript', json: !0 }), n.defineMIME('application/manifest+json', { name: 'javascript', json: !0 }), n.defineMIME('application/ld+json', { name: 'javascript', jsonld: !0 }), n.defineMIME('text/typescript', { name: 'javascript', typescript: !0 }), n.defineMIME('application/typescript', { name: 'javascript', typescript: !0 })
    })
  }())), Z0.exports
}m1(); const ey = { exports: {} }; let ty; function v1() {
  return ty || (ty = 1, (function (e, t) {
    (function (n) { n(sl()) })((n) => {
      const i = { autoSelfClosers: { area: !0, base: !0, br: !0, col: !0, command: !0, embed: !0, frame: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0, menuitem: !0 }, implicitlyClosed: { dd: !0, li: !0, optgroup: !0, option: !0, p: !0, rp: !0, rt: !0, tbody: !0, td: !0, tfoot: !0, th: !0, tr: !0 }, contextGrabbers: { dd: { dd: !0, dt: !0 }, dt: { dd: !0, dt: !0 }, li: { li: !0 }, option: { option: !0, optgroup: !0 }, optgroup: { optgroup: !0 }, p: { address: !0, article: !0, aside: !0, blockquote: !0, dir: !0, div: !0, dl: !0, fieldset: !0, footer: !0, form: !0, h1: !0, h2: !0, h3: !0, h4: !0, h5: !0, h6: !0, header: !0, hgroup: !0, hr: !0, menu: !0, nav: !0, ol: !0, p: !0, pre: !0, section: !0, table: !0, ul: !0 }, rp: { rp: !0, rt: !0 }, rt: { rp: !0, rt: !0 }, tbody: { tbody: !0, tfoot: !0 }, td: { td: !0, th: !0 }, tfoot: { tbody: !0 }, th: { td: !0, th: !0 }, thead: { tbody: !0, tfoot: !0 }, tr: { tr: !0 } }, doNotIndent: { pre: !0 }, allowUnquoted: !0, allowMissing: !0, caseFold: !0 }; const s = { autoSelfClosers: {}, implicitlyClosed: {}, contextGrabbers: {}, doNotIndent: {}, allowUnquoted: !1, allowMissing: !1, allowMissingTagName: !1, caseFold: !1 }; n.defineMode('xml', (l, u) => {
        const f = l.indentUnit; const h = {}; const p = u.htmlMode ? i : s; for (var g in p)h[g] = p[g]; for (var g in u)h[g] = u[g]; let v, y; function w(S, R) {
          function B(we) { return R.tokenize = we, we(S, R) } const oe = S.next(); if (oe == '<')
            return S.eat('!') ? S.eat('[') ? S.match('CDATA[') ? B(A('atom', ']]>')) : null : S.match('--') ? B(A('comment', '-->')) : S.match('DOCTYPE', !0, !0) ? (S.eatWhile(/[\w.\-]/), B(E(1))) : null : S.eat('?') ? (S.eatWhile(/[\w.\-]/), R.tokenize = A('meta', '?>'), 'meta') : (v = S.eat('/') ? 'closeTag' : 'openTag', R.tokenize = L, 'tag bracket'); if (oe == '&') { let ue; return S.eat('#') ? S.eat('x') ? ue = S.eatWhile(/[a-f\d]/i) && S.eat(';') : ue = S.eatWhile(/\d/) && S.eat(';') : ue = S.eatWhile(/[\w.\-:]/) && S.eat(';'), ue ? 'atom' : 'error' }
          else {
            return S.eatWhile(/[^&<]/), null
          }
        }w.isInText = !0; function L(S, R) {
          const B = S.next(); if (B == '>' || B == '/' && S.eat('>'))
            return R.tokenize = w, v = B == '>' ? 'endTag' : 'selfcloseTag', 'tag bracket'; if (B == '=')
            return v = 'equals', null; if (B == '<') { R.tokenize = w, R.state = D, R.tagName = R.tagStart = null; const oe = R.tokenize(S, R); return oe ? `${oe} tag error` : 'tag error' }
          else {
            return /['"]/.test(B) ? (R.tokenize = $(B), R.stringStartCol = S.column(), R.tokenize(S, R)) : (S.match(/^[^\s=<>"']*[^\s=<>"'/]/), 'word')
          }
        } function $(S) {
          const R = function (B, oe) {
            for (;!B.eol();) {
              if (B.next() == S) { oe.tokenize = L; break }
            } return 'string'
          }; return R.isInAttribute = !0, R
        } function A(S, R) { return function (B, oe) { for (;!B.eol();) { if (B.match(R)) { oe.tokenize = w; break }B.next() } return S } } function E(S) {
          return function (R, B) {
            for (var oe; (oe = R.next()) != null;) {
              if (oe == '<')
                return B.tokenize = E(S + 1), B.tokenize(R, B); if (oe == '>') {
                if (S == 1) { B.tokenize = w; break }
                else {
                  return B.tokenize = E(S - 1), B.tokenize(R, B)
                }
              }
            } return 'meta'
          }
        } function M(S) { return S && S.toLowerCase() } function O(S, R, B) { this.prev = S.context, this.tagName = R || '', this.indent = S.indented, this.startOfLine = B, (h.doNotIndent.hasOwnProperty(R) || S.context && S.context.noIndent) && (this.noIndent = !0) } function k(S) { S.context && (S.context = S.context.prev) } function z(S, R) {
          for (var B; ;) {
            if (!S.context || (B = S.context.tagName, !h.contextGrabbers.hasOwnProperty(M(B)) || !h.contextGrabbers[M(B)].hasOwnProperty(M(R))))
              return; k(S)
          }
        } function D(S, R, B) { return S == 'openTag' ? (B.tagStart = R.column(), te) : S == 'closeTag' ? ee : D } function te(S, R, B) { return S == 'word' ? (B.tagName = R.current(), y = 'tag', K) : h.allowMissingTagName && S == 'endTag' ? (y = 'tag bracket', K(S, R, B)) : (y = 'error', te) } function ee(S, R, B) {
          if (S == 'word') { const oe = R.current(); return B.context && B.context.tagName != oe && h.implicitlyClosed.hasOwnProperty(M(B.context.tagName)) && k(B), B.context && B.context.tagName == oe || h.matchClosing === !1 ? (y = 'tag', W) : (y = 'tag error', q) }
          else {
            return h.allowMissingTagName && S == 'endTag' ? (y = 'tag bracket', W(S, R, B)) : (y = 'error', q)
          }
        } function W(S, R, B) { return S != 'endTag' ? (y = 'error', W) : (k(B), D) } function q(S, R, B) { return y = 'error', W(S, R, B) } function K(S, R, B) {
          if (S == 'word')
            return y = 'attribute', C; if (S == 'endTag' || S == 'selfcloseTag') { const oe = B.tagName; const ue = B.tagStart; return B.tagName = B.tagStart = null, S == 'selfcloseTag' || h.autoSelfClosers.hasOwnProperty(M(oe)) ? z(B, oe) : (z(B, oe), B.context = new O(B, oe, ue == B.indented)), D } return y = 'error', K
        } function C(S, R, B) { return S == 'equals' ? P : (h.allowMissing || (y = 'error'), K(S, R, B)) } function P(S, R, B) { return S == 'string' ? I : S == 'word' && h.allowUnquoted ? (y = 'string', K) : (y = 'error', K(S, R, B)) } function I(S, R, B) { return S == 'string' ? I : K(S, R, B) } return { startState(S) { const R = { tokenize: w, state: D, indented: S || 0, tagName: null, tagStart: null, context: null }; return S != null && (R.baseIndent = S), R }, token(S, R) {
          if (!R.tagName && S.sol() && (R.indented = S.indentation()), S.eatSpace())
            return null; v = null; let B = R.tokenize(S, R); return (B || v) && B != 'comment' && (y = null, R.state = R.state(v || B, S, R), y && (B = y == 'error' ? `${B} error` : y)), B
        }, indent(S, R, B) {
          let oe = S.context; if (S.tokenize.isInAttribute)
            return S.tagStart == S.indented ? S.stringStartCol + 1 : S.indented + f; if (oe && oe.noIndent)
            return n.Pass; if (S.tokenize != L && S.tokenize != w)
            return B ? B.match(/^(\s*)/)[0].length : 0; if (S.tagName)
            return h.multilineTagIndentPastTag !== !1 ? S.tagStart + S.tagName.length + 2 : S.tagStart + f * (h.multilineTagIndentFactor || 1); if (h.alignCDATA && /<!\[CDATA\[/.test(R))
            return 0; const ue = R && /^<(\/)?([\w:.-]*)/.exec(R); if (ue && ue[1]) {
            for (;oe;) {
              if (oe.tagName == ue[2]) { oe = oe.prev; break }
              else if (h.implicitlyClosed.hasOwnProperty(M(oe.tagName))) {
                oe = oe.prev
              }
              else {
                break
              }
            }
          }
          else if (ue) {
            for (;oe;) {
              const we = h.contextGrabbers[M(oe.tagName)]; if (we && we.hasOwnProperty(M(ue[2])))
                oe = oe.prev; else break
            }
          } for (;oe && oe.prev && !oe.startOfLine;)oe = oe.prev; return oe ? oe.indent + f : S.baseIndent || 0
        }, electricInput: /<\/[\s\w:]+>$/, blockCommentStart: '<!--', blockCommentEnd: '-->', configuration: h.htmlMode ? 'html' : 'xml', helperType: h.htmlMode ? 'html' : 'xml', skipAttribute(S) { S.state == P && (S.state = K) }, xmlCurrentTag(S) { return S.tagName ? { name: S.tagName, close: S.type == 'closeTag' } : null }, xmlCurrentContext(S) { for (var R = [], B = S.context; B; B = B.prev)R.push(B.tagName); return R.reverse() } }
      }), n.defineMIME('text/xml', 'xml'), n.defineMIME('application/xml', 'xml'), n.mimeModes.hasOwnProperty('text/html') || n.defineMIME('text/html', { name: 'xml', htmlMode: !0 })
    })
  }())), ey.exports
}v1(); const ny = { exports: {} }; let ry; function Ade() {
  return ry || (ry = 1, (function (e, t) {
    (function (n) { n(sl(), v1(), m1()) })((n) => {
      function i(l, u, f, h) { this.state = l, this.mode = u, this.depth = f, this.prev = h } function s(l) { return new i(n.copyState(l.mode, l.state), l.mode, l.depth, l.prev && s(l.prev)) }n.defineMode('jsx', (l, u) => {
        const f = n.getMode(l, { name: 'xml', allowMissing: !0, multilineTagIndentPastTag: !1, allowMissingTagName: !0 }); const h = n.getMode(l, u && u.base || 'javascript'); function p(w) { const L = w.tagName; w.tagName = null; const $ = f.indent(w, '', ''); return w.tagName = L, $ } function g(w, L) { return L.context.mode == f ? v(w, L, L.context) : y(w, L, L.context) } function v(w, L, $) {
          if ($.depth == 2)
            return w.match(/^.*?\*\//) ? $.depth = 1 : w.skipToEnd(), 'comment'; if (w.peek() == '{') {
            f.skipAttribute($.state); let A = p($.state); let E = $.state.context; if (E && w.match(/^[^>]*>\s*$/, !1)) { for (;E.prev && !E.startOfLine;)E = E.prev; E.startOfLine ? A -= l.indentUnit : $.prev.state.lexical && (A = $.prev.state.lexical.indented) }
            else {
              $.depth == 1 && (A += l.indentUnit)
            } return L.context = new i(n.startState(h, A), h, 0, L.context), null
          } if ($.depth == 1) {
            if (w.peek() == '<')
              return f.skipAttribute($.state), L.context = new i(n.startState(f, p($.state)), f, 0, L.context), null; if (w.match('//'))
              return w.skipToEnd(), 'comment'; if (w.match('/*'))
              return $.depth = 2, g(w, L)
          } const M = f.token(w, $.state); const O = w.current(); let k; return /\btag\b/.test(M) ? O.endsWith('>') ? $.state.context ? $.depth = 0 : L.context = L.context.prev : O.startsWith('<') && ($.depth = 1) : !M && (k = O.indexOf('{')) > -1 && w.backUp(O.length - k), M
        } function y(w, L, $) {
          if (w.peek() == '<' && !w.match(/^<([^<>]|<[^>]*>)+,\s*>/, !1) && h.expressionAllowed(w, $.state))
            return L.context = new i(n.startState(f, h.indent($.state, '', '')), f, 0, L.context), h.skipExpression($.state), null; const A = h.token(w, $.state); if (!A && $.depth != null) { const E = w.current(); E == '{' ? $.depth++ : E == '}' && --$.depth == 0 && (L.context = L.context.prev) } return A
        } return { startState() { return { context: new i(n.startState(h), h) } }, copyState(w) { return { context: s(w.context) } }, token: g, indent(w, L, $) { return w.context.mode.indent(w.context.state, L, $) }, innerMode(w) { return w.context } }
      }, 'xml', 'javascript'), n.defineMIME('text/jsx', 'jsx'), n.defineMIME('text/typescript-jsx', { name: 'jsx', base: { name: 'javascript', typescript: !0 } })
    })
  }())), ny.exports
}Ade(); const iy = { exports: {} }; let oy; function Lde() {
  return oy || (oy = 1, (function (e, t) {
    (function (n) { n(sl()) })((n) => {
      n.defineOption('placeholder', '', (p, g, v) => {
        const y = v && v != n.Init; if (g && !y) {
          p.on('blur', u), p.on('change', f), p.on('swapDoc', f), n.on(p.getInputField(), 'compositionupdate', p.state.placeholderCompose = function () { l(p) }), f(p)
        }
        else if (!g && y) { p.off('blur', u), p.off('change', f), p.off('swapDoc', f), n.off(p.getInputField(), 'compositionupdate', p.state.placeholderCompose), i(p); const w = p.getWrapperElement(); w.className = w.className.replace(' CodeMirror-empty', '') }g && !p.hasFocus() && u(p)
      }); function i(p) { p.state.placeholder && (p.state.placeholder.parentNode.removeChild(p.state.placeholder), p.state.placeholder = null) } function s(p) { i(p); const g = p.state.placeholder = document.createElement('pre'); g.style.cssText = 'height: 0; overflow: visible', g.style.direction = p.getOption('direction'), g.className = 'CodeMirror-placeholder CodeMirror-line-like'; let v = p.getOption('placeholder'); typeof v == 'string' && (v = document.createTextNode(v)), g.appendChild(v), p.display.lineSpace.insertBefore(g, p.display.lineSpace.firstChild) } function l(p) { setTimeout(() => { let g = !1; if (p.lineCount() == 1) { const v = p.getInputField(); g = v.nodeName == 'TEXTAREA' ? !p.getLine(0).length : !/[^\u200B]/.test(v.querySelector('.CodeMirror-line').textContent) }g ? s(p) : i(p) }, 20) } function u(p) { h(p) && s(p) } function f(p) { const g = p.getWrapperElement(); const v = h(p); g.className = g.className.replace(' CodeMirror-empty', '') + (v ? ' CodeMirror-empty' : ''), v ? s(p) : i(p) } function h(p) { return p.lineCount() === 1 && p.getLine(0) === '' }
    })
  }())), iy.exports
}Lde(); const sy = { exports: {} }; let ly; function $de() {
  return ly || (ly = 1, (function (e, t) {
    (function (n) { n(sl()) })((n) => {
      function i(u, f, h) {
        this.orientation = f, this.scroll = h, this.screen = this.total = this.size = 1, this.pos = 0, this.node = document.createElement('div'), this.node.className = `${u}-${f}`, this.inner = this.node.appendChild(document.createElement('div')); const p = this; n.on(this.inner, 'mousedown', (v) => {
          if (v.which != 1)
            return; n.e_preventDefault(v); const y = p.orientation == 'horizontal' ? 'pageX' : 'pageY'; const w = v[y]; const L = p.pos; function $() { n.off(document, 'mousemove', A), n.off(document, 'mouseup', $) } function A(E) {
            if (E.which != 1)
              return $(); p.moveTo(L + (E[y] - w) * (p.total / p.size))
          }n.on(document, 'mousemove', A), n.on(document, 'mouseup', $)
        }), n.on(this.node, 'click', (v) => { n.e_preventDefault(v); const y = p.inner.getBoundingClientRect(); let w; p.orientation == 'horizontal' ? w = v.clientX < y.left ? -1 : v.clientX > y.right ? 1 : 0 : w = v.clientY < y.top ? -1 : v.clientY > y.bottom ? 1 : 0, p.moveTo(p.pos + w * p.screen) }); function g(v) { const y = n.wheelEventPixels(v)[p.orientation == 'horizontal' ? 'x' : 'y']; const w = p.pos; p.moveTo(p.pos + y), p.pos != w && n.e_preventDefault(v) }n.on(this.node, 'mousewheel', g), n.on(this.node, 'DOMMouseScroll', g)
      }i.prototype.setPos = function (u, f) { return u < 0 && (u = 0), u > this.total - this.screen && (u = this.total - this.screen), !f && u == this.pos ? !1 : (this.pos = u, this.inner.style[this.orientation == 'horizontal' ? 'left' : 'top'] = `${u * (this.size / this.total)}px`, !0) }, i.prototype.moveTo = function (u) { this.setPos(u) && this.scroll(u, this.orientation) }; const s = 10; i.prototype.update = function (u, f, h) { const p = this.screen != f || this.total != u || this.size != h; p && (this.screen = f, this.total = u, this.size = h); let g = this.screen * (this.size / this.total); g < s && (this.size -= s - g, g = s), this.inner.style[this.orientation == 'horizontal' ? 'width' : 'height'] = `${g}px`, this.setPos(this.pos, p) }; function l(u, f, h) { this.addClass = u, this.horiz = new i(u, 'horizontal', h), f(this.horiz.node), this.vert = new i(u, 'vertical', h), f(this.vert.node), this.width = null }l.prototype.update = function (u) { if (this.width == null) { const f = window.getComputedStyle ? window.getComputedStyle(this.horiz.node) : this.horiz.node.currentStyle; f && (this.width = Number.parseInt(f.height)) } const h = this.width || 0; const p = u.scrollWidth > u.clientWidth + 1; const g = u.scrollHeight > u.clientHeight + 1; return this.vert.node.style.display = g ? 'block' : 'none', this.horiz.node.style.display = p ? 'block' : 'none', g && (this.vert.update(u.scrollHeight, u.clientHeight, u.viewHeight - (p ? h : 0)), this.vert.node.style.bottom = p ? `${h}px` : '0'), p && (this.horiz.update(u.scrollWidth, u.clientWidth, u.viewWidth - (g ? h : 0) - u.barLeft), this.horiz.node.style.right = g ? `${h}px` : '0', this.horiz.node.style.left = `${u.barLeft}px`), { right: g ? h : 0, bottom: p ? h : 0 } }, l.prototype.setScrollTop = function (u) { this.vert.setPos(u) }, l.prototype.setScrollLeft = function (u) { this.horiz.setPos(u) }, l.prototype.clear = function () { const u = this.horiz.node.parentNode; u.removeChild(this.horiz.node), u.removeChild(this.vert.node) }, n.scrollbarModel.simple = function (u, f) { return new l('CodeMirror-simplescroll', u, f) }, n.scrollbarModel.overlay = function (u, f) { return new l('CodeMirror-overlayscroll', u, f) }
    })
  }())), sy.exports
}$de(); const Mn = rn(); function Mde(e, t, n = {}) { const i = Ede.fromTextArea(e.value, { theme: 'vars', ...n, scrollbarStyle: 'simple' }); let s = !1; return i.on('change', () => { if (s) { s = !1; return }t.value = i.getValue() }), St(t, (l) => { if (l !== i.getValue()) { s = !0; const u = i.listSelections(); i.replaceRange(l, i.posFromIndex(0), i.posFromIndex(Number.POSITIVE_INFINITY)), i.setSelections(u) } }, { immediate: !0 }), Zu(() => { Mn.value = void 0 }), lp(i) } async function Nde(e) { let t; hf({ file: e.file.id, line: ((t = e.location) == null ? void 0 : t.line) ?? 0, view: 'editor', test: null, column: null }) } function Ide(e, t) { hf({ file: e, column: t.column - 1, line: t.line, view: 'editor', test: js.value }) } function Pde(e, t) {
  if (!t.location)
    return; const { line: n, column: i, file: s } = t.location; if (e.file.filepath !== s)
    return Ip(s, n, i); hf({ file: e.file.id, column: i - 1, line: n, view: 'editor', test: js.value })
} const ll = lM(); const Ode = U$(ll); const Rde = { class: 'scrolls scrolls-rounded task-error' }; const zde = ['onClickPassive']; const Dde = ['innerHTML']; const Fde = at({ __name: 'ViewReportError', props: { fileId: {}, root: {}, filename: {}, error: {} }, setup(e) { const t = e; function n(f) { return f.startsWith(t.root) ? f.slice(t.root.length) : f } const i = _e(() => Pp(ll.value)); const s = _e(() => { let f; return !!((f = t.error) != null && f.diff) }); const l = _e(() => t.error.diff ? i.value.toHtml(sa(t.error.diff)) : void 0); function u(f) { return _fe(f.file, t.filename) ? Ide(t.fileId, f) : Ip(f.file, f.line, f.column) } return (f, h) => { const p = Dr('tooltip'); return se(), ye('div', Rde, [ne('pre', null, [ne('b', null, Re(f.error.name), 1), dt(`: ${Re(f.error.message)}`, 1)]), (se(!0), ye(nt, null, hr(f.error.stacks, (g, v) => (se(), ye('div', { 'key': v, 'class': 'op80 flex gap-x-2 items-center', 'data-testid': 'stack' }, [ne('pre', null, ` - ${Re(n(g.file))}:${Re(g.line)}:${Re(g.column)}`, 1), ct(ne('div', { 'class': 'i-carbon-launch c-red-600 dark:c-red-400 hover:cursor-pointer min-w-1em min-h-1em', 'tabindex': '0', 'aria-label': 'Open in Editor', 'onClickPassive': y => u(g) }, null, 40, zde), [[p, 'Open in Editor', void 0, { bottom: !0 }]])]))), 128)), j(s) ? (se(), ye('pre', { 'key': 0, 'data-testid': 'diff', 'innerHTML': j(l) }, null, 8, Dde)) : je('', !0)]) } } }); const y1 = ni(Fde, [['__scopeId', 'data-v-ae719fab']]); function b1(e) { let n; const t = (n = e.meta) == null ? void 0 : n.failScreenshotPath; t && fetch(`/__open-in-editor?file=${encodeURIComponent(t)}`) } function w1() { const e = Ue(!1); const t = Ue(Date.now()); const n = Ue(); const i = _e(() => { let f; const l = (f = n.value) == null ? void 0 : f.id; const u = t.value; return l ? `/__screenshot-error?id=${encodeURIComponent(l)}&t=${u}` : void 0 }); function s(l) { n.value = l, t.value = Date.now(), e.value = !0 } return { currentTask: n, showScreenshot: e, currentScreenshotUrl: i, showScreenshotModal: s } } const Hde = { 'h-full': '', 'class': 'scrolls' }; const Bde = { key: 0 }; const Wde = { 'bg': 'red-500/10', 'text': 'red-500 sm', 'p': 'x3 y2', 'm-2': '', 'rounded': '' }; const jde = { flex: '~ gap-2 items-center' }; const qde = { 'key': 0, 'class': 'scrolls scrolls-rounded task-error', 'data-testid': 'task-error' }; const Ude = ['innerHTML']; const Vde = { 'key': 1, 'bg': 'green-500/10', 'text': 'green-500 sm', 'p': 'x4 y2', 'm-2': '', 'rounded': '' }; const Gde = { 'flex': '~ gap-2 items-center justify-between', 'overflow-hidden': '' }; const Xde = { 'class': 'flex gap-2', 'overflow-hidden': '' }; const Kde = { 'class': 'font-bold', 'ws-nowrap': '', 'truncate': '' }; const Jde = ['href', 'download']; const Yde = ['onClick']; const Zde = { 'key': 1, 'class': 'flex gap-1 text-yellow-500/80', 'ws-nowrap': '' }; const Qde = { 'class': 'scrolls scrolls-rounded task-error', 'data-testid': 'task-error' }; const ehe = { 'bg': 'gray/10', 'text': 'black-100 sm', 'p': 'x3 y2', 'm-2': '', 'rounded': '', 'class': 'grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2', 'overflow-hidden': '' }; const the = { 'font-bold': '', 'ws-nowrap': '', 'truncate': '', 'py-2': '' }; const nhe = { 'overflow-auto': '', 'bg': 'gray/30', 'rounded': '', 'p-2': '' }; const rhe = at({ __name: 'ViewTestReport', props: { test: {} }, setup(e) { const t = e; const n = _e(() => { let v; return !t.test.result || !((v = t.test.result.errors) != null && v.length) ? null : r1(ll.value, [t.test])[0] }); function i(v) { return Pde(t.test, v) } const { currentTask: s, showScreenshot: l, showScreenshotModal: u, currentScreenshotUrl: f } = w1(); function h(v) { return `${sx(el.value.root, v.file)}:${v.line}:${v.column}` } const p = new Set(['benchmark', 'typecheck', 'failScreenshotPath']); const g = _e(() => Object.entries(t.test.meta).filter(([v]) => !p.has(v))); return (v, y) => { let O, k, z; const w = ri; const L = y1; const $ = kde; const A = h1; const E = zp; const M = Dr('tooltip'); return se(), ye('div', Hde, [j(n) ? (se(), ye('div', Bde, [ne('div', Wde, [ne('div', jde, [j(Nt) && ((O = v.test.meta) != null && O.failScreenshotPath) ? (se(), ye(nt, { key: 0 }, [ct(Ie(w, { class: '!op-100', icon: 'i-carbon:image', title: 'View screenshot error', onClick: y[0] || (y[0] = D => j(u)(v.test)) }, null, 512), [[M, 'View screenshot error', void 0, { bottom: !0 }]]), ct(Ie(w, { class: '!op-100', icon: 'i-carbon:image-reference', title: 'Open screenshot error in editor', onClick: y[1] || (y[1] = D => j(b1)(v.test)) }, null, 512), [[M, 'Open screenshot error in editor', void 0, { bottom: !0 }]])], 64)) : je('', !0)]), (k = v.test.result) != null && k.htmlError ? (se(), ye('div', qde, [ne('pre', { innerHTML: v.test.result.htmlError }, null, 8, Ude)])) : (z = v.test.result) != null && z.errors ? (se(!0), ye(nt, { key: 1 }, hr(v.test.result.errors, (D, te) => (se(), Ye(L, { 'key': te, 'file-id': v.test.file.id, 'error': D, 'filename': v.test.file.name, 'root': j(el).root }, null, 8, ['file-id', 'error', 'filename', 'root']))), 128)) : je('', !0)])])) : (se(), ye('div', Vde, ' All tests passed in this file ')), v.test.annotations.length ? (se(), ye(nt, { key: 2 }, [y[5] || (y[5] = ne('h1', { 'm-2': '' }, ' Test Annotations ', -1)), (se(!0), ye(nt, null, hr(v.test.annotations, (D) => { let te; return se(), ye('div', { 'key': D.type + D.message, 'bg': 'yellow-500/10', 'text': 'yellow-500 sm', 'p': 'x3 y2', 'm-2': '', 'rounded': '', 'role': 'note' }, [ne('div', Gde, [ne('div', Xde, [ne('span', Kde, Re(D.type), 1), D.attachment && !((te = D.attachment.contentType) != null && te.startsWith('image/')) ? (se(), ye('a', { key: 0, class: 'flex gap-1 items-center text-yellow-500/80 cursor-pointer', href: j(Pu)(D.attachment), download: j(g1)(D.message, D.attachment.contentType) }, y[4] || (y[4] = [ne('span', { class: 'i-carbon:download block' }, null, -1), dt(' Download ')]), 8, Jde)) : je('', !0)]), ne('div', null, [D.location && D.location.file === v.test.file.filepath ? ct((se(), ye('span', { 'key': 0, 'title': 'Open in Editor', 'class': 'flex gap-1 text-yellow-500/80 cursor-pointer', 'ws-nowrap': '', 'onClick': ee => i(D) }, [dt(Re(h(D.location)), 1)], 8, Yde)), [[M, 'Open in Editor', void 0, { bottom: !0 }]]) : D.location && D.location.file !== v.test.file.filepath ? (se(), ye('span', Zde, Re(h(D.location)), 1)) : je('', !0)])]), ne('div', Qde, Re(D.message), 1), Ie($, { annotation: D }, null, 8, ['annotation'])]) }), 128))], 64)) : je('', !0), j(g).length ? (se(), ye(nt, { key: 3 }, [y[6] || (y[6] = ne('h1', { 'm-2': '' }, ' Test Meta ', -1)), ne('div', ehe, [(se(!0), ye(nt, null, hr(j(g), ([D, te]) => (se(), ye(nt, { key: D }, [ne('div', the, Re(D), 1), ne('pre', nhe, Re(te), 1)], 64))), 128))])], 64)) : je('', !0), j(Nt) ? (se(), Ye(E, { 'key': 4, 'modelValue': j(l), 'onUpdate:modelValue': y[3] || (y[3] = D => kt(l) ? l.value = D : null), 'direction': 'right' }, { default: it(() => [j(s) ? (se(), Ye(gp, { key: 0 }, { default: it(() => [Ie(A, { file: j(s).file.filepath, name: j(s).name, url: j(f), onClose: y[2] || (y[2] = D => l.value = !1) }, null, 8, ['file', 'name', 'url'])]), _: 1 })) : je('', !0)]), _: 1 }, 8, ['modelValue'])) : je('', !0)]) } } }); const ihe = ni(rhe, [['__scopeId', 'data-v-efadcc09']]); const ohe = { 'h-full': '', 'class': 'scrolls' }; const she = ['id']; const lhe = { flex: '~ gap-2 items-center' }; const ahe = { 'key': 0, 'class': 'scrolls scrolls-rounded task-error', 'data-testid': 'task-error' }; const che = ['innerHTML']; const uhe = { 'key': 1, 'bg': 'green-500/10', 'text': 'green-500 sm', 'p': 'x4 y2', 'm-2': '', 'rounded': '' }; const fhe = at({ __name: 'ViewReport', props: { file: {} }, setup(e) { const t = e; function n(h, p) { let g; return ((g = h.result) == null ? void 0 : g.state) !== 'fail' ? [] : h.type === 'test' ? [{ ...h, level: p }] : [{ ...h, level: p }, ...h.tasks.flatMap(v => n(v, p + 1))] } const i = _e(() => { let y, w; const h = t.file; const p = ((y = h.tasks) == null ? void 0 : y.flatMap(L => n(L, 0))) ?? []; const g = h.result; if ((w = g == null ? void 0 : g.errors) == null ? void 0 : w[0]) { const L = { id: h.id, file: h, name: h.name, level: 0, type: 'suite', mode: 'run', meta: {}, tasks: [], result: g }; p.unshift(L) } return p.length > 0 ? r1(ll.value, p) : p }); const { currentTask: s, showScreenshot: l, showScreenshotModal: u, currentScreenshotUrl: f } = w1(); return (h, p) => { const g = ri; const v = y1; const y = h1; const w = zp; const L = Dr('tooltip'); return se(), ye('div', ohe, [j(i).length ? (se(!0), ye(nt, { key: 0 }, hr(j(i), ($) => { let A, E, M, O; return se(), ye('div', { id: $.id, key: $.id }, [ne('div', { 'bg': 'red-500/10', 'text': 'red-500 sm', 'p': 'x3 y2', 'm-2': '', 'rounded': '', 'style': nn({ 'margin-left': `${(A = $.result) != null && A.htmlError ? 0.5 : 2 * $.level + 0.5}rem` }) }, [ne('div', lhe, [ne('span', null, Re($.name), 1), j(Nt) && ((E = $.meta) != null && E.failScreenshotPath) ? (se(), ye(nt, { key: 0 }, [ct(Ie(g, { class: '!op-100', icon: 'i-carbon:image', title: 'View screenshot error', onClick: k => j(u)($) }, null, 8, ['onClick']), [[L, 'View screenshot error', void 0, { bottom: !0 }]]), ct(Ie(g, { class: '!op-100', icon: 'i-carbon:image-reference', title: 'Open screenshot error in editor', onClick: k => j(b1)($) }, null, 8, ['onClick']), [[L, 'Open screenshot error in editor', void 0, { bottom: !0 }]])], 64)) : je('', !0)]), (M = $.result) != null && M.htmlError ? (se(), ye('div', ahe, [ne('pre', { innerHTML: $.result.htmlError }, null, 8, che)])) : (O = $.result) != null && O.errors ? (se(!0), ye(nt, { key: 1 }, hr($.result.errors, (k, z) => (se(), Ye(v, { 'key': z, 'error': k, 'filename': h.file.name, 'root': j(el).root, 'file-id': h.file.id }, null, 8, ['error', 'filename', 'root', 'file-id']))), 128)) : je('', !0)], 4)], 8, she) }), 128)) : (se(), ye('div', uhe, ' All tests passed in this file ')), j(Nt) ? (se(), Ye(w, { 'key': 2, 'modelValue': j(l), 'onUpdate:modelValue': p[1] || (p[1] = $ => kt(l) ? l.value = $ : null), 'direction': 'right' }, { default: it(() => [j(s) ? (se(), Ye(gp, { key: 0 }, { default: it(() => [Ie(y, { file: j(s).file.filepath, name: j(s).name, url: j(f), onClose: p[0] || (p[0] = $ => l.value = !1) }, null, 8, ['file', 'name', 'url'])]), _: 1 })) : je('', !0)]), _: 1 }, 8, ['modelValue'])) : je('', !0)]) } } }); const dhe = ni(fhe, [['__scopeId', 'data-v-d1b5950e']]); const hhe = { 'border': 'b base', 'p-4': '' }; const phe = ['innerHTML']; const ghe = at({ __name: 'ViewConsoleOutputEntry', props: { taskName: {}, type: {}, time: {}, content: {} }, setup(e) { function t(n) { return new Date(n).toLocaleTimeString() } return (n, i) => (se(), ye('div', hhe, [ne('div', { 'text-xs': '', 'mb-1': '', 'class': ot(n.type === 'stderr' ? 'text-red-600 dark:text-red-300' : 'op30') }, `${Re(t(n.time))} | ${Re(n.taskName)} | ${Re(n.type)}`, 3), ne('pre', { 'data-type': 'html', 'innerHTML': n.content }, null, 8, phe)])) } }); const mhe = { 'key': 0, 'h-full': '', 'class': 'scrolls', 'flex': '', 'flex-col': '', 'data-testid': 'logs' }; const vhe = { key: 1, p6: '' }; const yhe = at({ __name: 'ViewConsoleOutput', setup(e) { const t = _e(() => { const i = f1.value; if (i) { const s = Pp(ll.value); return i.map(({ taskId: l, type: u, time: f, content: h }) => ({ taskId: l, type: u, time: f, content: s.toHtml(sa(h)) })) } }); function n(i) { const s = i && ht.state.idMap.get(i); return s && 'filepath' in s ? s.name : (s ? h$(s).slice(1).join(' > ') : '-') || '-' } return (i, s) => { let u; const l = ghe; return (u = j(t)) != null && u.length ? (se(), ye('div', mhe, [(se(!0), ye(nt, null, hr(j(t), ({ taskId: f, type: h, time: p, content: g }) => (se(), ye('div', { 'key': f, 'font-mono': '' }, [Ie(l, { 'task-name': n(f), 'type': h, 'time': p, 'content': g }, null, 8, ['task-name', 'type', 'time', 'content'])]))), 128))])) : (se(), ye('div', vhe, s[0] || (s[0] = [dt(' Log something in your test and it would print here. (e.g. '), ne('pre', { inline: '' }, 'console.log(foo)', -1), dt(') ')]))) } } }); const x1 = at({ __name: 'CodeMirrorContainer', props: pa({ mode: {}, readOnly: { type: Boolean }, saving: { type: Boolean } }, { modelValue: {}, modelModifiers: {} }), emits: pa(['save'], ['update:modelValue']), setup(e, { emit: t }) { const n = t; const i = ef(e, 'modelValue'); const s = OT(); const l = { js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: { name: 'javascript', typescript: !0 }, mts: { name: 'javascript', typescript: !0 }, cts: { name: 'javascript', typescript: !0 }, jsx: { name: 'javascript', jsx: !0 }, tsx: { name: 'javascript', typescript: !0, jsx: !0 } }; const u = Ue(); return bo(async () => { const f = Mde(u, i, { ...s, mode: l[e.mode || ''] || e.mode, readOnly: e.readOnly ? !0 : void 0, extraKeys: { 'Cmd-S': function (h) { h.getOption('readOnly') || n('save', h.getValue()) }, 'Ctrl-S': function (h) { h.getOption('readOnly') || n('save', h.getValue()) } } }); f.setSize('100%', '100%'), f.clearHistory(), Mn.value = f, setTimeout(() => Mn.value.refresh(), 100) }), (f, h) => (se(), ye('div', { 'relative': '', 'font-mono': '', 'text-sm': '', 'class': ot(['codemirror-scrolls', f.saving ? 'codemirror-busy' : void 0]) }, [ne('textarea', { ref_key: 'el', ref: u }, null, 512)], 2)) } }); const bhe = at({ __name: 'ViewEditor', props: { file: {} }, emits: ['draft'], setup(e, { emit: t }) {
  const n = e; const i = t; const s = Ue(''); const l = rn(void 0); const u = Ue(!1); const f = Ue(!0); const h = Ue(!1); const p = Ue(); St(() => n.file, async () => {
    let W; if (!h.value) {
      f.value = !0; try { if (!n.file || !((W = n.file) != null && W.filepath)) { s.value = '', l.value = s.value, u.value = !1, f.value = !1; return }s.value = await ht.rpc.readTestFile(n.file.filepath) || '', l.value = s.value, u.value = !1 }
      catch (q) { console.error('cannot fetch file', q) } await Et(), f.value = !1
    }
  }, { immediate: !0 }), St(() => [f.value, h.value, n.file, Jx.value, Yx.value], ([W, q, K, C, P]) => { !W && !q && (C != null ? Et(() => { let R; const I = p.value; const S = I ?? { line: (C ?? 1) - 1, ch: P ?? 0 }; I ? p.value = void 0 : ((R = Mn.value) == null || R.scrollIntoView(S, 100), Et(() => { let B, oe; (B = Mn.value) == null || B.focus(), (oe = Mn.value) == null || oe.setCursor(S) })) }) : Et(() => { let I; (I = Mn.value) == null || I.focus() })) }, { flush: 'post' }); const g = _e(() => { let W, q; return ((q = (W = n.file) == null ? void 0 : W.filepath) == null ? void 0 : q.split(/\./g).pop()) || 'js' }); const v = Ue(); const y = _e(() => { let K; const W = []; function q(C) { let P; (P = C.result) != null && P.errors && W.push(...C.result.errors), C.type === 'suite' && C.tasks.forEach(q) } return (K = n.file) == null || K.tasks.forEach(q), W }); const w = _e(() => { let K; const W = []; function q(C) { C.type === 'test' && W.push(...C.annotations), C.type === 'suite' && C.tasks.forEach(q) } return (K = n.file) == null || K.tasks.forEach(q), W }); const L = []; const $ = []; const A = []; const E = Ue(!1); function M() { A.forEach(([W, q, K]) => { W.removeEventListener('click', q), K() }), A.length = 0 }zx(v, () => { let W; (W = Mn.value) == null || W.refresh() }); function O() { u.value = l.value !== Mn.value.getValue() }St(u, (W) => { i('draft', W) }, { immediate: !0 }); function k(W) {
    const q = ((W == null ? void 0 : W.stacks) || []).filter((R) => { let B; return R.file && R.file === ((B = n.file) == null ? void 0 : B.filepath) }); const K = q == null ? void 0 : q[0]; if (!K)
      return; const C = document.createElement('div'); C.className = 'op80 flex gap-x-2 items-center'; const P = document.createElement('pre'); P.className = 'c-red-600 dark:c-red-400', P.textContent = `${' '.repeat(K.column)}^ ${W.name}: ${(W == null ? void 0 : W.message) || ''}`, C.appendChild(P); const I = document.createElement('span'); I.className = 'i-carbon-launch c-red-600 dark:c-red-400 hover:cursor-pointer min-w-1em min-h-1em', I.tabIndex = 0, I.ariaLabel = 'Open in Editor', jw(I, { content: 'Open in Editor', placement: 'bottom' }, !1); const S = async () => { await Ip(K.file, K.line, K.column) }; I.addEventListener('click', S), C.appendChild(I), A.push([I, S, () => xp(I)]), $.push(Mn.value.addLineClass(K.line - 1, 'wrap', 'bg-red-500/10')), L.push(Mn.value.addLineWidget(K.line - 1, C))
  } function z(W) {
    let B, oe; if (!W.location)
      return; const { line: q, file: K } = W.location; if (K !== ((B = n.file) == null ? void 0 : B.filepath))
      return; const C = document.createElement('div'); C.classList.add('wrap', 'bg-active', 'py-3', 'px-6', 'my-1'), C.role = 'note'; const P = document.createElement('div'); P.classList.add('block', 'text-black', 'dark:text-white'); const I = document.createElement('span'); I.textContent = `${W.type}: `, I.classList.add('font-bold'); const S = document.createElement('span'); S.classList.add('whitespace-pre'), S.textContent = W.message.replace(/[^\r]\n/, `\r
`), P.append(I, S), C.append(P); const R = W.attachment; if (R != null && R.path || R != null && R.body) {
      if ((oe = R.contentType) != null && oe.startsWith('image/')) { const ue = document.createElement('a'); const we = document.createElement('img'); ue.classList.add('inline-block', 'mt-3'), ue.style.maxWidth = '50vw'; const Pe = R.path || R.body; typeof Pe == 'string' && (Pe.startsWith('http://') || Pe.startsWith('https://')) ? (we.setAttribute('src', Pe), ue.referrerPolicy = 'no-referrer') : we.setAttribute('src', Pu(R)), ue.target = '_blank', ue.href = we.src, ue.append(we), C.append(ue) }
      else { const ue = document.createElement('a'); ue.href = Pu(R), ue.download = g1(W.message, R.contentType), ue.classList.add('flex', 'w-min', 'gap-2', 'items-center', 'font-sans', 'underline', 'cursor-pointer'); const we = document.createElement('div'); we.classList.add('i-carbon:download', 'block'); const Pe = document.createElement('span'); Pe.textContent = 'Download', ue.append(we, Pe), C.append(ue) }
    }L.push(Mn.value.addLineWidget(q - 1, C))
  } const { pause: D, resume: te } = St([Mn, y, w, $s], ([W, q, K, C]) => { if (!W) { L.length = 0, $.length = 0, M(); return }C && (W.off('changes', O), M(), L.forEach(P => P.clear()), $.forEach(P => W == null ? void 0 : W.removeLineClass(P, 'wrap')), L.length = 0, $.length = 0, setTimeout(() => { q.forEach(k), K.forEach(z), E.value || W.clearHistory(), W.on('changes', O) }, 100)) }, { flush: 'post' }); Lp(() => [$s.value, h.value, p.value], ([W, q], K) => { let C; W && !q && K && K[2] && ((C = Mn.value) == null || C.setCursor(K[2])) }, { debounce: 100, flush: 'post' }); async function ee(W) {
    if (h.value)
      return; D(), h.value = !0, await Et(); const q = Mn.value; q && (q.setOption('readOnly', !0), await Et(), q.refresh()), p.value = q == null ? void 0 : q.getCursor(), q == null || q.off('changes', O), M(), L.forEach(K => K.clear()), $.forEach(K => q == null ? void 0 : q.removeLineClass(K, 'wrap')), L.length = 0, $.length = 0; try { E.value = !0, await ht.rpc.saveTestFile(n.file.filepath, W), l.value = W, u.value = !1 }
    catch (K) { console.error('error saving file', K) }E.value || q == null || q.clearHistory(); try { await R0($s).toBe(!1, { flush: 'sync', timeout: 1e3, throwOnTimeout: !0 }), await R0($s).toBe(!0, { flush: 'sync', timeout: 1e3, throwOnTimeout: !1 }) }
    catch {}y.value.forEach(k), w.value.forEach(z), q == null || q.on('changes', O), h.value = !1, await Et(), q && (q.setOption('readOnly', !1), await Et(), q.refresh()), te()
  } return Fa(M), (W, q) => { const K = x1; return se(), Ye(K, _i({ 'ref_key': 'editor', 'ref': v, 'modelValue': j(s), 'onUpdate:modelValue': q[0] || (q[0] = C => kt(s) ? s.value = C : null), 'h-full': '' }, { lineNumbers: !0, readOnly: j(pr), saving: j(h) }, { 'mode': j(g), 'data-testid': 'code-mirror', 'onSave': ee }), null, 16, ['modelValue', 'mode']) }
} }); const whe = { 'w-350': '', 'max-w-screen': '', 'h-full': '', 'flex': '', 'flex-col': '' }; const xhe = { 'p-4': '', 'relative': '' }; const She = { 'op50': '', 'font-mono': '', 'text-sm': '' }; const _he = { 'key': 0, 'p-5': '' }; const khe = { 'grid': '~ cols-2 rows-[min-content_auto]', 'overflow-hidden': '', 'flex-auto': '' }; const The = { key: 0 }; const Che = { 'p': 'x3 y-1', 'bg-overlay': '', 'border': 'base b t' }; const Ehe = at({ __name: 'ModuleTransformResultView', props: { id: {}, projectName: {} }, emits: ['close'], setup(e, { emit: t }) { const n = e; const i = t; const s = X$(() => ht.rpc.getTransformResult(n.projectName, n.id, !!Nt)); const l = _e(() => { let p; return ((p = n.id) == null ? void 0 : p.split(/\./g).pop()) || 'js' }); const u = _e(() => { let p, g; return ((g = (p = s.value) == null ? void 0 : p.source) == null ? void 0 : g.trim()) || '' }); const f = _e(() => { let p, g; return ((g = (p = s.value) == null ? void 0 : p.code) == null ? void 0 : g.replace(/\/\/# sourceMappingURL=.*\n/, '').trim()) || '' }); const h = _e(() => { let p, g, v, y; return { mappings: ((g = (p = s.value) == null ? void 0 : p.map) == null ? void 0 : g.mappings) ?? '', version: (y = (v = s.value) == null ? void 0 : v.map) == null ? void 0 : y.version } }); return Ix('Escape', () => { i('close') }), (p, g) => { const v = ri; const y = x1; return se(), ye('div', whe, [ne('div', xhe, [g[1] || (g[1] = ne('p', null, 'Module Info', -1)), ne('p', She, Re(p.id), 1), Ie(v, { 'icon': 'i-carbon-close', 'absolute': '', 'top-5px': '', 'right-5px': '', 'text-2xl': '', 'onClick': g[0] || (g[0] = w => i('close')) })]), j(s) ? (se(), ye(nt, { key: 1 }, [ne('div', khe, [g[2] || (g[2] = ne('div', { 'p': 'x3 y-1', 'bg-overlay': '', 'border': 'base b t r' }, ' Source ', -1)), g[3] || (g[3] = ne('div', { 'p': 'x3 y-1', 'bg-overlay': '', 'border': 'base b t' }, ' Transformed ', -1)), Ie(y, _i({ 'h-full': '', 'model-value': j(u), 'read-only': '' }, { lineNumbers: !0 }, { mode: j(l) }), null, 16, ['model-value', 'mode']), Ie(y, _i({ 'h-full': '', 'model-value': j(f), 'read-only': '' }, { lineNumbers: !0 }, { mode: j(l) }), null, 16, ['model-value', 'mode'])]), j(h).mappings !== '' ? (se(), ye('div', The, [ne('div', Che, ` Source map (v${Re(j(h).version)}) `, 1), Ie(y, _i({ 'model-value': j(h).mappings, 'read-only': '' }, { lineNumbers: !0 }, { mode: j(l) }), null, 16, ['model-value', 'mode'])])) : je('', !0)], 64)) : (se(), ye('div', _he, ' No transform result found for this module. '))]) } } }); function Ahe(e, t) { let n; return (...i) => { n !== void 0 && clearTimeout(n), n = setTimeout(() => e(...i), t) } } const Nh = 'http://www.w3.org/1999/xhtml'; const ay = { svg: 'http://www.w3.org/2000/svg', xhtml: Nh, xlink: 'http://www.w3.org/1999/xlink', xml: 'http://www.w3.org/XML/1998/namespace', xmlns: 'http://www.w3.org/2000/xmlns/' }; function pf(e) { let t = e += ''; const n = t.indexOf(':'); return n >= 0 && (t = e.slice(0, n)) !== 'xmlns' && (e = e.slice(n + 1)), ay.hasOwnProperty(t) ? { space: ay[t], local: e } : e } function Lhe(e) { return function () { const t = this.ownerDocument; const n = this.namespaceURI; return n === Nh && t.documentElement.namespaceURI === Nh ? t.createElement(e) : t.createElementNS(n, e) } } function $he(e) { return function () { return this.ownerDocument.createElementNS(e.space, e.local) } } function S1(e) { const t = pf(e); return (t.local ? $he : Lhe)(t) } function Mhe() {} function Dp(e) { return e == null ? Mhe : function () { return this.querySelector(e) } } function Nhe(e) {
  typeof e != 'function' && (e = Dp(e)); for (var t = this._groups, n = t.length, i = new Array(n), s = 0; s < n; ++s) {
    for (var l = t[s], u = l.length, f = i[s] = new Array(u), h, p, g = 0; g < u; ++g)(h = l[g]) && (p = e.call(h, h.__data__, g, l)) && ('__data__' in h && (p.__data__ = h.__data__), f[g] = p)
  } return new or(i, this._parents)
} function Ihe(e) { return e == null ? [] : Array.isArray(e) ? e : Array.from(e) } function Phe() { return [] } function _1(e) { return e == null ? Phe : function () { return this.querySelectorAll(e) } } function Ohe(e) { return function () { return Ihe(e.apply(this, arguments)) } } function Rhe(e) {
  typeof e == 'function' ? e = Ohe(e) : e = _1(e); for (var t = this._groups, n = t.length, i = [], s = [], l = 0; l < n; ++l) {
    for (var u = t[l], f = u.length, h, p = 0; p < f; ++p)(h = u[p]) && (i.push(e.call(h, h.__data__, p, u)), s.push(h))
  } return new or(i, s)
} function k1(e) { return function () { return this.matches(e) } } function T1(e) { return function (t) { return t.matches(e) } } const zhe = Array.prototype.find; function Dhe(e) { return function () { return zhe.call(this.children, e) } } function Fhe() { return this.firstElementChild } function Hhe(e) { return this.select(e == null ? Fhe : Dhe(typeof e == 'function' ? e : T1(e))) } const Bhe = Array.prototype.filter; function Whe() { return Array.from(this.children) } function jhe(e) { return function () { return Bhe.call(this.children, e) } } function qhe(e) { return this.selectAll(e == null ? Whe : jhe(typeof e == 'function' ? e : T1(e))) } function Uhe(e) {
  typeof e != 'function' && (e = k1(e)); for (var t = this._groups, n = t.length, i = new Array(n), s = 0; s < n; ++s) {
    for (var l = t[s], u = l.length, f = i[s] = [], h, p = 0; p < u; ++p)(h = l[p]) && e.call(h, h.__data__, p, l) && f.push(h)
  } return new or(i, this._parents)
} function C1(e) { return Array.from({ length: e.length }) } function Vhe() { return new or(this._enter || this._groups.map(C1), this._parents) } function Ou(e, t) { this.ownerDocument = e.ownerDocument, this.namespaceURI = e.namespaceURI, this._next = null, this._parent = e, this.__data__ = t }Ou.prototype = { constructor: Ou, appendChild(e) { return this._parent.insertBefore(e, this._next) }, insertBefore(e, t) { return this._parent.insertBefore(e, t) }, querySelector(e) { return this._parent.querySelector(e) }, querySelectorAll(e) { return this._parent.querySelectorAll(e) } }; function Ghe(e) { return function () { return e } } function Xhe(e, t, n, i, s, l) { for (var u = 0, f, h = t.length, p = l.length; u < p; ++u)(f = t[u]) ? (f.__data__ = l[u], i[u] = f) : n[u] = new Ou(e, l[u]); for (;u < h; ++u)(f = t[u]) && (s[u] = f) } function Khe(e, t, n, i, s, l, u) { let f; let h; const p = new Map(); const g = t.length; const v = l.length; const y = new Array(g); let w; for (f = 0; f < g; ++f)(h = t[f]) && (y[f] = w = `${u.call(h, h.__data__, f, t)}`, p.has(w) ? s[f] = h : p.set(w, h)); for (f = 0; f < v; ++f)w = `${u.call(e, l[f], f, l)}`, (h = p.get(w)) ? (i[f] = h, h.__data__ = l[f], p.delete(w)) : n[f] = new Ou(e, l[f]); for (f = 0; f < g; ++f)(h = t[f]) && p.get(y[f]) === h && (s[f] = h) } function Jhe(e) { return e.__data__ } function Yhe(e, t) {
  if (!arguments.length)
    return Array.from(this, Jhe); const n = t ? Khe : Xhe; const i = this._parents; const s = this._groups; typeof e != 'function' && (e = Ghe(e)); for (var l = s.length, u = new Array(l), f = new Array(l), h = new Array(l), p = 0; p < l; ++p) {
    const g = i[p]; const v = s[p]; const y = v.length; const w = Zhe(e.call(g, g && g.__data__, p, i)); const L = w.length; const $ = f[p] = new Array(L); const A = u[p] = new Array(L); const E = h[p] = new Array(y); n(g, v, $, A, E, w, t); for (var M = 0, O = 0, k, z; M < L; ++M) {
      if (k = $[M]) { for (M >= O && (O = M + 1); !(z = A[O]) && ++O < L;);k._next = z || null }
    }
  } return u = new or(u, i), u._enter = f, u._exit = h, u
} function Zhe(e) { return typeof e == 'object' && 'length' in e ? e : Array.from(e) } function Qhe() { return new or(this._exit || this._groups.map(C1), this._parents) } function epe(e, t, n) { let i = this.enter(); let s = this; const l = this.exit(); return typeof e == 'function' ? (i = e(i), i && (i = i.selection())) : i = i.append(`${e}`), t != null && (s = t(s), s && (s = s.selection())), n == null ? l.remove() : n(l), i && s ? i.merge(s).order() : s } function tpe(e) {
  for (var t = e.selection ? e.selection() : e, n = this._groups, i = t._groups, s = n.length, l = i.length, u = Math.min(s, l), f = new Array(s), h = 0; h < u; ++h) {
    for (var p = n[h], g = i[h], v = p.length, y = f[h] = new Array(v), w, L = 0; L < v; ++L)(w = p[L] || g[L]) && (y[L] = w)
  } for (;h < s; ++h)f[h] = n[h]; return new or(f, this._parents)
} function npe() {
  for (let e = this._groups, t = -1, n = e.length; ++t < n;) {
    for (var i = e[t], s = i.length - 1, l = i[s], u; --s >= 0;)(u = i[s]) && (l && u.compareDocumentPosition(l) ^ 4 && l.parentNode.insertBefore(u, l), l = u)
  } return this
} function rpe(e) { e || (e = ipe); function t(v, y) { return v && y ? e(v.__data__, y.__data__) : !v - !y } for (var n = this._groups, i = n.length, s = new Array(i), l = 0; l < i; ++l) { for (var u = n[l], f = u.length, h = s[l] = new Array(f), p, g = 0; g < f; ++g)(p = u[g]) && (h[g] = p); h.sort(t) } return new or(s, this._parents).order() } function ipe(e, t) { return e < t ? -1 : e > t ? 1 : e >= t ? 0 : Number.NaN } function ope() { const e = arguments[0]; return arguments[0] = this, e.apply(null, arguments), this } function spe() { return Array.from(this) } function lpe() {
  for (let e = this._groups, t = 0, n = e.length; t < n; ++t) {
    for (let i = e[t], s = 0, l = i.length; s < l; ++s) {
      const u = i[s]; if (u)
        return u
    }
  } return null
} function ape() { let e = 0; for (const t of this)++e; return e } function cpe() { return !this.node() } function upe(e) {
  for (let t = this._groups, n = 0, i = t.length; n < i; ++n) {
    for (var s = t[n], l = 0, u = s.length, f; l < u; ++l)(f = s[l]) && e.call(f, f.__data__, l, s)
  } return this
} function fpe(e) { return function () { this.removeAttribute(e) } } function dpe(e) { return function () { this.removeAttributeNS(e.space, e.local) } } function hpe(e, t) { return function () { this.setAttribute(e, t) } } function ppe(e, t) { return function () { this.setAttributeNS(e.space, e.local, t) } } function gpe(e, t) { return function () { const n = t.apply(this, arguments); n == null ? this.removeAttribute(e) : this.setAttribute(e, n) } } function mpe(e, t) { return function () { const n = t.apply(this, arguments); n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n) } } function vpe(e, t) { const n = pf(e); if (arguments.length < 2) { const i = this.node(); return n.local ? i.getAttributeNS(n.space, n.local) : i.getAttribute(n) } return this.each((t == null ? n.local ? dpe : fpe : typeof t == 'function' ? n.local ? mpe : gpe : n.local ? ppe : hpe)(n, t)) } function E1(e) { return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView } function ype(e) { return function () { this.style.removeProperty(e) } } function bpe(e, t, n) { return function () { this.style.setProperty(e, t, n) } } function wpe(e, t, n) { return function () { const i = t.apply(this, arguments); i == null ? this.style.removeProperty(e) : this.style.setProperty(e, i, n) } } function xpe(e, t, n) { return arguments.length > 1 ? this.each((t == null ? ype : typeof t == 'function' ? wpe : bpe)(e, t, n ?? '')) : tl(this.node(), e) } function tl(e, t) { return e.style.getPropertyValue(t) || E1(e).getComputedStyle(e, null).getPropertyValue(t) } function Spe(e) { return function () { delete this[e] } } function _pe(e, t) { return function () { this[e] = t } } function kpe(e, t) { return function () { const n = t.apply(this, arguments); n == null ? delete this[e] : this[e] = n } } function Tpe(e, t) { return arguments.length > 1 ? this.each((t == null ? Spe : typeof t == 'function' ? kpe : _pe)(e, t)) : this.node()[e] } function A1(e) { return e.trim().split(/^|\s+/) } function Fp(e) { return e.classList || new L1(e) } function L1(e) { this._node = e, this._names = A1(e.getAttribute('class') || '') }L1.prototype = { add(e) { const t = this._names.indexOf(e); t < 0 && (this._names.push(e), this._node.setAttribute('class', this._names.join(' '))) }, remove(e) { const t = this._names.indexOf(e); t >= 0 && (this._names.splice(t, 1), this._node.setAttribute('class', this._names.join(' '))) }, contains(e) { return this._names.includes(e) } }; function $1(e, t) { for (let n = Fp(e), i = -1, s = t.length; ++i < s;)n.add(t[i]) } function M1(e, t) { for (let n = Fp(e), i = -1, s = t.length; ++i < s;)n.remove(t[i]) } function Cpe(e) { return function () { $1(this, e) } } function Epe(e) { return function () { M1(this, e) } } function Ape(e, t) { return function () { (t.apply(this, arguments) ? $1 : M1)(this, e) } } function Lpe(e, t) {
  const n = A1(`${e}`); if (arguments.length < 2) {
    for (let i = Fp(this.node()), s = -1, l = n.length; ++s < l;) {
      if (!i.contains(n[s]))
        return !1
    } return !0
  } return this.each((typeof t == 'function' ? Ape : t ? Cpe : Epe)(n, t))
} function $pe() { this.textContent = '' } function Mpe(e) { return function () { this.textContent = e } } function Npe(e) { return function () { const t = e.apply(this, arguments); this.textContent = t ?? '' } } function Ipe(e) { return arguments.length ? this.each(e == null ? $pe : (typeof e == 'function' ? Npe : Mpe)(e)) : this.node().textContent } function Ppe() { this.innerHTML = '' } function Ope(e) { return function () { this.innerHTML = e } } function Rpe(e) { return function () { const t = e.apply(this, arguments); this.innerHTML = t ?? '' } } function zpe(e) { return arguments.length ? this.each(e == null ? Ppe : (typeof e == 'function' ? Rpe : Ope)(e)) : this.node().innerHTML } function Dpe() { this.nextSibling && this.parentNode.appendChild(this) } function Fpe() { return this.each(Dpe) } function Hpe() { this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild) } function Bpe() { return this.each(Hpe) } function Wpe(e) { const t = typeof e == 'function' ? e : S1(e); return this.select(function () { return this.appendChild(t.apply(this, arguments)) }) } function jpe() { return null } function qpe(e, t) { const n = typeof e == 'function' ? e : S1(e); const i = t == null ? jpe : typeof t == 'function' ? t : Dp(t); return this.select(function () { return this.insertBefore(n.apply(this, arguments), i.apply(this, arguments) || null) }) } function Upe() { const e = this.parentNode; e && e.removeChild(this) } function Vpe() { return this.each(Upe) } function Gpe() { const e = this.cloneNode(!1); const t = this.parentNode; return t ? t.insertBefore(e, this.nextSibling) : e } function Xpe() { const e = this.cloneNode(!0); const t = this.parentNode; return t ? t.insertBefore(e, this.nextSibling) : e } function Kpe(e) { return this.select(e ? Xpe : Gpe) } function Jpe(e) { return arguments.length ? this.property('__data__', e) : this.node().__data__ } function Ype(e) { return function (t) { e.call(this, t, this.__data__) } } function Zpe(e) { return e.trim().split(/^|\s+/).map((t) => { let n = ''; const i = t.indexOf('.'); return i >= 0 && (n = t.slice(i + 1), t = t.slice(0, i)), { type: t, name: n } }) } function Qpe(e) { return function () { const t = this.__on; if (t) { for (var n = 0, i = -1, s = t.length, l; n < s; ++n)l = t[n], (!e.type || l.type === e.type) && l.name === e.name ? this.removeEventListener(l.type, l.listener, l.options) : t[++i] = l; ++i ? t.length = i : delete this.__on } } } function ege(e, t, n) {
  return function () {
    const i = this.__on; let s; const l = Ype(t); if (i) {
      for (let u = 0, f = i.length; u < f; ++u) {
        if ((s = i[u]).type === e.type && s.name === e.name) { this.removeEventListener(s.type, s.listener, s.options), this.addEventListener(s.type, s.listener = l, s.options = n), s.value = t; return }
      }
    } this.addEventListener(e.type, l, n), s = { type: e.type, name: e.name, value: t, listener: l, options: n }, i ? i.push(s) : this.__on = [s]
  }
} function tge(e, t, n) {
  const i = Zpe(`${e}`); let s; const l = i.length; let u; if (arguments.length < 2) {
    var f = this.node().__on; if (f) {
      for (var h = 0, p = f.length, g; h < p; ++h) {
        for (s = 0, g = f[h]; s < l; ++s) {
          if ((u = i[s]).type === g.type && u.name === g.name)
            return g.value
        }
      }
    } return
  } for (f = t ? ege : Qpe, s = 0; s < l; ++s) this.each(f(i[s], t, n)); return this
} function N1(e, t, n) { const i = E1(e); let s = i.CustomEvent; typeof s == 'function' ? s = new s(t, n) : (s = i.document.createEvent('Event'), n ? (s.initEvent(t, n.bubbles, n.cancelable), s.detail = n.detail) : s.initEvent(t, !1, !1)), e.dispatchEvent(s) } function nge(e, t) { return function () { return N1(this, e, t) } } function rge(e, t) { return function () { return N1(this, e, t.apply(this, arguments)) } } function ige(e, t) { return this.each((typeof t == 'function' ? rge : nge)(e, t)) } function* oge() {
  for (let e = this._groups, t = 0, n = e.length; t < n; ++t) {
    for (var i = e[t], s = 0, l = i.length, u; s < l; ++s)(u = i[s]) && (yield u)
  }
} const I1 = [null]; function or(e, t) { this._groups = e, this._parents = t } function Xa() { return new or([[document.documentElement]], I1) } function sge() { return this }or.prototype = Xa.prototype = { constructor: or, select: Nhe, selectAll: Rhe, selectChild: Hhe, selectChildren: qhe, filter: Uhe, data: Yhe, enter: Vhe, exit: Qhe, join: epe, merge: tpe, selection: sge, order: npe, sort: rpe, call: ope, nodes: spe, node: lpe, size: ape, empty: cpe, each: upe, attr: vpe, style: xpe, property: Tpe, classed: Lpe, text: Ipe, html: zpe, raise: Fpe, lower: Bpe, append: Wpe, insert: qpe, remove: Vpe, clone: Kpe, datum: Jpe, on: tge, dispatch: ige, [Symbol.iterator]: oge }; function Gn(e) { return typeof e == 'string' ? new or([[document.querySelector(e)]], [document.documentElement]) : new or([[e]], I1) } function lge(e) { let t; for (;t = e.sourceEvent;)e = t; return e } function bi(e, t) { if (e = lge(e), t === void 0 && (t = e.currentTarget), t) { const n = t.ownerSVGElement || t; if (n.createSVGPoint) { let i = n.createSVGPoint(); return i.x = e.clientX, i.y = e.clientY, i = i.matrixTransform(t.getScreenCTM().inverse()), [i.x, i.y] } if (t.getBoundingClientRect) { const s = t.getBoundingClientRect(); return [e.clientX - s.left - t.clientLeft, e.clientY - s.top - t.clientTop] } } return [e.pageX, e.pageY] } const age = Object.defineProperty; const cge = (e, t, n) => t in e ? age(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n; const cy = (e, t, n) => cge(e, typeof t != 'symbol' ? `${t}` : t, n); class Nn {constructor(t, n) { cy(this, 'x'), cy(this, 'y'), this.x = t, this.y = n } static of([t, n]) { return new Nn(t, n) }add(t) { return new Nn(this.x + t.x, this.y + t.y) }subtract(t) { return new Nn(this.x - t.x, this.y - t.y) }multiply(t) { return new Nn(this.x * t, this.y * t) }divide(t) { return new Nn(this.x / t, this.y / t) }dot(t) { return this.x * t.x + this.y * t.y }cross(t) { return this.x * t.y - t.x * this.y }hadamard(t) { return new Nn(this.x * t.x, this.y * t.y) }length() { return Math.sqrt(this.x ** 2 + this.y ** 2) }normalize() { const t = this.length(); return new Nn(this.x / t, this.y / t) }rotateByRadians(t) { const n = Math.cos(t); const i = Math.sin(t); return new Nn(this.x * n - this.y * i, this.x * i + this.y * n) }rotateByDegrees(t) { return this.rotateByRadians(t * Math.PI / 180) }} const uge = { value: () => {} }; function Ka() {
  for (var e = 0, t = arguments.length, n = {}, i; e < t; ++e) {
    if (!(i = `${arguments[e]}`) || i in n || /[\s.]/.test(i))
      throw new Error(`illegal type: ${i}`); n[i] = []
  } return new ru(n)
} function ru(e) { this._ = e } function fge(e, t) {
  return e.trim().split(/^|\s+/).map((n) => {
    let i = ''; const s = n.indexOf('.'); if (s >= 0 && (i = n.slice(s + 1), n = n.slice(0, s)), n && !t.hasOwnProperty(n))
      throw new Error(`unknown type: ${n}`); return { type: n, name: i }
  })
}ru.prototype = Ka.prototype = { constructor: ru, on(e, t) {
  const n = this._; const i = fge(`${e}`, n); let s; let l = -1; const u = i.length; if (arguments.length < 2) {
    for (;++l < u;) {
      if ((s = (e = i[l]).type) && (s = dge(n[s], e.name)))
        return s
    } return
  } if (t != null && typeof t != 'function')
    throw new Error(`invalid callback: ${t}`); for (;++l < u;) {
    if (s = (e = i[l]).type) {
      n[s] = uy(n[s], e.name, t)
    }
    else if (t == null) {
      for (s in n)n[s] = uy(n[s], e.name, null)
    }
  } return this
}, copy() { const e = {}; const t = this._; for (const n in t)e[n] = t[n].slice(); return new ru(e) }, call(e, t) {
  if ((s = arguments.length - 2) > 0) {
    for (var n = new Array(s), i = 0, s, l; i < s; ++i)n[i] = arguments[i + 2]
  } if (!this._.hasOwnProperty(e))
    throw new Error(`unknown type: ${e}`); for (l = this._[e], i = 0, s = l.length; i < s; ++i)l[i].value.apply(t, n)
}, apply(e, t, n) {
  if (!this._.hasOwnProperty(e))
    throw new Error(`unknown type: ${e}`); for (let i = this._[e], s = 0, l = i.length; s < l; ++s)i[s].value.apply(t, n)
} }; function dge(e, t) {
  for (var n = 0, i = e.length, s; n < i; ++n) {
    if ((s = e[n]).name === t)
      return s.value
  }
} function uy(e, t, n) {
  for (let i = 0, s = e.length; i < s; ++i) {
    if (e[i].name === t) { e[i] = uge, e = e.slice(0, i).concat(e.slice(i + 1)); break }
  } return n != null && e.push({ name: t, value: n }), e
} const hge = { passive: !1 }; const Aa = { capture: !0, passive: !1 }; function jd(e) { e.stopImmediatePropagation() } function Vs(e) { e.preventDefault(), e.stopImmediatePropagation() } function P1(e) { const t = e.document.documentElement; const n = Gn(e).on('dragstart.drag', Vs, Aa); 'onselectstart' in t ? n.on('selectstart.drag', Vs, Aa) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = 'none') } function O1(e, t) { const n = e.document.documentElement; const i = Gn(e).on('dragstart.drag', null); t && (i.on('click.drag', Vs, Aa), setTimeout(() => { i.on('click.drag', null) }, 0)), 'onselectstart' in n ? i.on('selectstart.drag', null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect) } const Wc = e => () => e; function Ih(e, { sourceEvent: t, subject: n, target: i, identifier: s, active: l, x: u, y: f, dx: h, dy: p, dispatch: g }) { Object.defineProperties(this, { type: { value: e, enumerable: !0, configurable: !0 }, sourceEvent: { value: t, enumerable: !0, configurable: !0 }, subject: { value: n, enumerable: !0, configurable: !0 }, target: { value: i, enumerable: !0, configurable: !0 }, identifier: { value: s, enumerable: !0, configurable: !0 }, active: { value: l, enumerable: !0, configurable: !0 }, x: { value: u, enumerable: !0, configurable: !0 }, y: { value: f, enumerable: !0, configurable: !0 }, dx: { value: h, enumerable: !0, configurable: !0 }, dy: { value: p, enumerable: !0, configurable: !0 }, _: { value: g } }) }Ih.prototype.on = function () { const e = this._.on.apply(this._, arguments); return e === this._ ? this : e }; function pge(e) { return !e.ctrlKey && !e.button } function gge() { return this.parentNode } function mge(e, t) { return t ?? { x: e.x, y: e.y } } function vge() { return navigator.maxTouchPoints || 'ontouchstart' in this } function yge() {
  let e = pge; let t = gge; let n = mge; let i = vge; const s = {}; const l = Ka('start', 'drag', 'end'); let u = 0; let f; let h; let p; let g; let v = 0; function y(k) { k.on('mousedown.drag', w).filter(i).on('touchstart.drag', A).on('touchmove.drag', E, hge).on('touchend.drag touchcancel.drag', M).style('touch-action', 'none').style('-webkit-tap-highlight-color', 'rgba(0,0,0,0)') } function w(k, z) { if (!(g || !e.call(this, k, z))) { const D = O(this, t.call(this, k, z), k, z, 'mouse'); D && (Gn(k.view).on('mousemove.drag', L, Aa).on('mouseup.drag', $, Aa), P1(k.view), jd(k), p = !1, f = k.clientX, h = k.clientY, D('start', k)) } } function L(k) { if (Vs(k), !p) { const z = k.clientX - f; const D = k.clientY - h; p = z * z + D * D > v }s.mouse('drag', k) } function $(k) { Gn(k.view).on('mousemove.drag mouseup.drag', null), O1(k.view, p), Vs(k), s.mouse('end', k) } function A(k, z) { if (e.call(this, k, z)) { const D = k.changedTouches; const te = t.call(this, k, z); const ee = D.length; let W; let q; for (W = 0; W < ee; ++W)(q = O(this, te, k, z, D[W].identifier, D[W])) && (jd(k), q('start', k, D[W])) } } function E(k) { const z = k.changedTouches; const D = z.length; let te; let ee; for (te = 0; te < D; ++te)(ee = s[z[te].identifier]) && (Vs(k), ee('drag', k, z[te])) } function M(k) { const z = k.changedTouches; const D = z.length; let te; let ee; for (g && clearTimeout(g), g = setTimeout(() => { g = null }, 500), te = 0; te < D; ++te)(ee = s[z[te].identifier]) && (jd(k), ee('end', k, z[te])) } function O(k, z, D, te, ee, W) {
    const q = l.copy(); let K = bi(W || D, z); let C; let P; let I; if ((I = n.call(k, new Ih('beforestart', { sourceEvent: D, target: y, identifier: ee, active: u, x: K[0], y: K[1], dx: 0, dy: 0, dispatch: q }), te)) != null)
      return C = I.x - K[0] || 0, P = I.y - K[1] || 0, function S(R, B, oe) { const ue = K; let we; switch (R) { case 'start':s[ee] = S, we = u++; break; case 'end':delete s[ee], --u; case 'drag':K = bi(oe || B, z), we = u; break }q.call(R, k, new Ih(R, { sourceEvent: B, subject: I, target: y, identifier: ee, active: we, x: K[0] + C, y: K[1] + P, dx: K[0] - ue[0], dy: K[1] - ue[1], dispatch: q }), te) }
  } return y.filter = function (k) { return arguments.length ? (e = typeof k == 'function' ? k : Wc(!!k), y) : e }, y.container = function (k) { return arguments.length ? (t = typeof k == 'function' ? k : Wc(k), y) : t }, y.subject = function (k) { return arguments.length ? (n = typeof k == 'function' ? k : Wc(k), y) : n }, y.touchable = function (k) { return arguments.length ? (i = typeof k == 'function' ? k : Wc(!!k), y) : i }, y.on = function () { const k = l.on.apply(l, arguments); return k === l ? y : k }, y.clickDistance = function (k) { return arguments.length ? (v = (k = +k) * k, y) : Math.sqrt(v) }, y
} function Hp(e, t, n) { e.prototype = t.prototype = n, n.constructor = e } function R1(e, t) { const n = Object.create(e.prototype); for (const i in t)n[i] = t[i]; return n } function Ja() {} const La = 0.7; const Ru = 1 / La; const Gs = '\\s*([+-]?\\d+)\\s*'; const $a = '\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*'; const ei = '\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*'; const bge = /^#([0-9a-f]{3,8})$/; const wge = new RegExp(`^rgb\\(${Gs},${Gs},${Gs}\\)$`); const xge = new RegExp(`^rgb\\(${ei},${ei},${ei}\\)$`); const Sge = new RegExp(`^rgba\\(${Gs},${Gs},${Gs},${$a}\\)$`); const _ge = new RegExp(`^rgba\\(${ei},${ei},${ei},${$a}\\)$`); const kge = new RegExp(`^hsl\\(${$a},${ei},${ei}\\)$`); const Tge = new RegExp(`^hsla\\(${$a},${ei},${ei},${$a}\\)$`); const fy = { aliceblue: 15792383, antiquewhite: 16444375, aqua: 65535, aquamarine: 8388564, azure: 15794175, beige: 16119260, bisque: 16770244, black: 0, blanchedalmond: 16772045, blue: 255, blueviolet: 9055202, brown: 10824234, burlywood: 14596231, cadetblue: 6266528, chartreuse: 8388352, chocolate: 13789470, coral: 16744272, cornflowerblue: 6591981, cornsilk: 16775388, crimson: 14423100, cyan: 65535, darkblue: 139, darkcyan: 35723, darkgoldenrod: 12092939, darkgray: 11119017, darkgreen: 25600, darkgrey: 11119017, darkkhaki: 12433259, darkmagenta: 9109643, darkolivegreen: 5597999, darkorange: 16747520, darkorchid: 10040012, darkred: 9109504, darksalmon: 15308410, darkseagreen: 9419919, darkslateblue: 4734347, darkslategray: 3100495, darkslategrey: 3100495, darkturquoise: 52945, darkviolet: 9699539, deeppink: 16716947, deepskyblue: 49151, dimgray: 6908265, dimgrey: 6908265, dodgerblue: 2003199, firebrick: 11674146, floralwhite: 16775920, forestgreen: 2263842, fuchsia: 16711935, gainsboro: 14474460, ghostwhite: 16316671, gold: 16766720, goldenrod: 14329120, gray: 8421504, green: 32768, greenyellow: 11403055, grey: 8421504, honeydew: 15794160, hotpink: 16738740, indianred: 13458524, indigo: 4915330, ivory: 16777200, khaki: 15787660, lavender: 15132410, lavenderblush: 16773365, lawngreen: 8190976, lemonchiffon: 16775885, lightblue: 11393254, lightcoral: 15761536, lightcyan: 14745599, lightgoldenrodyellow: 16448210, lightgray: 13882323, lightgreen: 9498256, lightgrey: 13882323, lightpink: 16758465, lightsalmon: 16752762, lightseagreen: 2142890, lightskyblue: 8900346, lightslategray: 7833753, lightslategrey: 7833753, lightsteelblue: 11584734, lightyellow: 16777184, lime: 65280, limegreen: 3329330, linen: 16445670, magenta: 16711935, maroon: 8388608, mediumaquamarine: 6737322, mediumblue: 205, mediumorchid: 12211667, mediumpurple: 9662683, mediumseagreen: 3978097, mediumslateblue: 8087790, mediumspringgreen: 64154, mediumturquoise: 4772300, mediumvioletred: 13047173, midnightblue: 1644912, mintcream: 16121850, mistyrose: 16770273, moccasin: 16770229, navajowhite: 16768685, navy: 128, oldlace: 16643558, olive: 8421376, olivedrab: 7048739, orange: 16753920, orangered: 16729344, orchid: 14315734, palegoldenrod: 15657130, palegreen: 10025880, paleturquoise: 11529966, palevioletred: 14381203, papayawhip: 16773077, peachpuff: 16767673, peru: 13468991, pink: 16761035, plum: 14524637, powderblue: 11591910, purple: 8388736, rebeccapurple: 6697881, red: 16711680, rosybrown: 12357519, royalblue: 4286945, saddlebrown: 9127187, salmon: 16416882, sandybrown: 16032864, seagreen: 3050327, seashell: 16774638, sienna: 10506797, silver: 12632256, skyblue: 8900331, slateblue: 6970061, slategray: 7372944, slategrey: 7372944, snow: 16775930, springgreen: 65407, steelblue: 4620980, tan: 13808780, teal: 32896, thistle: 14204888, tomato: 16737095, turquoise: 4251856, violet: 15631086, wheat: 16113331, white: 16777215, whitesmoke: 16119285, yellow: 16776960, yellowgreen: 10145074 }; Hp(Ja, Ma, { copy(e) { return Object.assign(new this.constructor(), this, e) }, displayable() { return this.rgb().displayable() }, hex: dy, formatHex: dy, formatHex8: Cge, formatHsl: Ege, formatRgb: hy, toString: hy }); function dy() { return this.rgb().formatHex() } function Cge() { return this.rgb().formatHex8() } function Ege() { return z1(this).formatHsl() } function hy() { return this.rgb().formatRgb() } function Ma(e) { let t, n; return e = (`${e}`).trim().toLowerCase(), (t = bge.exec(e)) ? (n = t[1].length, t = Number.parseInt(t[1], 16), n === 6 ? py(t) : n === 3 ? new Kn(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? jc(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? jc(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = wge.exec(e)) ? new Kn(t[1], t[2], t[3], 1) : (t = xge.exec(e)) ? new Kn(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = Sge.exec(e)) ? jc(t[1], t[2], t[3], t[4]) : (t = _ge.exec(e)) ? jc(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = kge.exec(e)) ? vy(t[1], t[2] / 100, t[3] / 100, 1) : (t = Tge.exec(e)) ? vy(t[1], t[2] / 100, t[3] / 100, t[4]) : fy.hasOwnProperty(e) ? py(fy[e]) : e === 'transparent' ? new Kn(Number.NaN, Number.NaN, Number.NaN, 0) : null } function py(e) { return new Kn(e >> 16 & 255, e >> 8 & 255, e & 255, 1) } function jc(e, t, n, i) { return i <= 0 && (e = t = n = Number.NaN), new Kn(e, t, n, i) } function Age(e) { return e instanceof Ja || (e = Ma(e)), e ? (e = e.rgb(), new Kn(e.r, e.g, e.b, e.opacity)) : new Kn() } function Ph(e, t, n, i) { return arguments.length === 1 ? Age(e) : new Kn(e, t, n, i ?? 1) } function Kn(e, t, n, i) { this.r = +e, this.g = +t, this.b = +n, this.opacity = +i }Hp(Kn, Ph, R1(Ja, { brighter(e) { return e = e == null ? Ru : Ru ** e, new Kn(this.r * e, this.g * e, this.b * e, this.opacity) }, darker(e) { return e = e == null ? La : La ** e, new Kn(this.r * e, this.g * e, this.b * e, this.opacity) }, rgb() { return this }, clamp() { return new Kn(Vo(this.r), Vo(this.g), Vo(this.b), zu(this.opacity)) }, displayable() { return this.r >= -0.5 && this.r < 255.5 && this.g >= -0.5 && this.g < 255.5 && this.b >= -0.5 && this.b < 255.5 && this.opacity >= 0 && this.opacity <= 1 }, hex: gy, formatHex: gy, formatHex8: Lge, formatRgb: my, toString: my })); function gy() { return `#${Wo(this.r)}${Wo(this.g)}${Wo(this.b)}` } function Lge() { return `#${Wo(this.r)}${Wo(this.g)}${Wo(this.b)}${Wo((isNaN(this.opacity) ? 1 : this.opacity) * 255)}` } function my() { const e = zu(this.opacity); return `${e === 1 ? 'rgb(' : 'rgba('}${Vo(this.r)}, ${Vo(this.g)}, ${Vo(this.b)}${e === 1 ? ')' : `, ${e})`}` } function zu(e) { return isNaN(e) ? 1 : Math.max(0, Math.min(1, e)) } function Vo(e) { return Math.max(0, Math.min(255, Math.round(e) || 0)) } function Wo(e) { return e = Vo(e), (e < 16 ? '0' : '') + e.toString(16) } function vy(e, t, n, i) { return i <= 0 ? e = t = n = Number.NaN : n <= 0 || n >= 1 ? e = t = Number.NaN : t <= 0 && (e = Number.NaN), new Lr(e, t, n, i) } function z1(e) {
  if (e instanceof Lr)
    return new Lr(e.h, e.s, e.l, e.opacity); if (e instanceof Ja || (e = Ma(e)), !e)
    return new Lr(); if (e instanceof Lr)
    return e; e = e.rgb(); const t = e.r / 255; const n = e.g / 255; const i = e.b / 255; const s = Math.min(t, n, i); const l = Math.max(t, n, i); let u = Number.NaN; let f = l - s; const h = (l + s) / 2; return f ? (t === l ? u = (n - i) / f + (n < i) * 6 : n === l ? u = (i - t) / f + 2 : u = (t - n) / f + 4, f /= h < 0.5 ? l + s : 2 - l - s, u *= 60) : f = h > 0 && h < 1 ? 0 : u, new Lr(u, f, h, e.opacity)
} function $ge(e, t, n, i) { return arguments.length === 1 ? z1(e) : new Lr(e, t, n, i ?? 1) } function Lr(e, t, n, i) { this.h = +e, this.s = +t, this.l = +n, this.opacity = +i }Hp(Lr, $ge, R1(Ja, { brighter(e) { return e = e == null ? Ru : Ru ** e, new Lr(this.h, this.s, this.l * e, this.opacity) }, darker(e) { return e = e == null ? La : La ** e, new Lr(this.h, this.s, this.l * e, this.opacity) }, rgb() { const e = this.h % 360 + (this.h < 0) * 360; const t = isNaN(e) || isNaN(this.s) ? 0 : this.s; const n = this.l; const i = n + (n < 0.5 ? n : 1 - n) * t; const s = 2 * n - i; return new Kn(qd(e >= 240 ? e - 240 : e + 120, s, i), qd(e, s, i), qd(e < 120 ? e + 240 : e - 120, s, i), this.opacity) }, clamp() { return new Lr(yy(this.h), qc(this.s), qc(this.l), zu(this.opacity)) }, displayable() { return (this.s >= 0 && this.s <= 1 || isNaN(this.s)) && this.l >= 0 && this.l <= 1 && this.opacity >= 0 && this.opacity <= 1 }, formatHsl() { const e = zu(this.opacity); return `${e === 1 ? 'hsl(' : 'hsla('}${yy(this.h)}, ${qc(this.s) * 100}%, ${qc(this.l) * 100}%${e === 1 ? ')' : `, ${e})`}` } })); function yy(e) { return e = (e || 0) % 360, e < 0 ? e + 360 : e } function qc(e) { return Math.max(0, Math.min(1, e || 0)) } function qd(e, t, n) { return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255 } const D1 = e => () => e; function Mge(e, t) { return function (n) { return e + n * t } } function Nge(e, t, n) { return e = e ** n, t = t ** n - e, n = 1 / n, function (i) { return (e + i * t) ** n } } function Ige(e) { return (e = +e) == 1 ? F1 : function (t, n) { return n - t ? Nge(t, n, e) : D1(isNaN(t) ? n : t) } } function F1(e, t) { const n = t - e; return n ? Mge(e, n) : D1(isNaN(e) ? t : e) } const by = (function e(t) { const n = Ige(t); function i(s, l) { const u = n((s = Ph(s)).r, (l = Ph(l)).r); const f = n(s.g, l.g); const h = n(s.b, l.b); const p = F1(s.opacity, l.opacity); return function (g) { return s.r = u(g), s.g = f(g), s.b = h(g), s.opacity = p(g), `${s}` } } return i.gamma = e, i }(1)); function Qi(e, t) { return e = +e, t = +t, function (n) { return e * (1 - n) + t * n } } const Oh = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:e[-+]?\d+)?/gi; const Ud = new RegExp(Oh.source, 'g'); function Pge(e) { return function () { return e } } function Oge(e) { return function (t) { return `${e(t)}` } } function Rge(e, t) { let n = Oh.lastIndex = Ud.lastIndex = 0; let i; let s; let l; let u = -1; const f = []; const h = []; for (e = `${e}`, t = `${t}`; (i = Oh.exec(e)) && (s = Ud.exec(t));)(l = s.index) > n && (l = t.slice(n, l), f[u] ? f[u] += l : f[++u] = l), (i = i[0]) === (s = s[0]) ? f[u] ? f[u] += s : f[++u] = s : (f[++u] = null, h.push({ i: u, x: Qi(i, s) })), n = Ud.lastIndex; return n < t.length && (l = t.slice(n), f[u] ? f[u] += l : f[++u] = l), f.length < 2 ? h[0] ? Oge(h[0].x) : Pge(t) : (t = h.length, function (p) { for (var g = 0, v; g < t; ++g)f[(v = h[g]).i] = v.x(p); return f.join('') }) } const wy = 180 / Math.PI; const Rh = { translateX: 0, translateY: 0, rotate: 0, skewX: 0, scaleX: 1, scaleY: 1 }; function H1(e, t, n, i, s, l) { let u, f, h; return (u = Math.sqrt(e * e + t * t)) && (e /= u, t /= u), (h = e * n + t * i) && (n -= e * h, i -= t * h), (f = Math.sqrt(n * n + i * i)) && (n /= f, i /= f, h /= f), e * i < t * n && (e = -e, t = -t, h = -h, u = -u), { translateX: s, translateY: l, rotate: Math.atan2(t, e) * wy, skewX: Math.atan(h) * wy, scaleX: u, scaleY: f } } let Uc; function zge(e) { const t = new (typeof DOMMatrix == 'function' ? DOMMatrix : WebKitCSSMatrix)(`${e}`); return t.isIdentity ? Rh : H1(t.a, t.b, t.c, t.d, t.e, t.f) } function Dge(e) { return e == null || (Uc || (Uc = document.createElementNS('http://www.w3.org/2000/svg', 'g')), Uc.setAttribute('transform', e), !(e = Uc.transform.baseVal.consolidate())) ? Rh : (e = e.matrix, H1(e.a, e.b, e.c, e.d, e.e, e.f)) } function B1(e, t, n, i) {
  function s(p) { return p.length ? `${p.pop()} ` : '' } function l(p, g, v, y, w, L) {
    if (p !== v || g !== y) { const $ = w.push('translate(', null, t, null, n); L.push({ i: $ - 4, x: Qi(p, v) }, { i: $ - 2, x: Qi(g, y) }) }
    else {
      (v || y) && w.push(`translate(${v}${t}${y}${n}`)
    }
  } function u(p, g, v, y) { p !== g ? (p - g > 180 ? g += 360 : g - p > 180 && (p += 360), y.push({ i: v.push(`${s(v)}rotate(`, null, i) - 2, x: Qi(p, g) })) : g && v.push(`${s(v)}rotate(${g}${i}`) } function f(p, g, v, y) { p !== g ? y.push({ i: v.push(`${s(v)}skewX(`, null, i) - 2, x: Qi(p, g) }) : g && v.push(`${s(v)}skewX(${g}${i}`) } function h(p, g, v, y, w, L) {
    if (p !== v || g !== y) { const $ = w.push(`${s(w)}scale(`, null, ',', null, ')'); L.push({ i: $ - 4, x: Qi(p, v) }, { i: $ - 2, x: Qi(g, y) }) }
    else {
      (v !== 1 || y !== 1) && w.push(`${s(w)}scale(${v},${y})`)
    }
  } return function (p, g) { const v = []; const y = []; return p = e(p), g = e(g), l(p.translateX, p.translateY, g.translateX, g.translateY, v, y), u(p.rotate, g.rotate, v, y), f(p.skewX, g.skewX, v, y), h(p.scaleX, p.scaleY, g.scaleX, g.scaleY, v, y), p = g = null, function (w) { for (var L = -1, $ = y.length, A; ++L < $;)v[(A = y[L]).i] = A.x(w); return v.join('') } }
} const Fge = B1(zge, 'px, ', 'px)', 'deg)'); const Hge = B1(Dge, ', ', ')', ')'); const Bge = 1e-12; function xy(e) { return ((e = Math.exp(e)) + 1 / e) / 2 } function Wge(e) { return ((e = Math.exp(e)) - 1 / e) / 2 } function jge(e) { return ((e = Math.exp(2 * e)) - 1) / (e + 1) } const qge = (function e(t, n, i) {
  function s(l, u) {
    const f = l[0]; const h = l[1]; const p = l[2]; const g = u[0]; const v = u[1]; const y = u[2]; const w = g - f; const L = v - h; const $ = w * w + L * L; let A; let E; if ($ < Bge) {
      E = Math.log(y / p) / t, A = function (te) { return [f + te * w, h + te * L, p * Math.exp(t * te * E)] }
    }
    else { const M = Math.sqrt($); const O = (y * y - p * p + i * $) / (2 * p * n * M); const k = (y * y - p * p - i * $) / (2 * y * n * M); const z = Math.log(Math.sqrt(O * O + 1) - O); const D = Math.log(Math.sqrt(k * k + 1) - k); E = (D - z) / t, A = function (te) { const ee = te * E; const W = xy(z); const q = p / (n * M) * (W * jge(t * ee + z) - Wge(z)); return [f + q * w, h + q * L, p * W / xy(t * ee + z)] } } return A.duration = E * 1e3 * t / Math.SQRT2, A
  } return s.rho = function (l) { const u = Math.max(0.001, +l); const f = u * u; const h = f * f; return e(u, f, h) }, s
}(Math.SQRT2, 2, 4)); let nl = 0; let Kl = 0; let ql = 0; const W1 = 1e3; let Du; let Jl; let Fu = 0; let Xo = 0; let gf = 0; const Na = typeof performance == 'object' && performance.now ? performance : Date; const j1 = typeof window == 'object' && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (e) { setTimeout(e, 17) }; function Bp() { return Xo || (j1(Uge), Xo = Na.now() + gf) } function Uge() { Xo = 0 } function Hu() { this._call = this._time = this._next = null }Hu.prototype = Wp.prototype = { constructor: Hu, restart(e, t, n) {
  if (typeof e != 'function')
    throw new TypeError('callback is not a function'); n = (n == null ? Bp() : +n) + (t == null ? 0 : +t), !this._next && Jl !== this && (Jl ? Jl._next = this : Du = this, Jl = this), this._call = e, this._time = n, zh()
}, stop() { this._call && (this._call = null, this._time = 1 / 0, zh()) } }; function Wp(e, t, n) { const i = new Hu(); return i.restart(e, t, n), i } function Vge() { Bp(), ++nl; for (var e = Du, t; e;)(t = Xo - e._time) >= 0 && e._call.call(void 0, t), e = e._next; --nl } function Sy() {
  Xo = (Fu = Na.now()) + gf, nl = Kl = 0; try { Vge() }
  finally { nl = 0, Xge(), Xo = 0 }
} function Gge() { const e = Na.now(); const t = e - Fu; t > W1 && (gf -= t, Fu = e) } function Xge() { for (var e, t = Du, n, i = 1 / 0; t;)t._call ? (i > t._time && (i = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : Du = n); Jl = e, zh(i) } function zh(e) { if (!nl) { Kl && (Kl = clearTimeout(Kl)); const t = e - Xo; t > 24 ? (e < 1 / 0 && (Kl = setTimeout(Sy, e - Na.now() - gf)), ql && (ql = clearInterval(ql))) : (ql || (Fu = Na.now(), ql = setInterval(Gge, W1)), nl = 1, j1(Sy)) } } function _y(e, t, n) { const i = new Hu(); return t = t == null ? 0 : +t, i.restart((s) => { i.stop(), e(s + t) }, t, n), i } const Kge = Ka('start', 'end', 'cancel', 'interrupt'); const Jge = []; const q1 = 0; const ky = 1; const Dh = 2; const iu = 3; const Ty = 4; const Fh = 5; const ou = 6; function mf(e, t, n, i, s, l) {
  const u = e.__transition; if (!u)
    e.__transition = {}; else if (n in u)
    return; Yge(e, n, { name: t, index: i, group: s, on: Kge, tween: Jge, time: l.time, delay: l.delay, duration: l.duration, ease: l.ease, timer: null, state: q1 })
} function jp(e, t) {
  const n = Fr(e, t); if (n.state > q1)
    throw new Error('too late; already scheduled'); return n
} function ii(e, t) {
  const n = Fr(e, t); if (n.state > iu)
    throw new Error('too late; already running'); return n
} function Fr(e, t) {
  let n = e.__transition; if (!n || !(n = n[t]))
    throw new Error('transition not found'); return n
} function Yge(e, t, n) {
  const i = e.__transition; let s; i[t] = n, n.timer = Wp(l, 0, n.time); function l(p) { n.state = ky, n.timer.restart(u, n.delay, n.time), n.delay <= p && u(p - n.delay) } function u(p) {
    let g, v, y, w; if (n.state !== ky)
      return h(); for (g in i) {
      if (w = i[g], w.name === n.name) {
        if (w.state === iu)
          return _y(u); w.state === Ty ? (w.state = ou, w.timer.stop(), w.on.call('interrupt', e, e.__data__, w.index, w.group), delete i[g]) : +g < t && (w.state = ou, w.timer.stop(), w.on.call('cancel', e, e.__data__, w.index, w.group), delete i[g])
      }
    } if (_y(() => { n.state === iu && (n.state = Ty, n.timer.restart(f, n.delay, n.time), f(p)) }), n.state = Dh, n.on.call('start', e, e.__data__, n.index, n.group), n.state === Dh) { for (n.state = iu, s = Array.from({ length: y = n.tween.length }), g = 0, v = -1; g < y; ++g)(w = n.tween[g].value.call(e, e.__data__, n.index, n.group)) && (s[++v] = w); s.length = v + 1 }
  } function f(p) { for (let g = p < n.duration ? n.ease.call(null, p / n.duration) : (n.timer.restart(h), n.state = Fh, 1), v = -1, y = s.length; ++v < y;)s[v].call(e, g); n.state === Fh && (n.on.call('end', e, e.__data__, n.index, n.group), h()) } function h() { n.state = ou, n.timer.stop(), delete i[t]; for (const p in i) return; delete e.__transition }
} function su(e, t) { const n = e.__transition; let i; let s; let l = !0; let u; if (n) { t = t == null ? null : `${t}`; for (u in n) { if ((i = n[u]).name !== t) { l = !1; continue }s = i.state > Dh && i.state < Fh, i.state = ou, i.timer.stop(), i.on.call(s ? 'interrupt' : 'cancel', e, e.__data__, i.index, i.group), delete n[u] }l && delete e.__transition } } function Zge(e) { return this.each(function () { su(this, e) }) } function Qge(e, t) {
  let n, i; return function () {
    const s = ii(this, e); const l = s.tween; if (l !== n) {
      i = n = l; for (let u = 0, f = i.length; u < f; ++u) {
        if (i[u].name === t) { i = i.slice(), i.splice(u, 1); break }
      }
    }s.tween = i
  }
} function eme(e, t, n) {
  let i, s; if (typeof n != 'function')
    throw new Error(); return function () {
    const l = ii(this, e); const u = l.tween; if (u !== i) {
      s = (i = u).slice(); for (var f = { name: t, value: n }, h = 0, p = s.length; h < p; ++h) {
        if (s[h].name === t) { s[h] = f; break }
      }h === p && s.push(f)
    }l.tween = s
  }
} function tme(e, t) {
  const n = this._id; if (e += '', arguments.length < 2) {
    for (var i = Fr(this.node(), n).tween, s = 0, l = i.length, u; s < l; ++s) {
      if ((u = i[s]).name === e)
        return u.value
    } return null
  } return this.each((t == null ? Qge : eme)(n, e, t))
} function qp(e, t, n) { const i = e._id; return e.each(function () { const s = ii(this, i); (s.value || (s.value = {}))[t] = n.apply(this, arguments) }), function (s) { return Fr(s, i).value[t] } } function U1(e, t) { let n; return (typeof t == 'number' ? Qi : t instanceof Ma ? by : (n = Ma(t)) ? (t = n, by) : Rge)(e, t) } function nme(e) { return function () { this.removeAttribute(e) } } function rme(e) { return function () { this.removeAttributeNS(e.space, e.local) } } function ime(e, t, n) { let i; const s = `${n}`; let l; return function () { const u = this.getAttribute(e); return u === s ? null : u === i ? l : l = t(i = u, n) } } function ome(e, t, n) { let i; const s = `${n}`; let l; return function () { const u = this.getAttributeNS(e.space, e.local); return u === s ? null : u === i ? l : l = t(i = u, n) } } function sme(e, t, n) { let i, s, l; return function () { let u; const f = n(this); let h; return f == null ? void this.removeAttribute(e) : (u = this.getAttribute(e), h = `${f}`, u === h ? null : u === i && h === s ? l : (s = h, l = t(i = u, f))) } } function lme(e, t, n) { let i, s, l; return function () { let u; const f = n(this); let h; return f == null ? void this.removeAttributeNS(e.space, e.local) : (u = this.getAttributeNS(e.space, e.local), h = `${f}`, u === h ? null : u === i && h === s ? l : (s = h, l = t(i = u, f))) } } function ame(e, t) { const n = pf(e); const i = n === 'transform' ? Hge : U1; return this.attrTween(e, typeof t == 'function' ? (n.local ? lme : sme)(n, i, qp(this, `attr.${e}`, t)) : t == null ? (n.local ? rme : nme)(n) : (n.local ? ome : ime)(n, i, t)) } function cme(e, t) { return function (n) { this.setAttribute(e, t.call(this, n)) } } function ume(e, t) { return function (n) { this.setAttributeNS(e.space, e.local, t.call(this, n)) } } function fme(e, t) { let n, i; function s() { const l = t.apply(this, arguments); return l !== i && (n = (i = l) && ume(e, l)), n } return s._value = t, s } function dme(e, t) { let n, i; function s() { const l = t.apply(this, arguments); return l !== i && (n = (i = l) && cme(e, l)), n } return s._value = t, s } function hme(e, t) {
  let n = `attr.${e}`; if (arguments.length < 2)
    return (n = this.tween(n)) && n._value; if (t == null)
    return this.tween(n, null); if (typeof t != 'function')
    throw new Error(); const i = pf(e); return this.tween(n, (i.local ? fme : dme)(i, t))
} function pme(e, t) { return function () { jp(this, e).delay = +t.apply(this, arguments) } } function gme(e, t) { return t = +t, function () { jp(this, e).delay = t } } function mme(e) { const t = this._id; return arguments.length ? this.each((typeof e == 'function' ? pme : gme)(t, e)) : Fr(this.node(), t).delay } function vme(e, t) { return function () { ii(this, e).duration = +t.apply(this, arguments) } } function yme(e, t) { return t = +t, function () { ii(this, e).duration = t } } function bme(e) { const t = this._id; return arguments.length ? this.each((typeof e == 'function' ? vme : yme)(t, e)) : Fr(this.node(), t).duration } function wme(e, t) {
  if (typeof t != 'function')
    throw new Error(); return function () { ii(this, e).ease = t }
} function xme(e) { const t = this._id; return arguments.length ? this.each(wme(t, e)) : Fr(this.node(), t).ease } function Sme(e, t) {
  return function () {
    const n = t.apply(this, arguments); if (typeof n != 'function')
      throw new Error(); ii(this, e).ease = n
  }
} function _me(e) {
  if (typeof e != 'function')
    throw new Error(); return this.each(Sme(this._id, e))
} function kme(e) {
  typeof e != 'function' && (e = k1(e)); for (var t = this._groups, n = t.length, i = new Array(n), s = 0; s < n; ++s) {
    for (var l = t[s], u = l.length, f = i[s] = [], h, p = 0; p < u; ++p)(h = l[p]) && e.call(h, h.__data__, p, l) && f.push(h)
  } return new Ei(i, this._parents, this._name, this._id)
} function Tme(e) {
  if (e._id !== this._id)
    throw new Error(); for (var t = this._groups, n = e._groups, i = t.length, s = n.length, l = Math.min(i, s), u = new Array(i), f = 0; f < l; ++f) {
    for (var h = t[f], p = n[f], g = h.length, v = u[f] = new Array(g), y, w = 0; w < g; ++w)(y = h[w] || p[w]) && (v[w] = y)
  } for (;f < i; ++f)u[f] = t[f]; return new Ei(u, this._parents, this._name, this._id)
} function Cme(e) { return (`${e}`).trim().split(/^|\s+/).every((t) => { const n = t.indexOf('.'); return n >= 0 && (t = t.slice(0, n)), !t || t === 'start' }) } function Eme(e, t, n) { let i; let s; const l = Cme(t) ? jp : ii; return function () { const u = l(this, e); const f = u.on; f !== i && (s = (i = f).copy()).on(t, n), u.on = s } } function Ame(e, t) { const n = this._id; return arguments.length < 2 ? Fr(this.node(), n).on.on(e) : this.each(Eme(n, e, t)) } function Lme(e) {
  return function () {
    const t = this.parentNode; for (const n in this.__transition) {
      if (+n !== e)
        return
    } t && t.removeChild(this)
  }
} function $me() { return this.on('end.remove', Lme(this._id)) } function Mme(e) {
  const t = this._name; const n = this._id; typeof e != 'function' && (e = Dp(e)); for (var i = this._groups, s = i.length, l = new Array(s), u = 0; u < s; ++u) {
    for (var f = i[u], h = f.length, p = l[u] = new Array(h), g, v, y = 0; y < h; ++y)(g = f[y]) && (v = e.call(g, g.__data__, y, f)) && ('__data__' in g && (v.__data__ = g.__data__), p[y] = v, mf(p[y], t, n, y, p, Fr(g, n)))
  } return new Ei(l, this._parents, t, n)
} function Nme(e) {
  const t = this._name; const n = this._id; typeof e != 'function' && (e = _1(e)); for (var i = this._groups, s = i.length, l = [], u = [], f = 0; f < s; ++f) {
    for (var h = i[f], p = h.length, g, v = 0; v < p; ++v) {
      if (g = h[v]) { for (var y = e.call(g, g.__data__, v, h), w, L = Fr(g, n), $ = 0, A = y.length; $ < A; ++$)(w = y[$]) && mf(w, t, n, $, y, L); l.push(y), u.push(g) }
    }
  } return new Ei(l, u, t, n)
} const Ime = Xa.prototype.constructor; function Pme() { return new Ime(this._groups, this._parents) } function Ome(e, t) { let n, i, s; return function () { const l = tl(this, e); const u = (this.style.removeProperty(e), tl(this, e)); return l === u ? null : l === n && u === i ? s : s = t(n = l, i = u) } } function V1(e) { return function () { this.style.removeProperty(e) } } function Rme(e, t, n) { let i; const s = `${n}`; let l; return function () { const u = tl(this, e); return u === s ? null : u === i ? l : l = t(i = u, n) } } function zme(e, t, n) { let i, s, l; return function () { const u = tl(this, e); let f = n(this); let h = `${f}`; return f == null && (h = f = (this.style.removeProperty(e), tl(this, e))), u === h ? null : u === i && h === s ? l : (s = h, l = t(i = u, f)) } } function Dme(e, t) { let n; let i; let s; const l = `style.${t}`; const u = `end.${l}`; let f; return function () { const h = ii(this, e); const p = h.on; const g = h.value[l] == null ? f || (f = V1(t)) : void 0; (p !== n || s !== g) && (i = (n = p).copy()).on(u, s = g), h.on = i } } function Fme(e, t, n) { const i = (e += '') == 'transform' ? Fge : U1; return t == null ? this.styleTween(e, Ome(e, i)).on(`end.style.${e}`, V1(e)) : typeof t == 'function' ? this.styleTween(e, zme(e, i, qp(this, `style.${e}`, t))).each(Dme(this._id, e)) : this.styleTween(e, Rme(e, i, t), n).on(`end.style.${e}`, null) } function Hme(e, t, n) { return function (i) { this.style.setProperty(e, t.call(this, i), n) } } function Bme(e, t, n) { let i, s; function l() { const u = t.apply(this, arguments); return u !== s && (i = (s = u) && Hme(e, u, n)), i } return l._value = t, l } function Wme(e, t, n) {
  let i = `style.${e += ''}`; if (arguments.length < 2)
    return (i = this.tween(i)) && i._value; if (t == null)
    return this.tween(i, null); if (typeof t != 'function')
    throw new Error(); return this.tween(i, Bme(e, t, n ?? ''))
} function jme(e) { return function () { this.textContent = e } } function qme(e) { return function () { const t = e(this); this.textContent = t ?? '' } } function Ume(e) { return this.tween('text', typeof e == 'function' ? qme(qp(this, 'text', e)) : jme(e == null ? '' : `${e}`)) } function Vme(e) { return function (t) { this.textContent = e.call(this, t) } } function Gme(e) { let t, n; function i() { const s = e.apply(this, arguments); return s !== n && (t = (n = s) && Vme(s)), t } return i._value = e, i } function Xme(e) {
  let t = 'text'; if (arguments.length < 1)
    return (t = this.tween(t)) && t._value; if (e == null)
    return this.tween(t, null); if (typeof e != 'function')
    throw new Error(); return this.tween(t, Gme(e))
} function Kme() {
  for (var e = this._name, t = this._id, n = G1(), i = this._groups, s = i.length, l = 0; l < s; ++l) {
    for (var u = i[l], f = u.length, h, p = 0; p < f; ++p) {
      if (h = u[p]) { const g = Fr(h, t); mf(h, e, n, p, u, { time: g.time + g.delay + g.duration, delay: 0, duration: g.duration, ease: g.ease }) }
    }
  } return new Ei(i, this._parents, e, n)
} function Jme() { let e; let t; const n = this; const i = n._id; let s = n.size(); return new Promise((l, u) => { const f = { value: u }; const h = { value() { --s === 0 && l() } }; n.each(function () { const p = ii(this, i); const g = p.on; g !== e && (t = (e = g).copy(), t._.cancel.push(f), t._.interrupt.push(f), t._.end.push(h)), p.on = t }), s === 0 && l() }) } let Yme = 0; function Ei(e, t, n, i) { this._groups = e, this._parents = t, this._name = n, this._id = i } function G1() { return ++Yme } const mi = Xa.prototype; Ei.prototype = { constructor: Ei, select: Mme, selectAll: Nme, selectChild: mi.selectChild, selectChildren: mi.selectChildren, filter: kme, merge: Tme, selection: Pme, transition: Kme, call: mi.call, nodes: mi.nodes, node: mi.node, size: mi.size, empty: mi.empty, each: mi.each, on: Ame, attr: ame, attrTween: hme, style: Fme, styleTween: Wme, text: Ume, textTween: Xme, remove: $me, tween: tme, delay: mme, duration: bme, ease: xme, easeVarying: _me, end: Jme, [Symbol.iterator]: mi[Symbol.iterator] }; function Zme(e) { return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2 } const Qme = { time: null, delay: 0, duration: 250, ease: Zme }; function eve(e, t) {
  for (var n; !(n = e.__transition) || !(n = n[t]);) {
    if (!(e = e.parentNode))
      throw new Error(`transition ${t} not found`)
  } return n
} function tve(e) {
  let t, n; e instanceof Ei ? (t = e._id, e = e._name) : (t = G1(), (n = Qme).time = Bp(), e = e == null ? null : `${e}`); for (var i = this._groups, s = i.length, l = 0; l < s; ++l) {
    for (var u = i[l], f = u.length, h, p = 0; p < f; ++p)(h = u[p]) && mf(h, e, t, p, u, n || eve(h, t))
  } return new Ei(i, this._parents, e, t)
}Xa.prototype.interrupt = Zge; Xa.prototype.transition = tve; const Vc = e => () => e; function nve(e, { sourceEvent: t, target: n, transform: i, dispatch: s }) { Object.defineProperties(this, { type: { value: e, enumerable: !0, configurable: !0 }, sourceEvent: { value: t, enumerable: !0, configurable: !0 }, target: { value: n, enumerable: !0, configurable: !0 }, transform: { value: i, enumerable: !0, configurable: !0 }, _: { value: s } }) } function Si(e, t, n) { this.k = e, this.x = t, this.y = n }Si.prototype = { constructor: Si, scale(e) { return e === 1 ? this : new Si(this.k * e, this.x, this.y) }, translate(e, t) { return e === 0 & t === 0 ? this : new Si(this.k, this.x + this.k * e, this.y + this.k * t) }, apply(e) { return [e[0] * this.k + this.x, e[1] * this.k + this.y] }, applyX(e) { return e * this.k + this.x }, applyY(e) { return e * this.k + this.y }, invert(e) { return [(e[0] - this.x) / this.k, (e[1] - this.y) / this.k] }, invertX(e) { return (e - this.x) / this.k }, invertY(e) { return (e - this.y) / this.k }, rescaleX(e) { return e.copy().domain(e.range().map(this.invertX, this).map(e.invert, e)) }, rescaleY(e) { return e.copy().domain(e.range().map(this.invertY, this).map(e.invert, e)) }, toString() { return `translate(${this.x},${this.y}) scale(${this.k})` } }; const Up = new Si(1, 0, 0); Si.prototype; function Vd(e) { e.stopImmediatePropagation() } function Ul(e) { e.preventDefault(), e.stopImmediatePropagation() } function rve(e) { return (!e.ctrlKey || e.type === 'wheel') && !e.button } function ive() { let e = this; return e instanceof SVGElement ? (e = e.ownerSVGElement || e, e.hasAttribute('viewBox') ? (e = e.viewBox.baseVal, [[e.x, e.y], [e.x + e.width, e.y + e.height]]) : [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]]) : [[0, 0], [e.clientWidth, e.clientHeight]] } function Cy() { return this.__zoom || Up } function ove(e) { return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) * (e.ctrlKey ? 10 : 1) } function sve() { return navigator.maxTouchPoints || 'ontouchstart' in this } function lve(e, t, n) { const i = e.invertX(t[0][0]) - n[0][0]; const s = e.invertX(t[1][0]) - n[1][0]; const l = e.invertY(t[0][1]) - n[0][1]; const u = e.invertY(t[1][1]) - n[1][1]; return e.translate(s > i ? (i + s) / 2 : Math.min(0, i) || Math.max(0, s), u > l ? (l + u) / 2 : Math.min(0, l) || Math.max(0, u)) } function ave() {
  let e = rve; let t = ive; let n = lve; let i = ove; let s = sve; const l = [0, 1 / 0]; const u = [[-1 / 0, -1 / 0], [1 / 0, 1 / 0]]; let f = 250; let h = qge; const p = Ka('start', 'zoom', 'end'); let g; let v; let y; const w = 500; const L = 150; let $ = 0; let A = 10; function E(I) { I.property('__zoom', Cy).on('wheel.zoom', ee, { passive: !1 }).on('mousedown.zoom', W).on('dblclick.zoom', q).filter(s).on('touchstart.zoom', K).on('touchmove.zoom', C).on('touchend.zoom touchcancel.zoom', P).style('-webkit-tap-highlight-color', 'rgba(0,0,0,0)') }E.transform = function (I, S, R, B) { const oe = I.selection ? I.selection() : I; oe.property('__zoom', Cy), I !== oe ? z(I, S, R, B) : oe.interrupt().each(function () { D(this, arguments).event(B).start().zoom(null, typeof S == 'function' ? S.apply(this, arguments) : S).end() }) }, E.scaleBy = function (I, S, R, B) { E.scaleTo(I, function () { const oe = this.__zoom.k; const ue = typeof S == 'function' ? S.apply(this, arguments) : S; return oe * ue }, R, B) }, E.scaleTo = function (I, S, R, B) { E.transform(I, function () { const oe = t.apply(this, arguments); const ue = this.__zoom; const we = R == null ? k(oe) : typeof R == 'function' ? R.apply(this, arguments) : R; const Pe = ue.invert(we); const qe = typeof S == 'function' ? S.apply(this, arguments) : S; return n(O(M(ue, qe), we, Pe), oe, u) }, R, B) }, E.translateBy = function (I, S, R, B) { E.transform(I, function () { return n(this.__zoom.translate(typeof S == 'function' ? S.apply(this, arguments) : S, typeof R == 'function' ? R.apply(this, arguments) : R), t.apply(this, arguments), u) }, null, B) }, E.translateTo = function (I, S, R, B, oe) { E.transform(I, function () { const ue = t.apply(this, arguments); const we = this.__zoom; const Pe = B == null ? k(ue) : typeof B == 'function' ? B.apply(this, arguments) : B; return n(Up.translate(Pe[0], Pe[1]).scale(we.k).translate(typeof S == 'function' ? -S.apply(this, arguments) : -S, typeof R == 'function' ? -R.apply(this, arguments) : -R), ue, u) }, B, oe) }; function M(I, S) { return S = Math.max(l[0], Math.min(l[1], S)), S === I.k ? I : new Si(S, I.x, I.y) } function O(I, S, R) { const B = S[0] - R[0] * I.k; const oe = S[1] - R[1] * I.k; return B === I.x && oe === I.y ? I : new Si(I.k, B, oe) } function k(I) { return [(+I[0][0] + +I[1][0]) / 2, (+I[0][1] + +I[1][1]) / 2] } function z(I, S, R, B) {
    I.on('start.zoom', function () { D(this, arguments).event(B).start() }).on('interrupt.zoom end.zoom', function () { D(this, arguments).event(B).end() }).tween('zoom', function () {
      const oe = this; const ue = arguments; const we = D(oe, ue).event(B); const Pe = t.apply(oe, ue); const qe = R == null ? k(Pe) : typeof R == 'function' ? R.apply(oe, ue) : R; const Ze = Math.max(Pe[1][0] - Pe[0][0], Pe[1][1] - Pe[0][1]); const Ke = oe.__zoom; const Je = typeof S == 'function' ? S.apply(oe, ue) : S; const ie = h(Ke.invert(qe).concat(Ze / Ke.k), Je.invert(qe).concat(Ze / Je.k)); return function (U) {
        if (U === 1) {
          U = Je
        }
        else { const Q = ie(U); const J = Ze / Q[2]; U = new Si(J, qe[0] - Q[0] * J, qe[1] - Q[1] * J) }we.zoom(null, U)
      }
    })
  } function D(I, S, R) { return !R && I.__zooming || new te(I, S) } function te(I, S) { this.that = I, this.args = S, this.active = 0, this.sourceEvent = null, this.extent = t.apply(I, S), this.taps = 0 }te.prototype = { event(I) { return I && (this.sourceEvent = I), this }, start() { return ++this.active === 1 && (this.that.__zooming = this, this.emit('start')), this }, zoom(I, S) { return this.mouse && I !== 'mouse' && (this.mouse[1] = S.invert(this.mouse[0])), this.touch0 && I !== 'touch' && (this.touch0[1] = S.invert(this.touch0[0])), this.touch1 && I !== 'touch' && (this.touch1[1] = S.invert(this.touch1[0])), this.that.__zoom = S, this.emit('zoom'), this }, end() { return --this.active === 0 && (delete this.that.__zooming, this.emit('end')), this }, emit(I) { const S = Gn(this.that).datum(); p.call(I, this.that, new nve(I, { sourceEvent: this.sourceEvent, target: E, transform: this.that.__zoom, dispatch: p }), S) } }; function ee(I, ...S) {
    if (!e.apply(this, arguments))
      return; const R = D(this, S).event(I); const B = this.__zoom; const oe = Math.max(l[0], Math.min(l[1], B.k * 2 ** i.apply(this, arguments))); const ue = bi(I); if (R.wheel) {
      (R.mouse[0][0] !== ue[0] || R.mouse[0][1] !== ue[1]) && (R.mouse[1] = B.invert(R.mouse[0] = ue)), clearTimeout(R.wheel)
    }
    else {
      if (B.k === oe)
        return; R.mouse = [ue, B.invert(ue)], su(this), R.start()
    }Ul(I), R.wheel = setTimeout(we, L), R.zoom('mouse', n(O(M(B, oe), R.mouse[0], R.mouse[1]), R.extent, u)); function we() { R.wheel = null, R.end() }
  } function W(I, ...S) {
    if (y || !e.apply(this, arguments))
      return; const R = I.currentTarget; const B = D(this, S, !0).event(I); const oe = Gn(I.view).on('mousemove.zoom', qe, !0).on('mouseup.zoom', Ze, !0); const ue = bi(I, R); const we = I.clientX; const Pe = I.clientY; P1(I.view), Vd(I), B.mouse = [ue, this.__zoom.invert(ue)], su(this), B.start(); function qe(Ke) { if (Ul(Ke), !B.moved) { const Je = Ke.clientX - we; const ie = Ke.clientY - Pe; B.moved = Je * Je + ie * ie > $ }B.event(Ke).zoom('mouse', n(O(B.that.__zoom, B.mouse[0] = bi(Ke, R), B.mouse[1]), B.extent, u)) } function Ze(Ke) { oe.on('mousemove.zoom mouseup.zoom', null), O1(Ke.view, B.moved), Ul(Ke), B.event(Ke).end() }
  } function q(I, ...S) { if (e.apply(this, arguments)) { const R = this.__zoom; const B = bi(I.changedTouches ? I.changedTouches[0] : I, this); const oe = R.invert(B); const ue = R.k * (I.shiftKey ? 0.5 : 2); const we = n(O(M(R, ue), B, oe), t.apply(this, S), u); Ul(I), f > 0 ? Gn(this).transition().duration(f).call(z, we, B, I) : Gn(this).call(E.transform, we, B, I) } } function K(I, ...S) { if (e.apply(this, arguments)) { const R = I.touches; const B = R.length; const oe = D(this, S, I.changedTouches.length === B).event(I); let ue; let we; let Pe; let qe; for (Vd(I), we = 0; we < B; ++we)Pe = R[we], qe = bi(Pe, this), qe = [qe, this.__zoom.invert(qe), Pe.identifier], oe.touch0 ? !oe.touch1 && oe.touch0[2] !== qe[2] && (oe.touch1 = qe, oe.taps = 0) : (oe.touch0 = qe, ue = !0, oe.taps = 1 + !!g); g && (g = clearTimeout(g)), ue && (oe.taps < 2 && (v = qe[0], g = setTimeout(() => { g = null }, w)), su(this), oe.start()) } } function C(I, ...S) {
    if (this.__zooming) {
      const R = D(this, S).event(I); const B = I.changedTouches; const oe = B.length; let ue; let we; let Pe; let qe; for (Ul(I), ue = 0; ue < oe; ++ue)we = B[ue], Pe = bi(we, this), R.touch0 && R.touch0[2] === we.identifier ? R.touch0[0] = Pe : R.touch1 && R.touch1[2] === we.identifier && (R.touch1[0] = Pe); if (we = R.that.__zoom, R.touch1) { const Ze = R.touch0[0]; const Ke = R.touch0[1]; const Je = R.touch1[0]; const ie = R.touch1[1]; var U = (U = Je[0] - Ze[0]) * U + (U = Je[1] - Ze[1]) * U; var Q = (Q = ie[0] - Ke[0]) * Q + (Q = ie[1] - Ke[1]) * Q; we = M(we, Math.sqrt(U / Q)), Pe = [(Ze[0] + Je[0]) / 2, (Ze[1] + Je[1]) / 2], qe = [(Ke[0] + ie[0]) / 2, (Ke[1] + ie[1]) / 2] }
      else if (R.touch0) {
        Pe = R.touch0[0], qe = R.touch0[1]
      }
      else {
        return
      }R.zoom('touch', n(O(we, Pe, qe), R.extent, u))
    }
  } function P(I, ...S) {
    if (this.__zooming) {
      const R = D(this, S).event(I); const B = I.changedTouches; const oe = B.length; let ue; let we; for (Vd(I), y && clearTimeout(y), y = setTimeout(() => { y = null }, w), ue = 0; ue < oe; ++ue)we = B[ue], R.touch0 && R.touch0[2] === we.identifier ? delete R.touch0 : R.touch1 && R.touch1[2] === we.identifier && delete R.touch1; if (R.touch1 && !R.touch0 && (R.touch0 = R.touch1, delete R.touch1), R.touch0) {
        R.touch0[1] = this.__zoom.invert(R.touch0[0])
      }
      else if (R.end(), R.taps === 2 && (we = bi(we, this), Math.hypot(v[0] - we[0], v[1] - we[1]) < A)) { const Pe = Gn(this).on('dblclick.zoom'); Pe && Pe.apply(this, arguments) }
    }
  } return E.wheelDelta = function (I) { return arguments.length ? (i = typeof I == 'function' ? I : Vc(+I), E) : i }, E.filter = function (I) { return arguments.length ? (e = typeof I == 'function' ? I : Vc(!!I), E) : e }, E.touchable = function (I) { return arguments.length ? (s = typeof I == 'function' ? I : Vc(!!I), E) : s }, E.extent = function (I) { return arguments.length ? (t = typeof I == 'function' ? I : Vc([[+I[0][0], +I[0][1]], [+I[1][0], +I[1][1]]]), E) : t }, E.scaleExtent = function (I) { return arguments.length ? (l[0] = +I[0], l[1] = +I[1], E) : [l[0], l[1]] }, E.translateExtent = function (I) { return arguments.length ? (u[0][0] = +I[0][0], u[1][0] = +I[1][0], u[0][1] = +I[0][1], u[1][1] = +I[1][1], E) : [[u[0][0], u[0][1]], [u[1][0], u[1][1]]] }, E.constrain = function (I) { return arguments.length ? (n = I, E) : n }, E.duration = function (I) { return arguments.length ? (f = +I, E) : f }, E.interpolate = function (I) { return arguments.length ? (h = I, E) : h }, E.on = function () { const I = p.on.apply(p, arguments); return I === p ? E : I }, E.clickDistance = function (I) { return arguments.length ? ($ = (I = +I) * I, E) : Math.sqrt($) }, E.tapDistance = function (I) { return arguments.length ? (A = +I, E) : A }, E
} function cve(e) { const t = +this._x.call(null, e); const n = +this._y.call(null, e); return X1(this.cover(t, n), t, n, e) } function X1(e, t, n, i) {
  if (isNaN(t) || isNaN(n))
    return e; let s; let l = e._root; const u = { data: i }; let f = e._x0; let h = e._y0; let p = e._x1; let g = e._y1; let v; let y; let w; let L; let $; let A; let E; let M; if (!l)
    return e._root = u, e; for (;l.length;) {
    if (($ = t >= (v = (f + p) / 2)) ? f = v : p = v, (A = n >= (y = (h + g) / 2)) ? h = y : g = y, s = l, !(l = l[E = A << 1 | $]))
      return s[E] = u, e
  } if (w = +e._x.call(null, l.data), L = +e._y.call(null, l.data), t === w && n === L)
    return u.next = l, s ? s[E] = u : e._root = u, e; do s = s ? s[E] = Array.from({ length: 4 }) : e._root = Array.from({ length: 4 }), ($ = t >= (v = (f + p) / 2)) ? f = v : p = v, (A = n >= (y = (h + g) / 2)) ? h = y : g = y; while ((E = A << 1 | $) === (M = (L >= y) << 1 | w >= v)); return s[M] = l, s[E] = u, e
} function uve(e) {
  let t; let n; const i = e.length; let s; let l; const u = new Array(i); const f = new Array(i); let h = 1 / 0; let p = 1 / 0; let g = -1 / 0; let v = -1 / 0; for (n = 0; n < i; ++n)isNaN(s = +this._x.call(null, t = e[n])) || isNaN(l = +this._y.call(null, t)) || (u[n] = s, f[n] = l, s < h && (h = s), s > g && (g = s), l < p && (p = l), l > v && (v = l)); if (h > g || p > v)
    return this; for (this.cover(h, p).cover(g, v), n = 0; n < i; ++n)X1(this, u[n], f[n], e[n]); return this
} function fve(e, t) {
  if (isNaN(e = +e) || isNaN(t = +t))
    return this; let n = this._x0; let i = this._y0; let s = this._x1; let l = this._y1; if (isNaN(n)) {
    s = (n = Math.floor(e)) + 1, l = (i = Math.floor(t)) + 1
  }
  else { for (var u = s - n || 1, f = this._root, h, p; n > e || e >= s || i > t || t >= l;) switch (p = (t < i) << 1 | e < n, h = Array.from({ length: 4 }), h[p] = f, f = h, u *= 2, p) { case 0:s = n + u, l = i + u; break; case 1:n = s - u, l = i + u; break; case 2:s = n + u, i = l - u; break; case 3:n = s - u, i = l - u; break } this._root && this._root.length && (this._root = f) } return this._x0 = n, this._y0 = i, this._x1 = s, this._y1 = l, this
} function dve() {
  const e = []; return this.visit((t) => {
    if (!t.length) {
      do e.push(t.data); while (t = t.next)
    }
  }), e
} function hve(e) { return arguments.length ? this.cover(+e[0][0], +e[0][1]).cover(+e[1][0], +e[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]] } function Pn(e, t, n, i, s) { this.node = e, this.x0 = t, this.y0 = n, this.x1 = i, this.y1 = s } function pve(e, t, n) {
  let i; let s = this._x0; let l = this._y0; let u; let f; let h; let p; let g = this._x1; let v = this._y1; const y = []; let w = this._root; let L; let $; for (w && y.push(new Pn(w, s, l, g, v)), n == null ? n = 1 / 0 : (s = e - n, l = t - n, g = e + n, v = t + n, n *= n); L = y.pop();) {
    if (!(!(w = L.node) || (u = L.x0) > g || (f = L.y0) > v || (h = L.x1) < s || (p = L.y1) < l)) {
      if (w.length) { const A = (u + h) / 2; const E = (f + p) / 2; y.push(new Pn(w[3], A, E, h, p), new Pn(w[2], u, E, A, p), new Pn(w[1], A, f, h, E), new Pn(w[0], u, f, A, E)), ($ = (t >= E) << 1 | e >= A) && (L = y[y.length - 1], y[y.length - 1] = y[y.length - 1 - $], y[y.length - 1 - $] = L) }
      else { const M = e - +this._x.call(null, w.data); const O = t - +this._y.call(null, w.data); const k = M * M + O * O; if (k < n) { const z = Math.sqrt(n = k); s = e - z, l = t - z, g = e + z, v = t + z, i = w.data } }
    }
  } return i
} function gve(e) {
  if (isNaN(g = +this._x.call(null, e)) || isNaN(v = +this._y.call(null, e)))
    return this; let t; let n = this._root; let i; let s; let l; let u = this._x0; let f = this._y0; let h = this._x1; let p = this._y1; let g; let v; let y; let w; let L; let $; let A; let E; if (!n)
    return this; if (n.length) {
    for (;;) {
      if ((L = g >= (y = (u + h) / 2)) ? u = y : h = y, ($ = v >= (w = (f + p) / 2)) ? f = w : p = w, t = n, !(n = n[A = $ << 1 | L]))
        return this; if (!n.length)
        break; (t[A + 1 & 3] || t[A + 2 & 3] || t[A + 3 & 3]) && (i = t, E = A)
    }
  } for (;n.data !== e;) {
    if (s = n, !(n = n.next))
      return this
  } return (l = n.next) && delete n.next, s ? (l ? s.next = l : delete s.next, this) : t ? (l ? t[A] = l : delete t[A], (n = t[0] || t[1] || t[2] || t[3]) && n === (t[3] || t[2] || t[1] || t[0]) && !n.length && (i ? i[E] = n : this._root = n), this) : (this._root = l, this)
} function mve(e) { for (let t = 0, n = e.length; t < n; ++t) this.remove(e[t]); return this } function vve() { return this._root } function yve() {
  let e = 0; return this.visit((t) => {
    if (!t.length) {
      do ++e; while (t = t.next)
    }
  }), e
} function bve(e) {
  const t = []; let n; let i = this._root; let s; let l; let u; let f; let h; for (i && t.push(new Pn(i, this._x0, this._y0, this._x1, this._y1)); n = t.pop();) {
    if (!e(i = n.node, l = n.x0, u = n.y0, f = n.x1, h = n.y1) && i.length) { const p = (l + f) / 2; const g = (u + h) / 2; (s = i[3]) && t.push(new Pn(s, p, g, f, h)), (s = i[2]) && t.push(new Pn(s, l, g, p, h)), (s = i[1]) && t.push(new Pn(s, p, u, f, g)), (s = i[0]) && t.push(new Pn(s, l, u, p, g)) }
  } return this
} function wve(e) { const t = []; const n = []; let i; for (this._root && t.push(new Pn(this._root, this._x0, this._y0, this._x1, this._y1)); i = t.pop();) { const s = i.node; if (s.length) { var l; const u = i.x0; const f = i.y0; const h = i.x1; const p = i.y1; const g = (u + h) / 2; const v = (f + p) / 2; (l = s[0]) && t.push(new Pn(l, u, f, g, v)), (l = s[1]) && t.push(new Pn(l, g, f, h, v)), (l = s[2]) && t.push(new Pn(l, u, v, g, p)), (l = s[3]) && t.push(new Pn(l, g, v, h, p)) }n.push(i) } for (;i = n.pop();)e(i.node, i.x0, i.y0, i.x1, i.y1); return this } function xve(e) { return e[0] } function Sve(e) { return arguments.length ? (this._x = e, this) : this._x } function _ve(e) { return e[1] } function kve(e) { return arguments.length ? (this._y = e, this) : this._y } function Vp(e, t, n) { const i = new Gp(t ?? xve, n ?? _ve, Number.NaN, Number.NaN, Number.NaN, Number.NaN); return e == null ? i : i.addAll(e) } function Gp(e, t, n, i, s, l) { this._x = e, this._y = t, this._x0 = n, this._y0 = i, this._x1 = s, this._y1 = l, this._root = void 0 } function Ey(e) { for (var t = { data: e.data }, n = t; e = e.next;)n = n.next = { data: e.data }; return t } const zn = Vp.prototype = Gp.prototype; zn.copy = function () {
  const e = new Gp(this._x, this._y, this._x0, this._y0, this._x1, this._y1); let t = this._root; let n; let i; if (!t)
    return e; if (!t.length)
    return e._root = Ey(t), e; for (n = [{ source: t, target: e._root = Array.from({ length: 4 }) }]; t = n.pop();) {
    for (let s = 0; s < 4; ++s)(i = t.source[s]) && (i.length ? n.push({ source: i, target: t.target[s] = Array.from({ length: 4 }) }) : t.target[s] = Ey(i))
  } return e
}; zn.add = cve; zn.addAll = uve; zn.cover = fve; zn.data = dve; zn.extent = hve; zn.find = pve; zn.remove = gve; zn.removeAll = mve; zn.root = vve; zn.size = yve; zn.visit = bve; zn.visitAfter = wve; zn.x = Sve; zn.y = kve; function Rn(e) { return function () { return e } } function no(e) { return (e() - 0.5) * 1e-6 } function Tve(e) { return e.x + e.vx } function Cve(e) { return e.y + e.vy } function Eve(e) {
  let t; let n; let i; let s = 1; let l = 1; typeof e != 'function' && (e = Rn(e == null ? 1 : +e)); function u() {
    for (var p, g = t.length, v, y, w, L, $, A, E = 0; E < l; ++E) {
      for (v = Vp(t, Tve, Cve).visitAfter(f), p = 0; p < g; ++p)y = t[p], $ = n[y.index], A = $ * $, w = y.x + y.vx, L = y.y + y.vy, v.visit(M)
    } function M(O, k, z, D, te) { const ee = O.data; let W = O.r; let q = $ + W; if (ee) { if (ee.index > y.index) { let K = w - ee.x - ee.vx; let C = L - ee.y - ee.vy; let P = K * K + C * C; P < q * q && (K === 0 && (K = no(i), P += K * K), C === 0 && (C = no(i), P += C * C), P = (q - (P = Math.sqrt(P))) / P * s, y.vx += (K *= P) * (q = (W *= W) / (A + W)), y.vy += (C *= P) * q, ee.vx -= K * (q = 1 - q), ee.vy -= C * q) } return } return k > w + q || D < w - q || z > L + q || te < L - q }
  } function f(p) {
    if (p.data)
      return p.r = n[p.data.index]; for (let g = p.r = 0; g < 4; ++g)p[g] && p[g].r > p.r && (p.r = p[g].r)
  } function h() { if (t) { let p; const g = t.length; let v; for (n = new Array(g), p = 0; p < g; ++p)v = t[p], n[v.index] = +e(v, p, t) } } return u.initialize = function (p, g) { t = p, i = g, h() }, u.iterations = function (p) { return arguments.length ? (l = +p, u) : l }, u.strength = function (p) { return arguments.length ? (s = +p, u) : s }, u.radius = function (p) { return arguments.length ? (e = typeof p == 'function' ? p : Rn(+p), h(), u) : e }, u
} function Ave(e) { return e.index } function Ay(e, t) {
  const n = e.get(t); if (!n)
    throw new Error(`node not found: ${t}`); return n
} function Lve(e) {
  let t = Ave; let n = v; let i; let s = Rn(30); let l; let u; let f; let h; let p; let g = 1; e == null && (e = []); function v(A) { return 1 / Math.min(f[A.source.index], f[A.target.index]) } function y(A) {
    for (let E = 0, M = e.length; E < g; ++E) {
      for (var O = 0, k, z, D, te, ee, W, q; O < M; ++O)k = e[O], z = k.source, D = k.target, te = D.x + D.vx - z.x - z.vx || no(p), ee = D.y + D.vy - z.y - z.vy || no(p), W = Math.sqrt(te * te + ee * ee), W = (W - l[O]) / W * A * i[O], te *= W, ee *= W, D.vx -= te * (q = h[O]), D.vy -= ee * q, z.vx += te * (q = 1 - q), z.vy += ee * q
    }
  } function w() { if (u) { let A; const E = u.length; const M = e.length; const O = new Map(u.map((z, D) => [t(z, D, u), z])); let k; for (A = 0, f = new Array(E); A < M; ++A)k = e[A], k.index = A, typeof k.source != 'object' && (k.source = Ay(O, k.source)), typeof k.target != 'object' && (k.target = Ay(O, k.target)), f[k.source.index] = (f[k.source.index] || 0) + 1, f[k.target.index] = (f[k.target.index] || 0) + 1; for (A = 0, h = new Array(M); A < M; ++A)k = e[A], h[A] = f[k.source.index] / (f[k.source.index] + f[k.target.index]); i = new Array(M), L(), l = new Array(M), $() } } function L() {
    if (u) {
      for (let A = 0, E = e.length; A < E; ++A)i[A] = +n(e[A], A, e)
    }
  } function $() {
    if (u) {
      for (let A = 0, E = e.length; A < E; ++A)l[A] = +s(e[A], A, e)
    }
  } return y.initialize = function (A, E) { u = A, p = E, w() }, y.links = function (A) { return arguments.length ? (e = A, w(), y) : e }, y.id = function (A) { return arguments.length ? (t = A, y) : t }, y.iterations = function (A) { return arguments.length ? (g = +A, y) : g }, y.strength = function (A) { return arguments.length ? (n = typeof A == 'function' ? A : Rn(+A), L(), y) : n }, y.distance = function (A) { return arguments.length ? (s = typeof A == 'function' ? A : Rn(+A), $(), y) : s }, y
} const $ve = 1664525; const Mve = 1013904223; const Ly = 4294967296; function Nve() { let e = 1; return () => (e = ($ve * e + Mve) % Ly) / Ly } function Ive(e) { return e.x } function Pve(e) { return e.y } const Ove = 10; const Rve = Math.PI * (3 - Math.sqrt(5)); function zve(e) {
  let t; let n = 1; let i = 0.001; let s = 1 - i ** (1 / 300); let l = 0; let u = 0.6; const f = new Map(); const h = Wp(v); const p = Ka('tick', 'end'); let g = Nve(); e == null && (e = []); function v() { y(), p.call('tick', t), n < i && (h.stop(), p.call('end', t)) } function y($) {
    let A; const E = e.length; let M; $ === void 0 && ($ = 1); for (let O = 0; O < $; ++O) {
      for (n += (l - n) * s, f.forEach((k) => { k(n) }), A = 0; A < E; ++A)M = e[A], M.fx == null ? M.x += M.vx *= u : (M.x = M.fx, M.vx = 0), M.fy == null ? M.y += M.vy *= u : (M.y = M.fy, M.vy = 0)
    } return t
  } function w() { for (var $ = 0, A = e.length, E; $ < A; ++$) { if (E = e[$], E.index = $, E.fx != null && (E.x = E.fx), E.fy != null && (E.y = E.fy), isNaN(E.x) || isNaN(E.y)) { const M = Ove * Math.sqrt(0.5 + $); const O = $ * Rve; E.x = M * Math.cos(O), E.y = M * Math.sin(O) }(isNaN(E.vx) || isNaN(E.vy)) && (E.vx = E.vy = 0) } } function L($) { return $.initialize && $.initialize(e, g), $ } return w(), t = { tick: y, restart() { return h.restart(v), t }, stop() { return h.stop(), t }, nodes($) { return arguments.length ? (e = $, w(), f.forEach(L), t) : e }, alpha($) { return arguments.length ? (n = +$, t) : n }, alphaMin($) { return arguments.length ? (i = +$, t) : i }, alphaDecay($) { return arguments.length ? (s = +$, t) : +s }, alphaTarget($) { return arguments.length ? (l = +$, t) : l }, velocityDecay($) { return arguments.length ? (u = 1 - $, t) : 1 - u }, randomSource($) { return arguments.length ? (g = $, f.forEach(L), t) : g }, force($, A) { return arguments.length > 1 ? (A == null ? f.delete($) : f.set($, L(A)), t) : f.get($) }, find($, A, E) { let M = 0; const O = e.length; let k; let z; let D; let te; let ee; for (E == null ? E = 1 / 0 : E *= E, M = 0; M < O; ++M)te = e[M], k = $ - te.x, z = A - te.y, D = k * k + z * z, D < E && (ee = te, E = D); return ee }, on($, A) { return arguments.length > 1 ? (p.on($, A), t) : p.on($) } }
} function Dve() {
  let e; let t; let n; let i; let s = Rn(-30); let l; let u = 1; let f = 1 / 0; let h = 0.81; function p(w) { let L; const $ = e.length; const A = Vp(e, Ive, Pve).visitAfter(v); for (i = w, L = 0; L < $; ++L)t = e[L], A.visit(y) } function g() { if (e) { let w; const L = e.length; let $; for (l = new Array(L), w = 0; w < L; ++w)$ = e[w], l[$.index] = +s($, w, e) } } function v(w) {
    let L = 0; let $; let A; let E = 0; let M; let O; let k; if (w.length) { for (M = O = k = 0; k < 4; ++k)($ = w[k]) && (A = Math.abs($.value)) && (L += $.value, E += A, M += A * $.x, O += A * $.y); w.x = M / E, w.y = O / E }
    else { $ = w, $.x = $.data.x, $.y = $.data.y; do L += l[$.data.index]; while ($ = $.next) }w.value = L
  } function y(w, L, $, A) {
    if (!w.value)
      return !0; let E = w.x - t.x; let M = w.y - t.y; let O = A - L; let k = E * E + M * M; if (O * O / h < k)
      return k < f && (E === 0 && (E = no(n), k += E * E), M === 0 && (M = no(n), k += M * M), k < u && (k = Math.sqrt(u * k)), t.vx += E * w.value * i / k, t.vy += M * w.value * i / k), !0; if (w.length || k >= f)
      return; (w.data !== t || w.next) && (E === 0 && (E = no(n), k += E * E), M === 0 && (M = no(n), k += M * M), k < u && (k = Math.sqrt(u * k))); do w.data !== t && (O = l[w.data.index] * i / k, t.vx += E * O, t.vy += M * O); while (w = w.next)
  } return p.initialize = function (w, L) { e = w, n = L, g() }, p.strength = function (w) { return arguments.length ? (s = typeof w == 'function' ? w : Rn(+w), g(), p) : s }, p.distanceMin = function (w) { return arguments.length ? (u = w * w, p) : Math.sqrt(u) }, p.distanceMax = function (w) { return arguments.length ? (f = w * w, p) : Math.sqrt(f) }, p.theta = function (w) { return arguments.length ? (h = w * w, p) : Math.sqrt(h) }, p
} function Fve(e) { let t = Rn(0.1); let n; let i; let s; typeof e != 'function' && (e = Rn(e == null ? 0 : +e)); function l(f) { for (var h = 0, p = n.length, g; h < p; ++h)g = n[h], g.vx += (s[h] - g.x) * i[h] * f } function u() { if (n) { let f; const h = n.length; for (i = new Array(h), s = new Array(h), f = 0; f < h; ++f)i[f] = isNaN(s[f] = +e(n[f], f, n)) ? 0 : +t(n[f], f, n) } } return l.initialize = function (f) { n = f, u() }, l.strength = function (f) { return arguments.length ? (t = typeof f == 'function' ? f : Rn(+f), u(), l) : t }, l.x = function (f) { return arguments.length ? (e = typeof f == 'function' ? f : Rn(+f), u(), l) : e }, l } function Hve(e) { let t = Rn(0.1); let n; let i; let s; typeof e != 'function' && (e = Rn(e == null ? 0 : +e)); function l(f) { for (var h = 0, p = n.length, g; h < p; ++h)g = n[h], g.vy += (s[h] - g.y) * i[h] * f } function u() { if (n) { let f; const h = n.length; for (i = new Array(h), s = new Array(h), f = 0; f < h; ++f)i[f] = isNaN(s[f] = +e(n[f], f, n)) ? 0 : +t(n[f], f, n) } } return l.initialize = function (f) { n = f, u() }, l.strength = function (f) { return arguments.length ? (t = typeof f == 'function' ? f : Rn(+f), u(), l) : t }, l.y = function (f) { return arguments.length ? (e = typeof f == 'function' ? f : Rn(+f), u(), l) : e }, l } const Bve = Object.defineProperty; const Wve = (e, t, n) => t in e ? Bve(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n; const Mt = (e, t, n) => Wve(e, typeof t != 'symbol' ? `${t}` : t, n); function jve() { return { drag: { end: 0, start: 0.1 }, filter: { link: 1, type: 0.1, unlinked: { include: 0.1, exclude: 0.1 } }, focus: { acquire: () => 0.1, release: () => 0.1 }, initialize: 1, labels: { links: { hide: 0, show: 0 }, nodes: { hide: 0, show: 0 } }, resize: 0.5 } } function $y(e) { if (typeof e == 'object' && e !== null) { if (typeof Object.getPrototypeOf == 'function') { const t = Object.getPrototypeOf(e); return t === Object.prototype || t === null } return Object.prototype.toString.call(e) === '[object Object]' } return !1 } function ro(...e) {
  return e.reduce((t, n) => {
    if (Array.isArray(n))
      throw new TypeError('Arguments provided to deepmerge must be objects, not arrays.'); return Object.keys(n).forEach((i) => { ['__proto__', 'constructor', 'prototype'].includes(i) || (Array.isArray(t[i]) && Array.isArray(n[i]) ? t[i] = ro.options.mergeArrays ? Array.from(new Set(t[i].concat(n[i]))) : n[i] : $y(t[i]) && $y(n[i]) ? t[i] = ro(t[i], n[i]) : t[i] = n[i]) }), t
  }, {})
} const K1 = { mergeArrays: !0 }; ro.options = K1; ro.withOptions = (e, ...t) => { ro.options = { mergeArrays: !0, ...e }; const n = ro(...t); return ro.options = K1, n }; function qve() { return { centering: { enabled: !0, strength: 0.1 }, charge: { enabled: !0, strength: -1 }, collision: { enabled: !0, strength: 1, radiusMultiplier: 2 }, link: { enabled: !0, strength: 1, length: 128 } } } function Uve() { return { includeUnlinked: !0, linkFilter: () => !0, nodeTypeFilter: void 0, showLinkLabels: !0, showNodeLabels: !0 } } function J1(e) { e.preventDefault(), e.stopPropagation() } function Y1(e) { return typeof e == 'number' } function yo(e, t) { return Y1(e.nodeRadius) ? e.nodeRadius : e.nodeRadius(t) } function Vve(e) { return `${e.source.id}-${e.target.id}` } function Z1(e) { return `link-arrow-${e}`.replace(/[()]/g, '~') } function Gve(e) { return `url(#${Z1(e.color)})` } function Xve(e) { return { size: e, padding: (t, n) => yo(n, t) + 2 * e, ref: [e / 2, e / 2], path: [[0, 0], [0, e], [e, e / 2]], viewBox: [0, 0, e, e].join(',') } } const Q1 = { Arrow: e => Xve(e) }; const Kve = (e, t, n) => [t / 2, n / 2]; const Jve = (e, t, n) => [My(0, t), My(0, n)]; function My(e, t) { return Math.random() * (t - e) + e } const Hh = { Centered: Kve, Randomized: Jve }; function Yve() { return { autoResize: !1, callbacks: {}, hooks: {}, initial: Uve(), nodeRadius: 16, marker: Q1.Arrow(4), modifiers: {}, positionInitializer: Hh.Centered, simulation: { alphas: jve(), forces: qve() }, zoom: { initial: 1, min: 0.1, max: 2 } } } function Zve(e = {}) { return ro.withOptions({ mergeArrays: !1 }, Yve(), e) } function Qve({ applyZoom: e, container: t, onDoubleClick: n, onPointerMoved: i, onPointerUp: s, offset: [l, u], scale: f, zoom: h }) { const p = t.classed('graph', !0).append('svg').attr('height', '100%').attr('width', '100%').call(h).on('contextmenu', g => J1(g)).on('dblclick', g => n == null ? void 0 : n(g)).on('dblclick.zoom', null).on('pointermove', g => i == null ? void 0 : i(g)).on('pointerup', g => s == null ? void 0 : s(g)).style('cursor', 'grab'); return e && p.call(h.transform, Up.translate(l, u).scale(f)), p.append('g') } function e0e({ canvas: e, scale: t, xOffset: n, yOffset: i }) { e == null || e.attr('transform', `translate(${n},${i})scale(${t})`) } function t0e({ config: e, onDragStart: t, onDragEnd: n }) { let i, s; const l = yge().filter(u => u.type === 'mousedown' ? u.button === 0 : u.type === 'touchstart' ? u.touches.length === 1 : !1).on('start', (u, f) => { u.active === 0 && t(u, f), Gn(u.sourceEvent.target).classed('grabbed', !0), f.fx = f.x, f.fy = f.y }).on('drag', (u, f) => { f.fx = u.x, f.fy = u.y }).on('end', (u, f) => { u.active === 0 && n(u, f), Gn(u.sourceEvent.target).classed('grabbed', !1), f.fx = void 0, f.fy = void 0 }); return (s = (i = e.modifiers).drag) == null || s.call(i, l), l } function n0e({ graph: e, filter: t, focusedNode: n, includeUnlinked: i, linkFilter: s }) { const l = e.links.filter(h => t.includes(h.source.type) && t.includes(h.target.type) && s(h)); const u = h => l.find(p => p.source.id === h.id || p.target.id === h.id) !== void 0; const f = e.nodes.filter(h => t.includes(h.type) && (i || u(h))); return n === void 0 || !t.includes(n.type) ? { nodes: f, links: l } : r0e({ links: l }, n) } function r0e(e, t) { const n = [...i0e(e, t), ...o0e(e, t)]; const i = n.flatMap(s => [s.source, s.target]); return { nodes: [...new Set([...i, t])], links: [...new Set(n)] } } function i0e(e, t) { return eS(e, t, (n, i) => n.target.id === i.id) } function o0e(e, t) { return eS(e, t, (n, i) => n.source.id === i.id) } function eS(e, t, n) {
  const i = new Set(e.links); const s = new Set([t]); const l = []; for (;i.size > 0;) {
    const u = [...i].filter(f => [...s].some(h => n(f, h))); if (u.length === 0)
      return l; u.forEach((f) => { s.add(f.source), s.add(f.target), l.push(f), i.delete(f) })
  } return l
} function Bh(e) { return e.x ?? 0 } function Wh(e) { return e.y ?? 0 } function Xp({ source: e, target: t }) { const n = new Nn(Bh(e), Wh(e)); const i = new Nn(Bh(t), Wh(t)); const s = i.subtract(n); const l = s.length(); const u = s.normalize(); const f = u.multiply(-1); return { s: n, t: i, dist: l, norm: u, endNorm: f } } function tS({ center: e, node: t }) { const n = new Nn(Bh(t), Wh(t)); let i = e; return n.x === i.x && n.y === i.y && (i = i.add(new Nn(0, 1))), { n, c: i } } function nS({ config: e, source: t, target: n }) { const { s: i, t: s, norm: l } = Xp({ source: t, target: n }); const u = i.add(l.multiply(yo(e, t) - 1)); const f = s.subtract(l.multiply(e.marker.padding(n, e))); return { start: u, end: f } } function s0e(e) {
  const { start: t, end: n } = nS(e); return `M${t.x},${t.y}
          L${n.x},${n.y}`
} function l0e(e) { const { start: t, end: n } = nS(e); const i = n.subtract(t).multiply(0.5); const s = t.add(i); return `translate(${s.x - 8},${s.y - 4})` } function a0e({ config: e, source: t, target: n }) {
  const { s: i, t: s, dist: l, norm: u, endNorm: f } = Xp({ source: t, target: n }); const h = 10; const p = u.rotateByDegrees(-10).multiply(yo(e, t) - 1).add(i); const g = f.rotateByDegrees(h).multiply(yo(e, n)).add(s).add(f.rotateByDegrees(h).multiply(2 * e.marker.size)); const v = 1.2 * l; return `M${p.x},${p.y}
          A${v},${v},0,0,1,${g.x},${g.y}`
} function c0e({ center: e, config: t, node: n }) {
  const { n: i, c: s } = tS({ center: e, node: n }); const l = yo(t, n); const u = i.subtract(s); const f = u.multiply(1 / u.length()); const h = f.rotateByDegrees(40).multiply(l - 1).add(i); const p = f.rotateByDegrees(-40).multiply(l).add(i).add(f.rotateByDegrees(-40).multiply(2 * t.marker.size)); return `M${h.x},${h.y}
          A${l},${l},0,1,0,${p.x},${p.y}`
} function u0e({ config: e, source: t, target: n }) { const { t: i, dist: s, endNorm: l } = Xp({ source: t, target: n }); const u = l.rotateByDegrees(10).multiply(0.5 * s).add(i); return `translate(${u.x},${u.y})` } function f0e({ center: e, config: t, node: n }) { const { n: i, c: s } = tS({ center: e, node: n }); const l = i.subtract(s); const u = l.multiply(1 / l.length()).multiply(3 * yo(t, n) + 8).add(i); return `translate(${u.x},${u.y})` } const Xs = { line: { labelTransform: l0e, path: s0e }, arc: { labelTransform: u0e, path: a0e }, reflexive: { labelTransform: f0e, path: c0e } }; function d0e(e) { return e.append('g').classed('links', !0).selectAll('path') } function h0e({ config: e, graph: t, selection: n, showLabels: i }) { const s = n == null ? void 0 : n.data(t.links, l => Vve(l)).join((l) => { let u, f, h, p; const g = l.append('g'); const v = g.append('path').classed('link', !0).style('marker-end', w => Gve(w)).style('stroke', w => w.color); (f = (u = e.modifiers).link) == null || f.call(u, v); const y = g.append('text').classed('link__label', !0).style('fill', w => w.label ? w.label.color : null).style('font-size', w => w.label ? w.label.fontSize : null).text(w => w.label ? w.label.text : null); return (p = (h = e.modifiers).linkLabel) == null || p.call(h, y), g }); return s == null || s.select('.link__label').attr('opacity', l => l.label && i ? 1 : 0), s } function p0e(e) { g0e(e), m0e(e) } function g0e({ center: e, config: t, graph: n, selection: i }) { i == null || i.selectAll('path').attr('d', s => s.source.x === void 0 || s.source.y === void 0 || s.target.x === void 0 || s.target.y === void 0 ? '' : s.source.id === s.target.id ? Xs.reflexive.path({ config: t, node: s.source, center: e }) : rS(n, s.source, s.target) ? Xs.arc.path({ config: t, source: s.source, target: s.target }) : Xs.line.path({ config: t, source: s.source, target: s.target })) } function m0e({ config: e, center: t, graph: n, selection: i }) { i == null || i.select('.link__label').attr('transform', s => s.source.x === void 0 || s.source.y === void 0 || s.target.x === void 0 || s.target.y === void 0 ? 'translate(0, 0)' : s.source.id === s.target.id ? Xs.reflexive.labelTransform({ config: e, node: s.source, center: t }) : rS(n, s.source, s.target) ? Xs.arc.labelTransform({ config: e, source: s.source, target: s.target }) : Xs.line.labelTransform({ config: e, source: s.source, target: s.target })) } function rS(e, t, n) { return t.id !== n.id && e.links.some(i => i.target.id === t.id && i.source.id === n.id) && e.links.some(i => i.target.id === n.id && i.source.id === t.id) } function v0e(e) { return e.append('defs').selectAll('marker') } function y0e({ config: e, graph: t, selection: n }) { return n == null ? void 0 : n.data(b0e(t), i => i).join((i) => { const s = i.append('marker').attr('id', l => Z1(l)).attr('markerHeight', 4 * e.marker.size).attr('markerWidth', 4 * e.marker.size).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto').attr('refX', e.marker.ref[0]).attr('refY', e.marker.ref[1]).attr('viewBox', e.marker.viewBox).style('fill', l => l); return s.append('path').attr('d', w0e(e.marker.path)), s }) } function b0e(e) { return [...new Set(e.links.map(t => t.color))] } function w0e(e) {
  const [t, ...n] = e; if (!t)
    return 'M0,0'; const [i, s] = t; return n.reduce((l, [u, f]) => `${l}L${u},${f}`, `M${i},${s}`)
} function x0e(e) { return e.append('g').classed('nodes', !0).selectAll('circle') } function S0e({ config: e, drag: t, graph: n, onNodeContext: i, onNodeSelected: s, selection: l, showLabels: u }) { const f = l == null ? void 0 : l.data(n.nodes, h => h.id).join((h) => { let p, g, v, y; const w = h.append('g'); t !== void 0 && w.call(t); const L = w.append('circle').classed('node', !0).attr('r', A => yo(e, A)).on('contextmenu', (A, E) => { J1(A), i(E) }).on('pointerdown', (A, E) => k0e(A, E, s ?? i)).style('fill', A => A.color); (g = (p = e.modifiers).node) == null || g.call(p, L); const $ = w.append('text').classed('node__label', !0).attr('dy', '0.33em').style('fill', A => A.label ? A.label.color : null).style('font-size', A => A.label ? A.label.fontSize : null).style('stroke', 'none').text(A => A.label ? A.label.text : null); return (y = (v = e.modifiers).nodeLabel) == null || y.call(v, $), w }); return f == null || f.select('.node').classed('focused', h => h.isFocused), f == null || f.select('.node__label').attr('opacity', u ? 1 : 0), f } const _0e = 500; function k0e(e, t, n) {
  if (e.button !== void 0 && e.button !== 0)
    return; const i = t.lastInteractionTimestamp; const s = Date.now(); if (i === void 0 || s - i > _0e) { t.lastInteractionTimestamp = s; return }t.lastInteractionTimestamp = void 0, n(t)
} function T0e(e) { e == null || e.attr('transform', t => `translate(${t.x ?? 0},${t.y ?? 0})`) } function C0e({ center: e, config: t, graph: n, onTick: i }) { let s, l; const u = zve(n.nodes); const f = t.simulation.forces.centering; if (f && f.enabled) { const v = f.strength; u.force('x', Fve(() => e().x).strength(v)).force('y', Hve(() => e().y).strength(v)) } const h = t.simulation.forces.charge; h && h.enabled && u.force('charge', Dve().strength(h.strength)); const p = t.simulation.forces.collision; p && p.enabled && u.force('collision', Eve().radius(v => p.radiusMultiplier * yo(t, v))); const g = t.simulation.forces.link; return g && g.enabled && u.force('link', Lve(n.links).id(v => v.id).distance(t.simulation.forces.link.length).strength(g.strength)), u.on('tick', () => i()), (l = (s = t.modifiers).simulation) == null || l.call(s, u), u } function E0e({ canvasContainer: e, config: t, min: n, max: i, onZoom: s }) { let l, u; const f = ave().scaleExtent([n, i]).filter((h) => { let p; return h.button === 0 || ((p = h.touches) == null ? void 0 : p.length) >= 2 }).on('start', () => e().classed('grabbed', !0)).on('zoom', h => s(h)).on('end', () => e().classed('grabbed', !1)); return (u = (l = t.modifiers).zoom) == null || u.call(l, f), f } class A0e {
  constructor(t, n, i) { if (Mt(this, 'nodeTypes'), Mt(this, '_nodeTypeFilter'), Mt(this, '_includeUnlinked', !0), Mt(this, '_linkFilter', () => !0), Mt(this, '_showLinkLabels', !0), Mt(this, '_showNodeLabels', !0), Mt(this, 'filteredGraph'), Mt(this, 'width', 0), Mt(this, 'height', 0), Mt(this, 'simulation'), Mt(this, 'canvas'), Mt(this, 'linkSelection'), Mt(this, 'nodeSelection'), Mt(this, 'markerSelection'), Mt(this, 'zoom'), Mt(this, 'drag'), Mt(this, 'xOffset', 0), Mt(this, 'yOffset', 0), Mt(this, 'scale'), Mt(this, 'focusedNode'), Mt(this, 'resizeObserver'), Mt(this, 'container'), Mt(this, 'graph'), Mt(this, 'config'), this.container = t, this.graph = n, this.config = i, this.scale = i.zoom.initial, this.resetView(), this.graph.nodes.forEach((s) => { const [l, u] = i.positionInitializer(s, this.effectiveWidth, this.effectiveHeight); s.x = s.x ?? l, s.y = s.y ?? u }), this.nodeTypes = [...new Set(n.nodes.map(s => s.type))], this._nodeTypeFilter = [...this.nodeTypes], i.initial) { const { includeUnlinked: s, nodeTypeFilter: l, linkFilter: u, showLinkLabels: f, showNodeLabels: h } = i.initial; this._includeUnlinked = s ?? this._includeUnlinked, this._showLinkLabels = f ?? this._showLinkLabels, this._showNodeLabels = h ?? this._showNodeLabels, this._nodeTypeFilter = l ?? this._nodeTypeFilter, this._linkFilter = u ?? this._linkFilter } this.filterGraph(void 0), this.initGraph(), this.restart(i.simulation.alphas.initialize), i.autoResize && (this.resizeObserver = new ResizeObserver(Ahe(() => this.resize())), this.resizeObserver.observe(this.container)) } get nodeTypeFilter() { return this._nodeTypeFilter } get includeUnlinked() { return this._includeUnlinked } set includeUnlinked(t) { this._includeUnlinked = t, this.filterGraph(this.focusedNode); const { include: n, exclude: i } = this.config.simulation.alphas.filter.unlinked; const s = t ? n : i; this.restart(s) } set linkFilter(t) { this._linkFilter = t, this.filterGraph(this.focusedNode), this.restart(this.config.simulation.alphas.filter.link) } get linkFilter() { return this._linkFilter } get showNodeLabels() { return this._showNodeLabels } set showNodeLabels(t) { this._showNodeLabels = t; const { hide: n, show: i } = this.config.simulation.alphas.labels.nodes; const s = t ? i : n; this.restart(s) } get showLinkLabels() { return this._showLinkLabels } set showLinkLabels(t) { this._showLinkLabels = t; const { hide: n, show: i } = this.config.simulation.alphas.labels.links; const s = t ? i : n; this.restart(s) } get effectiveWidth() { return this.width / this.scale } get effectiveHeight() { return this.height / this.scale } get effectiveCenter() { return Nn.of([this.width, this.height]).divide(2).subtract(Nn.of([this.xOffset, this.yOffset])).divide(this.scale) }resize() {
    const t = this.width; const n = this.height; const i = this.container.getBoundingClientRect().width; const s = this.container.getBoundingClientRect().height; const l = t.toFixed() !== i.toFixed(); const u = n.toFixed() !== s.toFixed(); if (!l && !u)
      return; this.width = this.container.getBoundingClientRect().width, this.height = this.container.getBoundingClientRect().height; const f = this.config.simulation.alphas.resize; this.restart(Y1(f) ? f : f({ oldWidth: t, oldHeight: n, newWidth: i, newHeight: s }))
  }

  restart(t) { let n; this.markerSelection = y0e({ config: this.config, graph: this.filteredGraph, selection: this.markerSelection }), this.linkSelection = h0e({ config: this.config, graph: this.filteredGraph, selection: this.linkSelection, showLabels: this._showLinkLabels }), this.nodeSelection = S0e({ config: this.config, drag: this.drag, graph: this.filteredGraph, onNodeContext: i => this.toggleNodeFocus(i), onNodeSelected: this.config.callbacks.nodeClicked, selection: this.nodeSelection, showLabels: this._showNodeLabels }), (n = this.simulation) == null || n.stop(), this.simulation = C0e({ center: () => this.effectiveCenter, config: this.config, graph: this.filteredGraph, onTick: () => this.onTick() }).alpha(t).restart() }filterNodesByType(t, n) { t ? this._nodeTypeFilter.push(n) : this._nodeTypeFilter = this._nodeTypeFilter.filter(i => i !== n), this.filterGraph(this.focusedNode), this.restart(this.config.simulation.alphas.filter.type) }shutdown() { let t, n; this.focusedNode !== void 0 && (this.focusedNode.isFocused = !1, this.focusedNode = void 0), (t = this.resizeObserver) == null || t.unobserve(this.container), (n = this.simulation) == null || n.stop() }initGraph() { this.zoom = E0e({ config: this.config, canvasContainer: () => Gn(this.container).select('svg'), min: this.config.zoom.min, max: this.config.zoom.max, onZoom: t => this.onZoom(t) }), this.canvas = Qve({ applyZoom: this.scale !== 1, container: Gn(this.container), offset: [this.xOffset, this.yOffset], scale: this.scale, zoom: this.zoom }), this.applyZoom(), this.linkSelection = d0e(this.canvas), this.nodeSelection = x0e(this.canvas), this.markerSelection = v0e(this.canvas), this.drag = t0e({ config: this.config, onDragStart: () => { let t; return (t = this.simulation) == null ? void 0 : t.alphaTarget(this.config.simulation.alphas.drag.start).restart() }, onDragEnd: () => { let t; return (t = this.simulation) == null ? void 0 : t.alphaTarget(this.config.simulation.alphas.drag.end).restart() } }) }onTick() { T0e(this.nodeSelection), p0e({ config: this.config, center: this.effectiveCenter, graph: this.filteredGraph, selection: this.linkSelection }) }resetView() { let t; (t = this.simulation) == null || t.stop(), Gn(this.container).selectChildren().remove(), this.zoom = void 0, this.canvas = void 0, this.linkSelection = void 0, this.nodeSelection = void 0, this.markerSelection = void 0, this.simulation = void 0, this.width = this.container.getBoundingClientRect().width, this.height = this.container.getBoundingClientRect().height }onZoom(t) { let n, i, s; this.xOffset = t.transform.x, this.yOffset = t.transform.y, this.scale = t.transform.k, this.applyZoom(), (i = (n = this.config.hooks).afterZoom) == null || i.call(n, this.scale, this.xOffset, this.yOffset), (s = this.simulation) == null || s.restart() }applyZoom() { e0e({ canvas: this.canvas, scale: this.scale, xOffset: this.xOffset, yOffset: this.yOffset }) }toggleNodeFocus(t) { t.isFocused ? (this.filterGraph(void 0), this.restart(this.config.simulation.alphas.focus.release(t))) : this.focusNode(t) }focusNode(t) { this.filterGraph(t), this.restart(this.config.simulation.alphas.focus.acquire(t)) }filterGraph(t) { this.focusedNode !== void 0 && (this.focusedNode.isFocused = !1, this.focusedNode = void 0), t !== void 0 && this._nodeTypeFilter.includes(t.type) && (t.isFocused = !0, this.focusedNode = t), this.filteredGraph = n0e({ graph: this.graph, filter: this._nodeTypeFilter, focusedNode: this.focusedNode, includeUnlinked: this._includeUnlinked, linkFilter: this._linkFilter }) }
} function Ny({ nodes: e, links: t }) { return { nodes: e ?? [], links: t ?? [] } } function L0e(e) { return { ...e } } function iS(e) { return { ...e, isFocused: !1, lastInteractionTimestamp: void 0 } } const $0e = { 'h-full': '', 'min-h-75': '', 'flex-1': '', 'overflow': 'hidden' }; const M0e = { 'flex': '', 'items-center': '', 'gap-4': '', 'px-3': '', 'py-2': '' }; const N0e = { 'flex': '~ gap-1', 'items-center': '', 'select-none': '' }; const I0e = ['id', 'checked', 'onChange']; const P0e = ['for']; const O0e = at({ __name: 'ViewModuleGraph', props: pa({ graph: {}, projectName: {} }, { modelValue: { type: Boolean, required: !0 }, modelModifiers: {} }), emits: ['update:modelValue'], setup(e) {
  const t = e; const n = ef(e, 'modelValue'); const { graph: i } = lT(t); const s = Ue(); const l = Ue(!1); const u = Ue(); const f = Ue(); hp(() => { l.value === !1 && setTimeout(() => u.value = void 0, 300) }, { flush: 'post' }), bo(() => { g() }), Zu(() => { let w; (w = f.value) == null || w.shutdown() }), St(i, () => g()); function h(w, L) { let $; ($ = f.value) == null || $.filterNodesByType(L, w) } function p(w) { u.value = w, l.value = !0 } function g(w = !1) { let L; if ((L = f.value) == null || L.shutdown(), w && !n.value) { n.value = !0; return }!i.value || !s.value || (f.value = new A0e(s.value, i.value, Zve({ nodeRadius: 10, autoResize: !0, simulation: { alphas: { initialize: 1, resize: ({ newHeight: $, newWidth: A }) => $ === 0 && A === 0 ? 0 : 0.25 }, forces: { collision: { radiusMultiplier: 10 }, link: { length: 240 } } }, marker: Q1.Arrow(2), modifiers: { node: y }, positionInitializer: i.value.nodes.length > 1 ? Hh.Randomized : Hh.Centered, zoom: { min: 0.5, max: 2 } }))) } const v = w => w.button === 0; function y(w) {
    if (pr)
      return; let L = 0; let $ = 0; let A = 0; w.on('pointerdown', (E, M) => { M.type !== 'external' && (!M.x || !M.y || !v(E) || (L = M.x, $ = M.y, A = Date.now())) }).on('pointerup', (E, M) => {
      if (M.type === 'external' || !M.x || !M.y || !v(E) || Date.now() - A > 500)
        return; const O = M.x - L; const k = M.y - $; O ** 2 + k ** 2 < 100 && p(M.id)
    })
  } return (w, L) => { let O; const $ = ri; const A = Ehe; const E = zp; const M = Dr('tooltip'); return se(), ye('div', $0e, [ne('div', null, [ne('div', M0e, [ne('div', N0e, [ct(ne('input', { 'id': 'hide-node-modules', 'onUpdate:modelValue': L[0] || (L[0] = k => n.value = k), 'type': 'checkbox' }, null, 512), [[xw, n.value]]), L[4] || (L[4] = ne('label', { 'font-light': '', 'text-sm': '', 'ws-nowrap': '', 'overflow-hidden': '', 'select-none': '', 'truncate': '', 'for': 'hide-node-modules', 'border-b-2': '', 'border': '$cm-namespace' }, 'Hide node_modules', -1))]), (se(!0), ye(nt, null, hr((O = j(f)) == null ? void 0 : O.nodeTypes.sort(), (k) => { let z; return se(), ye('div', { 'key': k, 'flex': '~ gap-1', 'items-center': '', 'select-none': '' }, [ne('input', { id: `type-${k}`, type: 'checkbox', checked: (z = j(f)) == null ? void 0 : z.nodeTypeFilter.includes(k), onChange: D => h(k, D.target.checked) }, null, 40, I0e), ne('label', { 'font-light': '', 'text-sm': '', 'ws-nowrap': '', 'overflow-hidden': '', 'capitalize': '', 'select-none': '', 'truncate': '', 'for': `type-${k}`, 'border-b-2': '', 'style': nn({ 'border-color': `var(--color-node-${k})` }) }, `${Re(k)} Modules`, 13, P0e)]) }), 128)), L[5] || (L[5] = ne('div', { 'flex-auto': '' }, null, -1)), ne('div', null, [ct(Ie($, { icon: 'i-carbon-reset', onClick: L[1] || (L[1] = k => g(!0)) }, null, 512), [[M, 'Reset', void 0, { bottom: !0 }]])])])]), ne('div', { ref_key: 'el', ref: s }, null, 512), Ie(E, { 'modelValue': j(l), 'onUpdate:modelValue': L[3] || (L[3] = k => kt(l) ? l.value = k : null), 'direction': 'right' }, { default: it(() => [j(u) ? (se(), Ye(gp, { key: 0 }, { default: it(() => [Ie(A, { 'id': j(u), 'project-name': w.projectName, 'onClose': L[2] || (L[2] = k => l.value = !1) }, null, 8, ['id', 'project-name'])]), _: 1 })) : je('', !0)]), _: 1 }, 8, ['modelValue'])]) }
} }); const R0e = { 'key': 0, 'text-green-500': '', 'flex-shrink-0': '', 'i-carbon:checkmark': '' }; const z0e = { 'key': 1, 'text-red-500': '', 'flex-shrink-0': '', 'i-carbon:compare': '' }; const D0e = { 'key': 2, 'text-red-500': '', 'flex-shrink-0': '', 'i-carbon:close': '' }; const F0e = { 'key': 3, 'text-gray-500': '', 'flex-shrink-0': '', 'i-carbon:document-blank': '' }; const H0e = { 'key': 4, 'text-gray-500': '', 'flex-shrink-0': '', 'i-carbon:redo': '', 'rotate-90': '' }; const B0e = { 'key': 5, 'text-yellow-500': '', 'flex-shrink-0': '', 'i-carbon:circle-dash': '', 'animate-spin': '' }; const oS = at({ __name: 'StatusIcon', props: { state: {}, mode: {}, failedSnapshot: { type: Boolean } }, setup(e) { return (t, n) => { const i = Dr('tooltip'); return t.state === 'pass' ? (se(), ye('div', R0e)) : t.failedSnapshot ? ct((se(), ye('div', z0e, null, 512)), [[i, 'Contains failed snapshot', void 0, { right: !0 }]]) : t.state === 'fail' ? (se(), ye('div', D0e)) : t.mode === 'todo' ? ct((se(), ye('div', F0e, null, 512)), [[i, 'Todo', void 0, { right: !0 }]]) : t.mode === 'skip' || t.state === 'skip' ? ct((se(), ye('div', H0e, null, 512)), [[i, 'Skipped', void 0, { right: !0 }]]) : (se(), ye('div', B0e)) } } }); function W0e(e) {
  const t = new Map(); const n = new Map(); const i = []; for (;;) {
    let s = 0; if (e.forEach((l, u) => { let g; const { splits: f, finished: h } = l; if (h) { s++; const { raw: v, candidate: y } = l; t.set(v, y); return } if (f.length === 0) { l.finished = !0; return } const p = f[0]; n.has(p) ? (l.candidate += l.candidate === '' ? p : `/${p}`, (g = n.get(p)) == null || g.push(u), f.shift()) : (n.set(p, [u]), i.push(u)) }), i.forEach((l) => { const u = e[l]; const f = u.splits.shift(); u.candidate += u.candidate === '' ? f : `/${f}` }), n.forEach((l) => { if (l.length === 1) { const u = l[0]; e[u].finished = !0 } }), n.clear(), i.length = 0, s === e.length)
      break
  } return t
} function j0e(e) { let t = e; t.includes('/node_modules/') && (t = e.split(/\/node_modules\//g).pop()); const n = t.split(/\//g); return { raw: t, splits: n, candidate: '', finished: !1, id: e } } function q0e(e) { const t = e.map(i => j0e(i)); const n = W0e(t); return t.map(({ raw: i, id: s }) => iS({ color: 'var(--color-node-external)', label: { color: 'var(--color-node-external)', fontSize: '0.875rem', text: n.get(i) ?? '' }, isFocused: !1, id: s, type: 'external' })) } function U0e(e, t) { return iS({ color: t ? 'var(--color-node-root)' : 'var(--color-node-inline)', label: { color: t ? 'var(--color-node-root)' : 'var(--color-node-inline)', fontSize: '0.875rem', text: e.split(/\//g).pop() }, isFocused: !1, id: e, type: 'inline' }) } function V0e(e, t) {
  if (!e)
    return Ny({}); const n = q0e(e.externalized); const i = e.inlined.map(f => U0e(f, f === t)) ?? []; const s = [...n, ...i]; const l = Object.fromEntries(s.map(f => [f.id, f])); const u = Object.entries(e.graph).flatMap(([f, h]) => h.map((p) => {
    const g = l[f]; const v = l[p]; if (!(g === void 0 || v === void 0))
      return L0e({ source: g, target: v, color: 'var(--color-link)', label: !1 })
  }).filter(p => p !== void 0)); return Ny({ nodes: s, links: u })
} const G0e = { 'key': 0, 'flex': '', 'flex-col': '', 'h-full': '', 'max-h-full': '', 'overflow-hidden': '', 'data-testid': 'file-detail' }; const X0e = { 'p': '2', 'h-10': '', 'flex': '~ gap-2', 'items-center': '', 'bg-header': '', 'border': 'b base' }; const K0e = { 'key': 0, 'class': 'i-logos:typescript-icon', 'flex-shrink-0': '' }; const J0e = { 'flex-1': '', 'font-light': '', 'op-50': '', 'ws-nowrap': '', 'truncate': '', 'text-sm': '' }; const Y0e = { class: 'flex text-lg' }; const Z0e = { 'flex': '~', 'items-center': '', 'bg-header': '', 'border': 'b-2 base', 'text-sm': '', 'h-41px': '' }; const Q0e = { key: 0, class: 'block w-1.4em h-1.4em i-carbon:circle-dash animate-spin animate-2s' }; const eye = { key: 1, class: 'block w-1.4em h-1.4em i-carbon:chart-relationship' }; const tye = { 'flex': '', 'flex-col': '', 'flex-1': '', 'overflow': 'hidden' }; const nye = ['flex-1']; const rye = at({ __name: 'FileDetails', setup(e) {
  const t = Ue({ nodes: [], links: [] }); const n = Ue(!1); const i = Ue(!1); const s = Ue(!1); const l = Ue(void 0); const u = Ue(!0); const f = _e(() => js.value ? ht.state.idMap.get(js.value) : void 0); const h = _e(() => {
    const k = qt.value; if (!(!k || !k.filepath))
      return { filepath: k.filepath, projectName: k.file.projectName || '' }
  }); const p = _e(() => qt.value && Np(qt.value)); const g = _e(() => { let k, z; return !!((z = (k = qt.value) == null ? void 0 : k.meta) != null && z.typecheck) }); function v() { let z; const k = (z = qt.value) == null ? void 0 : z.filepath; k && fetch(`/__open-in-editor?file=${encodeURIComponent(k)}`) } function y(k) { k === 'graph' && (i.value = !0), jn.value = k } const w = _e(() => { let k; return ((k = f1.value) == null ? void 0 : k.reduce((z, { size: D }) => z + D, 0)) ?? 0 }); function L(k) { n.value = k } const $ = /[/\\]node_modules[/\\]/; async function A(k = !1) {
    let z; if (!(s.value || ((z = h.value) == null ? void 0 : z.filepath) === l.value && !k)) {
      s.value = !0, await Et(); try { const D = h.value; if (!D) { s.value = !1; return } if (k || !l.value || D.filepath !== l.value || !t.value.nodes.length && !t.value.links.length) { let te = await ht.rpc.getModuleGraph(D.projectName, D.filepath, !!Nt); u.value && (pr && (te = typeof window.structuredClone < 'u' ? window.structuredClone(te) : z$(te)), te.inlined = te.inlined.filter(ee => !$.test(ee)), te.externalized = te.externalized.filter(ee => !$.test(ee))), t.value = V0e(te, D.filepath), l.value = D.filepath }y('graph') }
      finally { await new Promise(D => setTimeout(D, 100)), s.value = !1 }
    }
  }Lp(() => [h.value, jn.value, u.value], ([,k, z], D) => { k === 'graph' && A(D && z !== D[2]) }, { debounce: 100, immediate: !0 }); const E = _e(() => { let z, D; const k = ((z = qt.value) == null ? void 0 : z.file.projectName) || ''; return Ae.colors.get(k) || Bx((D = qt.value) == null ? void 0 : D.file.projectName) }); const M = _e(() => Wx(E.value)); const O = _e(() => {
    let te; const k = js.value; if (!k)
      return (te = qt.value) == null ? void 0 : te.name; const z = []; let D = ht.state.idMap.get(k); for (;D;)z.push(D.name), D = D.suite ? D.suite : D === D.file ? void 0 : D.file; return z.reverse().join(' > ')
  }); return (k, z) => { let I, S, R; const D = oS; const te = ri; const ee = O0e; const W = bhe; const q = yhe; const K = dhe; const C = ihe; const P = Dr('tooltip'); return j(qt) ? (se(), ye('div', G0e, [ne('div', null, [ne('div', X0e, [Ie(D, { 'state': (I = j(qt).result) == null ? void 0 : I.state, 'mode': j(qt).mode, 'failed-snapshot': j(p) }, null, 8, ['state', 'mode', 'failed-snapshot']), j(g) ? ct((se(), ye('div', K0e, null, 512)), [[P, 'This is a typecheck test. It won\'t report results of the runtime tests', void 0, { bottom: !0 }]]) : je('', !0), (S = j(qt)) != null && S.file.projectName ? (se(), ye('span', { key: 1, class: 'rounded-full py-0.5 px-2 text-xs font-light', style: nn({ backgroundColor: j(E), color: j(M) }) }, Re(j(qt).file.projectName), 5)) : je('', !0), ne('div', J0e, Re(j(O)), 1), ne('div', Y0e, [j(pr) ? je('', !0) : ct((se(), Ye(te, { key: 0, title: 'Open in editor', icon: 'i-carbon-launch', disabled: !((R = j(qt)) != null && R.filepath), onClick: v }, null, 8, ['disabled'])), [[P, 'Open in editor', void 0, { bottom: !0 }]])])]), ne('div', Z0e, [ne('button', { 'tab-button': '', 'class': ot(['flex items-center gap-2', { 'tab-button-active': j(jn) == null }]), 'data-testid': 'btn-report', 'onClick': z[0] || (z[0] = B => y(null)) }, z[5] || (z[5] = [ne('span', { class: 'block w-1.4em h-1.4em i-carbon:report' }, null, -1), dt(' Report ')]), 2), ne('button', { 'tab-button': '', 'data-testid': 'btn-graph', 'class': ot(['flex items-center gap-2', { 'tab-button-active': j(jn) === 'graph' }]), 'onClick': z[1] || (z[1] = B => y('graph')) }, [j(s) ? (se(), ye('span', Q0e)) : (se(), ye('span', eye)), z[6] || (z[6] = dt(' Module Graph '))], 2), ne('button', { 'tab-button': '', 'data-testid': 'btn-code', 'class': ot(['flex items-center gap-2', { 'tab-button-active': j(jn) === 'editor' }]), 'onClick': z[2] || (z[2] = B => y('editor')) }, [z[7] || (z[7] = ne('span', { class: 'block w-1.4em h-1.4em i-carbon:code' }, null, -1)), dt(` ${Re(j(n) ? '* ' : '')}Code `, 1)], 2), ne('button', { 'tab-button': '', 'data-testid': 'btn-console', 'class': ot(['flex items-center gap-2', { 'tab-button-active': j(jn) === 'console', 'op20': j(jn) !== 'console' && j(w) === 0 }]), 'onClick': z[3] || (z[3] = B => y('console')) }, [z[8] || (z[8] = ne('span', { class: 'block w-1.4em h-1.4em i-carbon:terminal-3270' }, null, -1)), dt(` Console (${Re(j(w))}) `, 1)], 2)])]), ne('div', tye, [j(i) ? (se(), ye('div', { 'key': 0, 'flex-1': j(jn) === 'graph' && '' }, [ct(Ie(ee, { 'modelValue': j(u), 'onUpdate:modelValue': z[4] || (z[4] = B => kt(u) ? u.value = B : null), 'graph': j(t), 'data-testid': 'graph', 'project-name': j(qt).file.projectName || '' }, null, 8, ['modelValue', 'graph', 'project-name']), [[to, j(jn) === 'graph' && !j(s)]])], 8, nye)) : je('', !0), j(jn) === 'editor' ? (se(), Ye(W, { 'key': j(qt).id, 'file': j(qt), 'data-testid': 'editor', 'onDraft': L }, null, 8, ['file'])) : j(jn) === 'console' ? (se(), Ye(q, { 'key': 2, 'file': j(qt), 'data-testid': 'console' }, null, 8, ['file'])) : !j(jn) && !j(f) && j(qt) ? (se(), Ye(K, { 'key': 3, 'file': j(qt), 'data-testid': 'report' }, null, 8, ['file'])) : !j(jn) && j(f) ? (se(), Ye(C, { 'key': 4, 'test': j(f), 'data-testid': 'report' }, null, 8, ['test'])) : je('', !0)])])) : je('', !0) }
} }); const iye = { h: 'full', flex: '~ col' }; const oye = { 'flex-auto': '', 'py-1': '', 'bg-white': '' }; const sye = ['src']; const lye = at({ __name: 'Coverage', props: { src: {} }, setup(e) { return (t, n) => (se(), ye('div', iye, [n[0] || (n[0] = ne('div', { 'p': '3', 'h-10': '', 'flex': '~ gap-2', 'items-center': '', 'bg-header': '', 'border': 'b base' }, [ne('div', { class: 'i-carbon:folder-details-reference' }), ne('span', { 'pl-1': '', 'font-bold': '', 'text-sm': '', 'flex-auto': '', 'ws-nowrap': '', 'overflow-hidden': '', 'truncate': '' }, 'Coverage')], -1)), ne('div', oye, [ne('iframe', { id: 'vitest-ui-coverage', src: t.src }, null, 8, sye)])])) } }); const aye = { 'bg': 'red500/10', 'p-1': '', 'mb-1': '', 'mt-2': '', 'rounded': '' }; const cye = { 'font-bold': '' }; const uye = { 'key': 0, 'class': 'scrolls', 'text': 'xs', 'font-mono': '', 'mx-1': '', 'my-2': '', 'pb-2': '', 'overflow-auto': '' }; const fye = ['font-bold']; const dye = { text: 'red500/70' }; const hye = { 'key': 1, 'text': 'sm', 'mb-2': '' }; const pye = { 'font-bold': '' }; const gye = { 'key': 2, 'text': 'sm', 'mb-2': '' }; const mye = { 'font-bold': '' }; const vye = { 'key': 3, 'text': 'sm', 'font-thin': '' }; const yye = at({ __name: 'ErrorEntry', props: { error: {} }, setup(e) { return (t, n) => { let i; return se(), ye(nt, null, [ne('h4', aye, [ne('span', cye, [dt(Re(t.error.name || t.error.nameStr || 'Unknown Error'), 1), t.error.message ? (se(), ye(nt, { key: 0 }, [dt(':')], 64)) : je('', !0)]), dt(` ${Re(t.error.message)}`, 1)]), (i = t.error.stacks) != null && i.length ? (se(), ye('p', uye, [(se(!0), ye(nt, null, hr(t.error.stacks, (s, l) => (se(), ye('span', { 'key': l, 'whitespace-pre': '', 'font-bold': l === 0 ? '' : null }, [dt(`❯ ${Re(s.method)} ${Re(s.file)}:`, 1), ne('span', dye, `${Re(s.line)}:${Re(s.column)}`, 1), n[0] || (n[0] = ne('br', null, null, -1))], 8, fye))), 128))])) : je('', !0), t.error.VITEST_TEST_PATH ? (se(), ye('p', hye, [n[1] || (n[1] = dt(' This error originated in ')), ne('span', pye, Re(t.error.VITEST_TEST_PATH), 1), n[2] || (n[2] = dt(' test file. It doesn\'t mean the error was thrown inside the file itself, but while it was running. '))])) : je('', !0), t.error.VITEST_TEST_NAME ? (se(), ye('div', gye, [n[3] || (n[3] = dt(' The latest test that might\'ve caused the error is ')), ne('span', mye, Re(t.error.VITEST_TEST_NAME), 1), n[4] || (n[4] = dt('. It might mean one of the following:')), n[5] || (n[5] = ne('br', null, null, -1)), n[6] || (n[6] = ne('ul', null, [ne('li', null, ' The error was thrown, while Vitest was running this test. '), ne('li', null, ' If the error occurred after the test had been completed, this was the last documented test before it was thrown. ')], -1))])) : je('', !0), t.error.VITEST_AFTER_ENV_TEARDOWN ? (se(), ye('div', vye, n[7] || (n[7] = [dt(' This error was caught after test environment was torn down. Make sure to cancel any running tasks before test finishes:'), ne('br', null, null, -1), ne('ul', null, [ne('li', null, ' Cancel timeouts using clearTimeout and clearInterval. '), ne('li', null, ' Wait for promises to resolve using the await keyword. ')], -1)]))) : je('', !0)], 64) } } }); const bye = { 'data-testid': 'test-files-entry', 'grid': '~ cols-[min-content_1fr_min-content]', 'items-center': '', 'gap': 'x-2 y-3', 'p': 'x4', 'relative': '', 'font-light': '', 'w-80': '', 'op80': '' }; const wye = { 'class': 'number', 'data-testid': 'num-files' }; const xye = { class: 'number' }; const Sye = { 'class': 'number', 'text-red5': '' }; const _ye = { 'class': 'number', 'text-red5': '' }; const kye = { 'class': 'number', 'text-red5': '' }; const Tye = { 'class': 'number', 'data-testid': 'run-time' }; const Cye = { 'key': 0, 'bg': 'red500/10', 'text': 'red500', 'p': 'x3 y2', 'max-w-xl': '', 'm-2': '', 'rounded': '' }; const Eye = { 'text': 'sm', 'font-thin': '', 'mb-2': '', 'data-testid': 'unhandled-errors' }; const Aye = { 'data-testid': 'unhandled-errors-details', 'class': 'scrolls unhandled-errors', 'text': 'sm', 'font-thin': '', 'pe-2.5': '', 'open:max-h-52': '', 'overflow-auto': '' }; const Lye = at({ __name: 'TestFilesEntry', setup(e) { return (t, n) => { const i = yye; return se(), ye(nt, null, [ne('div', bye, [n[8] || (n[8] = ne('div', { 'i-carbon-document': '' }, null, -1)), n[9] || (n[9] = ne('div', null, 'Files', -1)), ne('div', wye, Re(j(Ae).summary.files), 1), j(Ae).summary.filesSuccess ? (se(), ye(nt, { key: 0 }, [n[0] || (n[0] = ne('div', { 'i-carbon-checkmark': '' }, null, -1)), n[1] || (n[1] = ne('div', null, 'Pass', -1)), ne('div', xye, Re(j(Ae).summary.filesSuccess), 1)], 64)) : je('', !0), j(Ae).summary.filesFailed ? (se(), ye(nt, { key: 1 }, [n[2] || (n[2] = ne('div', { 'i-carbon-close': '' }, null, -1)), n[3] || (n[3] = ne('div', null, ' Fail ', -1)), ne('div', Sye, Re(j(Ae).summary.filesFailed), 1)], 64)) : je('', !0), j(Ae).summary.filesSnapshotFailed ? (se(), ye(nt, { key: 2 }, [n[4] || (n[4] = ne('div', { 'i-carbon-compare': '' }, null, -1)), n[5] || (n[5] = ne('div', null, ' Snapshot Fail ', -1)), ne('div', _ye, Re(j(Ae).summary.filesSnapshotFailed), 1)], 64)) : je('', !0), j(Zi).length ? (se(), ye(nt, { key: 3 }, [n[6] || (n[6] = ne('div', { 'i-carbon-checkmark-outline-error': '' }, null, -1)), n[7] || (n[7] = ne('div', null, ' Errors ', -1)), ne('div', kye, Re(j(Zi).length), 1)], 64)) : je('', !0), n[10] || (n[10] = ne('div', { 'i-carbon-timer': '' }, null, -1)), n[11] || (n[11] = ne('div', null, 'Time', -1)), ne('div', Tye, Re(j(Ae).summary.time), 1)]), j(Zi).length ? (se(), ye('div', Cye, [n[15] || (n[15] = ne('h3', { 'text-center': '', 'mb-2': '' }, ' Unhandled Errors ', -1)), ne('p', Eye, [dt(` Vitest caught ${Re(j(Zi).length)} error${Re(j(Zi).length > 1 ? 's' : '')} during the test run.`, 1), n[12] || (n[12] = ne('br', null, null, -1)), n[13] || (n[13] = dt(' This might cause false positive tests. Resolve unhandled errors to make sure your tests are not affected. '))]), ne('details', Aye, [n[14] || (n[14] = ne('summary', { 'font-bold': '', 'cursor-pointer': '' }, ' Errors ', -1)), (se(!0), ye(nt, null, hr(j(Zi), (s, l) => (se(), Ye(i, { key: l, error: s }, null, 8, ['error']))), 128))])])) : je('', !0)], 64) } } }); const $ye = ni(Lye, [['__scopeId', 'data-v-0178ddee']]); const Mye = { 'p-2': '', 'text-center': '', 'flex': '' }; const Nye = { 'text-4xl': '', 'min-w-2em': '' }; const Iye = { 'text-md': '' }; const Pye = at({ __name: 'DashboardEntry', setup(e) { return (t, n) => (se(), ye('div', Mye, [ne('div', null, [ne('div', Nye, [xn(t.$slots, 'body')]), ne('div', Iye, [xn(t.$slots, 'header')])])])) } }); const Oye = { 'flex': '~ wrap', 'justify-evenly': '', 'gap-2': '', 'p': 'x-4', 'relative': '' }; const Rye = at({ __name: 'TestsEntry', setup(e) { return (t, n) => { const i = Pye; return se(), ye('div', Oye, [Ie(i, { 'text-green5': '', 'data-testid': 'pass-entry' }, { header: it(() => n[0] || (n[0] = [dt(' Pass ')])), body: it(() => [dt(Re(j(Ae).summary.testsSuccess), 1)]), _: 1 }), Ie(i, { 'class': ot({ 'text-red5': j(Ae).summary.testsFailed, 'op50': !j(Ae).summary.testsFailed }), 'data-testid': 'fail-entry' }, { header: it(() => n[1] || (n[1] = [dt(' Fail ')])), body: it(() => [dt(Re(j(Ae).summary.testsFailed), 1)]), _: 1 }, 8, ['class']), j(Ae).summary.testsSkipped ? (se(), Ye(i, { 'key': 0, 'op50': '', 'data-testid': 'skipped-entry' }, { header: it(() => n[2] || (n[2] = [dt(' Skip ')])), body: it(() => [dt(Re(j(Ae).summary.testsSkipped), 1)]), _: 1 })) : je('', !0), j(Ae).summary.testsTodo ? (se(), Ye(i, { 'key': 1, 'op50': '', 'data-testid': 'todo-entry' }, { header: it(() => n[3] || (n[3] = [dt(' Todo ')])), body: it(() => [dt(Re(j(Ae).summary.testsTodo), 1)]), _: 1 })) : je('', !0), Ie(i, { 'tail': !0, 'data-testid': 'total-entry' }, { header: it(() => n[4] || (n[4] = [dt(' Total ')])), body: it(() => [dt(Re(j(Ae).summary.totalTests), 1)]), _: 1 })]) } } }); const zye = { 'gap-0': '', 'flex': '~ col gap-4', 'h-full': '', 'justify-center': '', 'items-center': '' }; const Dye = { key: 0, class: 'text-gray-5' }; const Fye = { 'aria-labelledby': 'tests', 'm': 'y-4 x-2' }; const Hye = at({ __name: 'TestsFilesContainer', setup(e) { return (t, n) => { const i = Rye; const s = $ye; return se(), ye('div', zye, [j(Ae).summary.files === 0 && j($s) ? (se(), ye('div', Dye, ' No tests found ')) : je('', !0), ne('section', Fye, [Ie(i)]), Ie(s)]) } } }); const Bye = {}; const Wye = { h: 'full', flex: '~ col' }; const jye = { 'class': 'scrolls', 'flex-auto': '', 'py-1': '' }; function qye(e, t) { const n = Hye; return se(), ye('div', Wye, [t[0] || (t[0] = ne('div', { 'p': '3', 'h-10': '', 'flex': '~ gap-2', 'items-center': '', 'bg-header': '', 'border': 'b base' }, [ne('div', { class: 'i-carbon-dashboard' }), ne('span', { 'pl-1': '', 'font-bold': '', 'text-sm': '', 'flex-auto': '', 'ws-nowrap': '', 'overflow-hidden': '', 'truncate': '' }, 'Dashboard')], -1)), ne('div', jye, [Ie(n)])]) } const Uye = ni(Bye, [['render', qye]]); const Vye = ['open']; const Gye = at({ __name: 'DetailsPanel', props: { color: {} }, setup(e) { const t = Ue(!0); return (n, i) => (se(), ye('div', { 'open': j(t), 'class': 'details-panel', 'data-testid': 'details-panel', 'onToggle': i[0] || (i[0] = s => t.value = s.target.open) }, [ne('div', { 'p': 'y1', 'text-sm': '', 'bg-base': '', 'items-center': '', 'z-5': '', 'gap-2': '', 'class': ot(n.color), 'w-full': '', 'flex': '', 'select-none': '', 'sticky': '', 'top': '-1' }, [i[1] || (i[1] = ne('div', { 'flex-1': '', 'h-1px': '', 'border': 'base b', 'op80': '' }, null, -1)), xn(n.$slots, 'summary', { open: j(t) }), i[2] || (i[2] = ne('div', { 'flex-1': '', 'h-1px': '', 'border': 'base b', 'op80': '' }, null, -1))], 2), xn(n.$slots, 'default')], 40, Vye)) } }); const Xye = { 'type': 'button', 'dark': 'op75', 'bg': 'gray-200 dark:#111', 'hover': 'op100', 'rounded-1': '', 'p-0.5': '' }; const Kye = { __name: 'IconAction', props: { icon: String }, setup(e) { return (t, n) => (se(), ye('button', Xye, [ne('span', { block: '', class: ot([e.icon, 'dark:op85 hover:op100']), op65: '' }, null, 2)])) } }; const Jye = ['aria-label', 'data-current']; const Yye = { 'key': 1, 'w-4': '' }; const Zye = { 'flex': '', 'items-end': '', 'gap-2': '', 'overflow-hidden': '' }; const Qye = { 'key': 0, 'class': 'i-logos:typescript-icon', 'flex-shrink-0': '' }; const ebe = { 'text-sm': '', 'truncate': '', 'font-light': '' }; const tbe = ['text', 'innerHTML']; const nbe = { key: 1, text: 'xs', op20: '', style: { 'white-space': 'nowrap' } }; const rbe = { 'gap-1': '', 'justify-end': '', 'flex-grow-1': '', 'pl-1': '', 'class': 'test-actions' }; const ibe = { key: 0, class: 'op100 gap-1 p-y-1', grid: '~ items-center cols-[1.5em_1fr]' }; const obe = { key: 1 }; const sbe = at({ __name: 'ExplorerItem', props: { taskId: {}, name: {}, indent: {}, typecheck: { type: Boolean }, duration: {}, state: {}, current: { type: Boolean }, type: {}, opened: { type: Boolean }, expandable: { type: Boolean }, search: {}, projectName: {}, projectNameColor: {}, disableTaskLocation: { type: Boolean }, onItemClick: { type: Function } }, setup(e) {
  const t = _e(() => ht.state.idMap.get(e.taskId)); const n = _e(() => {
    if (pr)
      return !1; const A = t.value; return A && Np(A)
  }); function i() { let A; if (!e.expandable) { (A = e.onItemClick) == null || A.call(e, t.value); return }e.opened ? Ae.collapseNode(e.taskId) : Ae.expandNode(e.taskId) } async function s(A) { let E; (E = e.onItemClick) == null || E.call(e, A), Ns.value && (Nu.value = !0, await Et()), e.type === 'file' ? await Rp([A.file]) : await Jfe(A) } function l(A) { return ht.rpc.updateSnapshot(A.file) } const u = _e(() => e.indent <= 0 ? [] : Array.from({ length: e.indent }, (A, E) => `${e.taskId}-${E}`)); const f = _e(() => { const A = u.value; const E = []; return (e.type === 'file' || e.type === 'suite') && E.push('min-content'), E.push('min-content'), e.type === 'suite' && e.typecheck && E.push('min-content'), E.push('minmax(0, 1fr)'), E.push('min-content'), `grid-template-columns: ${A.map(() => '1rem').join(' ')} ${E.join(' ')};` }); const h = _e(() => e.type === 'file' ? 'Run current file' : e.type === 'suite' ? 'Run all tests in this suite' : 'Run current test'); const p = _e(() => Fx(e.name)); const g = _e(() => { const A = uM.value; const E = p.value; return A ? E.replace(A, M => `<span class="highlight">${M}</span>`) : E }); const v = _e(() => e.type !== 'file' && e.disableTaskLocation); const y = _e(() => e.type === 'file' ? 'Open test details' : e.type === 'suite' ? 'View Suite Source Code' : 'View Test Source Code'); const w = _e(() => v.value ? 'color-red5 dark:color-#f43f5e' : null); function L() { let E; const A = t.value; e.type === 'file' ? (E = e.onItemClick) == null || E.call(e, A) : Nde(A) } const $ = _e(() => Wx(e.projectNameColor)); return (A, E) => { const M = oS; const O = Kye; const k = ri; const z = Dr('tooltip'); return j(t) ? (se(), ye('div', { 'key': 0, 'items-center': '', 'p': 'x-2 y-1', 'grid': '~ rows-1 items-center gap-x-2', 'w-full': '', 'h-28px': '', 'border-rounded': '', 'hover': 'bg-active', 'cursor-pointer': '', 'class': 'item-wrapper', 'style': nn(j(f)), 'aria-label': A.name, 'data-current': A.current, 'onClick': E[2] || (E[2] = D => i()) }, [A.indent > 0 ? (se(!0), ye(nt, { key: 0 }, hr(j(u), D => (se(), ye('div', { 'key': D, 'border': 'solid gray-500 dark:gray-400', 'class': 'vertical-line', 'h-28px': '', 'inline-flex': '', 'mx-2': '', 'op20': '' }))), 128)) : je('', !0), A.type === 'file' || A.type === 'suite' ? (se(), ye('div', Yye, [ne('div', { class: ot(A.opened ? 'i-carbon:chevron-down' : 'i-carbon:chevron-right op20'), op20: '' }, null, 2)])) : je('', !0), Ie(M, { 'state': A.state, 'mode': j(t).mode, 'failed-snapshot': j(n), 'w-4': '' }, null, 8, ['state', 'mode', 'failed-snapshot']), ne('div', Zye, [A.type === 'file' && A.typecheck ? ct((se(), ye('div', Qye, null, 512)), [[z, 'This is a typecheck test. It won\'t report results of the runtime tests', void 0, { bottom: !0 }]]) : je('', !0), ne('span', ebe, [A.type === 'file' && A.projectName ? (se(), ye('span', { key: 0, class: 'rounded-full py-0.5 px-2 mr-1 text-xs', style: nn({ backgroundColor: A.projectNameColor, color: j($) }) }, Re(A.projectName), 5)) : je('', !0), ne('span', { text: A.state === 'fail' ? 'red-500' : '', innerHTML: j(g) }, null, 8, tbe)]), typeof A.duration == 'number' ? (se(), ye('span', nbe, `${Re(A.duration > 0 ? A.duration : '< 1')}ms `, 1)) : je('', !0)]), ne('div', rbe, [!j(pr) && j(n) ? ct((se(), Ye(O, { 'key': 0, 'data-testid': 'btn-fix-snapshot', 'title': 'Fix failed snapshot(s)', 'icon': 'i-carbon:result-old', 'onClick': E[0] || (E[0] = Zc(D => l(j(t)), ['prevent', 'stop'])) }, null, 512)), [[z, 'Fix failed snapshot(s)', void 0, { bottom: !0 }]]) : je('', !0), Ie(j(qw), { placement: 'bottom', class: ot(['w-1.4em h-1.4em op100 rounded flex', j(w)]) }, { popper: it(() => [j(v) ? (se(), ye('div', ibe, [E[5] || (E[5] = ne('div', { class: 'i-carbon:information-square w-1.5em h-1.5em' }, null, -1)), ne('div', null, [dt(`${Re(j(y))}: this feature is not available, you have disabled `, 1), E[3] || (E[3] = ne('span', { class: 'text-[#add467]' }, 'includeTaskLocation', -1)), E[4] || (E[4] = dt(' in your configuration file.'))]), E[6] || (E[6] = ne('div', { style: { 'grid-column': '2' } }, ' Clicking this button the code tab will position the cursor at first line in the source code since the UI doesn\'t have the information available. ', -1))])) : (se(), ye('div', obe, Re(j(y)), 1))]), default: it(() => [Ie(k, { 'data-testid': 'btn-open-details', 'icon': A.type === 'file' ? 'i-carbon:intrusion-prevention' : 'i-carbon:code-reference', 'onClick': Zc(L, ['prevent', 'stop']) }, null, 8, ['icon'])]), _: 1 }, 8, ['class']), j(pr) ? je('', !0) : ct((se(), Ye(k, { 'key': 1, 'data-testid': 'btn-run-test', 'title': j(h), 'icon': 'i-carbon:play-filled-alt', 'text-green5': '', 'onClick': E[1] || (E[1] = Zc(D => s(j(t)), ['prevent', 'stop'])) }, null, 8, ['title'])), [[z, j(h), void 0, { bottom: !0 }]])])], 12, Jye)) : je('', !0) }
} }); const lbe = ni(sbe, [['__scopeId', 'data-v-5b954324']]); const abe = { 'flex-1': '', 'ms-2': '', 'select-none': '' }; const cbe = at({ __name: 'FilterStatus', props: pa({ label: {} }, { modelValue: { type: [Boolean, null] }, modelModifiers: {} }), emits: ['update:modelValue'], setup(e) { const t = ef(e, 'modelValue'); return (n, i) => (se(), ye('label', _i({ class: 'font-light text-sm checkbox flex items-center cursor-pointer py-1 text-sm w-full gap-y-1 mb-1px' }, n.$attrs, { onClick: i[1] || (i[1] = Zc(s => t.value = !t.value, ['prevent'])) }), [ne('span', { 'class': ot([t.value ? 'i-carbon:checkbox-checked-filled' : 'i-carbon:checkbox']), 'text-lg': '', 'aria-hidden': 'true' }, null, 2), ct(ne('input', { 'onUpdate:modelValue': i[0] || (i[0] = s => t.value = s), 'type': 'checkbox', 'sr-only': '' }, null, 512), [[xw, t.value]]), ne('span', abe, Re(n.label), 1)], 16)) } }); function ube() {
  const e = window.navigator.userAgent; const t = e.indexOf('MSIE '); if (t > 0)
    return Number.parseInt(e.substring(t + 5, e.indexOf('.', t)), 10); const n = e.indexOf('Trident/'); if (n > 0) { const i = e.indexOf('rv:'); return Number.parseInt(e.substring(i + 3, e.indexOf('.', i)), 10) } const s = e.indexOf('Edge/'); return s > 0 ? Number.parseInt(e.substring(s + 5, e.indexOf('.', s)), 10) : -1
} let lu; function jh() { jh.init || (jh.init = !0, lu = ube() !== -1) } const vf = { name: 'ResizeObserver', props: { emitOnMount: { type: Boolean, default: !1 }, ignoreWidth: { type: Boolean, default: !1 }, ignoreHeight: { type: Boolean, default: !1 } }, emits: ['notify'], mounted() { jh(), Et(() => { this._w = this.$el.offsetWidth, this._h = this.$el.offsetHeight, this.emitOnMount && this.emitSize() }); const e = document.createElement('object'); this._resizeObject = e, e.setAttribute('aria-hidden', 'true'), e.setAttribute('tabindex', -1), e.onload = this.addResizeHandlers, e.type = 'text/html', lu && this.$el.appendChild(e), e.data = 'about:blank', lu || this.$el.appendChild(e) }, beforeUnmount() { this.removeResizeHandlers() }, methods: { compareAndNotify() { (!this.ignoreWidth && this._w !== this.$el.offsetWidth || !this.ignoreHeight && this._h !== this.$el.offsetHeight) && (this._w = this.$el.offsetWidth, this._h = this.$el.offsetHeight, this.emitSize()) }, emitSize() { this.$emit('notify', { width: this._w, height: this._h }) }, addResizeHandlers() { this._resizeObject.contentDocument.defaultView.addEventListener('resize', this.compareAndNotify), this.compareAndNotify() }, removeResizeHandlers() { this._resizeObject && this._resizeObject.onload && (!lu && this._resizeObject.contentDocument && this._resizeObject.contentDocument.defaultView.removeEventListener('resize', this.compareAndNotify), this.$el.removeChild(this._resizeObject), this._resizeObject.onload = null, this._resizeObject = null) } } }; const fbe = Pb(); Nb('data-v-b329ee4c'); const dbe = { class: 'resize-observer', tabindex: '-1' }; Ib(); const hbe = fbe((e, t, n, i, s, l) => (se(), Ye('div', dbe))); vf.render = hbe; vf.__scopeId = 'data-v-b329ee4c'; vf.__file = 'src/components/ResizeObserver.vue'; function au(e) { '@babel/helpers - typeof'; return typeof Symbol == 'function' && typeof Symbol.iterator == 'symbol' ? au = function (t) { return typeof t } : au = function (t) { return t && typeof Symbol == 'function' && t.constructor === Symbol && t !== Symbol.prototype ? 'symbol' : typeof t }, au(e) } function pbe(e, t) {
  if (!(e instanceof t))
    throw new TypeError('Cannot call a class as a function')
} function gbe(e, t) { for (let n = 0; n < t.length; n++) { const i = t[n]; i.enumerable = i.enumerable || !1, i.configurable = !0, 'value' in i && (i.writable = !0), Object.defineProperty(e, i.key, i) } } function mbe(e, t, n) { return t && gbe(e.prototype, t), e } function Iy(e) { return vbe(e) || ybe(e) || bbe(e) || wbe() } function vbe(e) {
  if (Array.isArray(e))
    return qh(e)
} function ybe(e) {
  if (typeof Symbol < 'u' && Symbol.iterator in new Object(e))
    return Array.from(e)
} function bbe(e, t) {
  if (e) {
    if (typeof e == 'string')
      return qh(e, t); let n = Object.prototype.toString.call(e).slice(8, -1); if (n === 'Object' && e.constructor && (n = e.constructor.name), n === 'Map' || n === 'Set')
      return Array.from(e); if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
      return qh(e, t)
  }
} function qh(e, t) { (t == null || t > e.length) && (t = e.length); for (var n = 0, i = new Array(t); n < t; n++)i[n] = e[n]; return i } function wbe() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
} function xbe(e) { let t; return typeof e == 'function' ? t = { callback: e } : t = e, t } function Sbe(e, t) { const n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}; let i; let s; let l; const u = function (h) { for (var p = arguments.length, g = Array.from({ length: p > 1 ? p - 1 : 0 }), v = 1; v < p; v++)g[v - 1] = arguments[v]; if (l = g, !(i && h === s)) { let y = n.leading; typeof y == 'function' && (y = y(h, s)), (!i || h !== s) && y && e.apply(void 0, [h].concat(Iy(l))), s = h, clearTimeout(i), i = setTimeout(() => { e.apply(void 0, [h].concat(Iy(l))), i = 0 }, t) } }; return u._clear = function () { clearTimeout(i), i = null }, u } function sS(e, t) {
  if (e === t)
    return !0; if (au(e) === 'object') {
    for (const n in e) {
      if (!sS(e[n], t[n]))
        return !1
    } return !0
  } return !1
} const _be = (function () {
  function e(t, n, i) { pbe(this, e), this.el = t, this.observer = null, this.frozen = !1, this.createObserver(n, i) } return mbe(e, [{ key: 'createObserver', value(n, i) {
    const s = this; if (this.observer && this.destroyObserver(), !this.frozen) {
      if (this.options = xbe(n), this.callback = function (f, h) { s.options.callback(f, h), f && s.options.once && (s.frozen = !0, s.destroyObserver()) }, this.callback && this.options.throttle) { const l = this.options.throttleOptions || {}; const u = l.leading; this.callback = Sbe(this.callback, this.options.throttle, { leading(h) { return u === 'both' || u === 'visible' && h || u === 'hidden' && !h } }) } this.oldResult = void 0, this.observer = new IntersectionObserver((f) => {
        let h = f[0]; if (f.length > 1) { const p = f.find((v) => { return v.isIntersecting }); p && (h = p) } if (s.callback) {
          const g = h.isIntersecting && h.intersectionRatio >= s.threshold; if (g === s.oldResult)
            return; s.oldResult = g, s.callback(g, h)
        }
      }, this.options.intersection), Et(() => { s.observer && s.observer.observe(s.el) })
    }
  } }, { key: 'destroyObserver', value() { this.observer && (this.observer.disconnect(), this.observer = null), this.callback && this.callback._clear && (this.callback._clear(), this.callback = null) } }, { key: 'threshold', get() { return this.options.intersection && typeof this.options.intersection.threshold == 'number' ? this.options.intersection.threshold : 0 } }]), e
}()); function lS(e, t, n) {
  const i = t.value; if (i) {
    if (typeof IntersectionObserver > 'u') {
      console.warn('[vue-observe-visibility] IntersectionObserver API is not available in your browser. Please install this polyfill: https://github.com/w3c/IntersectionObserver/tree/master/polyfill')
    }
    else { const s = new _be(e, i, n); e._vue_visibilityState = s }
  }
} function kbe(e, t, n) { const i = t.value; const s = t.oldValue; if (!sS(i, s)) { const l = e._vue_visibilityState; if (!i) { aS(e); return }l ? l.createObserver(i, n) : lS(e, { value: i }, n) } } function aS(e) { const t = e._vue_visibilityState; t && (t.destroyObserver(), delete e._vue_visibilityState) } const Tbe = { beforeMount: lS, updated: kbe, unmounted: aS }; const Cbe = { itemsLimit: 1e3 }; const Ebe = /(auto|scroll)/; function cS(e, t) { return e.parentNode === null ? t : cS(e.parentNode, t.concat([e])) } function Gd(t, n) { return getComputedStyle(t, null).getPropertyValue(n) } function Abe(t) { return Gd(t, 'overflow') + Gd(t, 'overflow-y') + Gd(t, 'overflow-x') } function Lbe(t) { return Ebe.test(Abe(t)) } function Py(e) {
  if (e instanceof HTMLElement || e instanceof SVGElement) {
    for (let t = cS(e.parentNode, []), n = 0; n < t.length; n += 1) {
      if (Lbe(t[n]))
        return t[n]
    } return document.scrollingElement || document.documentElement
  }
} function Uh(e) { '@babel/helpers - typeof'; return Uh = typeof Symbol == 'function' && typeof Symbol.iterator == 'symbol' ? function (t) { return typeof t } : function (t) { return t && typeof Symbol == 'function' && t.constructor === Symbol && t !== Symbol.prototype ? 'symbol' : typeof t }, Uh(e) } const $be = { items: { type: Array, required: !0 }, keyField: { type: String, default: 'id' }, direction: { type: String, default: 'vertical', validator(t) { return ['vertical', 'horizontal'].includes(t) } }, listTag: { type: String, default: 'div' }, itemTag: { type: String, default: 'div' } }; function Mbe() { return this.items.length && Uh(this.items[0]) !== 'object' } let Vh = !1; if (typeof window < 'u') {
  Vh = !1; try { const Nbe = Object.defineProperty({}, 'passive', { get() { Vh = !0 } }); window.addEventListener('test', null, Nbe) }
  catch {}
} let Ibe = 0; const Kp = { name: 'RecycleScroller', components: { ResizeObserver: vf }, directives: { ObserveVisibility: Tbe }, props: { ...$be, itemSize: { type: Number, default: null }, gridItems: { type: Number, default: void 0 }, itemSecondarySize: { type: Number, default: void 0 }, minItemSize: { type: [Number, String], default: null }, sizeField: { type: String, default: 'size' }, typeField: { type: String, default: 'type' }, buffer: { type: Number, default: 200 }, pageMode: { type: Boolean, default: !1 }, prerender: { type: Number, default: 0 }, emitUpdate: { type: Boolean, default: !1 }, updateInterval: { type: Number, default: 0 }, skipHover: { type: Boolean, default: !1 }, listTag: { type: String, default: 'div' }, itemTag: { type: String, default: 'div' }, listClass: { type: [String, Object, Array], default: '' }, itemClass: { type: [String, Object, Array], default: '' } }, emits: ['resize', 'visible', 'hidden', 'update', 'scroll-start', 'scroll-end'], data() { return { pool: [], totalSize: 0, ready: !1, hoverKey: null } }, computed: { sizes() { if (this.itemSize === null) { const e = { '-1': { accumulator: 0 } }; const t = this.items; const n = this.sizeField; const i = this.minItemSize; let s = 1e4; let l = 0; let u; for (let f = 0, h = t.length; f < h; f++)u = t[f][n] || i, u < s && (s = u), l += u, e[f] = { accumulator: l, size: u }; return this.$_computedMinItemSize = s, e } return [] }, simpleArray: Mbe, itemIndexByKey() { const { keyField: e, items: t } = this; const n = {}; for (let i = 0, s = t.length; i < s; i++)n[t[i][e]] = i; return n } }, watch: { items() { this.updateVisibleItems(!0) }, pageMode() { this.applyPageMode(), this.updateVisibleItems(!1) }, sizes: { handler() { this.updateVisibleItems(!1) }, deep: !0 }, gridItems() { this.updateVisibleItems(!0) }, itemSecondarySize() { this.updateVisibleItems(!0) } }, created() { this.$_startIndex = 0, this.$_endIndex = 0, this.$_views = new Map(), this.$_unusedViews = new Map(), this.$_scrollDirty = !1, this.$_lastUpdateScrollPosition = 0, this.prerender && (this.$_prerender = !0, this.updateVisibleItems(!1)), this.gridItems && !this.itemSize && console.error('[vue-recycle-scroller] You must provide an itemSize when using gridItems') }, mounted() { this.applyPageMode(), this.$nextTick(() => { this.$_prerender = !1, this.updateVisibleItems(!0), this.ready = !0 }) }, activated() { const e = this.$_lastUpdateScrollPosition; typeof e == 'number' && this.$nextTick(() => { this.scrollToPosition(e) }) }, beforeUnmount() { this.removeListeners() }, methods: { addView(e, t, n, i, s) { const l = lp({ id: Ibe++, index: t, used: !0, key: i, type: s }); const u = ip({ item: n, position: 0, nr: l }); return e.push(u), u }, unuseView(e, t = !1) { const n = this.$_unusedViews; const i = e.nr.type; let s = n.get(i); s || (s = [], n.set(i, s)), s.push(e), t || (e.nr.used = !1, e.position = -9999) }, handleResize() { this.$emit('resize'), this.ready && this.updateVisibleItems(!1) }, handleScroll(e) {
  if (!this.$_scrollDirty) {
    if (this.$_scrollDirty = !0, this.$_updateTimeout)
      return; const t = () => requestAnimationFrame(() => { this.$_scrollDirty = !1; const { continuous: n } = this.updateVisibleItems(!1, !0); n || (clearTimeout(this.$_refreshTimout), this.$_refreshTimout = setTimeout(this.handleScroll, this.updateInterval + 100)) }); t(), this.updateInterval && (this.$_updateTimeout = setTimeout(() => { this.$_updateTimeout = 0, this.$_scrollDirty && t() }, this.updateInterval))
  }
}, handleVisibilityChange(e, t) { this.ready && (e || t.boundingClientRect.width !== 0 || t.boundingClientRect.height !== 0 ? (this.$emit('visible'), requestAnimationFrame(() => { this.updateVisibleItems(!1) })) : this.$emit('hidden')) }, updateVisibleItems(e, t = !1) {
  const n = this.itemSize; const i = this.gridItems || 1; const s = this.itemSecondarySize || n; const l = this.$_computedMinItemSize; const u = this.typeField; const f = this.simpleArray ? null : this.keyField; const h = this.items; const p = h.length; const g = this.sizes; const v = this.$_views; const y = this.$_unusedViews; const w = this.pool; const L = this.itemIndexByKey; let $, A, E, M, O; if (!p) {
    $ = A = M = O = E = 0
  }
  else if (this.$_prerender) {
    $ = M = 0, A = O = Math.min(this.prerender, h.length), E = null
  }
  else {
    const q = this.getScroll(); if (t) {
      let P = q.start - this.$_lastUpdateScrollPosition; if (P < 0 && (P = -P), n === null && P < l || P < n)
        return { continuous: !0 }
    } this.$_lastUpdateScrollPosition = q.start; const K = this.buffer; q.start -= K, q.end += K; let C = 0; if (this.$refs.before && (C = this.$refs.before.scrollHeight, q.start -= C), this.$refs.after) { const P = this.$refs.after.scrollHeight; q.end += P } if (n === null) { let P; let I = 0; let S = p - 1; let R = ~~(p / 2); let B; do B = R, P = g[R].accumulator, P < q.start ? I = R : R < p - 1 && g[R + 1].accumulator > q.start && (S = R), R = ~~((I + S) / 2); while (R !== B); for (R < 0 && (R = 0), $ = R, E = g[p - 1].accumulator, A = R; A < p && g[A].accumulator < q.end; A++);for (A === -1 ? A = h.length - 1 : (A++, A > p && (A = p)), M = $; M < p && C + g[M].accumulator < q.start; M++);for (O = M; O < p && C + g[O].accumulator < q.end; O++); }
    else { $ = ~~(q.start / n * i); const P = $ % i; $ -= P, A = Math.ceil(q.end / n * i), M = Math.max(0, Math.floor((q.start - C) / n * i)), O = Math.floor((q.end - C) / n * i), $ < 0 && ($ = 0), A > p && (A = p), M < 0 && (M = 0), O > p && (O = p), E = Math.ceil(p / i) * n }
  }A - $ > Cbe.itemsLimit && this.itemsLimitError(), this.totalSize = E; let k; const z = $ <= this.$_endIndex && A >= this.$_startIndex; if (z) {
    for (let q = 0, K = w.length; q < K; q++)k = w[q], k.nr.used && (e && (k.nr.index = L[k.item[f]]), (k.nr.index == null || k.nr.index < $ || k.nr.index >= A) && this.unuseView(k))
  } const D = z ? null : new Map(); let te, ee, W; for (let q = $; q < A; q++) {
    te = h[q]; const K = f ? te[f] : te; if (K == null)
      throw new Error(`Key is ${K} on item (keyField is '${f}')`); if (k = v.get(K), !n && !g[q].size) { k && this.unuseView(k); continue }ee = te[u]; let C = y.get(ee); let P = !1; if (!k) {
      z ? C && C.length ? k = C.pop() : k = this.addView(w, q, te, K, ee) : (W = D.get(ee) || 0, (!C || W >= C.length) && (k = this.addView(w, q, te, K, ee), this.unuseView(k, !0), C = y.get(ee)), k = C[W], D.set(ee, W + 1)), v.delete(k.nr.key), k.nr.used = !0, k.nr.index = q, k.nr.key = K, k.nr.type = ee, v.set(K, k), P = !0
    }
    else if (!k.nr.used && (k.nr.used = !0, P = !0, C)) { const I = C.indexOf(k); I !== -1 && C.splice(I, 1) }k.item = te, P && (q === h.length - 1 && this.$emit('scroll-end'), q === 0 && this.$emit('scroll-start')), n === null ? (k.position = g[q - 1].accumulator, k.offset = 0) : (k.position = Math.floor(q / i) * n, k.offset = q % i * s)
  } return this.$_startIndex = $, this.$_endIndex = A, this.emitUpdate && this.$emit('update', $, A, M, O), clearTimeout(this.$_sortTimer), this.$_sortTimer = setTimeout(this.sortViews, this.updateInterval + 300), { continuous: z }
}, getListenerTarget() { let e = Py(this.$el); return window.document && (e === window.document.documentElement || e === window.document.body) && (e = window), e }, getScroll() {
  const { $el: e, direction: t } = this; const n = t === 'vertical'; let i; if (this.pageMode) { const s = e.getBoundingClientRect(); const l = n ? s.height : s.width; let u = -(n ? s.top : s.left); let f = n ? window.innerHeight : window.innerWidth; u < 0 && (f += u, u = 0), u + f > l && (f = l - u), i = { start: u, end: u + f } }
  else {
    n ? i = { start: e.scrollTop, end: e.scrollTop + e.clientHeight } : i = { start: e.scrollLeft, end: e.scrollLeft + e.clientWidth }
  } return i
}, applyPageMode() { this.pageMode ? this.addListeners() : this.removeListeners() }, addListeners() { this.listenerTarget = this.getListenerTarget(), this.listenerTarget.addEventListener('scroll', this.handleScroll, Vh ? { passive: !0 } : !1), this.listenerTarget.addEventListener('resize', this.handleResize) }, removeListeners() { this.listenerTarget && (this.listenerTarget.removeEventListener('scroll', this.handleScroll), this.listenerTarget.removeEventListener('resize', this.handleResize), this.listenerTarget = null) }, scrollToItem(e) { let t; const n = this.gridItems || 1; this.itemSize === null ? t = e > 0 ? this.sizes[e - 1].accumulator : 0 : t = Math.floor(e / n) * this.itemSize, this.scrollToPosition(t) }, scrollToPosition(e) {
  const t = this.direction === 'vertical' ? { scroll: 'scrollTop', start: 'top' } : { scroll: 'scrollLeft', start: 'left' }; let n, i, s; if (this.pageMode) { const l = Py(this.$el); const u = l.tagName === 'HTML' ? 0 : l[t.scroll]; const f = l.getBoundingClientRect(); const p = this.$el.getBoundingClientRect()[t.start] - f[t.start]; n = l, i = t.scroll, s = e + u + p }
  else {
    n = this.$el, i = t.scroll, s = e
  }n[i] = s
}, itemsLimitError() { throw setTimeout(() => { console.log('It seems the scroller element isn\'t scrolling, so it tries to render all the items at once.', 'Scroller:', this.$el), console.log('Make sure the scroller has a fixed height (or width) and \'overflow-y\' (or \'overflow-x\') set to \'auto\' so it can scroll correctly and only render the items visible in the scroll viewport.') }), new Error('Rendered items limit reached') }, sortViews() { this.pool.sort((e, t) => e.nr.index - t.nr.index) } } }; const Pbe = { key: 0, ref: 'before', class: 'vue-recycle-scroller__slot' }; const Obe = { key: 1, ref: 'after', class: 'vue-recycle-scroller__slot' }; function Rbe(e, t, n, i, s, l) { const u = Go('ResizeObserver'); const f = Dr('observe-visibility'); return ct((se(), ye('div', { class: ot(['vue-recycle-scroller', { 'ready': s.ready, 'page-mode': n.pageMode, [`direction-${e.direction}`]: !0 }]), onScrollPassive: t[0] || (t[0] = (...h) => l.handleScroll && l.handleScroll(...h)) }, [e.$slots.before ? (se(), ye('div', Pbe, [xn(e.$slots, 'before')], 512)) : je('v-if', !0), (se(), Ye(rh(n.listTag), { ref: 'wrapper', style: nn({ [e.direction === 'vertical' ? 'minHeight' : 'minWidth']: `${s.totalSize}px` }), class: ot(['vue-recycle-scroller__item-wrapper', n.listClass]) }, { default: it(() => [(se(!0), ye(nt, null, hr(s.pool, h => (se(), Ye(rh(n.itemTag), _i({ key: h.nr.id, style: s.ready ? { transform: `translate${e.direction === 'vertical' ? 'Y' : 'X'}(${h.position}px) translate${e.direction === 'vertical' ? 'X' : 'Y'}(${h.offset}px)`, width: n.gridItems ? `${e.direction === 'vertical' && n.itemSecondarySize || n.itemSize}px` : void 0, height: n.gridItems ? `${e.direction === 'horizontal' && n.itemSecondarySize || n.itemSize}px` : void 0 } : null, class: ['vue-recycle-scroller__item-view', [n.itemClass, { hover: !n.skipHover && s.hoverKey === h.nr.key }]] }, NT(n.skipHover ? {} : { mouseenter: () => { s.hoverKey = h.nr.key }, mouseleave: () => { s.hoverKey = null } })), { default: it(() => [xn(e.$slots, 'default', { item: h.item, index: h.nr.index, active: h.nr.used })]), _: 2 }, 1040, ['style', 'class']))), 128)), xn(e.$slots, 'empty')]), _: 3 }, 8, ['style', 'class'])), e.$slots.after ? (se(), ye('div', Obe, [xn(e.$slots, 'after')], 512)) : je('v-if', !0), Ie(u, { onNotify: l.handleResize }, null, 8, ['onNotify'])], 34)), [[f, l.handleVisibilityChange]]) }Kp.render = Rbe; Kp.__file = 'src/components/RecycleScroller.vue'; function zbe(e) { const t = _e(() => Ch.value ? !1 : !et.onlyTests); const n = _e(() => Un.value === ''); const i = Ue(Un.value); Lp(() => Un.value, (h) => { i.value = (h == null ? void 0 : h.trim()) ?? '' }, { debounce: 256 }); function s(h) { let p; Un.value = '', h && ((p = e.value) == null || p.focus()) } function l(h) { let p; et.failed = !1, et.success = !1, et.skipped = !1, et.onlyTests = !1, h && ((p = e.value) == null || p.focus()) } function u() { l(!1), s(!0) } function f(h, p, g, v, y) { Zs.value && (pn.value.search = (h == null ? void 0 : h.trim()) ?? '', pn.value.failed = p, pn.value.success = g, pn.value.skipped = v, pn.value.onlyTests = y) } return St(() => [i.value, et.failed, et.success, et.skipped, et.onlyTests], ([h, p, g, v, y]) => { f(h, p, g, v, y), Ae.filterNodes() }, { flush: 'post' }), St(() => Rr.value.length, (h) => { h && (pn.value.expandAll = void 0) }, { flush: 'post' }), { initialized: Zs, filter: et, search: Un, disableFilter: t, isFiltered: Hx, isFilteredByStatus: Ch, disableClearSearch: n, clearAll: u, clearSearch: s, clearFilter: l, filteredFiles: ff, testsTotal: fM, uiEntries: Jn } } const Dbe = { 'p': '2', 'h-10': '', 'flex': '~ gap-2', 'items-center': '', 'bg-header': '', 'border': 'b base' }; const Fbe = { 'p': 'l3 y2 r2', 'flex': '~ gap-2', 'items-center': '', 'bg-header': '', 'border': 'b-2 base' }; const Hbe = ['op']; const Bbe = { grid: '~ items-center gap-x-1 cols-[auto_min-content_auto] rows-[min-content_min-content]' }; const Wbe = { 'text-red5': '' }; const jbe = { 'text-yellow5': '' }; const qbe = { 'text-green5': '' }; const Ube = { class: 'text-purple5:50' }; const Vbe = { 'key': 0, 'flex': '~ col', 'items-center': '', 'p': 'x4 y4', 'font-light': '' }; const Gbe = ['disabled']; const Xbe = ['disabled']; const Kbe = { 'key': 1, 'flex': '~ col', 'items-center': '', 'p': 'x4 y4', 'font-light': '' }; const Jbe = at({ inheritAttrs: !1, __name: 'Explorer', props: { onItemClick: { type: Function } }, emits: ['item-click', 'run'], setup(e, { emit: t }) { const n = t; const i = _e(() => el.value.includeTaskLocation); const s = Ue(); const { initialized: l, filter: u, search: f, disableFilter: h, isFiltered: p, isFilteredByStatus: g, disableClearSearch: v, clearAll: y, clearSearch: w, clearFilter: L, filteredFiles: $, testsTotal: A, uiEntries: E } = zbe(s); const M = Ue('grid-cols-2'); const O = Ue('grid-col-span-2'); const k = Ue(); return zx(() => k.value, ([{ contentRect: z }]) => { z.width < 420 ? (M.value = 'grid-cols-2', O.value = 'grid-col-span-2') : (M.value = 'grid-cols-4', O.value = 'grid-col-span-4') }), (z, D) => { const te = ri; const ee = cbe; const W = lbe; const q = Gye; const K = Dr('tooltip'); return se(), ye('div', { ref_key: 'testExplorerRef', ref: k, h: 'full', flex: '~ col' }, [ne('div', null, [ne('div', Dbe, [xn(z.$slots, 'header', { filteredFiles: j(p) || j(g) ? j($) : void 0 })]), ne('div', Fbe, [D[13] || (D[13] = ne('div', { 'class': 'i-carbon:search', 'flex-shrink-0': '' }, null, -1)), ct(ne('input', { 'ref_key': 'searchBox', 'ref': s, 'onUpdate:modelValue': D[0] || (D[0] = C => kt(f) ? f.value = C : null), 'placeholder': 'Search...', 'outline': 'none', 'bg': 'transparent', 'font': 'light', 'text': 'sm', 'flex-1': '', 'pl-1': '', 'op': j(f).length ? '100' : '50', 'onKeydown': [D[1] || (D[1] = dh(C => j(w)(!1), ['esc'])), D[2] || (D[2] = dh(C => n('run', j(p) || j(g) ? j($) : void 0), ['enter']))] }, null, 40, Hbe), [[JC, j(f)]]), ct(Ie(te, { disabled: j(v), title: 'Clear search', icon: 'i-carbon:filter-remove', onClickPassive: D[3] || (D[3] = C => j(w)(!0)) }, null, 8, ['disabled']), [[K, 'Clear search', void 0, { bottom: !0 }]])]), ne('div', { 'p': 'l3 y2 r2', 'items-center': '', 'bg-header': '', 'border': 'b-2 base', 'grid': '~ items-center gap-x-2 rows-[auto_auto]', 'class': ot(j(M)) }, [ne('div', { class: ot(j(O)), flex: '~ gap-2 items-center' }, [D[14] || (D[14] = ne('div', { 'aria-hidden': 'true', 'class': 'i-carbon:filter' }, null, -1)), D[15] || (D[15] = ne('div', { 'flex-grow-1': '', 'text-sm': '' }, ' Filter ', -1)), ct(Ie(te, { disabled: j(h), title: 'Clear search', icon: 'i-carbon:filter-remove', onClickPassive: D[4] || (D[4] = C => j(L)(!1)) }, null, 8, ['disabled']), [[K, 'Clear Filter', void 0, { bottom: !0 }]])], 2), Ie(ee, { 'modelValue': j(u).failed, 'onUpdate:modelValue': D[5] || (D[5] = C => j(u).failed = C), 'label': 'Fail' }, null, 8, ['modelValue']), Ie(ee, { 'modelValue': j(u).success, 'onUpdate:modelValue': D[6] || (D[6] = C => j(u).success = C), 'label': 'Pass' }, null, 8, ['modelValue']), Ie(ee, { 'modelValue': j(u).skipped, 'onUpdate:modelValue': D[7] || (D[7] = C => j(u).skipped = C), 'label': 'Skip' }, null, 8, ['modelValue']), Ie(ee, { 'modelValue': j(u).onlyTests, 'onUpdate:modelValue': D[8] || (D[8] = C => j(u).onlyTests = C), 'label': 'Only Tests' }, null, 8, ['modelValue'])], 2)]), ne('div', { 'class': 'scrolls', 'flex-auto': '', 'py-1': '', 'onScrollPassive': D[12] || (D[12] = (...C) => j(Jv) && j(Jv)(...C)) }, [Ie(q, null, MT({ default: it(() => [(j(p) || j(g)) && j(E).length === 0 ? (se(), ye(nt, { key: 0 }, [j(l) ? (se(), ye('div', Vbe, [D[18] || (D[18] = ne('div', { op30: '' }, ' No matched test ', -1)), ne('button', { 'type': 'button', 'font-light': '', 'text-sm': '', 'border': '~ gray-400/50 rounded', 'p': 'x2 y0.5', 'm': 't2', 'op': '50', 'class': ot(j(v) ? null : 'hover:op100'), 'disabled': j(v), 'onClickPassive': D[9] || (D[9] = C => j(w)(!0)) }, ' Clear Search ', 42, Gbe), ne('button', { 'type': 'button', 'font-light': '', 'text-sm': '', 'border': '~ gray-400/50 rounded', 'p': 'x2 y0.5', 'm': 't2', 'op': '50', 'class': ot(j(h) ? null : 'hover:op100'), 'disabled': j(h), 'onClickPassive': D[10] || (D[10] = C => j(L)(!0)) }, ' Clear Filter ', 42, Xbe), ne('button', { 'type': 'button', 'font-light': '', 'op': '50 hover:100', 'text-sm': '', 'border': '~ gray-400/50 rounded', 'p': 'x2 y0.5', 'm': 't2', 'onClickPassive': D[11] || (D[11] = (...C) => j(y) && j(y)(...C)) }, ' Clear All ', 32)])) : (se(), ye('div', Kbe, D[19] || (D[19] = [ne('div', { class: 'i-carbon:circle-dash animate-spin' }, null, -1), ne('div', { op30: '' }, ' Loading... ', -1)])))], 64)) : (se(), Ye(j(Kp), { 'key': 1, 'page-mode': '', 'key-field': 'id', 'item-size': 28, 'items': j(E), 'buffer': 100 }, { default: it(({ item: C }) => [Ie(W, { 'class': ot(['h-28px m-0 p-0', j(mo) === C.id ? 'bg-active' : '']), 'task-id': C.id, 'expandable': C.expandable, 'type': C.type, 'current': j(mo) === C.id, 'indent': C.indent, 'name': C.name, 'typecheck': C.typecheck === !0, 'project-name': C.projectName ?? '', 'project-name-color': C.projectNameColor ?? '', 'state': C.state, 'duration': C.duration, 'opened': C.expanded, 'disable-task-location': !j(i), 'on-item-click': z.onItemClick }, null, 8, ['task-id', 'expandable', 'type', 'current', 'indent', 'name', 'typecheck', 'project-name', 'project-name-color', 'state', 'duration', 'opened', 'disable-task-location', 'class', 'on-item-click'])]), _: 1 }, 8, ['items']))]), _: 2 }, [j(l) ? { name: 'summary', fn: it(() => [ne('div', Bbe, [ne('span', Wbe, ` FAIL (${Re(j(A).failed)}) `, 1), D[16] || (D[16] = ne('span', null, '/', -1)), ne('span', jbe, ` RUNNING (${Re(j(A).running)}) `, 1), ne('span', qbe, ` PASS (${Re(j(A).success)}) `, 1), D[17] || (D[17] = ne('span', null, '/', -1)), ne('span', Ube, ` SKIP (${Re(j(u).onlyTests ? j(A).skipped : '--')}) `, 1)])]), key: '0' } : void 0]), 1024)], 32)], 512) } } }); const Ybe = `${new URL('../favicon.svg', import.meta.url).href}`; const Zbe = { class: 'flex text-lg' }; const Qbe = at({ __name: 'Navigation', setup(e) { function t() { return ht.rpc.updateSnapshot() } const n = _e(() => ll.value ? 'light' : 'dark'); async function i(u) { Ns.value && (Nu.value = !0, await Et(), vo.value && (Iu(!0), await Et())), u != null && u.length ? await Rp(u) : await Xfe() } function s() { Ae.collapseAllNodes() } function l() { Ae.expandAllNodes() } return (u, f) => { const h = ri; const p = Jbe; const g = Dr('tooltip'); return se(), Ye(p, { 'border': 'r base', 'on-item-click': j(BM), 'nested': !0, 'onRun': i }, { header: it(({ filteredFiles: v }) => [f[8] || (f[8] = ne('img', { 'w-6': '', 'h-6': '', 'src': Ybe, 'alt': 'Vitest logo' }, null, -1)), f[9] || (f[9] = ne('span', { 'font-light': '', 'text-sm': '', 'flex-1': '' }, 'Vitest', -1)), ne('div', Zbe, [ct(Ie(h, { 'title': 'Collapse tests', 'disabled': !j(Zs), 'data-testid': 'collapse-all', 'icon': 'i-carbon:collapse-all', 'onClick': f[0] || (f[0] = y => s()) }, null, 8, ['disabled']), [[to, !j(D0)], [g, 'Collapse tests', void 0, { bottom: !0 }]]), ct(Ie(h, { 'disabled': !j(Zs), 'title': 'Expand tests', 'data-testid': 'expand-all', 'icon': 'i-carbon:expand-all', 'onClick': f[1] || (f[1] = y => l()) }, null, 8, ['disabled']), [[to, j(D0)], [g, 'Expand tests', void 0, { bottom: !0 }]]), ct(Ie(h, { 'title': 'Show dashboard', 'class': '!animate-100ms', 'animate-count-1': '', 'icon': 'i-carbon:dashboard', 'onClick': f[2] || (f[2] = y => j(Iu)(!0)) }, null, 512), [[to, j(Lh) && !j(Ns) || !j(qs)], [g, 'Dashboard', void 0, { bottom: !0 }]]), j(Lh) && !j(Ns) ? (se(), Ye(j(qw), { key: 0, title: 'Coverage enabled but missing html reporter', class: 'w-1.4em h-1.4em op100 rounded flex color-red5 dark:color-#f43f5e cursor-help' }, { popper: it(() => f[6] || (f[6] = [ne('div', { class: 'op100 gap-1 p-y-1', grid: '~ items-center cols-[1.5em_1fr]' }, [ne('div', { class: 'i-carbon:information-square w-1.5em h-1.5em' }), ne('div', null, 'Coverage enabled but missing html reporter.'), ne('div', { style: { 'grid-column': '2' } }, ' Add html reporter to your configuration to see coverage here. ')], -1)])), default: it(() => [f[7] || (f[7] = ne('div', { class: 'i-carbon:folder-off ma' }, null, -1))]), _: 1, __: [7] })) : je('', !0), j(Ns) ? ct((se(), Ye(h, { 'key': 1, 'disabled': j(Nu), 'title': 'Show coverage', 'class': '!animate-100ms', 'animate-count-1': '', 'icon': 'i-carbon:folder-details-reference', 'onClick': f[3] || (f[3] = y => j(WM)()) }, null, 8, ['disabled'])), [[to, !j(vo)], [g, 'Coverage', void 0, { bottom: !0 }]]) : je('', !0), j(Ae).summary.failedSnapshot && !j(pr) ? ct((se(), Ye(h, { key: 2, icon: 'i-carbon:result-old', disabled: !j(Ae).summary.failedSnapshotEnabled, onClick: f[4] || (f[4] = y => j(Ae).summary.failedSnapshotEnabled && t()) }, null, 8, ['disabled'])), [[g, 'Update all failed snapshot(s)', void 0, { bottom: !0 }]]) : je('', !0), j(pr) ? je('', !0) : ct((se(), Ye(h, { key: 3, disabled: (v == null ? void 0 : v.length) === 0, icon: 'i-carbon:play', onClick: y => i(v) }, null, 8, ['disabled', 'onClick'])), [[g, v ? v.length === 0 ? 'No test to run (clear filter)' : 'Rerun filtered' : 'Rerun all', void 0, { bottom: !0 }]]), ct(Ie(h, { icon: 'dark:i-carbon-moon i-carbon:sun', onClick: f[5] || (f[5] = y => j(Ode)()) }, null, 512), [[g, `Toggle to ${j(n)} mode`, void 0, { bottom: !0 }]])])]), _: 1 }, 8, ['on-item-click']) } } }); const ewe = { 'h-3px': '', 'relative': '', 'overflow-hidden': '', 'class': 'px-0', 'w-screen': '' }; const twe = at({ __name: 'ProgressBar', setup(e) { const { width: t } = Dx(); const n = _e(() => [Ae.summary.files === 0 && '!bg-gray-4 !dark:bg-gray-7', !$s.value && 'in-progress'].filter(Boolean).join(' ')); const i = _e(() => { const f = Ae.summary.files; return f > 0 ? t.value * Ae.summary.filesSuccess / f : 0 }); const s = _e(() => { const f = Ae.summary.files; return f > 0 ? t.value * Ae.summary.filesFailed / f : 0 }); const l = _e(() => Ae.summary.files - Ae.summary.filesFailed - Ae.summary.filesSuccess); const u = _e(() => { const f = Ae.summary.files; return f > 0 ? t.value * l.value / f : 0 }); return (f, h) => (se(), ye('div', { 'absolute': '', 't-0': '', 'l-0': '', 'r-0': '', 'z-index-1031': '', 'pointer-events-none': '', 'p-0': '', 'h-3px': '', 'grid': '~ auto-cols-max', 'justify-items-center': '', 'w-screen': '', 'class': ot(j(n)) }, [ne('div', ewe, [ne('div', { 'absolute': '', 'l-0': '', 't-0': '', 'bg-red5': '', 'h-3px': '', 'class': ot(j(n)), 'style': nn(`width: ${j(s)}px;`) }, '   ', 6), ne('div', { 'absolute': '', 'l-0': '', 't-0': '', 'bg-green5': '', 'h-3px': '', 'class': ot(j(n)), 'style': nn(`left: ${j(s)}px; width: ${j(i)}px;`) }, '   ', 6), ne('div', { 'absolute': '', 'l-0': '', 't-0': '', 'bg-yellow5': '', 'h-3px': '', 'class': ot(j(n)), 'style': nn(`left: ${j(i) + j(s)}px; width: ${j(u)}px;`) }, '   ', 6)])], 2)) } }); const nwe = ni(twe, [['__scopeId', 'data-v-16879415']]); const Oy = { __name: 'splitpanes', props: { horizontal: { type: Boolean }, pushOtherPanes: { type: Boolean, default: !0 }, dblClickSplitter: { type: Boolean, default: !0 }, rtl: { type: Boolean, default: !1 }, firstSplitter: { type: Boolean } }, emits: ['ready', 'resize', 'resized', 'pane-click', 'pane-maximize', 'pane-add', 'pane-remove', 'splitter-click'], setup(e, { emit: t }) {
  const n = t; const i = e; const s = PT(); const l = Ue([]); const u = _e(() => l.value.reduce((ie, U) => (ie[~~U.id] = U) && ie, {})); const f = _e(() => l.value.length); const h = Ue(null); const p = Ue(!1); const g = Ue({ mouseDown: !1, dragging: !1, activeSplitter: null, cursorOffset: 0 }); const v = Ue({ splitter: null, timeoutId: null }); const y = _e(() => ({ [`splitpanes splitpanes--${i.horizontal ? 'horizontal' : 'vertical'}`]: !0, 'splitpanes--dragging': g.value.dragging })); const w = () => { document.addEventListener('mousemove', A, { passive: !1 }), document.addEventListener('mouseup', E), 'ontouchstart' in window && (document.addEventListener('touchmove', A, { passive: !1 }), document.addEventListener('touchend', E)) }; const L = () => { document.removeEventListener('mousemove', A, { passive: !1 }), document.removeEventListener('mouseup', E), 'ontouchstart' in window && (document.removeEventListener('touchmove', A, { passive: !1 }), document.removeEventListener('touchend', E)) }; const $ = (ie, U) => { const Q = ie.target.closest('.splitpanes__splitter'); if (Q) { const { left: J, top: ae } = Q.getBoundingClientRect(); const { clientX: ge, clientY: F } = 'ontouchstart' in window && ie.touches ? ie.touches[0] : ie; g.value.cursorOffset = i.horizontal ? F - ae : ge - J }w(), g.value.mouseDown = !0, g.value.activeSplitter = U }; const A = (ie) => { g.value.mouseDown && (ie.preventDefault(), g.value.dragging = !0, requestAnimationFrame(() => { te(z(ie)), n('resize', l.value.map(U => ({ min: U.min, max: U.max, size: U.size }))) })) }; const E = () => { g.value.dragging && n('resized', l.value.map(ie => ({ min: ie.min, max: ie.max, size: ie.size }))), g.value.mouseDown = !1, setTimeout(() => { g.value.dragging = !1, L() }, 100) }; const M = (ie, U) => { 'ontouchstart' in window && (ie.preventDefault(), i.dblClickSplitter && (v.value.splitter === U ? (clearTimeout(v.value.timeoutId), v.value.timeoutId = null, O(ie, U), v.value.splitter = null) : (v.value.splitter = U, v.value.timeoutId = setTimeout(() => v.value.splitter = null, 500)))), g.value.dragging || n('splitter-click', l.value[U]) }; const O = (ie, U) => { let Q = 0; l.value = l.value.map((J, ae) => (J.size = ae === U ? J.max : J.min, ae !== U && (Q += J.min), J)), l.value[U].size -= Q, n('pane-maximize', l.value[U]), n('resized', l.value.map(J => ({ min: J.min, max: J.max, size: J.size }))) }; const k = (ie, U) => { n('pane-click', u.value[U]) }; const z = (ie) => { const U = h.value.getBoundingClientRect(); const { clientX: Q, clientY: J } = 'ontouchstart' in window && ie.touches ? ie.touches[0] : ie; return { x: Q - (i.horizontal ? 0 : g.value.cursorOffset) - U.left, y: J - (i.horizontal ? g.value.cursorOffset : 0) - U.top } }; const D = (ie) => { ie = ie[i.horizontal ? 'y' : 'x']; const U = h.value[i.horizontal ? 'clientHeight' : 'clientWidth']; return i.rtl && !i.horizontal && (ie = U - ie), ie * 100 / U }; const te = (ie) => {
    const U = g.value.activeSplitter; let Q = { prevPanesSize: W(U), nextPanesSize: q(U), prevReachedMinPanes: 0, nextReachedMinPanes: 0 }; const J = 0 + (i.pushOtherPanes ? 0 : Q.prevPanesSize); const ae = 100 - (i.pushOtherPanes ? 0 : Q.nextPanesSize); const ge = Math.max(Math.min(D(ie), ae), J); let F = [U, U + 1]; let V = l.value[F[0]] || null; let Y = l.value[F[1]] || null; const fe = V.max < 100 && ge >= V.max + Q.prevPanesSize; const pe = Y.max < 100 && ge <= 100 - (Y.max + q(U + 1)); if (fe || pe) { fe ? (V.size = V.max, Y.size = Math.max(100 - V.max - Q.prevPanesSize - Q.nextPanesSize, 0)) : (V.size = Math.max(100 - Y.max - Q.prevPanesSize - q(U + 1), 0), Y.size = Y.max); return } if (i.pushOtherPanes) {
      const he = ee(Q, ge); if (!he)
        return; ({ sums: Q, panesToResize: F } = he), V = l.value[F[0]] || null, Y = l.value[F[1]] || null
    }V !== null && (V.size = Math.min(Math.max(ge - Q.prevPanesSize - Q.prevReachedMinPanes, V.min), V.max)), Y !== null && (Y.size = Math.min(Math.max(100 - ge - Q.nextPanesSize - Q.nextReachedMinPanes, Y.min), Y.max))
  }; const ee = (ie, U) => { const Q = g.value.activeSplitter; const J = [Q, Q + 1]; return U < ie.prevPanesSize + l.value[J[0]].min && (J[0] = K(Q).index, ie.prevReachedMinPanes = 0, J[0] < Q && l.value.forEach((ae, ge) => { ge > J[0] && ge <= Q && (ae.size = ae.min, ie.prevReachedMinPanes += ae.min) }), ie.prevPanesSize = W(J[0]), J[0] === void 0) ? (ie.prevReachedMinPanes = 0, l.value[0].size = l.value[0].min, l.value.forEach((ae, ge) => { ge > 0 && ge <= Q && (ae.size = ae.min, ie.prevReachedMinPanes += ae.min) }), l.value[J[1]].size = 100 - ie.prevReachedMinPanes - l.value[0].min - ie.prevPanesSize - ie.nextPanesSize, null) : U > 100 - ie.nextPanesSize - l.value[J[1]].min && (J[1] = C(Q).index, ie.nextReachedMinPanes = 0, J[1] > Q + 1 && l.value.forEach((ae, ge) => { ge > Q && ge < J[1] && (ae.size = ae.min, ie.nextReachedMinPanes += ae.min) }), ie.nextPanesSize = q(J[1] - 1), J[1] === void 0) ? (ie.nextReachedMinPanes = 0, l.value.forEach((ae, ge) => { ge < f.value - 1 && ge >= Q + 1 && (ae.size = ae.min, ie.nextReachedMinPanes += ae.min) }), l.value[J[0]].size = 100 - ie.prevPanesSize - q(J[0] - 1), null) : { sums: ie, panesToResize: J } }; const W = ie => l.value.reduce((U, Q, J) => U + (J < ie ? Q.size : 0), 0); const q = ie => l.value.reduce((U, Q, J) => U + (J > ie + 1 ? Q.size : 0), 0); const K = ie => [...l.value].reverse().find(U => U.index < ie && U.size > U.min) || {}; const C = ie => l.value.find(U => U.index > ie + 1 && U.size > U.min) || {}; const P = () => { let ie; Array.from(((ie = h.value) == null ? void 0 : ie.children) || []).forEach((U) => { const Q = U.classList.contains('splitpanes__pane'); const J = U.classList.contains('splitpanes__splitter'); !Q && !J && (U.remove(), console.warn('Splitpanes: Only <pane> elements are allowed at the root of <splitpanes>. One of your DOM nodes was removed.')) }) }; const I = (ie, U, Q = !1) => { const J = ie - 1; const ae = document.createElement('div'); ae.classList.add('splitpanes__splitter'), Q || (ae.onmousedown = ge => $(ge, J), typeof window < 'u' && 'ontouchstart' in window && (ae.ontouchstart = ge => $(ge, J)), ae.onclick = ge => M(ge, J + 1)), i.dblClickSplitter && (ae.ondblclick = ge => O(ge, J + 1)), U.parentNode.insertBefore(ae, U) }; const S = (ie) => { ie.onmousedown = void 0, ie.onclick = void 0, ie.ondblclick = void 0, ie.remove() }; const R = () => { let ie; const U = Array.from(((ie = h.value) == null ? void 0 : ie.children) || []); U.forEach((J) => { J.className.includes('splitpanes__splitter') && S(J) }); let Q = 0; U.forEach((J) => { J.className.includes('splitpanes__pane') && (!Q && i.firstSplitter ? I(Q, J, !0) : Q && I(Q, J), Q++) }) }; const B = ({ uid: ie, ...U }) => { const Q = u.value[ie]; Object.entries(U).forEach(([J, ae]) => Q[J] = ae) }; const oe = (ie) => { let U; let Q = -1; Array.from(((U = h.value) == null ? void 0 : U.children) || []).some(J => (J.className.includes('splitpanes__pane') && Q++, J.isSameNode(ie.el))), l.value.splice(Q, 0, { ...ie, index: Q }), l.value.forEach((J, ae) => J.index = ae), p.value && Et(() => { R(), we({ addedPane: l.value[Q] }), n('pane-add', { index: Q, panes: l.value.map(J => ({ min: J.min, max: J.max, size: J.size })) }) }) }; const ue = (ie) => { const U = l.value.findIndex(J => J.id === ie); const Q = l.value.splice(U, 1)[0]; l.value.forEach((J, ae) => J.index = ae), Et(() => { R(), we({ removedPane: { ...Q } }), n('pane-remove', { removed: Q, panes: l.value.map(J => ({ min: J.min, max: J.max, size: J.size })) }) }) }; const we = (ie = {}) => { !ie.addedPane && !ie.removedPane ? qe() : l.value.some(U => U.givenSize !== null || U.min || U.max < 100) ? Ze(ie) : Pe(), p.value && n('resized', l.value.map(U => ({ min: U.min, max: U.max, size: U.size }))) }; const Pe = () => { const ie = 100 / f.value; let U = 0; const Q = []; const J = []; l.value.forEach((ae) => { ae.size = Math.max(Math.min(ie, ae.max), ae.min), U -= ae.size, ae.size >= ae.max && Q.push(ae.id), ae.size <= ae.min && J.push(ae.id) }), U > 0.1 && Ke(U, Q, J) }; const qe = () => { let ie = 100; const U = []; const Q = []; let J = 0; l.value.forEach((ge) => { ie -= ge.size, ge.givenSize !== null && J++, ge.size >= ge.max && U.push(ge.id), ge.size <= ge.min && Q.push(ge.id) }); let ae = 100; ie > 0.1 && (l.value.forEach((ge) => { ge.givenSize === null && (ge.size = Math.max(Math.min(ie / (f.value - J), ge.max), ge.min)), ae -= ge.size }), ae > 0.1 && Ke(ae, U, Q)) }; const Ze = ({ addedPane: ie, removedPane: U } = {}) => { let Q = 100 / f.value; let J = 0; const ae = []; const ge = []; ((ie == null ? void 0 : ie.givenSize) ?? null) !== null && (Q = (100 - ie.givenSize) / (f.value - 1).value), l.value.forEach((F) => { J -= F.size, F.size >= F.max && ae.push(F.id), F.size <= F.min && ge.push(F.id) }), !(Math.abs(J) < 0.1) && (l.value.forEach((F) => { (ie == null ? void 0 : ie.givenSize) !== null && (ie == null ? void 0 : ie.id) === F.id || (F.size = Math.max(Math.min(Q, F.max), F.min)), J -= F.size, F.size >= F.max && ae.push(F.id), F.size <= F.min && ge.push(F.id) }), J > 0.1 && Ke(J, ae, ge)) }; const Ke = (ie, U, Q) => {
    let J; ie > 0 ? J = ie / (f.value - U.length) : J = ie / (f.value - Q.length), l.value.forEach((ae, ge) => {
      if (ie > 0 && !U.includes(ae.id)) { const F = Math.max(Math.min(ae.size + J, ae.max), ae.min); const V = F - ae.size; ie -= V, ae.size = F }
      else if (!Q.includes(ae.id)) { const F = Math.max(Math.min(ae.size + J, ae.max), ae.min); const V = F - ae.size; ie -= V, ae.size = F }
    }), Math.abs(ie) > 0.1 && Et(() => { p.value && console.warn('Splitpanes: Could not resize panes correctly due to their constraints.') })
  }; St(() => i.firstSplitter, () => R()), St(() => i.dblClickSplitter, (ie) => { [...h.value.querySelectorAll('.splitpanes__splitter')].forEach((U, Q) => { U.ondblclick = ie ? J => O(J, Q) : void 0 }) }), Fa(() => p.value = !1), bo(() => { P(), R(), we(), n('ready'), p.value = !0 }); const Je = () => { let ie; return Ba('div', { ref: h, class: y.value }, (ie = s.default) == null ? void 0 : ie.call(s)) }; return Er('panes', l), Er('indexedPanes', u), Er('horizontal', _e(() => i.horizontal)), Er('requestUpdate', B), Er('onPaneAdd', oe), Er('onPaneRemove', ue), Er('onPaneClick', k), (ie, U) => (se(), Ye(rh(Je)))
} }; const Gc = { __name: 'pane', props: { size: { type: [Number, String] }, minSize: { type: [Number, String], default: 0 }, maxSize: { type: [Number, String], default: 100 } }, setup(e) { let t; const n = e; const i = wn('requestUpdate'); const s = wn('onPaneAdd'); const l = wn('horizontal'); const u = wn('onPaneRemove'); const f = wn('onPaneClick'); const h = (t = Ko()) == null ? void 0 : t.uid; const p = wn('indexedPanes'); const g = _e(() => p.value[h]); const v = Ue(null); const y = _e(() => { const A = isNaN(n.size) || n.size === void 0 ? 0 : Number.parseFloat(n.size); return Math.max(Math.min(A, L.value), w.value) }); const w = _e(() => { const A = Number.parseFloat(n.minSize); return isNaN(A) ? 0 : A }); const L = _e(() => { const A = Number.parseFloat(n.maxSize); return isNaN(A) ? 100 : A }); const $ = _e(() => { let A; return `${l.value ? 'height' : 'width'}: ${(A = g.value) == null ? void 0 : A.size}%` }); return bo(() => { s({ id: h, el: v.value, min: w.value, max: L.value, givenSize: n.size === void 0 ? null : y.value, size: y.value }) }), St(() => y.value, A => i({ uid: h, size: A })), St(() => w.value, A => i({ uid: h, min: A })), St(() => L.value, A => i({ uid: h, max: A })), Fa(() => u(h)), (A, E) => (se(), ye('div', { ref_key: 'paneEl', ref: v, class: 'splitpanes__pane', onClick: E[0] || (E[0] = M => j(f)(M, A._.uid)), style: nn($.value) }, [xn(A.$slots, 'default')], 4)) } }; const rwe = { 'h-screen': '', 'w-screen': '', 'overflow': 'hidden' }; const iwe = at({ __name: 'index', setup(e) { const t = HM(); const n = Fc((g) => { h(), f(g) }, 0); const i = Fc((g) => { g.forEach((v, y) => { Us.value[y] = v.size }), u(g), p() }, 0); const s = Fc((g) => { g.forEach((v, y) => { co.value[y] = v.size }), f(g), p() }, 0); const l = Fc((g) => { u(g), h() }, 0); function u(g) { At.navigation = g[0].size, At.details.size = g[1].size } function f(g) { At.details.browser = g[0].size, At.details.main = g[1].size } function h() { const g = document.querySelector('#tester-ui'); g && (g.style.pointerEvents = 'none') } function p() { const g = document.querySelector('#tester-ui'); g && (g.style.pointerEvents = '') } return (g, v) => { const y = nwe; const w = Qbe; const L = Uye; const $ = lye; const A = rye; const E = ude; const M = Qfe; return se(), ye(nt, null, [Ie(y), ne('div', rwe, [Ie(j(Oy), { class: 'pt-4px', onResized: j(i), onResize: j(l) }, { default: it(() => [Ie(j(Gc), { size: j(Us)[0] }, { default: it(() => [Ie(w)]), _: 1 }, 8, ['size']), Ie(j(Gc), { size: j(Us)[1] }, { default: it(() => [j(Nt) ? (se(), Ye(j(Oy), { id: 'details-splitpanes', key: 'browser-detail', onResize: j(n), onResized: j(s) }, { default: it(() => [Ie(j(Gc), { 'size': j(co)[0], 'min-size': '10' }, { default: it(() => [v[0] || (vu(-1, !0), (v[0] = Ie(E)).cacheIndex = 0, vu(1), v[0])]), _: 1 }, 8, ['size']), Ie(j(Gc), { size: j(co)[1] }, { default: it(() => [j(t) ? (se(), Ye(L, { key: 'summary' })) : j(vo) ? (se(), Ye($, { key: 'coverage', src: j(W0) }, null, 8, ['src'])) : (se(), Ye(A, { key: 'details' }))]), _: 1 }, 8, ['size'])]), _: 1 }, 8, ['onResize', 'onResized'])) : (se(), Ye($C, { key: 'ui-detail' }, { default: it(() => [j(t) ? (se(), Ye(L, { key: 'summary' })) : j(vo) ? (se(), Ye($, { key: 'coverage', src: j(W0) }, null, 8, ['src'])) : (se(), Ye(A, { key: 'details' }))]), _: 1 }))]), _: 1 }, 8, ['size'])]), _: 1 }, 8, ['onResized', 'onResize'])]), Ie(M)], 64) } } }); const owe = [{ name: 'index', path: '/', component: iwe, props: !0 }]/*!
  * vue-router v4.5.1
  * (c) 2025 Eduardo San Martin Morote
  * @license MIT
  */const Ls = typeof document < 'u'; function uS(e) { return typeof e == 'object' || 'displayName' in e || 'props' in e || '__vccOpts' in e } function swe(e) { return e.__esModule || e[Symbol.toStringTag] === 'Module' || e.default && uS(e.default) } const bt = Object.assign; function Xd(e, t) { const n = {}; for (const i in t) { const s = t[i]; n[i] = zr(s) ? s.map(e) : e(s) } return n } function aa() {} const zr = Array.isArray; const fS = /#/g; const lwe = /&/g; const awe = /\//g; const cwe = /=/g; const uwe = /\?/g; const dS = /\+/g; const fwe = /%5B/g; const dwe = /%5D/g; const hS = /%5E/g; const hwe = /%60/g; const pS = /%7B/g; const pwe = /%7C/g; const gS = /%7D/g; const gwe = /%20/g; function Jp(e) { return encodeURI(`${e}`).replace(pwe, '|').replace(fwe, '[').replace(dwe, ']') } function mwe(e) { return Jp(e).replace(pS, '{').replace(gS, '}').replace(hS, '^') } function Gh(e) { return Jp(e).replace(dS, '%2B').replace(gwe, '+').replace(fS, '%23').replace(lwe, '%26').replace(hwe, '`').replace(pS, '{').replace(gS, '}').replace(hS, '^') } function vwe(e) { return Gh(e).replace(cwe, '%3D') } function ywe(e) { return Jp(e).replace(fS, '%23').replace(uwe, '%3F') } function bwe(e) { return e == null ? '' : ywe(e).replace(awe, '%2F') } function Ia(e) {
  try { return decodeURIComponent(`${e}`) }
  catch {} return `${e}`
} const wwe = /\/$/; const xwe = e => e.replace(wwe, ''); function Kd(e, t, n = '/') { let i; let s = {}; let l = ''; let u = ''; const f = t.indexOf('#'); let h = t.indexOf('?'); return f < h && f >= 0 && (h = -1), h > -1 && (i = t.slice(0, h), l = t.slice(h + 1, f > -1 ? f : t.length), s = e(l)), f > -1 && (i = i || t.slice(0, f), u = t.slice(f, t.length)), i = Twe(i ?? t, n), { fullPath: i + (l && '?') + l + u, path: i, query: s, hash: Ia(u) } } function Swe(e, t) { const n = t.query ? e(t.query) : ''; return t.path + (n && '?') + n + (t.hash || '') } function Ry(e, t) { return !t || !e.toLowerCase().startsWith(t.toLowerCase()) ? e : e.slice(t.length) || '/' } function _we(e, t, n) { const i = t.matched.length - 1; const s = n.matched.length - 1; return i > -1 && i === s && rl(t.matched[i], n.matched[s]) && mS(t.params, n.params) && e(t.query) === e(n.query) && t.hash === n.hash } function rl(e, t) { return (e.aliasOf || e) === (t.aliasOf || t) } function mS(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1; for (const n in e) {
    if (!kwe(e[n], t[n]))
      return !1
  } return !0
} function kwe(e, t) { return zr(e) ? zy(e, t) : zr(t) ? zy(t, e) : e === t } function zy(e, t) { return zr(t) ? e.length === t.length && e.every((n, i) => n === t[i]) : e.length === 1 && e[0] === t } function Twe(e, t) {
  if (e.startsWith('/'))
    return e; if (!e)
    return t; const n = t.split('/'); const i = e.split('/'); const s = i[i.length - 1]; (s === '..' || s === '.') && i.push(''); let l = n.length - 1; let u; let f; for (u = 0; u < i.length; u++) {
    if (f = i[u], f !== '.') {
      if (f === '..')
        l > 1 && l--; else break
    }
  } return `${n.slice(0, l).join('/')}/${i.slice(u).join('/')}`
} const Vi = { path: '/', name: void 0, params: {}, query: {}, hash: '', fullPath: '/', matched: [], meta: {}, redirectedFrom: void 0 }; let Pa; (function (e) { e.pop = 'pop', e.push = 'push' })(Pa || (Pa = {})); let ca; (function (e) { e.back = 'back', e.forward = 'forward', e.unknown = '' })(ca || (ca = {})); function Cwe(e) {
  if (!e) {
    if (Ls) { const t = document.querySelector('base'); e = t && t.getAttribute('href') || '/', e = e.replace(/^\w+:\/\/[^/]+/, '') }
    else {
      e = '/'
    }
  } return e[0] !== '/' && e[0] !== '#' && (e = `/${e}`), xwe(e)
} const Ewe = /^[^#]+#/; function Awe(e, t) { return e.replace(Ewe, '#') + t } function Lwe(e, t) { const n = document.documentElement.getBoundingClientRect(); const i = e.getBoundingClientRect(); return { behavior: t.behavior, left: i.left - n.left - (t.left || 0), top: i.top - n.top - (t.top || 0) } } const yf = () => ({ left: window.scrollX, top: window.scrollY }); function $we(e) {
  let t; if ('el' in e) {
    const n = e.el; const i = typeof n == 'string' && n.startsWith('#'); const s = typeof n == 'string' ? i ? document.getElementById(n.slice(1)) : document.querySelector(n) : n; if (!s)
      return; t = Lwe(s, e)
  }
  else {
    t = e
  }'scrollBehavior' in document.documentElement.style ? window.scrollTo(t) : window.scrollTo(t.left != null ? t.left : window.scrollX, t.top != null ? t.top : window.scrollY)
} function Dy(e, t) { return (history.state ? history.state.position - t : -1) + e } const Xh = new Map(); function Mwe(e, t) { Xh.set(e, t) } function Nwe(e) { const t = Xh.get(e); return Xh.delete(e), t } const Iwe = () => `${location.protocol}//${location.host}`; function vS(e, t) { const { pathname: n, search: i, hash: s } = t; const l = e.indexOf('#'); if (l > -1) { const f = s.includes(e.slice(l)) ? e.slice(l).length : 1; let h = s.slice(f); return h[0] !== '/' && (h = `/${h}`), Ry(h, '') } return Ry(n, e) + i + s } function Pwe(e, t, n, i) {
  const s = []; let l = []; let u = null; const f = ({ state: y }) => {
    const w = vS(e, location); const L = n.value; const $ = t.value; let A = 0; if (y) { if (n.value = w, t.value = y, u && u === L) { u = null; return }A = $ ? y.position - $.position : 0 }
    else {
      i(w)
    }s.forEach((E) => { E(n.value, L, { delta: A, type: Pa.pop, direction: A ? A > 0 ? ca.forward : ca.back : ca.unknown }) })
  }; function h() { u = n.value } function p(y) { s.push(y); const w = () => { const L = s.indexOf(y); L > -1 && s.splice(L, 1) }; return l.push(w), w } function g() { const { history: y } = window; y.state && y.replaceState(bt({}, y.state, { scroll: yf() }), '') } function v() { for (const y of l)y(); l = [], window.removeEventListener('popstate', f), window.removeEventListener('beforeunload', g) } return window.addEventListener('popstate', f), window.addEventListener('beforeunload', g, { passive: !0 }), { pauseListeners: h, listen: p, destroy: v }
} function Fy(e, t, n, i = !1, s = !1) { return { back: e, current: t, forward: n, replaced: i, position: window.history.length, scroll: s ? yf() : null } } function Owe(e) {
  const { history: t, location: n } = window; const i = { value: vS(e, n) }; const s = { value: t.state }; s.value || l(i.value, { back: null, current: i.value, forward: null, position: t.length - 1, replaced: !0, scroll: null }, !0); function l(h, p, g) {
    const v = e.indexOf('#'); const y = v > -1 ? (n.host && document.querySelector('base') ? e : e.slice(v)) + h : Iwe() + e + h; try { t[g ? 'replaceState' : 'pushState'](p, '', y), s.value = p }
    catch (w) { console.error(w), n[g ? 'replace' : 'assign'](y) }
  } function u(h, p) { const g = bt({}, t.state, Fy(s.value.back, h, s.value.forward, !0), p, { position: s.value.position }); l(h, g, !0), i.value = h } function f(h, p) { const g = bt({}, s.value, t.state, { forward: h, scroll: yf() }); l(g.current, g, !0); const v = bt({}, Fy(i.value, h, null), { position: g.position + 1 }, p); l(h, v, !1), i.value = h } return { location: i, state: s, push: f, replace: u }
} function Rwe(e) { e = Cwe(e); const t = Owe(e); const n = Pwe(e, t.state, t.location, t.replace); function i(l, u = !0) { u || n.pauseListeners(), history.go(l) } const s = bt({ location: '', base: e, go: i, createHref: Awe.bind(null, e) }, t, n); return Object.defineProperty(s, 'location', { enumerable: !0, get: () => t.location.value }), Object.defineProperty(s, 'state', { enumerable: !0, get: () => t.state.value }), s } function zwe(e) { return e = location.host ? e || location.pathname + location.search : '', e.includes('#') || (e += '#'), Rwe(e) } function Dwe(e) { return typeof e == 'string' || e && typeof e == 'object' } function yS(e) { return typeof e == 'string' || typeof e == 'symbol' } const bS = Symbol(''); let Hy; (function (e) { e[e.aborted = 4] = 'aborted', e[e.cancelled = 8] = 'cancelled', e[e.duplicated = 16] = 'duplicated' })(Hy || (Hy = {})); function il(e, t) { return bt(new Error(), { type: e, [bS]: !0 }, t) } function vi(e, t) { return e instanceof Error && bS in e && (t == null || !!(e.type & t)) } const By = '[^/]+?'; const Fwe = { sensitive: !1, strict: !1, start: !0, end: !0 }; const Hwe = /[.+*?^${}()[\]/\\]/g; function Bwe(e, t) {
  const n = bt({}, Fwe, t); const i = []; let s = n.start ? '^' : ''; const l = []; for (const p of e) {
    const g = p.length ? [] : [90]; n.strict && !p.length && (s += '/'); for (let v = 0; v < p.length; v++) {
      const y = p[v]; let w = 40 + (n.sensitive ? 0.25 : 0); if (y.type === 0) {
        v || (s += '/'), s += y.value.replace(Hwe, '\\$&'), w += 40
      }
      else if (y.type === 1) {
        const { value: L, repeatable: $, optional: A, regexp: E } = y; l.push({ name: L, repeatable: $, optional: A }); const M = E || By; if (M !== By) {
          w += 10; try { new RegExp(`(${M})`) }
          catch (k) { throw new Error(`Invalid custom RegExp for param "${L}" (${M}): ${k.message}`) }
        } let O = $ ? `((?:${M})(?:/(?:${M}))*)` : `(${M})`; v || (O = A && p.length < 2 ? `(?:/${O})` : `/${O}`), A && (O += '?'), s += O, w += 20, A && (w += -8), $ && (w += -20), M === '.*' && (w += -50)
      }g.push(w)
    }i.push(g)
  } if (n.strict && n.end) { const p = i.length - 1; i[p][i[p].length - 1] += 0.7000000000000001 }n.strict || (s += '/?'), n.end ? s += '$' : n.strict && !s.endsWith('/') && (s += '(?:/|$)'); const u = new RegExp(s, n.sensitive ? '' : 'i'); function f(p) {
    const g = p.match(u); const v = {}; if (!g)
      return null; for (let y = 1; y < g.length; y++) { const w = g[y] || ''; const L = l[y - 1]; v[L.name] = w && L.repeatable ? w.split('/') : w } return v
  } function h(p) {
    let g = ''; let v = !1; for (const y of e) {
      (!v || !g.endsWith('/')) && (g += '/'), v = !1; for (const w of y) {
        if (w.type === 0) {
          g += w.value
        }
        else if (w.type === 1) {
          const { value: L, repeatable: $, optional: A } = w; const E = L in p ? p[L] : ''; if (zr(E) && !$)
            throw new Error(`Provided param "${L}" is an array but it is not repeatable (* or + modifiers)`); const M = zr(E) ? E.join('/') : E; if (!M) {
            if (A)
              y.length < 2 && (g.endsWith('/') ? g = g.slice(0, -1) : v = !0); else throw new Error(`Missing required param "${L}"`)
          } g += M
        }
      }
    } return g || '/'
  } return { re: u, score: i, keys: l, parse: f, stringify: h }
} function Wwe(e, t) {
  let n = 0; for (;n < e.length && n < t.length;) {
    const i = t[n] - e[n]; if (i)
      return i; n++
  } return e.length < t.length ? e.length === 1 && e[0] === 80 ? -1 : 1 : e.length > t.length ? t.length === 1 && t[0] === 80 ? 1 : -1 : 0
} function wS(e, t) {
  let n = 0; const i = e.score; const s = t.score; for (;n < i.length && n < s.length;) {
    const l = Wwe(i[n], s[n]); if (l)
      return l; n++
  } if (Math.abs(s.length - i.length) === 1) {
    if (Wy(i))
      return 1; if (Wy(s))
      return -1
  } return s.length - i.length
} function Wy(e) { const t = e[e.length - 1]; return e.length > 0 && t[t.length - 1] < 0 } const jwe = { type: 0, value: '' }; const qwe = /\w/; function Uwe(e) {
  if (!e)
    return [[]]; if (e === '/')
    return [[jwe]]; if (!e.startsWith('/'))
    throw new Error(`Invalid path "${e}"`); function t(w) { throw new Error(`ERR (${n})/"${p}": ${w}`) } let n = 0; let i = n; const s = []; let l; function u() { l && s.push(l), l = [] } let f = 0; let h; let p = ''; let g = ''; function v() { p && (n === 0 ? l.push({ type: 0, value: p }) : n === 1 || n === 2 || n === 3 ? (l.length > 1 && (h === '*' || h === '+') && t(`A repeatable param (${p}) must be alone in its segment. eg: '/:ids+.`), l.push({ type: 1, value: p, regexp: g, repeatable: h === '*' || h === '+', optional: h === '*' || h === '?' })) : t('Invalid state to consume buffer'), p = '') } function y() { p += h } for (;f < e.length;) { if (h = e[f++], h === '\\' && n !== 2) { i = n, n = 4; continue } switch (n) { case 0:h === '/' ? (p && v(), u()) : h === ':' ? (v(), n = 1) : y(); break; case 4:y(), n = i; break; case 1:h === '(' ? n = 2 : qwe.test(h) ? y() : (v(), n = 0, h !== '*' && h !== '?' && h !== '+' && f--); break; case 2:h === ')' ? g[g.length - 1] == '\\' ? g = g.slice(0, -1) + h : n = 3 : g += h; break; case 3:v(), n = 0, h !== '*' && h !== '?' && h !== '+' && f--, g = ''; break; default:t('Unknown state'); break } } return n === 2 && t(`Unfinished custom RegExp for param "${p}"`), v(), u(), s
} function Vwe(e, t, n) { const i = Bwe(Uwe(e.path), n); const s = bt(i, { record: e, parent: t, children: [], alias: [] }); return t && !s.record.aliasOf == !t.record.aliasOf && t.children.push(s), s } function Gwe(e, t) {
  const n = []; const i = new Map(); t = Vy({ strict: !1, end: !0, sensitive: !1 }, t); function s(v) { return i.get(v) } function l(v, y, w) { const L = !w; const $ = qy(v); $.aliasOf = w && w.record; const A = Vy(t, v); const E = [$]; if ('alias' in v) { const k = typeof v.alias == 'string' ? [v.alias] : v.alias; for (const z of k)E.push(qy(bt({}, $, { components: w ? w.record.components : $.components, path: z, aliasOf: w ? w.record : $ }))) } let M, O; for (const k of E) { const { path: z } = k; if (y && z[0] !== '/') { const D = y.record.path; const te = D[D.length - 1] === '/' ? '' : '/'; k.path = y.record.path + (z && te + z) } if (M = Vwe(k, y, A), w ? w.alias.push(M) : (O = O || M, O !== M && O.alias.push(M), L && v.name && !Uy(M) && u(v.name)), xS(M) && h(M), $.children) { const D = $.children; for (let te = 0; te < D.length; te++)l(D[te], M, w && w.children[te]) }w = w || M } return O ? () => { u(O) } : aa } function u(v) {
    if (yS(v)) { const y = i.get(v); y && (i.delete(v), n.splice(n.indexOf(y), 1), y.children.forEach(u), y.alias.forEach(u)) }
    else { const y = n.indexOf(v); y > -1 && (n.splice(y, 1), v.record.name && i.delete(v.record.name), v.children.forEach(u), v.alias.forEach(u)) }
  } function f() { return n } function h(v) { const y = Jwe(v, n); n.splice(y, 0, v), v.record.name && !Uy(v) && i.set(v.record.name, v) } function p(v, y) {
    let w; let L = {}; let $; let A; if ('name' in v && v.name) {
      if (w = i.get(v.name), !w)
        throw il(1, { location: v }); A = w.record.name, L = bt(jy(y.params, w.keys.filter(O => !O.optional).concat(w.parent ? w.parent.keys.filter(O => O.optional) : []).map(O => O.name)), v.params && jy(v.params, w.keys.map(O => O.name))), $ = w.stringify(L)
    }
    else if (v.path != null) {
      $ = v.path, w = n.find(O => O.re.test($)), w && (L = w.parse($), A = w.record.name)
    }
    else {
      if (w = y.name ? i.get(y.name) : n.find(O => O.re.test(y.path)), !w)
        throw il(1, { location: v, currentLocation: y }); A = w.record.name, L = bt({}, y.params, v.params), $ = w.stringify(L)
    } const E = []; let M = w; for (;M;)E.unshift(M.record), M = M.parent; return { name: A, path: $, params: L, matched: E, meta: Kwe(E) }
  }e.forEach(v => l(v)); function g() { n.length = 0, i.clear() } return { addRoute: l, resolve: p, removeRoute: u, clearRoutes: g, getRoutes: f, getRecordMatcher: s }
} function jy(e, t) { const n = {}; for (const i of t)i in e && (n[i] = e[i]); return n } function qy(e) { const t = { path: e.path, redirect: e.redirect, name: e.name, meta: e.meta || {}, aliasOf: e.aliasOf, beforeEnter: e.beforeEnter, props: Xwe(e), children: e.children || [], instances: {}, leaveGuards: new Set(), updateGuards: new Set(), enterCallbacks: {}, components: 'components' in e ? e.components || null : e.component && { default: e.component } }; return Object.defineProperty(t, 'mods', { value: {} }), t } function Xwe(e) {
  const t = {}; const n = e.props || !1; if ('component' in e) {
    t.default = n
  }
  else {
    for (const i in e.components)t[i] = typeof n == 'object' ? n[i] : n
  } return t
} function Uy(e) {
  for (;e;) {
    if (e.record.aliasOf)
      return !0; e = e.parent
  } return !1
} function Kwe(e) { return e.reduce((t, n) => bt(t, n.meta), {}) } function Vy(e, t) { const n = {}; for (const i in e)n[i] = i in t ? t[i] : e[i]; return n } function Jwe(e, t) { let n = 0; let i = t.length; for (;n !== i;) { const l = n + i >> 1; wS(e, t[l]) < 0 ? i = l : n = l + 1 } const s = Ywe(e); return s && (i = t.lastIndexOf(s, i - 1)), i } function Ywe(e) {
  let t = e; for (;t = t.parent;) {
    if (xS(t) && wS(e, t) === 0)
      return t
  }
} function xS({ record: e }) { return !!(e.name || e.components && Object.keys(e.components).length || e.redirect) } function Zwe(e) {
  const t = {}; if (e === '' || e === '?')
    return t; const i = (e[0] === '?' ? e.slice(1) : e).split('&'); for (let s = 0; s < i.length; ++s) {
    const l = i[s].replace(dS, ' '); const u = l.indexOf('='); const f = Ia(u < 0 ? l : l.slice(0, u)); const h = u < 0 ? null : Ia(l.slice(u + 1)); if (f in t) { let p = t[f]; zr(p) || (p = t[f] = [p]), p.push(h) }
    else {
      t[f] = h
    }
  } return t
} function Gy(e) { let t = ''; for (let n in e) { const i = e[n]; if (n = vwe(n), i == null) { i !== void 0 && (t += (t.length ? '&' : '') + n); continue }(zr(i) ? i.map(l => l && Gh(l)) : [i && Gh(i)]).forEach((l) => { l !== void 0 && (t += (t.length ? '&' : '') + n, l != null && (t += `=${l}`)) }) } return t } function Qwe(e) { const t = {}; for (const n in e) { const i = e[n]; i !== void 0 && (t[n] = zr(i) ? i.map(s => s == null ? null : `${s}`) : i == null ? i : `${i}`) } return t } const exe = Symbol(''); const Xy = Symbol(''); const Yp = Symbol(''); const SS = Symbol(''); const Kh = Symbol(''); function Vl() { let e = []; function t(i) { return e.push(i), () => { const s = e.indexOf(i); s > -1 && e.splice(s, 1) } } function n() { e = [] } return { add: t, list: () => e.slice(), reset: n } } function eo(e, t, n, i, s, l = u => u()) { const u = i && (i.enterCallbacks[s] = i.enterCallbacks[s] || []); return () => new Promise((f, h) => { const p = (y) => { y === !1 ? h(il(4, { from: n, to: t })) : y instanceof Error ? h(y) : Dwe(y) ? h(il(2, { from: t, to: y })) : (u && i.enterCallbacks[s] === u && typeof y == 'function' && u.push(y), f()) }; const g = l(() => e.call(i && i.instances[s], t, n, p)); let v = Promise.resolve(g); e.length < 3 && (v = v.then(p)), v.catch(y => h(y)) }) } function Jd(e, t, n, i, s = l => l()) {
  const l = []; for (const u of e) {
    for (const f in u.components) {
      const h = u.components[f]; if (!(t !== 'beforeRouteEnter' && !u.instances[f])) {
        if (uS(h)) { const g = (h.__vccOpts || h)[t]; g && l.push(eo(g, n, i, u, f, s)) }
        else {
          const p = h(); l.push(() => p.then((g) => {
            if (!g)
              throw new Error(`Couldn't resolve component "${f}" at "${u.path}"`); const v = swe(g) ? g.default : g; u.mods[f] = g, u.components[f] = v; const w = (v.__vccOpts || v)[t]; return w && eo(w, n, i, u, f, s)()
          }))
        }
      }
    }
  } return l
} function Ky(e) {
  const t = wn(Yp); const n = wn(SS); const i = _e(() => { const h = j(e.to); return t.resolve(h) }); const s = _e(() => {
    const { matched: h } = i.value; const { length: p } = h; const g = h[p - 1]; const v = n.matched; if (!g || !v.length)
      return -1; const y = v.findIndex(rl.bind(null, g)); if (y > -1)
      return y; const w = Jy(h[p - 2]); return p > 1 && Jy(g) === w && v[v.length - 1].path !== w ? v.findIndex(rl.bind(null, h[p - 2])) : y
  }); const l = _e(() => s.value > -1 && oxe(n.params, i.value.params)); const u = _e(() => s.value > -1 && s.value === n.matched.length - 1 && mS(n.params, i.value.params)); function f(h = {}) { if (ixe(h)) { const p = t[j(e.replace) ? 'replace' : 'push'](j(e.to)).catch(aa); return e.viewTransition && typeof document < 'u' && 'startViewTransition' in document && document.startViewTransition(() => p), p } return Promise.resolve() } return { route: i, href: _e(() => i.value.href), isActive: l, isExactActive: u, navigate: f }
} function txe(e) { return e.length === 1 ? e[0] : e } const nxe = at({ name: 'RouterLink', compatConfig: { MODE: 3 }, props: { to: { type: [String, Object], required: !0 }, replace: Boolean, activeClass: String, exactActiveClass: String, custom: Boolean, ariaCurrentValue: { type: String, default: 'page' }, viewTransition: Boolean }, useLink: Ky, setup(e, { slots: t }) { const n = rr(Ky(e)); const { options: i } = wn(Yp); const s = _e(() => ({ [Yy(e.activeClass, i.linkActiveClass, 'router-link-active')]: n.isActive, [Yy(e.exactActiveClass, i.linkExactActiveClass, 'router-link-exact-active')]: n.isExactActive })); return () => { const l = t.default && txe(t.default(n)); return e.custom ? l : Ba('a', { 'aria-current': n.isExactActive ? e.ariaCurrentValue : null, 'href': n.href, 'onClick': n.navigate, 'class': s.value }, l) } } }); const rxe = nxe; function ixe(e) {
  if (!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) && !e.defaultPrevented && !(e.button !== void 0 && e.button !== 0)) {
    if (e.currentTarget && e.currentTarget.getAttribute) {
      const t = e.currentTarget.getAttribute('target'); if (/\b_blank\b/i.test(t))
        return
    } return e.preventDefault && e.preventDefault(), !0
  }
} function oxe(e, t) {
  for (const n in t) {
    const i = t[n]; const s = e[n]; if (typeof i == 'string') {
      if (i !== s)
        return !1
    }
    else if (!zr(s) || s.length !== i.length || i.some((l, u) => l !== s[u])) {
      return !1
    }
  } return !0
} function Jy(e) { return e ? e.aliasOf ? e.aliasOf.path : e.path : '' } const Yy = (e, t, n) => e ?? t ?? n; const sxe = at({ name: 'RouterView', inheritAttrs: !1, props: { name: { type: String, default: 'default' }, route: Object }, compatConfig: { MODE: 3 }, setup(e, { attrs: t, slots: n }) {
  const i = wn(Kh); const s = _e(() => e.route || i.value); const l = wn(Xy, 0); const u = _e(() => { let p = j(l); const { matched: g } = s.value; let v; for (;(v = g[p]) && !v.components;)p++; return p }); const f = _e(() => s.value.matched[u.value]); Er(Xy, _e(() => u.value + 1)), Er(exe, f), Er(Kh, s); const h = Ue(); return St(() => [h.value, f.value, e.name], ([p, g, v], [y, w, L]) => { g && (g.instances[v] = p, w && w !== g && p && p === y && (g.leaveGuards.size || (g.leaveGuards = w.leaveGuards), g.updateGuards.size || (g.updateGuards = w.updateGuards))), p && g && (!w || !rl(g, w) || !y) && (g.enterCallbacks[v] || []).forEach($ => $(p)) }, { flush: 'post' }), () => {
    const p = s.value; const g = e.name; const v = f.value; const y = v && v.components[g]; if (!y)
      return Zy(n.default, { Component: y, route: p }); const w = v.props[g]; const L = w ? w === !0 ? p.params : typeof w == 'function' ? w(p) : w : null; const A = Ba(y, bt({}, L, t, { onVnodeUnmounted: (E) => { E.component.isUnmounted && (v.instances[g] = null) }, ref: h })); return Zy(n.default, { Component: A, route: p }) || A
  }
} }); function Zy(e, t) {
  if (!e)
    return null; const n = e(t); return n.length === 1 ? n[0] : n
} const lxe = sxe; function axe(e) {
  const t = Gwe(e.routes, e); const n = e.parseQuery || Zwe; const i = e.stringifyQuery || Gy; const s = e.history; const l = Vl(); const u = Vl(); const f = Vl(); const h = rn(Vi); let p = Vi; Ls && e.scrollBehavior && 'scrollRestoration' in history && (history.scrollRestoration = 'manual'); const g = Xd.bind(null, U => `${U}`); const v = Xd.bind(null, bwe); const y = Xd.bind(null, Ia); function w(U, Q) { let J, ae; return yS(U) ? (J = t.getRecordMatcher(U), ae = Q) : ae = U, t.addRoute(ae, J) } function L(U) { const Q = t.getRecordMatcher(U); Q && t.removeRoute(Q) } function $() { return t.getRoutes().map(U => U.record) } function A(U) { return !!t.getRecordMatcher(U) } function E(U, Q) {
    if (Q = bt({}, Q || h.value), typeof U == 'string') { const Y = Kd(n, U, Q.path); const fe = t.resolve({ path: Y.path }, Q); const pe = s.createHref(Y.fullPath); return bt(Y, fe, { params: y(fe.params), hash: Ia(Y.hash), redirectedFrom: void 0, href: pe }) } let J; if (U.path != null) {
      J = bt({}, U, { path: Kd(n, U.path, Q.path).path })
    }
    else { const Y = bt({}, U.params); for (const fe in Y)Y[fe] == null && delete Y[fe]; J = bt({}, U, { params: v(Y) }), Q.params = v(Q.params) } const ae = t.resolve(J, Q); const ge = U.hash || ''; ae.params = g(y(ae.params)); const F = Swe(i, bt({}, U, { hash: mwe(ge), path: ae.path })); const V = s.createHref(F); return bt({ fullPath: F, hash: ge, query: i === Gy ? Qwe(U.query) : U.query || {} }, ae, { redirectedFrom: void 0, href: V })
  } function M(U) { return typeof U == 'string' ? Kd(n, U, h.value.path) : bt({}, U) } function O(U, Q) {
    if (p !== U)
      return il(8, { from: Q, to: U })
  } function k(U) { return te(U) } function z(U) { return k(bt(M(U), { replace: !0 })) } function D(U) { const Q = U.matched[U.matched.length - 1]; if (Q && Q.redirect) { const { redirect: J } = Q; let ae = typeof J == 'function' ? J(U) : J; return typeof ae == 'string' && (ae = ae.includes('?') || ae.includes('#') ? ae = M(ae) : { path: ae }, ae.params = {}), bt({ query: U.query, hash: U.hash, params: ae.path != null ? {} : U.params }, ae) } } function te(U, Q) {
    const J = p = E(U); const ae = h.value; const ge = U.state; const F = U.force; const V = U.replace === !0; const Y = D(J); if (Y)
      return te(bt(M(Y), { state: typeof Y == 'object' ? bt({}, ge, Y.state) : ge, force: F, replace: V }), Q || J); const fe = J; fe.redirectedFrom = Q; let pe; return !F && _we(i, ae, J) && (pe = il(16, { to: fe, from: ae }), Pe(ae, ae, !0, !1)), (pe ? Promise.resolve(pe) : q(fe, ae)).catch(he => vi(he) ? vi(he, 2) ? he : we(he) : oe(he, fe, ae)).then((he) => {
      if (he) {
        if (vi(he, 2))
          return te(bt({ replace: V }, M(he.to), { state: typeof he.to == 'object' ? bt({}, ge, he.to.state) : ge, force: F }), Q || fe)
      }
      else {
        he = C(fe, ae, !0, V, ge)
      } return K(fe, ae, he), he
    })
  } function ee(U, Q) { const J = O(U, Q); return J ? Promise.reject(J) : Promise.resolve() } function W(U) { const Q = Ke.values().next().value; return Q && typeof Q.runWithContext == 'function' ? Q.runWithContext(U) : U() } function q(U, Q) {
    let J; const [ae, ge, F] = cxe(U, Q); J = Jd(ae.reverse(), 'beforeRouteLeave', U, Q); for (const Y of ae)Y.leaveGuards.forEach((fe) => { J.push(eo(fe, U, Q)) }); const V = ee.bind(null, U, Q); return J.push(V), ie(J).then(() => { J = []; for (const Y of l.list())J.push(eo(Y, U, Q)); return J.push(V), ie(J) }).then(() => { J = Jd(ge, 'beforeRouteUpdate', U, Q); for (const Y of ge)Y.updateGuards.forEach((fe) => { J.push(eo(fe, U, Q)) }); return J.push(V), ie(J) }).then(() => {
      J = []; for (const Y of F) {
        if (Y.beforeEnter) {
          if (zr(Y.beforeEnter)) {
            for (const fe of Y.beforeEnter)J.push(eo(fe, U, Q))
          }
          else {
            J.push(eo(Y.beforeEnter, U, Q))
          }
        }
      } return J.push(V), ie(J)
    }).then(() => (U.matched.forEach(Y => Y.enterCallbacks = {}), J = Jd(F, 'beforeRouteEnter', U, Q, W), J.push(V), ie(J))).then(() => { J = []; for (const Y of u.list())J.push(eo(Y, U, Q)); return J.push(V), ie(J) }).catch(Y => vi(Y, 8) ? Y : Promise.reject(Y))
  } function K(U, Q, J) { f.list().forEach(ae => W(() => ae(U, Q, J))) } function C(U, Q, J, ae, ge) {
    const F = O(U, Q); if (F)
      return F; const V = Q === Vi; const Y = Ls ? history.state : {}; J && (ae || V ? s.replace(U.fullPath, bt({ scroll: V && Y && Y.scroll }, ge)) : s.push(U.fullPath, ge)), h.value = U, Pe(U, Q, J, V), we()
  } let P; function I() {
    P || (P = s.listen((U, Q, J) => {
      if (!Je.listening)
        return; const ae = E(U); const ge = D(ae); if (ge) { te(bt(ge, { replace: !0, force: !0 }), ae).catch(aa); return }p = ae; const F = h.value; Ls && Mwe(Dy(F.fullPath, J.delta), yf()), q(ae, F).catch(V => vi(V, 12) ? V : vi(V, 2) ? (te(bt(M(V.to), { force: !0 }), ae).then((Y) => { vi(Y, 20) && !J.delta && J.type === Pa.pop && s.go(-1, !1) }).catch(aa), Promise.reject()) : (J.delta && s.go(-J.delta, !1), oe(V, ae, F))).then((V) => { V = V || C(ae, F, !1), V && (J.delta && !vi(V, 8) ? s.go(-J.delta, !1) : J.type === Pa.pop && vi(V, 20) && s.go(-1, !1)), K(ae, F, V) }).catch(aa)
    }))
  } const S = Vl(); const R = Vl(); let B; function oe(U, Q, J) { we(U); const ae = R.list(); return ae.length ? ae.forEach(ge => ge(U, Q, J)) : console.error(U), Promise.reject(U) } function ue() { return B && h.value !== Vi ? Promise.resolve() : new Promise((U, Q) => { S.add([U, Q]) }) } function we(U) { return B || (B = !U, I(), S.list().forEach(([Q, J]) => U ? J(U) : Q()), S.reset()), U } function Pe(U, Q, J, ae) {
    const { scrollBehavior: ge } = e; if (!Ls || !ge)
      return Promise.resolve(); const F = !J && Nwe(Dy(U.fullPath, 0)) || (ae || !J) && history.state && history.state.scroll || null; return Et().then(() => ge(U, Q, F)).then(V => V && $we(V)).catch(V => oe(V, U, Q))
  } const qe = U => s.go(U); let Ze; const Ke = new Set(); const Je = { currentRoute: h, listening: !0, addRoute: w, removeRoute: L, clearRoutes: t.clearRoutes, hasRoute: A, getRoutes: $, resolve: E, options: e, push: k, replace: z, go: qe, back: () => qe(-1), forward: () => qe(1), beforeEach: l.add, beforeResolve: u.add, afterEach: f.add, onError: R.add, isReady: ue, install(U) { const Q = this; U.component('RouterLink', rxe), U.component('RouterView', lxe), U.config.globalProperties.$router = Q, Object.defineProperty(U.config.globalProperties, '$route', { enumerable: !0, get: () => j(h) }), Ls && !Ze && h.value === Vi && (Ze = !0, k(s.location).catch((ge) => {})); const J = {}; for (const ge in Vi)Object.defineProperty(J, ge, { get: () => h.value[ge], enumerable: !0 }); U.provide(Yp, Q), U.provide(SS, ip(J)), U.provide(Kh, h); const ae = U.unmount; Ke.add(U), U.unmount = function () { Ke.delete(U), Ke.size < 1 && (p = Vi, P && P(), P = null, h.value = Vi, Ze = !1, B = !1), ae() } } }; function ie(U) { return U.reduce((Q, J) => Q.then(() => W(J)), Promise.resolve()) } return Je
} function cxe(e, t) { const n = []; const i = []; const s = []; const l = Math.max(t.matched.length, e.matched.length); for (let u = 0; u < l; u++) { const f = t.matched[u]; f && (e.matched.find(p => rl(p, f)) ? i.push(f) : n.push(f)); const h = e.matched[u]; h && (t.matched.find(p => rl(p, h)) || s.push(h)) } return [n, i, s] } const uxe = { tooltip: iA }; Uw.options.instantMove = !0; Uw.options.distance = 10; function fxe() { return axe({ history: zwe(), routes: owe }) } const dxe = [fxe]; const Zp = _w(lE); dxe.forEach((e) => { Zp.use(e()) }); Object.entries(uxe).forEach(([e, t]) => { Zp.directive(e, t) }); Zp.mount('#app')
