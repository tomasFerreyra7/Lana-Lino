/* =============================================================
   state.js  -  Estado de la sesion en el navegador
   -------------------------------------------------------------
   Maneja: usuario logueado, carrito y tema (claro/oscuro).
   Persistido en localStorage. No toca el "backend" (db.js).
   ============================================================= */
(function (global) {
  'use strict';

  const K_SESION = 'lanaylino_sesion';
  const K_CARRITO = 'lanaylino_carrito';
  const K_TEMA = 'lanaylino_tema';

  function leer(k, def) {
    try { return JSON.parse(localStorage.getItem(k)) ?? def; }
    catch (e) { return def; }
  }
  function escribir(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  const Estado = {
    // ----- sesion -----
    getUsuario() { return leer(K_SESION, null); },
    setUsuario(u) { escribir(K_SESION, u); emit(); },
    cerrarSesion() { localStorage.removeItem(K_SESION); emit(); },
    estaLogueado() { return !!this.getUsuario(); },
    esAdmin() { const u = this.getUsuario(); return !!u && u.rol === 'admin'; },

    // ----- carrito -----  item: {id_producto, nombre, precio, imagen, talle, color, cantidad, id_inventario}
    getCarrito() { return leer(K_CARRITO, []); },
    setCarrito(c) { escribir(K_CARRITO, c); emit(); },
    agregarAlCarrito(item) {
      const c = this.getCarrito();
      const i = c.findIndex((x) => x.id_producto === item.id_producto && x.talle === item.talle && x.color === item.color);
      if (i >= 0) c[i].cantidad += item.cantidad;
      else c.push(item);
      this.setCarrito(c);
    },
    quitarDelCarrito(idx) { const c = this.getCarrito(); c.splice(idx, 1); this.setCarrito(c); },
    vaciarCarrito() { this.setCarrito([]); },
    totalCarrito() { return this.getCarrito().reduce((s, it) => s + it.precio * it.cantidad, 0); },
    cantidadCarrito() { return this.getCarrito().reduce((s, it) => s + it.cantidad, 0); },

    // ----- tema -----
    getTema() { return leer(K_TEMA, 'light'); },
    setTema(t) { escribir(K_TEMA, t); document.documentElement.setAttribute('data-theme', t); },
    alternarTema() { this.setTema(this.getTema() === 'light' ? 'dark' : 'light'); },

    // ----- suscripcion a cambios (para refrescar el header) -----
    _subs: [],
    onCambio(fn) { this._subs.push(fn); },
  };

  function emit() { Estado._subs.forEach((fn) => fn()); }

  global.Estado = Estado;
})(window);
