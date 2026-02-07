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
                <div class="col-6 col-md-4 col-lg-3 d-flex align-stretch producto" 
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

// --- SOPORTE Y MENÚ ---

/**
 * Función modificada para evitar el zoom molesto en móviles
 * Se añade e.preventDefault() para bloquear el comportamiento de doble tap del navegador
 */
function cambiarCantidadDetalle(v, event) {
    if (event) {
        event.preventDefault(); // Evita que el navegador haga zoom al clickear rápido
    }
    const input = document.getElementById("cant-detalle");
    input.value = Math.max(1, (parseInt(input.value) || 1) + v);
}

function intentarAbrirCarrito() {
    if (carrito.length === 0) return mostrarToast("🛒 El carrito está vacío");
    new bootstrap.Modal(document.getElementById('modalCarrito')).show();
}

function mostrarToast(mensaje) {
    const toastExistente = document.querySelector('.custom-toast');
    if (toastExistente) toastExistente.remove();

    const toast = document.createElement('div');
    toast.className = "custom-toast";
    toast.innerHTML = mensaje; 
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
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
    const inputNombre = document.getElementById('nombreCliente');
    const inputTelefono = document.getElementById('telefonoCliente');
    const inputDireccion = document.getElementById('direccionModal');
    
    const campos = [inputNombre, inputTelefono, inputDireccion];
    let faltaDato = false;

    campos.forEach(campo => {
        campo.classList.remove('is-invalid-custom');
        if (!campo.value.trim()) {
            campo.classList.add('is-invalid-custom'); 
            faltaDato = true;
        }
        campo.oninput = () => {
            campo.classList.remove('is-invalid-custom');
        };
    });

    if (faltaDato) {
        mostrarToast("⚠️ Por favor, completa los campos marcados en rojo");
        return;
    }

    if (carrito.length === 0) {
        mostrarToast("🛒 El carrito está vacío");
        return;
    }

    let totalAcumulado = 0;
    carrito.forEach(p => totalAcumulado += (p.precio * p.cantidad));

    const montoMinimo = 45000;
    if (totalAcumulado < montoMinimo) {
        mostrarToast(`❌ La compra mínima es de $${montoMinimo.toLocaleString()}`);
        return;
    }

    const numeroPedido = obtenerSiguientePedido(); 
    const fechaPedido = new Date().toLocaleString('es-AR');
    const aliasMP = "walter30mp";
    const linkApp = "https://link.mercadopago.com.ar/home";

    let msg = `👋 ¡Hola! Soy *${inputNombre.value.trim()}*.\n\n`;
    msg += `📦 *PEDIDO N° ${numeroPedido}*\n`;
    msg += `📅 ${fechaPedido}\n`;
    msg += `--------------------------\n`;
    
    carrito.forEach(p => {
        msg += `✅ ${p.cantidad}x - ${p.nombre.toUpperCase()} (${p.talle})\n`;
    });
    
    msg += `--------------------------\n`;
    msg += `📍 *Dirección:* ${inputDireccion.value.trim()}\n`;
    msg += `💰 *Total a pagar:* $${totalAcumulado.toLocaleString()}\n\n`;
    
    msg += `💳 *MERCADO PAGO:*\n`;
    msg += `📲 *TOCÁ EN "INICIAR SESIÓN"*\n`;
    msg += `👇 Abrir App:\n${linkApp}\n\n`;
    msg += `🔑 *Alias:* ${aliasMP}\n\n`;
    
    msg += `📸 *No olvides mandar el comprobante de pago*\n`;
    msg += `🙏 ¡Muchas gracias por tu compra!`;

    fetch(URL_SHEETS, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pedido: numeroPedido,
            fecha: fechaPedido,
            nombre: inputNombre.value.trim(),
            telefono: inputTelefono.value.trim(),
            productos: carrito.map(p => `${p.cantidad}x ${p.nombre} (${p.talle})`).join(", "),
            total: totalAcumulado,
            direccion: inputDireccion.value.trim()
        })
    });

    const whatsappUrl = `https://wa.me/5491127461954?text=${encodeURIComponent(msg)}`;
    const btn = document.querySelector(".btn-dark[onclick='enviarPedidoWhatsApp()']");
    
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    }

    setTimeout(() => {
        window.open(whatsappUrl, '_blank'); 
        carrito = [];
        actualizarCarrito();
        const modalElt = document.getElementById('modalCarrito');
        const modalInst = bootstrap.Modal.getInstance(modalElt);
        if (modalInst) modalInst.hide();
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'FINALIZAR COMPRA POR WHATSAPP <i class="bi bi-whatsapp"></i>';
        }
    }, 800);
}

// --- NAVEGACIÓN Y FILTROS ---
function filtrar(categoria) {
    cerrarMenuMobile();
    const hero = document.getElementById("hero");
    const catalogo = document.getElementById("contenedor-catalogo");
    const detalle = document.getElementById("vista-detalle");

    if (hero) hero.classList.remove("d-none");
    if (catalogo) catalogo.classList.remove("d-none");
    if (detalle) detalle.classList.add("d-none");

    const productosDOM = document.querySelectorAll('.producto');
    productosDOM.forEach(p => {
        const catProd = p.getAttribute('data-categoria');
        if (categoria === 'todos' || catProd === categoria.toLowerCase()) {
            p.style.setProperty('display', 'block', 'important');
        } else {
            p.style.setProperty('display', 'none', 'important');
        }
    });

    setTimeout(() => {
        const section = document.getElementById("productos-section");
        if (section) {
            const headerOffset = 100;
            const elementPosition = section.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
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
}

function cerrarMenuMobile() {
    const nav = document.getElementById('menuNav');
    if (nav && nav.classList.contains('show')) {
        const bCollapse = bootstrap.Collapse.getInstance(nav);
        if (bCollapse) {
            bCollapse.hide();
        } else {
            nav.classList.remove('show');
            document.body.classList.remove('menu-open');
            const overlay = document.querySelector('.menu-overlay');
            if(overlay) overlay.classList.remove('show');
        }
    }
}

function obtenerSiguientePedido() {
    let ultimoNum = localStorage.getItem('contadorPedido') || 0;
    let siguienteNum = parseInt(ultimoNum) + 1;
    localStorage.setItem('contadorPedido', siguienteNum);
    let parteIzquierda = Math.floor(siguienteNum / 10000).toString().padStart(3, '0');
    let parteDerecha = (siguienteNum % 10000).toString().padStart(4, '0');
    return `${parteIzquierda}-${parteDerecha}`;
}