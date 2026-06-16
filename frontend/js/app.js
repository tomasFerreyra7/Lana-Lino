/* =============================================================
   app.js  -  Router + vistas (HTML/CSS/JS puro, sin frameworks)
   ============================================================= */
(function () {
  'use strict';

  const $app = document.getElementById('app');

  /* ---------- utilidades ---------- */
  const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const goto = (hash) => { location.hash = hash; };
  const loader = (msg = 'Cargando...') => `<div class="loader">${msg}</div>`;

  /* --- iconos (Lucide) --- */
  const ic = (name, cls = '') => `<i data-lucide="${name}" class="icon${cls ? ' ' + cls : ''}"></i>`;
  function icons() { if (window.lucide) lucide.createIcons(); }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* =============================================================
     HEADER
     ============================================================= */
  async function pintarCategorias() {
    const dd = document.getElementById('dropdownCategorias');
    const cats = await DB.getCategorias();
    dd.innerHTML =
      `<a href="#/">Todos los productos</a>` +
      cats.map((c) => `<a href="#/categoria/${c.id_categoria}">${esc(c.nombre)}</a>`).join('');
  }

  function pintarAcciones() {
    const nav = document.getElementById('headerActions');
    const logueado = Estado.estaLogueado();
    const admin = Estado.esAdmin();
    const cant = Estado.cantidadCarrito();
    const tema = Estado.getTema();

    nav.innerHTML = `
      <button class="icon-btn" id="btnTema" title="Cambiar tema" aria-label="Tema">${ic(tema === 'light' ? 'moon' : 'sun')}</button>
      <a class="icon-btn" href="#/favoritos" title="Favoritos" aria-label="Favoritos">${ic('heart')}</a>
      <a class="icon-btn" href="#/carrito" title="Carrito" aria-label="Carrito">${ic('shopping-bag')}${cant ? `<span class="badge">${cant}</span>` : ''}</a>
      ${admin ? `<a class="icon-btn" href="#/admin" title="Gestionar productos">${ic('settings-2')} Gestionar</a>` : ''}
      ${logueado ? `<a class="icon-btn" href="#/usuario" title="Mis datos" aria-label="Usuario">${ic('user')}</a>` : ''}
      ${logueado
        ? `<button class="icon-btn" id="btnSesion">Cerrar sesion</button>`
        : `<a class="icon-btn" href="#/login" id="btnSesion">Iniciar sesion</a>`}
    `;
    icons();

    document.getElementById('btnTema').onclick = () => { Estado.alternarTema(); pintarAcciones(); };
    if (logueado) {
      document.getElementById('btnSesion').onclick = () => {
        DB.logout(); Estado.cerrarSesion(); toast('Sesion cerrada'); goto('#/');
      };
    }
  }

  function initHeader() {
    pintarCategorias();
    pintarAcciones();
    Estado.onCambio(pintarAcciones);
    icons();

    // dropdown categorias
    const btnCat = document.getElementById('btnCategorias');
    const dd = document.getElementById('dropdownCategorias');
    btnCat.addEventListener('click', (e) => { e.stopPropagation(); dd.classList.toggle('open'); });
    document.addEventListener('click', () => dd.classList.remove('open'));
    dd.addEventListener('click', (e) => e.stopPropagation());

    // buscador
    const form = document.getElementById('formBuscar');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('inputBuscar').value.trim();
      goto(q ? `#/buscar/${encodeURIComponent(q)}` : '#/');
    });
  }

  /* =============================================================
     VISTA: Catalogo (con filtros genero / categoria / color)
     ============================================================= */
  async function vistaCatalogo(base = {}) {
    $app.innerHTML = loader();
    const [cats, colores] = await Promise.all([DB.getCategorias(), DB.getColores()]);
    const generos = ['Hombre', 'Mujer', 'Unisex'];

    let titulo = 'Catalogo';
    if (base.q) titulo = `Resultados para "${esc(base.q)}"`;
    if (base.categoria) {
      const c = cats.find((x) => x.id_categoria === Number(base.categoria));
      titulo = c ? c.nombre : 'Catalogo';
    }

    $app.innerHTML = `
      <h2 class="page-title">${titulo}</h2>
      <p class="page-sub">Explora nuestra indumentaria y filtra a tu gusto.</p>
      <div class="filtros">
        <div class="campo">
          <label>Categoria</label>
          <select id="fCategoria">
            <option value="">Todas</option>
            ${cats.map((c) => `<option value="${c.id_categoria}" ${Number(base.categoria) === c.id_categoria ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Genero</label>
          <select id="fGenero"><option value="">Todos</option>${generos.map((g) => `<option>${g}</option>`).join('')}</select>
        </div>
        <div class="campo">
          <label>Color</label>
          <select id="fColor"><option value="">Todos</option>${colores.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
        </div>
        <button class="btn btn--ghost" id="fLimpiar">Limpiar filtros</button>
      </div>
      <div id="gridProductos" class="grid"></div>
    `;

    const cargar = async () => {
      const filtros = {
        q: base.q || '',
        categoria: document.getElementById('fCategoria').value,
        genero: document.getElementById('fGenero').value,
        color: document.getElementById('fColor').value,
      };
      await pintarGrid('gridProductos', filtros);
    };

    document.getElementById('fCategoria').onchange = cargar;
    document.getElementById('fGenero').onchange = cargar;
    document.getElementById('fColor').onchange = cargar;
    document.getElementById('fLimpiar').onclick = () => {
      if (location.hash === '#/' || location.hash === '') {
        vistaCatalogo();
      } else {
        goto('#/');
      }
    };

    cargar();
  }

  async function pintarGrid(containerId, filtros) {
    const cont = document.getElementById(containerId);
    cont.innerHTML = loader();
    const prods = await DB.getProductos(filtros);
    if (!prods.length) {
      cont.innerHTML = `<div class="empty"><div class="big">${ic('search', 'icon--xl')}</div>No se encontraron productos.</div>`;
      icons();
      return;
    }
    const usuario = Estado.getUsuario();
    let favIds = [];
    if (usuario) favIds = (await DB.getFavoritos(usuario.id_usuario)).map((p) => p.id_producto);

    cont.classList.add('grid');
    cont.innerHTML = prods.map((p) => cardProducto(p, favIds.includes(p.id_producto))).join('');
    icons();

    cont.querySelectorAll('.card').forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card__fav')) return;
        goto(`#/producto/${id}`);
      });
      const fav = card.querySelector('.card__fav');
      fav.addEventListener('click', async () => {
        if (!Estado.estaLogueado()) { toast('Inicia sesion para usar favoritos'); return goto('#/login'); }
        const r = await DB.toggleFavorito(Estado.getUsuario().id_usuario, id);
        fav.classList.toggle('activo', r.activo);
        toast(r.activo ? 'Agregado a favoritos' : 'Quitado de favoritos');
      });
    });
  }

  function cardProducto(p, esFav) {
    return `
      <article class="card" data-id="${p.id_producto}">
        <div class="card__img">
          <img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" />
          <button class="card__fav ${esFav ? 'activo' : ''}" title="Favorito">${ic('heart')}</button>
        </div>
        <div class="card__body">
          <span class="card__cat">${esc(p.categoria)} · ${esc(p.genero)}</span>
          <span class="card__name">${esc(p.nombre)}</span>
          <span class="card__price">${money(p.precio)}</span>
          <span class="tag ${p.disponible ? 'tag--ok' : 'tag--no'}">${p.disponible ? 'Disponible' : 'Sin stock'}</span>
        </div>
      </article>`;
  }

  /* =============================================================
     VISTA: Detalle de producto
     ============================================================= */
  async function vistaProducto(id) {
    $app.innerHTML = loader();
    const p = await DB.getProducto(id);
    if (!p) { $app.innerHTML = vacio('Producto no encontrado'); icons(); return; }

    const usuario = Estado.getUsuario();
    const esFav = usuario ? await DB.esFavorito(usuario.id_usuario, p.id_producto) : false;

    const sel = { talle: null, color: null, cuotas: 1 };

    $app.innerHTML = `
      <a class="link" href="#/">← Volver al catalogo</a>
      <div class="detalle" style="margin-top:14px">
        <div class="detalle__img"><img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" /></div>
        <div class="detalle__info">
          <span class="card__cat">${esc(p.categoria)} · ${esc(p.genero)}</span>
          <h1>${esc(p.nombre)}</h1>
          <p class="detalle__desc">${esc(p.descripcion)}</p>
          <div class="detalle__precio">${money(p.precio)}</div>

          <div class="bloque">
            <h4>Talle</h4>
            <div class="chips" id="chipsTalle">
              ${p.talles.map((t) => `<button class="chip" data-talle="${esc(t)}">${esc(t)}</button>`).join('')}
            </div>
          </div>
          <div class="bloque">
            <h4>Color</h4>
            <div class="chips" id="chipsColor">
              ${p.colores.map((c) => `<button class="chip" data-color="${esc(c)}">${esc(c)}</button>`).join('')}
            </div>
          </div>

          <div class="bloque" id="bloqueStock"></div>

          <div class="bloque">
            <h4>Cuotas</h4>
            <div class="row" style="align-items:center;gap:12px">
              <select class="input" id="selCuotas">
                ${[1, 3, 6, 9, 12].map((n) => `<option value="${n}">${n} cuota${n > 1 ? 's' : ''}</option>`).join('')}
              </select>
              <div class="cuotas-box" id="cuotasBox"></div>
            </div>
          </div>

          <div class="row" style="margin-top:10px;gap:10px">
            <button class="btn" id="btnAgregar" disabled>${ic('shopping-bag')} Agregar al carrito</button>
            <button class="btn btn--ghost btn-fav ${esFav ? 'activo' : ''}" id="btnFav">
              ${ic('heart')} ${esFav ? 'En favoritos' : 'Favorito'}
            </button>
          </div>
        </div>
      </div>
    `;
    icons();

    const varianteActual = () => p.variantes.find((v) => v.talle === sel.talle && v.color === sel.color);
    const coloresParaTalle = (t) => p.variantes.filter((v) => v.talle === t).map((v) => v.color);

    function refrescarStock() {
      const box = document.getElementById('bloqueStock');
      const btn = document.getElementById('btnAgregar');
      if (!sel.talle || !sel.color) {
        box.innerHTML = `<span class="page-sub">Selecciona talle y color.</span>`;
        btn.disabled = true; return;
      }
      const v = varianteActual();
      if (!v || v.stock <= 0) {
        box.innerHTML = `<span class="tag tag--no">Sin stock para esta combinacion</span>`;
        btn.disabled = true;
      } else {
        box.innerHTML = `<span class="tag tag--ok">Stock disponible: ${v.stock} u.</span>`;
        btn.disabled = false;
      }
    }

    function refrescarCuotas() {
      const n = sel.cuotas;
      const valor = p.precio / n;
      document.getElementById('cuotasBox').innerHTML =
        `<div class="detalle-cuota">${n} × ${money(valor)}</div><small class="page-sub">Total ${money(p.precio)}${n > 1 ? ' sin interes' : ''}</small>`;
    }

    $app.querySelectorAll('#chipsTalle .chip').forEach((b) => {
      b.onclick = () => {
        sel.talle = b.dataset.talle;
        $app.querySelectorAll('#chipsTalle .chip').forEach((x) => x.classList.toggle('sel', x === b));
        const validos = coloresParaTalle(sel.talle);
        $app.querySelectorAll('#chipsColor .chip').forEach((cb) => {
          const disp = validos.includes(cb.dataset.color);
          cb.disabled = !disp;
          if (!disp && sel.color === cb.dataset.color) { sel.color = null; cb.classList.remove('sel'); }
        });
        refrescarStock();
      };
    });
    $app.querySelectorAll('#chipsColor .chip').forEach((b) => {
      b.onclick = () => {
        if (b.disabled) return;
        sel.color = b.dataset.color;
        $app.querySelectorAll('#chipsColor .chip').forEach((x) => x.classList.toggle('sel', x === b));
        refrescarStock();
      };
    });

    document.getElementById('selCuotas').onchange = (e) => { sel.cuotas = Number(e.target.value); refrescarCuotas(); };

    document.getElementById('btnAgregar').onclick = () => {
      if (!Estado.estaLogueado()) { toast('Inicia sesion para comprar'); return goto('#/login'); }
      const v = varianteActual();
      if (!v || v.stock <= 0) return;
      Estado.agregarAlCarrito({
        id_producto: p.id_producto, nombre: p.nombre, precio: p.precio, imagen: p.imagen,
        talle: sel.talle, color: sel.color, cantidad: 1, id_inventario: v.id_inventario,
      });
      toast('Producto agregado al carrito');
    };

    document.getElementById('btnFav').onclick = async () => {
      if (!Estado.estaLogueado()) { toast('Inicia sesion para usar favoritos'); return goto('#/login'); }
      const r = await DB.toggleFavorito(Estado.getUsuario().id_usuario, p.id_producto);
      const btn = document.getElementById('btnFav');
      btn.classList.toggle('activo', r.activo);
      btn.innerHTML = `${ic('heart')} ${r.activo ? 'En favoritos' : 'Favorito'}`;
      icons();
      toast(r.activo ? 'Agregado a favoritos' : 'Quitado de favoritos');
    };

    refrescarStock();
    refrescarCuotas();
  }

  /* =============================================================
     VISTA: Favoritos
     ============================================================= */
  async function vistaFavoritos() {
    if (!Estado.estaLogueado()) return requiereLogin('Inicia sesion para ver tus favoritos');
    $app.innerHTML = loader();
    const favs = await DB.getFavoritos(Estado.getUsuario().id_usuario);
    if (!favs.length) { $app.innerHTML = vacio('Todavia no tenes favoritos', 'heart'); icons(); return; }

    $app.innerHTML = `
      <h2 class="page-title">Mis favoritos</h2>
      <p class="page-sub">${favs.length} producto(s) guardados.</p>
      <div class="lista" id="listaFav">
        ${favs.map((p) => `
          <div class="item" data-id="${p.id_producto}">
            <img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" />
            <div class="item__meta">
              <strong>${esc(p.nombre)}</strong><br><small>${esc(p.categoria)}</small>
            </div>
            <span class="item__price">${money(p.precio)}</span>
            <button class="btn btn--danger btn--sm" data-del="${p.id_producto}">Quitar</button>
          </div>`).join('')}
      </div>`;

    document.querySelectorAll('#listaFav .item').forEach((it) => {
      it.addEventListener('click', (e) => {
        if (e.target.closest('[data-del]')) return;
        goto(`#/producto/${it.dataset.id}`);
      });
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.addEventListener('click', async () => {
        await DB.toggleFavorito(Estado.getUsuario().id_usuario, b.dataset.del);
        toast('Quitado de favoritos'); vistaFavoritos();
      });
    });
  }

  /* =============================================================
     VISTA: Carrito
     ============================================================= */
  function vistaCarrito() {
    const carrito = Estado.getCarrito();
    if (!carrito.length) { $app.innerHTML = vacio('Tu carrito esta vacio', 'shopping-bag'); icons(); return; }

    $app.innerHTML = `
      <h2 class="page-title">Carrito</h2>
      <p class="page-sub">${Estado.cantidadCarrito()} artículo(s).</p>
      <div class="lista">
        ${carrito.map((it, i) => `
          <div class="item">
            <img src="${esc(it.imagen)}" alt="${esc(it.nombre)}" />
            <div class="item__meta">
              <strong>${esc(it.nombre)}</strong><br>
              <small>Talle ${esc(it.talle)} · ${esc(it.color)} · x${it.cantidad}</small>
            </div>
            <span class="item__price">${money(it.precio * it.cantidad)}</span>
            <button class="btn btn--danger btn--sm" data-i="${i}">Eliminar</button>
          </div>`).join('')}
      </div>
      <div class="resumen">
        <div class="linea total"><span>Total</span><span>${money(Estado.totalCarrito())}</span></div>
        <a class="btn btn--block" href="#/pago">Pagar</a>
        <button class="btn btn--ghost btn--block" id="vaciar">Vaciar carrito</button>
      </div>`;

    document.querySelectorAll('[data-i]').forEach((b) => {
      b.onclick = () => { Estado.quitarDelCarrito(Number(b.dataset.i)); toast('Producto eliminado'); vistaCarrito(); };
    });
    document.getElementById('vaciar').onclick = () => { Estado.vaciarCarrito(); vistaCarrito(); };
  }

  /* =============================================================
     VISTA: Pago
     ============================================================= */
  function vistaPago() {
    if (!Estado.estaLogueado()) return requiereLogin('Inicia sesion para pagar');
    const carrito = Estado.getCarrito();
    if (!carrito.length) { $app.innerHTML = vacio('No hay productos para pagar', 'shopping-bag'); icons(); return; }

    $app.innerHTML = `
      <h2 class="page-title">Pago</h2>
      <div class="grid-2" style="align-items:start">
        <div class="panel">
          <h4 class="page-sub" style="margin-bottom:14px">Detalle de la compra</h4>
          <div class="lista">
            ${carrito.map((it) => `
              <div class="linea" style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span>${esc(it.nombre)} <small class="page-sub">x${it.cantidad}</small></span>
                <strong>${money(it.precio * it.cantidad)}</strong>
              </div>`).join('')}
          </div>
          <div class="resumen" style="margin:14px 0 0">
            <div class="linea total"><span>Total</span><span>${money(Estado.totalCarrito())}</span></div>
          </div>
        </div>

        <div class="panel">
          <form class="form" id="formPago">
            <div class="campo">
              <label>Metodo de pago</label>
              <select id="metodo" class="input">
                <option value="">Seleccionar...</option>
                <option value="transferencia">Transferencia</option>
                <option value="debito">Debito</option>
                <option value="credito">Credito</option>
              </select>
            </div>
            <div id="datosTarjeta" style="display:none">
              <div class="campo"><label>Numero de tarjeta</label><input id="tNum" class="input" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" /></div>
              <div class="grid-2">
                <div class="campo"><label>Vencimiento</label><input id="tVto" class="input" placeholder="MM/AA" maxlength="5" /></div>
                <div class="campo"><label>Nombre en la tarjeta</label><input id="tNom" class="input" placeholder="Como figura" /></div>
              </div>
            </div>
            <div class="form-error" id="pagoError"></div>
            <button class="btn btn--block" id="btnPagar" type="submit" disabled>Pagar ${money(Estado.totalCarrito())}</button>
          </form>
          <div id="pagoOk"></div>
        </div>
      </div>`;

    const metodo = document.getElementById('metodo');
    const datos = document.getElementById('datosTarjeta');
    const btn = document.getElementById('btnPagar');
    const tNum = document.getElementById('tNum');
    const tVto = document.getElementById('tVto');
    const tNom = document.getElementById('tNom');

    function validar() {
      const m = metodo.value;
      let ok = !!m;
      if (m === 'debito' || m === 'credito') {
        const num = tNum.value.replace(/\s/g, '');
        ok = num.length >= 13 && /^\d{2}\/\d{2}$/.test(tVto.value) && tNom.value.trim().length >= 3;
      }
      btn.disabled = !ok;
    }

    metodo.onchange = () => {
      const m = metodo.value;
      datos.style.display = (m === 'debito' || m === 'credito') ? 'block' : 'none';
      validar();
    };
    [tNum, tVto, tNom].forEach((i) => i.addEventListener('input', validar));
    tNum.addEventListener('input', () => { tNum.value = tNum.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim(); });
    tVto.addEventListener('input', () => { tVto.value = tVto.value.replace(/[^\d]/g, '').replace(/^(\d{2})(\d)/, '$1/$2'); });

    document.getElementById('formPago').onsubmit = async (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      await DB.crearPedido(Estado.getUsuario().id_usuario, Estado.getCarrito(), metodo.value);
      Estado.vaciarCarrito();
      document.getElementById('formPago').style.display = 'none';
      document.getElementById('pagoOk').innerHTML = `
        <div class="aviso center">${ic('check-circle')} Pago aprobado con exito</div>
        <a class="btn btn--block" href="#/" style="margin-top:14px">Volver a la tienda</a>`;
      icons();
      toast('Pago aprobado');
    };
  }

  /* =============================================================
     VISTA: Login
     ============================================================= */
  function vistaLogin() {
    if (Estado.estaLogueado()) return goto('#/');
    $app.innerHTML = `
      <div class="panel">
        <h2 class="page-title center">Iniciar sesion</h2>
        <p class="page-sub center">Ingresa con tu email y contraseña.</p>
        <form class="form" id="formLogin">
          <div class="campo"><label>Email</label><input id="email" class="input" type="email" required /></div>
          <div class="campo"><label>Contraseña</label><input id="pass" class="input" type="password" required /></div>
          <div class="form-error" id="loginError"></div>
          <button class="btn btn--block" type="submit">Ingresar</button>
        </form>
        <p class="center" style="margin-top:16px">¿No tenes cuenta? <a class="link" href="#/registro">Registrate</a></p>
        <p class="center page-sub" style="margin-top:10px;font-size:.8rem">Demo admin: admin@lanaylino.com / admin123 — cliente: juan@mail.com / 1234</p>
      </div>`;

    document.getElementById('formLogin').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('pass').value;
      const u = await DB.login(email, pass);
      if (!u) { document.getElementById('loginError').textContent = 'Email o contraseña incorrectos.'; return; }
      Estado.setUsuario(u); toast(`Hola ${u.nombre}!`); goto('#/');
    };
  }

  /* =============================================================
     VISTA: Registro
     ============================================================= */
  function vistaRegistro() {
    if (Estado.estaLogueado()) return goto('#/');
    $app.innerHTML = `
      <div class="panel panel--wide">
        <h2 class="page-title center">Crear cuenta</h2>
        <form class="form" id="formReg">
          <div class="grid-2">
            <div class="campo"><label>Nombre</label><input id="nombre" class="input" required /></div>
            <div class="campo"><label>Apellido</label><input id="apellido" class="input" required /></div>
          </div>
          <div class="campo"><label>Direccion</label><input id="direccion" class="input" /></div>
          <div class="grid-2">
            <div class="campo"><label>Telefono</label><input id="telefono" class="input" /></div>
            <div class="campo"><label>Email</label><input id="email" class="input" type="email" required /></div>
          </div>
          <div class="campo"><label>Contraseña</label><input id="pass" class="input" type="password" required maxlength="20" /></div>
          <div class="form-error" id="regError"></div>
          <button class="btn btn--block" type="submit">Registrarme</button>
        </form>
        <p class="center" style="margin-top:16px">¿Ya tenes cuenta? <a class="link" href="#/login">Inicia sesion</a></p>
      </div>`;

    document.getElementById('formReg').onsubmit = async (e) => {
      e.preventDefault();
      const u = {
        nombre: val('nombre'), apellido: val('apellido'), direccion: val('direccion'),
        telefono: val('telefono'), email: val('email'), password: val('pass'),
      };
      const r = await DB.registrar(u);
      if (r.error) { document.getElementById('regError').textContent = r.error; return; }
      Estado.setUsuario(r); toast('Cuenta creada!'); goto('#/');
    };
  }

  /* =============================================================
     VISTA: Datos del usuario
     ============================================================= */
  function vistaUsuario() {
    if (!Estado.estaLogueado()) return requiereLogin('Inicia sesion para ver tus datos');
    const u = Estado.getUsuario();
    $app.innerHTML = `
      <div class="panel panel--wide">
        <h2 class="page-title">Mis datos</h2>
        <p class="page-sub">Rol: ${esc(u.rol)}</p>
        <form class="form" id="formUser">
          <div class="grid-2">
            <div class="campo"><label>Nombre</label><input id="nombre" class="input" value="${esc(u.nombre)}" /></div>
            <div class="campo"><label>Apellido</label><input id="apellido" class="input" value="${esc(u.apellido)}" /></div>
          </div>
          <div class="campo"><label>Email</label><input id="email" class="input" type="email" value="${esc(u.email)}" /></div>
          <div class="campo"><label>Direccion</label><input id="direccion" class="input" value="${esc(u.direccion || '')}" /></div>
          <div class="campo"><label>Telefono</label><input id="telefono" class="input" value="${esc(u.telefono || '')}" /></div>
          <div class="form-error" id="userMsg"></div>
          <button class="btn" type="submit">Guardar cambios</button>
        </form>
      </div>`;

    document.getElementById('formUser').onsubmit = async (e) => {
      e.preventDefault();
      const cambios = { nombre: val('nombre'), apellido: val('apellido'), email: val('email'), direccion: val('direccion'), telefono: val('telefono') };
      const actualizado = await DB.actualizarUsuario(u.id_usuario, cambios);
      Estado.setUsuario(actualizado);
      const msg = document.getElementById('userMsg');
      msg.style.color = 'var(--ok)'; msg.textContent = 'Datos actualizados correctamente.';
      toast('Datos guardados');
    };
  }

  /* =============================================================
     VISTA: Administrador - gestionar productos
     ============================================================= */
  async function vistaAdmin() {
    if (!Estado.esAdmin()) { $app.innerHTML = vacio('Acceso solo para administradores', 'lock'); icons(); return; }
    $app.innerHTML = loader();
    const cats = await DB.getCategorias();
    const optsCat = cats.map((c) => `<option value="${c.id_categoria}">${esc(c.nombre)}</option>`).join('');

    $app.innerHTML = `
      <h2 class="page-title">Gestionar productos</h2>

      <div class="panel panel--wide" style="margin-bottom:26px">
        <h4 class="page-sub" style="margin-bottom:14px">Cargar nuevo producto</h4>
        <form class="form" id="formProd">
          <div class="grid-2">
            <div class="campo"><label>Nombre</label><input id="pNombre" class="input" required /></div>
            <div class="campo"><label>Precio</label><input id="pPrecio" class="input" type="number" min="0" required /></div>
          </div>
          <div class="campo"><label>Descripcion</label><textarea id="pDesc" required></textarea></div>
          <div class="grid-2">
            <div class="campo"><label>Genero</label>
              <select id="pGenero" class="input"><option>Hombre</option><option>Mujer</option><option>Unisex</option></select>
            </div>
            <div class="campo"><label>Categoria</label><select id="pCat" class="input">${optsCat}</select></div>
          </div>
          <div class="grid-2">
            <div class="campo"><label>Color</label><input id="pColor" class="input" required /></div>
            <div class="campo"><label>Imagen (URL, opcional)</label><input id="pImg" class="input" placeholder="https://..." /></div>
          </div>
          <div class="campo"><label>Talles disponibles (talle:stock, separados por coma. Ej: S:5, M:3, L:0)</label>
            <input id="pTalles" class="input" placeholder="S:5, M:3, L:2" required /></div>
          <div class="form-error" id="prodMsg"></div>
          <button class="btn" type="submit">Cargar producto</button>
        </form>
      </div>

      <div class="panel panel--wide">
        <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:14px">
          <h4 class="page-sub" style="margin:0">Productos cargados</h4>
          <input id="adminBuscar" class="input" placeholder="Buscar por nombre..." />
        </div>
        <div id="adminLista" class="lista"></div>
      </div>
    `;

    document.getElementById('formProd').onsubmit = async (e) => {
      e.preventDefault();
      const talles = val('pTalles').split(',').map((s) => s.trim()).filter(Boolean).map((par) => {
        const [talle, stock] = par.split(':').map((x) => x.trim());
        return { talle, stock: Number(stock || 0) };
      });
      if (!talles.length) { document.getElementById('prodMsg').textContent = 'Indica al menos un talle.'; return; }
      await DB.crearProducto({
        nombre: val('pNombre'), descripcion: val('pDesc'), precio: val('pPrecio'),
        genero: val('pGenero'), id_categoria: val('pCat'), color: val('pColor'),
        imagen: val('pImg'), talles,
      });
      document.getElementById('formProd').reset();
      toast('Producto cargado'); cargarLista();
    };

    const cargarLista = async (q = '') => {
      const cont = document.getElementById('adminLista');
      cont.innerHTML = loader();
      const prods = await DB.getProductos({ q });
      if (!prods.length) { cont.innerHTML = `<p class="page-sub">Sin resultados.</p>`; return; }
      cont.innerHTML = prods.map((p) => `
        <div class="item" data-id="${p.id_producto}">
          <img src="${esc(p.imagen)}" alt="" />
          <div class="item__meta">
            <strong>${esc(p.nombre)}</strong><br>
            <small>${esc(p.categoria)} · ${esc(p.genero)} · Stock ${p.stockTotal}</small>
          </div>
          <span class="item__price">${money(p.precio)}</span>
          <button class="btn btn--ghost btn--sm" data-edit="${p.id_producto}">Editar stock</button>
        </div>`).join('');
      cont.querySelectorAll('[data-edit]').forEach((b) => {
        b.onclick = () => abrirEdicion(b.dataset.edit, cats, cargarLista);
      });
    };

    let tBuscar;
    document.getElementById('adminBuscar').addEventListener('input', (e) => {
      clearTimeout(tBuscar);
      tBuscar = setTimeout(() => cargarLista(e.target.value.trim()), 250);
    });

    cargarLista();
  }

  async function abrirEdicion(id, cats, refrescar) {
    const p = await DB.getProducto(id);
    if (!p) { vistaAdmin(); return; }

    // El backend solo expone modificarStock: aca se edita el stock de cada
    // variante (talle/color). Los datos del producto se muestran solo lectura.
    const filasStock = (p.variantes || []).map((v) => `
      <div class="item">
        <div class="item__meta">
          <strong>${esc(v.talle)}</strong> · ${esc(v.color)}
        </div>
        <input class="input eStock" data-inv="${v.id_inventario}" data-prev="${v.stock}"
               type="number" min="0" value="${v.stock}" style="max-width:120px" />
      </div>`).join('');

    $app.innerHTML = `
      <a class="link" id="volverAdmin">← Volver a gestion</a>
      <div class="panel panel--wide" style="margin-top:14px">
        <h2 class="page-title">Modificar stock</h2>
        <p class="page-sub">${esc(p.nombre)} — ${esc(p.categoria)} · ${esc(p.genero)} · ${money(p.precio)}</p>
        <form class="form" id="formEdit">
          ${filasStock || '<p class="page-sub">Este producto no tiene inventario cargado.</p>'}
          <div class="form-error" id="editMsg"></div>
          <div class="row" style="margin-top:14px">
            <button class="btn" type="submit" ${filasStock ? '' : 'disabled'}>Guardar stock</button>
            <button class="btn btn--ghost" type="button" id="cancelarEdit">Cancelar</button>
          </div>
        </form>
      </div>`;

    document.getElementById('volverAdmin').onclick = () => vistaAdmin();
    document.getElementById('cancelarEdit').onclick = () => vistaAdmin();
    document.getElementById('formEdit').onsubmit = async (e) => {
      e.preventDefault();
      const inputs = [...$app.querySelectorAll('.eStock')];
      const cambios = inputs.filter((i) => Number(i.value) !== Number(i.dataset.prev));
      if (!cambios.length) { toast('No hay cambios de stock'); return; }
      try {
        await Promise.all(cambios.map((i) => DB.modificarStock(i.dataset.inv, i.value)));
        toast('Stock actualizado'); vistaAdmin();
      } catch (err) {
        document.getElementById('editMsg').textContent = 'No se pudo actualizar el stock.';
      }
    };
  }

  /* =============================================================
     helpers de vista
     ============================================================= */
  function val(id) { return document.getElementById(id).value.trim(); }
  function vacio(msg, icono = 'package') {
    return `<div class="empty"><div class="big">${ic(icono, 'icon--xl')}</div>${esc(msg)}</div>`;
  }
  function requiereLogin(msg) {
    $app.innerHTML = `<div class="empty"><div class="big">${ic('lock', 'icon--xl')}</div><p>${esc(msg)}</p>
      <a class="btn" href="#/login" style="margin-top:16px">Iniciar sesion</a></div>`;
    icons();
  }

  /* =============================================================
     ROUTER
     ============================================================= */
  function parseHash() {
    const raw = (location.hash || '#/').slice(1) || '/';
    const [path] = raw.split('?');
    const seg = path.split('/').filter(Boolean);
    return seg;
  }

  function router() {
    window.scrollTo(0, 0);
    const seg = parseHash();
    switch (seg[0]) {
      case undefined: return vistaCatalogo();
      case 'producto': return vistaProducto(seg[1]);
      case 'categoria': return vistaCatalogo({ categoria: seg[1] });
      case 'buscar': return vistaCatalogo({ q: decodeURIComponent(seg[1] || '') });
      case 'favoritos': return vistaFavoritos();
      case 'carrito': return vistaCarrito();
      case 'pago': return vistaPago();
      case 'login': return vistaLogin();
      case 'registro': return vistaRegistro();
      case 'usuario': return vistaUsuario();
      case 'admin': return vistaAdmin();
      default: $app.innerHTML = vacio('Pagina no encontrada', 'compass'); icons();
    }
  }

  /* =============================================================
     INIT
     ============================================================= */
  function init() {
    Estado.setTema(Estado.getTema());
    initHeader();
    window.addEventListener('hashchange', router);
    router();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
