const URL_SHEETS = "https://script.google.com/macros/s/AKfycbzb_I--xAIvRja1jJJwPfert2zgLEUScpqQ4rTEU0yIdjKpnQDIGQzbKfNdqX8BOwC_/exec";
let carrito = [];
let productosGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarDesdeSheets();
});

function cargarDesdeSheets() {
    fetch(URL_SHEETS, {
        method: 'GET',
        redirect: 'follow' // <--- AGREGA ESTO
    })
    .then(r => r.json())
    .then(data => renderizarProductos(data))
    .catch(err => {
        console.error("Error:", err);
        document.getElementById("productos").innerHTML = "<p class='text-center'>Error al cargar productos.</p>";
    });
}

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
                <div class="col-6 col-md-4 col-lg-3 producto" data-categoria="${categoria.toLowerCase()}">
                    <div class="card h-100 border-0 shadow-sm producto-card">
                        <div class="position-relative overflow-hidden">
                            <img src="${p.imagen || 'https://via.placeholder.com/300'}" class="card-img-top img-producto" alt="${p.nombre}">
                        </div>
                        <div class="card-body p-3 text-center">
                            <h6 class="fw-bold mb-1">${p.nombre}</h6>
                            <p class="text-muted small mb-2">Talle: ${p.talle || 'Único'}</p>
                            <div class="mb-3">
                                <span class="fs-5 fw-bold text-primary">$${precio.toLocaleString()}</span>
                            </div>
                            <div class="d-flex justify-content-center align-items-center gap-2">
                                <div class="input-group input-group-sm w-50">
                                    <button class="btn btn-outline-secondary" onclick="cambiarCantidad(${index}, -1)">-</button>
                                    <input id="cant${index}" class="form-control text-center" value="1" readonly>
                                    <button class="btn btn-outline-secondary" onclick="cambiarCantidad(${index}, 1)">+</button>
                                </div>
                                <button class="btn btn-dark btn-sm" onclick="agregar(${index})">🛍️</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            index++;
        });
    }
    contenedor.innerHTML = htmlFinal;
}

function cambiarCantidad(i, v) {
    const input = document.getElementById(`cant${i}`);
    let cant = parseInt(input.value) || 1;
    cant = Math.max(1, cant + v);
    input.value = cant;
}

function agregar(i) {
    const cant = parseInt(document.getElementById(`cant${i}`).value);
    const prod = productosGlobal[i];
    const existe = carrito.find(p => p.nombre === prod.nombre && p.talle === prod.talle);

    if (existe) {
        existe.cantidad += cant;
    } else {
        carrito.push({ ...prod, cantidad: cant });
    }

    actualizarCarrito();
    mostrarToast(`¡${prod.nombre} agregado!`);
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

// ==========================
// 🔹 FUNCIÓN DE ENVÍO CORREGIDA
// ==========================
function enviarPedidoWhatsApp() {
    const inputNombre = document.getElementById('nombreCliente');
    const inputTelefono = document.getElementById('telefonoCliente');
    const inputDireccion = document.getElementById('direccionModal');
    
    if (carrito.length === 0) return;
    if (!inputNombre.value || !inputTelefono.value || !inputDireccion.value) {
        mostrarToast("Por favor completa todos los datos");
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
        pedido: "ST-" + Math.floor(Math.random() * 10000),
        fecha: new Date().toLocaleString(),
        nombre: inputNombre.value,
        telefono: inputTelefono.value,
        productos: detallePedido,
        total: totalAcumulado,
        direccion: inputDireccion.value
    };

    // USAMOS EL MÉTODO MÁS COMPATIBLE PARA EVITAR CORS EN EL POST
    fetch(URL_SHEETS, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaSheets)
    });

    // Formato solicitado
    let mensajeWA = `👋 ¡Hola! Soy ${inputNombre.value}. Quiero realizar este pedido:\n\n` +
                    `${detallePedido}\n\n` +
                    `📍 Dirección: ${inputDireccion.value}\n` +
                    `💰 Total: $${totalAcumulado.toLocaleString()}`;

    // Pequeño retraso para asegurar que el fetch se dispare antes de abrir la ventana
    setTimeout(() => {
        const urlWA = `https://wa.me/5491127461954?text=${encodeURIComponent(mensajeWA)}`;
        window.open(urlWA, '_blank');
    }, 150);
}

function filtrar(categoria) {
    const productosDOM = document.querySelectorAll('.producto');
    productosDOM.forEach(p => {
        const catProd = p.getAttribute('data-categoria');
        if (categoria === 'todos' || catProd === categoria.toLowerCase()) {
            p.style.display = 'block';
        } else {
            p.style.display = 'none';
        }
    });
}

function cerrarMenuMobile() {
    const navbarCollapse = document.getElementById('menuNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse);
        bsCollapse.hide();
    }
}

function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.className = "position-fixed bottom-0 start-50 translate-middle-x bg-dark text-white p-2 rounded mb-5 shadow-lg";
    toast.style.zIndex = "10000";
    toast.style.fontSize = "14px";
    toast.innerText = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}