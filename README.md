# Lana & Lino — E-commerce (TP1 Programación II)

Tienda de indumentaria online. SPA en HTML/CSS/JavaScript puro (sin frameworks) con
backend Node/Express + MySQL.

Autores: Tomás Ferreyra · Facundo Bustamante

## Estructura

```
lana-lino/
├── frontend/     SPA vanilla JS (router hash, sin build)
│   ├── index.html
│   ├── css/styles.css
│   └── js/  (db.js · state.js · app.js)
├── backend/      API REST Express 5 + MySQL (promise-mysql)
│   ├── src/
│   ├── Scripts/  (lanaylino.sql · scriptTablaCarrito.sql)
│   └── .env.example
└── productos.sql
```

## Requisitos

- Node.js 18+
- MySQL o MariaDB (ej. XAMPP)

## Puesta en marcha

### 1. Base de datos

Crear la base y cargar las tablas:

```sql
CREATE DATABASE tp_programacion_2;
```

Importar (en ese orden) dentro de `tp_programacion_2`:

1. `backend/Scripts/lanaylino.sql` — tablas y datos de ejemplo.
2. `backend/Scripts/scriptTablaCarrito.sql` — tabla `carrito`.

Con XAMPP/phpMyAdmin se importan desde la pestaña *Importar*. Por consola:

```bash
mysql -u root tp_programacion_2 < backend/Scripts/lanaylino.sql
mysql -u root tp_programacion_2 < backend/Scripts/scriptTablaCarrito.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env      # completar valores (ver abajo)
npm install
npm run dev               # API en http://localhost:4000
```

Variables de `.env`:

| Variable  | Valor de ejemplo      |
|-----------|-----------------------|
| HOST      | localhost             |
| DATABASE  | tp_programacion_2     |
| USER      | root                  |
| PASSWORD  | (vacío en XAMPP)      |
| SECRET    | un secreto propio JWT |

### 3. Frontend

El frontend hace `fetch` a la API, así que debe servirse por HTTP (no abrir el
archivo directo). Cualquier servidor estático sirve:

```bash
cd frontend
npx serve .               # o: python -m http.server
```

Abrir la URL que indique (ej. http://localhost:3000).

## Usuarios de prueba

| Rol     | Email                  | Password  |
|---------|------------------------|-----------|
| Admin   | admin@lanaylino.com    | admin123  |
| Cliente | cliente1@gmail.com     | 123456    |

## Funcionalidad

- **Visitante:** ver catálogo (filtros por categoría, género y color), búsqueda,
  detalle de producto con talles/colores/cuotas, registro y login.
- **Cliente:** favoritos, carrito, checkout (transferencia o tarjeta, pago mock),
  editar perfil.
- **Admin:** cargar productos (con inventario por talle/color) y editar el stock
  de cada variante.

## Notas

- El pago es un **éxito simulado** (no hay pasarela real).
- El backend solo permite modificar **stock** de productos ya cargados
  (`PUT /modificarStock`); no expone edición de nombre/precio/etc.
