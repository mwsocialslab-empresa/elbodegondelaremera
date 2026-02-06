const URL_SHEETS = "https://script.google.com/macros/s/AKfycbzb_I--xAIvRja1jJJwPfert2zgLEUScpqQ4rTEU0yIdjKpnQDIGQzbKfNdqX8BOwC_/exec";
let carrito = [];
let productosGlobal = [];
let productoSeleccionado = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarDesdeSheets();
    inicializarEventosMenu();
});

// --- CARGA DE DATOS ---
function cargarDesdeSheets() {
    fetch(URL_SHEETS, { method: 'GET', redirect: 'follow' })
    .then(r => r.json())
    .then(data => renderizarProductos(data))
    .catch(err => {
        console.error("Error:", err);
        const contenedor = document.getElementById("productos");
        if(contenedor) contenedor.innerHTML = "<p class='text-center'>Error al cargar productos.</p>";
    });
}

// --- RENDERIZADO DEL CATÁLOGO ---
function renderizarProductos(data) {
    const contenedor = document.getElementById("productos");
    if (!contenedor) return;
    
    let htmlFinal = ""; 
    let index = 0;
    productosGlobal = [];

    for (const categoria in data) {
        data[categoria].forEach(p => {
            const precio = parseFloat(p.precio) || 0;
            productosGlobal.push({ ...p, precio, categoria });

            htmlFinal += `
                <div class="col-6 col-md-4 col-lg-3 d-flex align-items-stretch producto" 
                    data-categoria="${categoria.toLowerCase()}">
                    <div class="card producto-card border-0 shadow-sm w-100" onclick="verDetalle(${index})">
                        <div class="position-relative">
                            <img src="${p.imagen || 'https://via.placeholder.com/300'}" alt="${p.nombre}" class="img-fluid">
                        </div>
                        <div class="card-body text-center">
                            <h6 class="fw-bold mb-1">${p.nombre}</h6>
                            <div class="mt-auto">
                                <span class="fw-bold text-primary fs-5">$${precio.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            index++;
        });
    }
    contenedor.innerHTML = htmlFinal;
}

// --- VISTA DE DETALLE ---
function verDetalle(index) {
    const p = productosGlobal[index];
    if (!p) return;
    
    productoSeleccionado = { ...p, indexGlobal: index, talleElegido: "" };

    document.getElementById("detalle-img").src = p.imagen;
    document.getElementById("detalle-nombre").innerText = p.nombre;
    document.getElementById("detalle-precio").innerText = `$${p.precio.toLocaleString()}`;
    document.getElementById("detalle-descripcion").innerText = p.detalle || 'Sin descripción disponible.';
    document.getElementById("cant-detalle").value = 1;

    const contenedorTalles = document.getElementById("detalle-talle");
    contenedorTalles.innerHTML = ""; 
    const labelTalle = document.querySelector('label[for="detalle-talle"]');

    if (p.categoria.toLowerCase() !== "accesorios" && p.talle) {
        if(labelTalle) labelTalle.style.display = "block";
        p.talle.split(",").forEach(t => {
            const btnTalle = document.createElement("button");
            btnTalle.innerText = t.trim();
            btnTalle.className = "btn-talle-selector"; 
            btnTalle.onclick = function() {
                document.querySelectorAll(".btn-talle-selector").forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                productoSeleccionado.talleElegido = t.trim();
            };
            contenedorTalles.appendChild(btnTalle);
        });
    } else {
        if(labelTalle) labelTalle.style.display = "none";
        productoSeleccionado.talleElegido = "Único";
    }

    document.getElementById("btn-agregar-detalle").onclick = () => {
        if (!productoSeleccionado.talleElegido) {
            mostrarToast("❌ Por favor, selecciona un talle");
            return;
        }
        agregarDesdeDetalle(productoSeleccionado, parseInt(document.getElementById("cant-detalle").value));
    };

    document.getElementById("hero").classList.add("d-none");
    document.getElementById("contenedor-catalogo").classList.add("d-none");
    document.getElementById("vista-detalle").classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- LÓGICA DE COMPRA ---
function agregarDesdeDetalle(prod, cant) {
    const talleFinal = prod.talleElegido;
    const existe = carrito.find(p => p.nombre === prod.nombre && p.talle === talleFinal);
    existe ? existe.cantidad += cant : carrito.push({ ...prod, talle: talleFinal, cantidad: cant });

    actualizarCarrito();
    const btn = document.getElementById("btn-agregar-detalle");
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ ¡AGREGADO!";
    setTimeout(() => btn.innerHTML = originalText, 2000);
    mostrarToast(`Agregado: ${prod.nombre}`);
}

function actualizarCarrito() {
    const listaModal = document.getElementById("listaModal");
    const totalModal = document.getElementById("totalModal");
    const contadorNav = document.getElementById("contadorNav");
    let html = "", total = 0, items = 0;

    carrito.forEach((p, i) => {
        const sub = p.precio * p.cantidad;
        total += sub; items += p.cantidad;
        html += `
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <div><h6 class="mb-0 fw-bold">${p.nombre}</h6><small>Talle: ${p.talle} x ${p.cantidad}</small></div>
                <div class="text-end"><div class="fw-bold">$${sub.toLocaleString()}</div>
                <button class="btn btn-sm text-danger p-0" onclick="eliminarDelCarrito(${i})">Eliminar</button></div>
            </div>`;
    });

    if(listaModal) listaModal.innerHTML = carrito.length === 0 ? "<p class='text-center'>Vacío</p>" : html;
    if(totalModal) totalModal.innerText = total.toLocaleString();
    if(contadorNav) {
        contadorNav.innerText = items;
        contadorNav.style.display = items > 0 ? "block" : "none";
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// --- NAVEGACIÓN Y FILTROS (ARREGLADO) ---
function filtrar(categoria) {
    volverAlCatalogo();
    const productosDOM = document.querySelectorAll('.producto');
    
    productosDOM.forEach(p => {
        const catProd = p.getAttribute('data-categoria');
        if (categoria === 'todos' || catProd === categoria.toLowerCase()) {
            p.style.display = 'block';
        } else {
            p.style.display = 'none';
        }
    });

    const section = document.getElementById("productos-section");
    if(section) {
        const yOffset = -110;
        const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
    cerrarMenuMobile();
}

function irAlCatalogo() {
    filtrar('todos');
}

// --- SOPORTE Y MENÚ ---
function cambiarCantidadDetalle(v) {
    const input = document.getElementById("cant-detalle");
    input.value = Math.max(1, (parseInt(input.value) || 1) + v);
}

function intentarAbrirCarrito() {
    if (carrito.length === 0) return mostrarToast("🛒 El carrito está vacío");
    new bootstrap.Modal(document.getElementById('modalCarrito')).show();
}

function mostrarToast(msj) {
    const t = document.createElement('div');
    t.className = "custom-toast"; t.innerText = msj;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 3000);
}

function inicializarEventosMenu() {
    const menuNav = document.getElementById('menuNav');
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);

    menuNav.addEventListener('show.bs.collapse', () => {
        document.body.classList.add('menu-open');
        overlay.classList.add('show');
    });

    menuNav.addEventListener('hide.bs.collapse', () => {
        document.body.classList.remove('menu-open');
        overlay.classList.remove('show');
    });

    overlay.onclick = cerrarMenuMobile;
}

function enviarPedidoWhatsApp() {
    const nom = document.getElementById('nombreCliente'), tel = document.getElementById('telefonoCliente'), dir = document.getElementById('direccionModal');
    if (!nom.value || !tel.value || !dir.value) return mostrarToast("⚠️ Completa los datos");

    let detalle = "", total = 0;
    carrito.forEach(p => {
        detalle += `${p.cantidad}x ${p.nombre} (${p.talle}), `;
        total += p.precio * p.cantidad;
    });

    const datos = { pedido: "ST-"+Math.floor(Math.random()*9000), fecha: new Date().toLocaleString(), nombre: nom.value, telefono: tel.value, productos: detalle, total: total, direccion: dir.value };
    fetch(URL_SHEETS, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datos) });

    const msj = `👋 Hola! Soy ${nom.value}. Pedido:\n${detalle}\n📍 Dir: ${dir.value}\n💰 Total: $${total.toLocaleString()}`;
    window.open(`https://wa.me/5491127461954?text=${encodeURIComponent(msj)}`, '_blank');
}
// --- NAVEGACIÓN Y FILTROS (VERSIÓN DEFINITIVA) ---
function filtrar(categoria) {
    // 1. Forzar cierre de cualquier menú abierto inmediatamente
    cerrarMenuMobile();

    // 2. Mostrar catálogo y ocultar detalle (asegura que los elementos existan en el DOM)
    const hero = document.getElementById("hero");
    const catalogo = document.getElementById("contenedor-catalogo");
    const detalle = document.getElementById("vista-detalle");

    if (hero) hero.classList.remove("d-none");
    if (catalogo) catalogo.classList.remove("d-none");
    if (detalle) detalle.classList.add("d-none");

    // 3. Filtrar los productos
    const productosDOM = document.querySelectorAll('.producto');
    productosDOM.forEach(p => {
        const catProd = p.getAttribute('data-categoria');
        if (categoria === 'todos' || catProd === categoria.toLowerCase()) {
            p.style.setProperty('display', 'block', 'important');
        } else {
            p.style.setProperty('display', 'none', 'important');
        }
    });

    // 4. Scroll forzado con un pequeño retraso para que el navegador procese el cambio de D-NONE
    setTimeout(() => {
        const section = document.getElementById("productos-section");
        if (section) {
            const headerOffset = 100;
            const elementPosition = section.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    }, 150);
}

function irAlHero() {
    cerrarMenuMobile();
    const hero = document.getElementById("hero");
    const catalogo = document.getElementById("contenedor-catalogo");
    const detalle = document.getElementById("vista-detalle");

    if (hero) hero.classList.remove("d-none");
    if (catalogo) catalogo.classList.remove("d-none");
    if (detalle) detalle.classList.add("d-none");

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function volverAlCatalogo() {
    const hero = document.getElementById("hero");
    const catalogo = document.getElementById("contenedor-catalogo");
    const detalle = document.getElementById("vista-detalle");

    if (hero) hero.classList.remove("d-none");
    if (catalogo) catalogo.classList.remove("d-none");
    if (detalle) detalle.classList.add("d-none");
    
    // Al volver al catálogo, no hacemos scroll arriba para no perder la posición
}

// Reemplazá también esta función para que sea más robusta
function cerrarMenuMobile() {
    const nav = document.getElementById('menuNav');
    if (nav && nav.classList.contains('show')) {
        const bCollapse = bootstrap.Collapse.getInstance(nav);
        if (bCollapse) {
            bCollapse.hide();
        } else {
            // Si no hay instancia, lo cerramos a mano
            nav.classList.remove('show');
            document.body.classList.remove('menu-open');
            const overlay = document.querySelector('.menu-overlay');
            if(overlay) overlay.classList.remove('show');
        }
    }
}