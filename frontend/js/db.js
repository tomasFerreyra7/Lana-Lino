/* =============================================================
   db.js  -  Capa de datos | Backend: http://localhost:4000/api
   ============================================================= */
(function (global) {
  'use strict';

  const BASE = 'http://localhost:4000/api';
  const JWT_KEY = 'lanaylino_jwt';

  /* --- HTTP helpers --- */
  function getJWT() { return localStorage.getItem(JWT_KEY) || ''; }
  function saveJWT(t) { if (t) localStorage.setItem(JWT_KEY, t); }
  function clearJWT() { localStorage.removeItem(JWT_KEY); }

  async function req(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = getJWT();
    if (auth && t) headers['Authorization'] = t;
    const init = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(BASE + path, init);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
    return res.json();
  }

  /* --- normalización producto ---
     Aliases reales que devuelve el backend:
       obtenerProductos:      idProducto, producto, ulrImagen, idCategoria, categoria
       obtenerDatosProducto:  producto, ulrImagen, idCategoria, categoria, idInventario
       (id_producto NO está en la query de detalle → se pasa como parámetro)
  --- */
  function adaptarProducto(rows, id_producto) {
    if (!rows || !rows.length) return null;
    const b = rows[0];
    const variantes = rows
      .filter(r => r.idInventario != null)
      .map(r => ({
        id_inventario: r.idInventario,
        talle: r.talle,
        color: r.color,
        stock: Number(r.stock || 0),
      }));
    const stockTotal = variantes.reduce((s, v) => s + v.stock, 0);
    return {
      id_producto: Number(id_producto),
      nombre: b.producto,
      descripcion: b.descripcion,
      precio: Number(b.precio),
      genero: b.genero,
      id_categoria: b.idCategoria,
      imagen: b.ulrImagen || placeholder(b.producto),
      categoria: b.categoria || '',
      variantes,
      talles: [...new Set(variantes.map(v => v.talle))],
      colores: [...new Set(variantes.map(v => v.color))],
      stockTotal,
      disponible: stockTotal > 0,
    };
  }

  function placeholder(nombre) {
    const paleta = ['#d8cfc4', '#c9d6cf', '#cdd3df', '#e0cdd3', '#d3cee0', '#dadfc9'];
    let h = 0;
    for (const ch of String(nombre || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const bg = paleta[h % paleta.length];
    return 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='600' height='600' fill='${bg}'/><text x='50%' y='50%' font-family='Segoe UI,Arial' font-size='34' fill='#3a3a3a' text-anchor='middle' dominant-baseline='middle' opacity='.8'>Lana &amp; Lino</text></svg>`
    );
  }

  /* --- cache de productos con inventario para filtros client-side --- */
  let _cache = null;

  async function todosConDetalles() {
    if (_cache) return _cache;
    const r = await req('/obtenerProductos');
    const lista = r.payload || [];
    const ds = await Promise.all(
      lista.map(p => req(`/obtenerDatosProducto/${p.idProducto}`).then(d => ({ id: p.idProducto, d })))
    );
    _cache = ds
      .filter(({ d }) => d.codigo === 200 && d.payload && d.payload.length)
      .map(({ id, d }) => adaptarProducto(d.payload, id));
    return _cache;
  }

  function invalidar() { _cache = null; }

  /* --- helper favoritos: devuelve array de id_producto (número) --- */
  async function idsFavoritos(id_usuario) {
    const r = await req(`/obtenerFavoritos/${id_usuario}`, { auth: true });
    return (r.payload || []).map(f => Number(f.idProducto ?? f.id_producto ?? Object.values(f)[0]));
  }

  /* ======================= API pública ======================= */
  const API = {

    getCategorias() {
      // requiere token (verificarToken está activo en obtenerCategorias)
      return req('/obtenerCategorias', { auth: true }).then(r => r.payload || []);
    },

    async getProductos(filtros = {}) {
      let prods = await todosConDetalles();
      const { q, categoria, genero, color } = filtros;
      if (q) prods = prods.filter(p => p.nombre.toLowerCase().includes(q.toLowerCase()));
      if (categoria) prods = prods.filter(p => p.id_categoria === Number(categoria));
      if (genero) prods = prods.filter(p => p.genero === genero);
      if (color) prods = prods.filter(p => p.colores.includes(color));
      return prods;
    },

    async getProducto(id) {
      const r = await req(`/obtenerDatosProducto/${id}`);
      if (r.codigo !== 200 || !r.payload || !r.payload.length) return null;
      return adaptarProducto(r.payload, id);
    },

    async getColores() {
      const prods = await todosConDetalles();
      return [...new Set(prods.flatMap(p => p.colores))].sort();
    },

    /* ----- usuarios ----- */
    async login(email, password) {
      const r = await req('/login', { method: 'POST', body: { email, password } });
      if (r.codigo !== 200 || !r.payload || !r.payload.length) return null;
      saveJWT(r.jwt);
      const u = r.payload[0];
      try {
        const datos = await req(`/obtenerDatosUsuario/${u.id_usuario}`, { auth: true });
        const full = datos.payload && datos.payload[0] ? datos.payload[0] : u;
        const { password: _p, ...sinPass } = full;
        return sinPass;
      } catch (_) {
        return { ...u, email };
      }
    },

    async registrar(u) {
      const r = await req('/registrarUsuario', {
        method: 'POST',
        body: {
          nombre: u.nombre, apellido: u.apellido,
          direccion: u.direccion || '', email: u.email,
          telefono: u.telefono || '', password: u.password, rol: 'cliente',
        },
      });
      if (r.codigo !== 200) return { error: r.mensaje || 'Error al registrar' };
      return this.login(u.email, u.password);
    },

    async actualizarUsuario(id, cambios) {
      const actual = await req(`/obtenerDatosUsuario/${id}`, { auth: true });
      const base = (actual.payload && actual.payload[0]) || {};
      await req(`/modificarUsuario/${id}`, {
        method: 'POST', auth: true,
        body: {
          nombre: cambios.nombre !== undefined ? cambios.nombre : base.nombre,
          apellido: cambios.apellido !== undefined ? cambios.apellido : base.apellido,
          email: cambios.email !== undefined ? cambios.email : base.email,
          direccion: cambios.direccion !== undefined ? cambios.direccion : (base.direccion || ''),
          telefono: cambios.telefono !== undefined ? cambios.telefono : (base.telefono || ''),
          rol: base.rol || 'cliente',
          password: base.password || '',
        },
      });
      const datos = await req(`/obtenerDatosUsuario/${id}`, { auth: true });
      const full = (datos.payload && datos.payload[0]) || {};
      const { password: _p, ...sinPass } = full;
      return sinPass;
    },

    logout() { clearJWT(); },

    /* ----- favoritos ----- */
    async getFavoritos(id_usuario) {
      const ids = await idsFavoritos(id_usuario);
      if (!ids.length) return [];
      const prods = await todosConDetalles();
      return prods.filter(p => ids.includes(p.id_producto));
    },

    async toggleFavorito(id_usuario, id_producto) {
      const ids = await idsFavoritos(id_usuario);
      const esFav = ids.includes(Number(id_producto));
      if (esFav) {
        const r = await req('/eliminarFavorito', {
          method: 'DELETE', auth: true,
          body: { id_usuario: Number(id_usuario), id_producto: Number(id_producto) },
        });
        if (r && r.codigo !== undefined && r.codigo !== 200) throw new Error(r.mensaje || 'No se pudo quitar de favoritos');
        return { activo: false };
      } else {
        const r = await req('/agregarFavorito', {
          method: 'POST', auth: true,
          body: { id_producto: Number(id_producto), id_usuario: Number(id_usuario) },
        });
        if (r && r.codigo !== undefined && r.codigo !== 200) throw new Error(r.mensaje || 'No se pudo agregar a favoritos');
        return { activo: true };
      }
    },

    async esFavorito(id_usuario, id_producto) {
      const ids = await idsFavoritos(id_usuario);
      return ids.includes(Number(id_producto));
    },

    async quitarFavorito(id_usuario, id_producto) {
      return req('/eliminarFavorito', {
        method: 'DELETE', auth: true,
        body: { id_usuario: Number(id_usuario), id_producto: Number(id_producto) },
      });
    },

    /* ----- admin: productos ----- */
    async crearProducto(p) {
      invalidar();
      const rProd = await req('/cargarProducto', {
        method: 'POST', auth: true,
        body: {
          nombre: p.nombre, descripcion: p.descripcion, precio: Number(p.precio),
          genero: p.genero, id_categoria: Number(p.id_categoria), imagen: p.imagen || '',
        },
      });
      if (rProd.codigo !== 200 || !rProd.payload || !rProd.payload.length) return null;
      const id_producto = rProd.payload[0].idProducto;
      await Promise.all((p.talles || []).map(t =>
        req('/crearInventario', {
          method: 'POST', auth: true,
          body: { talle: t.talle, color: p.color, stock: Number(t.stock || 0), id_producto },
        })
      ));
      return this.getProducto(id_producto);
    },

    // El backend solo permite modificar el stock de una variante (PUT /modificarStock).
    // No existe endpoint para cambiar nombre/precio/etc. de un producto ya cargado.
    async modificarStock(id_inventario, stock) {
      const r = await req('/modificarStock', {
        method: 'PUT', auth: true,
        body: { stock: Number(stock), id_inventario: Number(id_inventario) },
      });
      invalidar();
      return r;
    },

    async agregarACarrito(id_usuario, id_inventario) {
      return req('/agregarACarrito', {
        method: 'POST', auth: true,
        body: { id_inventario: Number(id_inventario), id_usuario: Number(id_usuario) },
      });
    },

    async getCarritoBackend(id_usuario) {
      const r = await req(`/obtenerProductosCarrito/${id_usuario}`, { auth: true });
      const rows = r.payload || [];
      const map = new Map();
      for (const it of rows) {
        const key = Number(it.idInventario);
        if (map.has(key)) {
          map.get(key).cantidad++;
        } else {
          map.set(key, {
            id_inventario: key,
            id_producto: Number(it.idProducto),
            nombre: it.producto,
            precio: Number(it.precio),
            imagen: it.urlImagen || placeholder(it.producto),
            talle: it.talle,
            color: it.color,
            cantidad: 1,
          });
        }
      }
      return [...map.values()];
    },

    async eliminarDeCarrito(id_usuario, id_inventario) {
      return req('/eliminarProductoCarrito', {
        method: 'DELETE', auth: true,
        body: { id_usuario: Number(id_usuario), id_inventario: Number(id_inventario) },
      });
    },

    crearPedido(_id_usuario, items, _metodo_pago) {
      const total = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
      return Promise.resolve({ id_pedido: Date.now(), total });
    },
  };

  global.DB = API;
})(window);
