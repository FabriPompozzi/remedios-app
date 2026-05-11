const express = require('express');
const path = require('path');

const db = require('./database');

const app = express();

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

function getTodayInTimeZone() {
  const today = new Date();

  const dateStr = today.toLocaleDateString(
    'sv-SE',
    { timeZone: TIME_ZONE }
  );

  const day = new Date(
    `${dateStr}T00:00:00Z`
  ).getUTCDay();

  return {
    dateStr,
    day
  };
}

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/medicamentos', (req, res) => {
  const { dateStr, day } = getTodayInTimeZone();

  const medicamentos = db.prepare(`
    SELECT
      m.id,
      m.nombre,
      m.horario,
      m.dosis,
      m.dias,

      CASE
        WHEN t.id IS NOT NULL THEN 1
        ELSE 0
      END AS tomado

    FROM medicamentos m

    LEFT JOIN tomas t
      ON t.medicamento_id = m.id
      AND t.fecha = ?

    WHERE m.dias IS NOT NULL
    AND m.dias LIKE ?

    ORDER BY m.horario
  `).all(dateStr, `%${day}%`);

  res.json(medicamentos);
});

app.get('/api/medicamentos/todos', (req, res) => {
  const { dateStr } = getTodayInTimeZone();

  const medicamentos = db.prepare(`
    SELECT
      m.id,
      m.nombre,
      m.horario,
      m.dosis,
      m.dias,

      CASE
        WHEN t.id IS NOT NULL THEN 1
        ELSE 0
      END AS tomado

    FROM medicamentos m

    LEFT JOIN tomas t
      ON t.medicamento_id = m.id
      AND t.fecha = ?

    ORDER BY m.horario
  `).all(dateStr);

  res.json(medicamentos);
});

app.post('/api/medicamentos', (req, res) => {
    try {
      const { nombre, horario, dosis, dias } = req.body;

      const result = db
        .prepare(`
          INSERT INTO medicamentos (nombre, horario, dosis, dias)
          VALUES (?, ?, ?, ?)
        `)
        .run(nombre, horario, dosis, dias);

      res.json({
        id: result.lastInsertRowid,
        nombre,
        horario,
        dosis,
        dias
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: error.message
      });
    }
  });

app.post('/api/medicamentos/:id/tomar', (req, res) => {
  const medicamentoId = req.params.id;

  const { dateStr } = getTodayInTimeZone();

  const existe = db.prepare(`
    SELECT * FROM tomas
    WHERE medicamento_id = ?
    AND fecha = ?
  `).get(medicamentoId, dateStr);

  if (existe) {
    return res.json({
      tomado: true,
      yaRegistrado: true
    });
  }

  db.prepare(`
    INSERT INTO tomas (medicamento_id, fecha)
    VALUES (?, ?)
  `).run(medicamentoId, dateStr);

  res.json({
    tomado: true,
    yaRegistrado: false
  });
});

app.delete('/api/medicamentos/:id', (req, res) => {
  const medicamentoId = req.params.id;

  db.prepare(`
    DELETE FROM tomas
    WHERE medicamento_id = ?
  `).run(medicamentoId);

  db.prepare(`
    DELETE FROM medicamentos
    WHERE id = ?
  `).run(medicamentoId);

  res.json({
    ok: true
  });
});

app.put('/api/medicamentos/:id', (req, res) => {
  const medicamentoId = req.params.id;

  const {
    nombre,
    horario,
    dosis,
    dias
  } = req.body;

  db.prepare(`
    UPDATE medicamentos
    SET nombre = ?, horario = ?, dosis = ?, dias = ?
    WHERE id = ?
  `).run(nombre, horario, dosis, dias, medicamentoId);

  res.json({
    ok: true
  });
});

app.get('/api/historial', (req, res) => {
  const historial = db.prepare(`
    SELECT
      t.fecha,
      m.nombre,
      m.horario
    FROM tomas t
    JOIN medicamentos m
      ON m.id = t.medicamento_id
    ORDER BY t.fecha DESC
  `).all();

  res.json(historial);
});

app.delete('/api/historial', (req, res) => {
  db.prepare(`
    DELETE FROM tomas
  `).run();

  res.json({
    ok: true
  });
});

//todo, sacar cuando haga el commit final
try {
  db.prepare(`
    ALTER TABLE medicamentos
    ADD COLUMN dias TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6'
  `).run();

  console.log('Columna dias agregada');
} catch (error) {
  console.log('La columna dias ya existe');
}
//todo idem anterior
try {
  db.prepare(`
    ALTER TABLE medicamentos
    ADD COLUMN dosis TEXT NOT NULL DEFAULT ''
  `).run();

  console.log('Columna dosis agregada');
} catch (error) {
  console.log('La columna dosis ya existe');
}


app.listen(3000, '0.0.0.0', () => {
  console.log('Servidor escuchando en puerto 3000');
});