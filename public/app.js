let editingId = null;
let deletingId = null;
let mostrarTodos = false;
const TIME_ZONE = 'America/Argentina/Buenos_Aires';
let confirmarHistorial = false;

/* =========================
   HELPERS
========================= */

function mostrarToast(texto) {
  Toastify({
    text: texto,
    duration: 2500,
    gravity: 'top',
    position: 'center'
  }).showToast();
}

function actualizarFecha() {
  const fecha = new Date();

  const texto = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  document.getElementById('fecha-hoy').innerText =
    texto.charAt(0).toUpperCase() + texto.slice(1);
}

function getTodayDayIndex() {
  const ahora = new Date();
  const fechaZona = new Date(
    ahora.toLocaleString('en-US', {
      timeZone: TIME_ZONE
    })
  );

  return fechaZona.getDay();
}

function actualizarVistaUI() {
  const titulo = document.getElementById('titulo-vista');
  const boton = document.getElementById('toggle-vista');

  if (mostrarTodos) {
    titulo.innerText = 'Todos los remedios';
    boton.innerText = 'Ver solo hoy';
  } else {
    titulo.innerText = 'Remedios de Hoy';
    boton.innerText = 'Ver todos';
  }
}

function actualizarHistorialUI() {
  const botonBorrar = document.getElementById('historial-borrar');
  const botonConfirmar = document.getElementById('historial-confirmar');
  const botonCancelar = document.getElementById('historial-cancelar');

  if (confirmarHistorial) {
    botonBorrar.classList.add('oculto');
    botonConfirmar.classList.remove('oculto');
    botonCancelar.classList.remove('oculto');
  } else {
    botonBorrar.classList.remove('oculto');
    botonConfirmar.classList.add('oculto');
    botonCancelar.classList.add('oculto');
  }
}

function renderGrupo(titulo, meds, lista) {
  if (meds.length === 0) {
    return;
  }

  const h2 = document.createElement('h2');

  h2.className = 'grupo-titulo';

  h2.innerText = titulo;

  lista.appendChild(h2);

  meds.forEach((med) => {
    renderMedicamento(med, lista);
  });
}

function renderMedicamento(med, lista) {
  const div = document.createElement('div');

  div.className = med.tomado
    ? 'remedio tomado'
    : 'remedio';

  const diasSeleccionados = med.dias
    ? med.dias.split(',')
    : [];

  const diasOrdenados = [1, 2, 3, 4, 5, 6, 0];
  const etiquetasDias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const diasTexto = diasOrdenados
    .filter((dia) => diasSeleccionados.includes(String(dia)))
    .map((dia) => etiquetasDias[dia])
    .join(', ');

  const puedeTomar = diasSeleccionados.includes(
    String(getTodayDayIndex())
  );

  div.innerHTML = editingId === med.id
    ? `
      <div class="info">
        <input
          id="edit-nombre-${med.id}"
          type="text"
          value="${med.nombre}"
          placeholder="Nombre"
        >

        <input
          id="edit-horario-${med.id}"
          type="time"
          value="${med.horario}"
        >

        <input
          id="edit-dosis-${med.id}"
          type="text"
          value="${med.dosis || ''}"
          placeholder="Dosis"
        >

        <div
          class="dias-edicion"
          id="dias-edit-${med.id}"
        >
          ${['L', 'M', 'X', 'J', 'V', 'S', 'D']
            .map((dia, index) => `
              <label>
                <input
                  type="checkbox"
                  value="${(index + 1) % 7}"
                  ${
                    diasSeleccionados.includes(
                      String((index + 1) % 7)
                    )
                    ? 'checked'
                    : ''
                  }
                >
                ${dia}
              </label>
            `).join('')}
        </div>
      </div>

      <div class="acciones">
        <button onclick="guardarEdicion(${med.id})">
          Guardar
        </button>

        <button onclick="cancelarEdicion()">
          Cancelar
        </button>
      </div>
    `
    : `
      <div class="info">
        <div class="nombre">
          ${med.nombre}
        </div>

        <div class="horario">
          ${med.horario}
        </div>

        <div class="dosis">
          ${med.dosis || ''}
        </div>

        <div class="dias-texto">
          Días: ${diasTexto || '-'}
        </div>
      </div>

      <div class="acciones">
        ${deletingId === med.id
          ? `
            <div class="confirmacion">
              <span>¿Borrar?</span>
              <button class="boton-peligro" onclick="confirmarBorrado(${med.id})">
                Confirmar
              </button>
              <button class="boton-secundario" onclick="cancelarBorrado()">
                Cancelar
              </button>
            </div>
          `
          : `
            ${puedeTomar
              ? `
                <button onclick="toggleTomado(${med.id})">
                  ${med.tomado ? '✓ Tomado' : 'Tomar'}
                </button>
              `
              : ''
            }

            <button onclick="editarMedicamento(${med.id})">
              Editar
            </button>

            <button class="boton-peligro" onclick="solicitarBorrado(${med.id})">
              Borrar
            </button>
          `
        }
      </div>
    `;

  lista.appendChild(div);
}

/* =========================
   CARGA PRINCIPAL
========================= */

async function cargarMedicamentos() {
  const endpoint = mostrarTodos
    ? '/api/medicamentos/todos'
    : '/api/medicamentos';

  const response = await fetch(endpoint);

  const medicamentos = await response.json();

  const lista = document.getElementById('lista');

  lista.innerHTML = '';

  const grupos = {
    mañana: [],
    tarde: [],
    noche: []
  };

  medicamentos.forEach((med) => {
    const hora = parseInt(
      med.horario.split(':')[0]
    );

    if (hora < 12) {
      grupos.mañana.push(med);
    } else if (hora < 19) {
      grupos.tarde.push(med);
    } else {
      grupos.noche.push(med);
    }
  });

  renderGrupo(
    '☀️ Mañana',
    grupos.mañana,
    lista
  );

  renderGrupo(
    '🌤️ Tarde',
    grupos.tarde,
    lista
  );

  renderGrupo(
    '🌙 Noche',
    grupos.noche,
    lista
  );
}

function toggleVista() {
  mostrarTodos = !mostrarTodos;
  editingId = null;
  deletingId = null;

  actualizarVistaUI();
  cargarMedicamentos();
  cargarCalendario();
}

/* =========================
   CRUD
========================= */

async function agregarMedicamento() {
  const nombre = document
    .getElementById('nombre')
    .value;

  const horario = document
    .getElementById('horario')
    .value;

  const dosis = document
    .getElementById('dosis')
    .value;

  const dias = Array.from(
    document.querySelectorAll(
      '.dias input:checked'
    )
  ).map(cb => cb.value);

  if (
    !nombre ||
    !horario ||
    !dosis ||
    dias.length === 0
  ) {
    mostrarToast(
      'Completar todos los campos'
    );

    return;
  }

  await fetch('/api/medicamentos', {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      nombre,
      horario,
      dosis,
      dias: dias.join(',')
    })
  });

  document.getElementById('nombre').value = '';
  document.getElementById('horario').value = '';
  document.getElementById('dosis').value = '';

  document
    .querySelectorAll('.dias input')
    .forEach(cb => cb.checked = true);

  mostrarToast('Medicamento agregado');

  cargarMedicamentos();
  cargarCalendario();
}

async function toggleTomado(id) {
  const response = await fetch(
    `/api/medicamentos/${id}/tomar`,
    {
      method: 'POST'
    }
  );

  const result = await response.json();

  if (result.yaRegistrado) {
    mostrarToast('Ya estaba registrado');
  } else {
    mostrarToast('Medicamento tomado');
  }

  cargarMedicamentos();
  cargarCalendario();
}

function solicitarBorradoHistorial() {
  confirmarHistorial = true;
  actualizarHistorialUI();
}

function cancelarBorradoHistorial() {
  confirmarHistorial = false;
  actualizarHistorialUI();
}

async function confirmarBorradoHistorial() {
  await fetch('/api/historial', {
    method: 'DELETE'
  });

  confirmarHistorial = false;
  actualizarHistorialUI();
  mostrarToast('Historial borrado');

  cargarCalendario();
}

let calendar = null;

async function cargarCalendario() {
  const response = await fetch('/api/historial');

  const historial = await response.json();

  const eventos = historial.map(item => ({
    title: `${item.horario} - ${item.nombre}`,
    start: item.fecha,
    allDay: true,
    backgroundColor: '#4caf50',
    borderColor: '#4caf50'
  }));

  const calendarEl =
    document.getElementById('calendar');

  if (calendar) {
    calendar.destroy();
  }

  calendar = new FullCalendar.Calendar(
    calendarEl,
    {
      initialView: 'dayGridMonth',

      locale: 'es',

      height: 'auto',

      events: eventos,

      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },

      buttonText: {
        today: 'Hoy'
      },

      eventDisplay: 'block'
    }
  );

  calendar.render();

  window.addEventListener('resize', () => {
    calendar.updateSize();
  });
}

function solicitarBorrado(id) {
  deletingId = id;

  cargarMedicamentos();
  cargarCalendario();
}

function cancelarBorrado() {
  deletingId = null;

  cargarMedicamentos();
  cargarCalendario();
}

async function confirmarBorrado(id) {

  await fetch(`/api/medicamentos/${id}`, {
    method: 'DELETE'
  });

  deletingId = null;

  mostrarToast('Medicamento borrado');

  cargarMedicamentos();
  cargarCalendario();
}

function editarMedicamento(id) {
  editingId = id;
  deletingId = null;

  cargarMedicamentos();
  cargarCalendario();
}

function cancelarEdicion() {
  editingId = null;
  deletingId = null;

  cargarMedicamentos();
  cargarCalendario();
}

async function guardarEdicion(id) {
  const nombre = document
    .getElementById(`edit-nombre-${id}`)
    .value;

  const horario = document
    .getElementById(`edit-horario-${id}`)
    .value;

  const dosis = document
    .getElementById(`edit-dosis-${id}`)
    .value;

  const dias = Array.from(
    document.querySelectorAll(
      `#dias-edit-${id} input:checked`
    )
  ).map(cb => cb.value);

  if (
    !nombre ||
    !horario ||
    !dosis ||
    dias.length === 0
  ) {
    mostrarToast(
      'Completar todos los campos'
    );

    return;
  }

  await fetch(`/api/medicamentos/${id}`, {
    method: 'PUT',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      nombre,
      horario,
      dosis,
      dias: dias.join(',')
    })
  });

  editingId = null;
  deletingId = null;

  mostrarToast('Medicamento actualizado');

  cargarMedicamentos();
  cargarCalendario();
}

/* =========================
   INIT
========================= */

document
  .getElementById('agregar')
  .addEventListener(
    'click',
    agregarMedicamento
  );

document
  .getElementById('toggle-vista')
  .addEventListener('click', toggleVista);

document
  .getElementById('historial-borrar')
  .addEventListener('click', solicitarBorradoHistorial);

document
  .getElementById('historial-confirmar')
  .addEventListener('click', confirmarBorradoHistorial);

document
  .getElementById('historial-cancelar')
  .addEventListener('click', cancelarBorradoHistorial);


actualizarFecha();
actualizarVistaUI();
actualizarHistorialUI();
cargarMedicamentos();
cargarCalendario();