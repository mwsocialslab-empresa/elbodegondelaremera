const URL_SHEETS = "https://script.google.com/macros/s/AKfycbxWcPxS19UZ_hJCEqiZQn4Pp39f_k1sAMSvgOiMSrT9zZbSR8_mOIX6SQslpVqyOBGr/exec";
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
            const precioNormal = parseFloat(p.precio) || 0;
            const precioOferta = parseFloat(p.precioOferta) || 0;
            const nombreCat = categoria.toLowerCase();
            
            // Si el precio de oferta es mayor a 0, o si el producto VIENE de la hoja "ofertas"
            const tieneOferta = precioOferta > 0 || nombreCat === 'ofertas';

            // Guardamos el producto
            productosGlobal.push({ ...p, precio: precioNormal, precioOferta, categoria });

            const nombreFormateado = p.nombre.charAt(0).toUpperCase() + p.nombre.slice(1).toLowerCase();
            
            // Asignamos categorías: su nombre de hoja + "ofertas" si corresponde
            let categoriasData = nombreCat;
            if (tieneOferta) {
                categoriasData += " ofertas";
            }

            const badgeOferta = tieneOferta 
                ? `<span class="position-absolute top-0 start-0 badge rounded-pill bg-danger m-2" style="z-index: 10;">OFERTA</span>` 
                : "";

            // Mostramos el precio de oferta si existe, sino el normal
            const precioAMostrar = (precioOferta > 0) ? precioOferta : precioNormal;
            
            const preciosHTML = (precioOferta > 0)
                ? `<span class="fw-bold text-primary fs-5">$${precioOferta.toLocaleString()}</span>
                   <span class="text-muted text-decoration-line-through small ms-1">$${precioNormal.toLocaleString()}</span>`
                : `<span class="fw-bold text-primary fs-5">$${precioNormal.toLocaleString()}</span>`;

            htmlFinal += `
                <div class="col-6 col-md-4 col-lg-3 d-flex align-stretch producto" 
                    data-categoria="${categoriasData}">
                    <div class="card producto-card border-0 shadow-sm w-100 position-relative">
                        ${badgeOferta}
                        <div class="position-relative" onclick="verDetalle(${index})" style="cursor:pointer">
                            <img src="${p.imagen || 'https://placeholder.co/300'}" alt="${p.nombre}" class="img-fluid">
                        </div>
                        <div class="card-body d-flex flex-column p-2">
                            <h6 class="fw-bold mb-1 text-start" style="font-size: 0.85rem;">${nombreFormateado}</h6>
                            <div class="text-start mb-2">
                                ${preciosHTML}
                            </div>
                            <div class="mt-auto text-center">
                                <button class="btn btn-dark btn-sm w-100 rounded-pill fw-bold" onclick="verDetalle(${index})">
                                    COMPRAR
                                </button>
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
    
    // El precio de venta real será el de oferta si existe, sino el normal
    const precioVenta = (p.precioOferta && p.precioOferta > 0) ? p.precioOferta : p.precio;
    productoSeleccionado = { ...p, indexGlobal: index, talleElegido: "", precioFinal: precioVenta };

    const btnAgregar = document.getElementById("btn-agregar-detalle");
    if (btnAgregar) {
        btnAgregar.innerHTML = 'AÑADIR AL CARRITO <i class="bi bi-cart4"></i>';
        btnAgregar.disabled = false;
    }

    // --- NUEVA LÓGICA PARA EL BADGE EN DETALLE ---
    const tieneOferta = (p.precioOferta && p.precioOferta > 0) || p.categoria.toLowerCase() === 'ofertas';
    const contenedorImagen = document.querySelector(".detalle-img-contenedor") || document.getElementById("detalle-img").parentElement;
    
    // Si ya existe un badge viejo, lo borramos para no duplicar
    const badgeViejo = contenedorImagen.querySelector(".badge-oferta-detalle");
    if (badgeViejo) badgeViejo.remove();

    if (tieneOferta) {
        const badgeHTML = `<span class="badge-oferta-detalle position-absolute top-0 start-0 badge rounded-pill bg-danger m-3" style="z-index: 10; font-size: 1rem;">OFERTA</span>`;
        contenedorImagen.classList.add("position-relative"); // Nos aseguramos de que el contenedor sea relativo
        contenedorImagen.insertAdjacentHTML('beforeend', badgeHTML);
    }
    // ----------------------------------------------

    document.getElementById("detalle-img").src = p.imagen || 'https://placeholder.co/300';
    document.getElementById("detalle-nombre").innerText = p.nombre;
    
    // Lógica para mostrar precio de oferta en el detalle
    const contenedorPrecio = document.getElementById("detalle-precio");
    if (p.precioOferta && p.precioOferta > 0) {
        contenedorPrecio.innerHTML = `
            <span class="text-primary fw-bold">$${p.precioOferta.toLocaleString()}</span>
            <span class="text-muted fs-5 text-decoration-line-through ms-3">$${p.precio.toLocaleString()}</span>
        `;
    } else {
        contenedorPrecio.innerText = `$${p.precio.toLocaleString()}`;
    }

    document.getElementById("detalle-descripcion").innerText = p.detalle || 'Sin descripción disponible.';
    document.getElementById("cant-detalle").value = 1;

    const contenedorTalles = document.getElementById("detalle-talle");
    contenedorTalles.innerHTML = ""; 
    const labelTalle = document.querySelector('label[for="detalle-talle"]');

    const esAccesorio = p.categoria.toLowerCase().includes("accesorio");
    
    if (!esAccesorio && p.talle && p.talle.trim() !== "") {
        if(labelTalle) labelTalle.classList.remove("d-none");
        contenedorTalles.classList.remove("d-none");
        
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
        if(labelTalle) labelTalle.classList.add("d-none");
        contenedorTalles.classList.add("d-none");
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
    
    // Calculamos si tiene oferta antes de guardar
    const tieneOferta = (prod.precioOferta && prod.precioOferta > 0) || prod.categoria.toLowerCase() === 'ofertas';

    // Agregamos el producto con la propiedad tieneOferta para que el carrito la reconozca
    existe ? existe.cantidad += cant : carrito.push({ ...prod, talle: talleFinal, cantidad: cant, tieneOferta: tieneOferta });

    actualizarCarrito();
    
    const btn = document.getElementById("btn-agregar-detalle");
    const originalText = 'AÑADIR AL CARRITO <i class="bi bi-cart4"></i>';
    btn.innerHTML = "✅ ¡AGREGADO!";
    btn.disabled = true; 
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 1500); 

    //mostrarToast(`Agregado: ${prod.nombre}`);
}

function actualizarCarrito() {
    const listaModal = document.getElementById("listaModal");
    const totalModal = document.getElementById("totalModal");
    const contadorNav = document.getElementById("contadorNav");
    let html = "", total = 0, items = 0;

    carrito.forEach((p, i) => {
        // Determinamos el precio real a cobrar (oferta o normal)
        const precioReal = (p.precioOferta && p.precioOferta > 0) ? p.precioOferta : p.precio;
        const sub = precioReal * p.cantidad;
        
        total += sub; 
        items += p.cantidad;
        
        const talleTexto = p.talle === "Único" ? "" : `Talle: ${p.talle}`;
        
        // --- Badge de oferta para la miniatura ---
        const badgeOfertaCarrito = p.tieneOferta 
            ? `<span class="badge bg-danger position-absolute" style="font-size: 0.5rem; top: -5px; left: -5px; z-index: 10; padding: 2px 5px;">OFERTA</span>` 
            : "";
        
        html += `
            <div class="mb-4 border-bottom pb-3" style="overflow-x: hidden;">
                <div class="row gx-2 align-items-center">
                    <div class="col-3 position-relative">
                        ${badgeOfertaCarrito}
                        <img src="${p.imagen}" class="img-mini-carrito shadow-sm" style="width: 100%; border-radius: 4px;">
                    </div>
                    <div class="col-9">
                        <h6 class="mb-0 fw-bold text-uppercase" style="font-size: 0.85rem;">${p.nombre}</h6>
                        <small class="text-muted">${talleTexto}</small>
                    </div>
                </div>

                <div class="row gx-2 align-items-center mt-2">
                    <div class="col-5">
                        <div class="wrapper-cantidad-carrito">
                            <button class="btn-qty" onclick="modificarCantidadCarrito(${i}, -1)">
                                <i class="bi bi-dash-lg"></i> </button>
                            <span class="qty-num">${p.cantidad}</span>
                            <button class="btn-qty" onclick="modificarCantidadCarrito(${i}, 1)">
                                <i class="bi bi-plus-lg"></i> </button>
                        </div>
                    </div>
                    <div class="col-3 text-center">
                        <button class="btn btn-sm text-danger fw-bold p-0" style="font-size: 0.65rem;" onclick="eliminarDelCarrito(${i})">ELIMINAR</button>
                    </div>
                    <div class="col-4 text-end">
                        <span class="fw-bold">$${sub.toLocaleString()}</span>
                    </div>
                </div>
            </div>`;
    });

    if(listaModal) listaModal.innerHTML = carrito.length === 0 ? "<p class='text-center py-4'>Vacío</p>" : html;
    if(totalModal) totalModal.innerText = total.toLocaleString();
    if(contadorNav) {
        contadorNav.innerText = items;
        contadorNav.style.display = items > 0 ? "block" : "none";
    }
}
// --- NUEVA FUNCIÓN: MODIFICAR CANTIDAD DESDE EL CARRITO ---
function modificarCantidadCarrito(index, cambio) {
    if (carrito[index]) {
        carrito[index].cantidad += cambio;
        // Si la cantidad llega a 0, lo eliminamos
        if (carrito[index].cantidad <= 0) {
            eliminarDelCarrito(index);
        } else {
            actualizarCarrito();
        }
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function cambiarCantidadDetalle(v, event) {
    if (event) { event.preventDefault(); }
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

    const soloNumeros = /^[0-9]+$/;
    if (!soloNumeros.test(inputTelefono.value.trim())) {
        inputTelefono.classList.add('is-invalid-custom');
        mostrarToast("❌ El teléfono solo debe contener números");
        return;
    }

    if (carrito.length === 0) return;

    let totalAcumulado = 0;
    carrito.forEach(p => totalAcumulado += (p.precio * p.cantidad));

    const numeroPedido = obtenerSiguientePedido(); 
    const fechaPedido = new Date().toLocaleString('es-AR');
    
    const aliasMP = "Alias-Ejemplo";
    const linkApp = "https://link.mercadopago.com.ar/home";

    let msg = `👋 ¡Hola! Soy *${inputNombre.value.trim()}*.\n\n`;
    msg += `📦 *PEDIDO N° ${numeroPedido}*\n`;
    msg += `📅 ${fechaPedido}\n`;
    msg += `--------------------------\n`;
    
    carrito.forEach(p => {
        const talleMsg = p.talle === "Único" ? "" : ` (${p.talle})`;
        msg += `✅ ${p.cantidad}x - ${p.nombre.toUpperCase()}${talleMsg}\n`;
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

function filtrar(categoria) {
    cerrarMenuMobile();
    
    if (categoria === 'todos') {
        irAlHero();
        return;
    }

    const hero = document.getElementById("hero");
    const catalogo = document.getElementById("contenedor-catalogo");
    const detalle = document.getElementById("vista-detalle");

    if (hero) hero.classList.remove("d-none");
    if (catalogo) catalogo.classList.remove("d-none");
    if (detalle) detalle.classList.add("d-none");

    const productosDOM = document.querySelectorAll('.producto');
    productosDOM.forEach(p => {
        const catProd = p.getAttribute('data-categoria').toLowerCase();
        // CAMBIO AQUÍ: Ahora verifica si la categoría buscada está dentro del atributo
        if (catProd.includes(categoria.toLowerCase())) {
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
        if (bCollapse) bCollapse.hide();
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

function irAlHero() {
    cerrarMenuMobile();
    const hero = document.getElementById("hero");
    const catalogo = document.getElementById("contenedor-catalogo");
    const detalle = document.getElementById("vista-detalle");

    if (hero) hero.classList.remove("d-none");
    if (catalogo) catalogo.classList.remove("d-none");
    if (detalle) detalle.classList.add("d-none");

    const productosDOM = document.querySelectorAll('.producto');
    productosDOM.forEach(p => {
        p.style.setProperty('display', 'block', 'important');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}