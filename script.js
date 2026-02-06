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
    fetch(URL_SHEETS, {
        method: 'GET',
        redirect: 'follow'
    })
    .then(r => r.json())
    .then(data => renderizarProductos(data))
    .catch(err => {
        console.error("Error:", err);
        document.getElementById("productos").innerHTML = "<p class='text-center'>Error al cargar productos.</p>";
    });
}

// --- RENDERIZADO DEL CATÁLOGO ---
function renderizarProductos(data) {
    const contenedor = document.getElementById("productos");
    let htmlFinal = ""; 
    let index = 0;
    productosGlobal = [];

    for (const categoria in data) {
        data[categoria].forEach(p => {
            const precio = parseFloat(p.precio) || 0;
            productosGlobal.push({ ...p, precio, categoria });

            htmlFinal += `
                <div class="col-6 col-md-4 col-lg-3 d-flex align-items-stretch producto" 
                    data-categoria="${categoria.toLowerCase()}" 
                    onclick="verDetalle(${index})">
                    <div class="card producto-card border-0 shadow-sm w-100">
                        <div class="position-relative">
                            <img src="${p.imagen || 'https://via.placeholder.com/300'}" class="card-img-top" alt="${p.nombre}">
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
    productoSeleccionado = { ...p, indexGlobal: index, talleElegido: "" };

    document.getElementById("detalle-img").src = p.imagen;
    document.getElementById("detalle-nombre").innerText = p.nombre;
    document.getElementById("detalle-precio").innerText = `$${p.precio.toLocaleString()}`;
    document.getElementById("detalle-descripcion").innerText = p.detalle || 'Sin descripción disponible.';
    document.getElementById("cant-detalle").value = 1;

    // Renderizar botones de talle con lógica de selección
    const contenedorTalles = document.getElementById("detalle-talle");
    contenedorTalles.innerHTML = ""; 

    if (p.categoria.toLowerCase() !== "accesorios" && p.talle) {
        document.querySelector('label[for="detalle-talle"]').style.display = "block";
        const listaTalles = p.talle.split(","); 
        
        listaTalles.forEach(t => {
            const btnTalle = document.createElement("button");
            btnTalle.innerText = t.trim();
            btnTalle.className = "btn-talle-selector"; 
            
            btnTalle.onclick = function() {
                // Quitar 'active' de todos y poner al seleccionado
                document.querySelectorAll(".btn-talle-selector").forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                productoSeleccionado.talleElegido = t.trim();
            };
            contenedorTalles.appendChild(btnTalle);
        });
    } else {
        document.querySelector('label[for="detalle-talle"]').style.display = "none";
        productoSeleccionado.talleElegido = "Único";
    }

    // Botón Agregar al Carrito
    document.getElementById("btn-agregar-detalle").onclick = () => {
        if (!productoSeleccionado.talleElegido) {
            mostrarToast("❌ Por favor, selecciona un talle");
            return;
        }
        const cant = parseInt(document.getElementById("cant-detalle").value);
        agregarDesdeDetalle(productoSeleccionado, cant);
    };

    // Navegación de vistas
    document.getElementById("hero").classList.add("d-none");
    document.getElementById("contenedor-catalogo").classList.add("d-none");
    document.getElementById("vista-detalle").classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- LÓGICA DE COMPRA ---
function agregarDesdeDetalle(prod, cant) {
    const talleFinal = prod.talleElegido;
    const existe = carrito.find(p => p.nombre === prod.nombre && p.talle === talleFinal);
    
    if (existe) {
        existe.cantidad += cant;
    } else {
        carrito.push({ ...prod, talle: talleFinal, cantidad: cant });
    }

    actualizarCarrito();
    
    const btn = document.getElementById("btn-agregar-detalle");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "✅ ¡AGREGADO!";
    btn.style.backgroundColor = "#198754";
    
    setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.style.backgroundColor = "";
    }, 2000);

    mostrarToast(`Agregado: ${prod.nombre} (Talle ${talleFinal})`);
}

function actualizarCarrito() {
    const listaModal = document.getElementById("listaModal");
    const totalModal = document.getElementById("totalModal");
    const contadorNav = document.getElementById("contadorNav");
    
    let html = "";
    let total = 0;
    let itemsTotales = 0;

    carrito.forEach((p, index) => {
        const subtotal = p.precio * p.cantidad;
        total += subtotal;
        itemsTotales += p.cantidad;
        html += `
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <div>
                    <h6 class="mb-0 fw-bold">${p.nombre}</h6>
                    <small class="text-muted">Talle: ${p.talle} x ${p.cantidad}</small>
                </div>
                <div class="text-end">
                    <div class="fw-bold">$${subtotal.toLocaleString()}</div>
                    <button class="btn btn-sm text-danger p-0" onclick="eliminarDelCarrito(${index})">Eliminar</button>
                </div>
            </div>`;
    });

    listaModal.innerHTML = carrito.length === 0 ? "<p class='text-center'>Tu carrito está vacío</p>" : html;
    totalModal.innerText = total.toLocaleString();
    
    if (itemsTotales > 0) {
        contadorNav.innerText = itemsTotales;
        contadorNav.style.display = "block";
    } else {
        contadorNav.style.display = "none";
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// --- FILTROS Y NAVEGACIÓN ---
function filtrar(categoria) {
    if (!document.getElementById("vista-detalle").classList.contains('d-none')) {
        volverAlCatalogo();
    }

    const productosDOM = document.querySelectorAll('.producto');
    productosDOM.forEach(p => {
        const catProd = p.getAttribute('data-categoria');
        p.style.display = (categoria === 'todos' || catProd === categoria.toLowerCase()) ? 'block' : 'none';
    });

    setTimeout(() => {
        document.getElementById("productos-section").scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300); 

    cerrarMenuMobile();
}

function volverAlCatalogo() {
    document.getElementById("hero").classList.remove("d-none");
    document.getElementById("contenedor-catalogo").classList.remove("d-none");
    document.getElementById("vista-detalle").classList.add("d-none");
}

function irAlHero() {
    volverAlCatalogo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function irAlCatalogo() {
    volverAlCatalogo();
    document.getElementById("productos-section").scrollIntoView({ behavior: 'smooth' });
}

// --- FUNCIONES DE SOPORTE ---
function cambiarCantidadDetalle(v) {
    const input = document.getElementById("cant-detalle");
    let cant = parseInt(input.value) || 1;
    cant = Math.max(1, cant + v);
    input.value = cant;
}

function intentarAbrirCarrito() {
    if (carrito.length === 0) {
        mostrarToast("🛒 El carrito está vacío");
        return;
    }
    const modal = new bootstrap.Modal(document.getElementById('modalCarrito'));
    modal.show();
}

function mostrarToast(mensaje) {
    const toastExistente = document.querySelector('.custom-toast');
    if (toastExistente) toastExistente.remove();

    const toast = document.createElement('div');
    toast.className = "custom-toast";
    toast.innerText = mensaje;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function cerrarMenuMobile() {
    const navbarCollapse = document.getElementById('menuNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        bootstrap.Collapse.getInstance(navbarCollapse).hide();
    }
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

// --- WHATSAPP & SHEETS ---
function enviarPedidoWhatsApp() {
    const inputNombre = document.getElementById('nombreCliente');
    const inputTelefono = document.getElementById('telefonoCliente');
    const inputDireccion = document.getElementById('direccionModal');
    
    const campos = [inputNombre, inputTelefono, inputDireccion];
    let faltaDato = false;

    campos.forEach(campo => campo.classList.remove('is-invalid-custom'));

    if (carrito.length === 0) {
        mostrarToast("🛒 El carrito está vacío");
        return;
    }

    campos.forEach(campo => {
        if (!campo.value.trim()) {
            campo.classList.add('is-invalid-custom');
            faltaDato = true;
        }
    });

    if (faltaDato) {
        mostrarToast("⚠️ Por favor, completa los campos marcados");
        return;
    }

    let detallePedido = "";
    let totalAcumulado = 0;
    carrito.forEach((p, index) => {
        detallePedido += `${p.cantidad}x ${p.nombre} (${p.talle})`;
        if (index < carrito.length - 1) detallePedido += ", ";
        totalAcumulado += p.precio * p.cantidad;
    });

    const datosParaSheets = {
        pedido: "ST-" + Math.floor(1000 + Math.random() * 9000),
        fecha: new Date().toLocaleString(),
        nombre: inputNombre.value.trim(),
        telefono: inputTelefono.value.trim(),
        productos: detallePedido,
        total: totalAcumulado,
        direccion: inputDireccion.value.trim()
    };

    fetch(URL_SHEETS, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaSheets)
    });

    let mensajeWA = `👋 ¡Hola! Soy ${inputNombre.value}. Quiero realizar este pedido:\n\n` +
                    `${detallePedido}\n\n` +
                    `📍 Dirección: ${inputDireccion.value}\n` +
                    `💰 Total: $${totalAcumulado.toLocaleString()}`;

    setTimeout(() => {
        const urlWA = `https://wa.me/5491127461954?text=${encodeURIComponent(mensajeWA)}`;
        window.open(urlWA, '_blank');
    }, 150);
}