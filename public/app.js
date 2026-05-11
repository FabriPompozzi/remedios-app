let editingId = null;

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
      </div>

      <div class="acciones">
        <button onclick="toggleTomado(${med.id})">
          ${med.tomado ? '✓ Tomado' : 'Tomar'}
        </button>

        <button onclick="editarMedicamento(${med.id})">
          Editar
        </button>

        <button onclick="borrarMedicamento(${med.id})">
          Borrar
        </button>
      </div>
    `;

  lista.appendChild(div);
}

/* =========================
   CARGA PRINCIPAL
========================= */

async function cargarMedicamentos() {
  const response = await fetch('/api/medicamentos');

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
}

async function toggleTomado(id) {
  await fetch(
    `/api/medicamentos/${id}/tomar`,
    {
      method: 'POST'
    }
  );

  cargarMedicamentos();
}

async function borrarMedicamento(id) {
  const confirmar = confirm(
    '¿Borrar medicamento?'
  );

  if (!confirmar) {
    return;
  }

  await fetch(`/api/medicamentos/${id}`, {
    method: 'DELETE'
  });

  mostrarToast('Medicamento borrado');

  cargarMedicamentos();
}

function editarMedicamento(id) {
  editingId = id;

  cargarMedicamentos();
}

function cancelarEdicion() {
  editingId = null;

  cargarMedicamentos();
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

  mostrarToast('Medicamento actualizado');

  cargarMedicamentos();
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

actualizarFecha();

cargarMedicamentos();