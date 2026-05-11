const express = require('express');
const path = require('path');

const db = require('./database');

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/medicamentos', (req, res) => {
  const hoy = new Date().toLocaleDateString('sv-SE');
  const diaSemana = new Date().getDay();

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
  `).all(hoy, `%${diaSemana}%`);

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

  const hoy = new Date().toLocaleDateString('sv-SE');

  const existe = db.prepare(`
    SELECT * FROM tomas
    WHERE medicamento_id = ?
    AND fecha = ?
  `).get(medicamentoId, hoy);

  if (existe) {
    db.prepare(`
      DELETE FROM tomas
      WHERE medicamento_id = ?
      AND fecha = ?
    `).run(medicamentoId, hoy);

    return res.json({
      tomado: false
    });
  }

  db.prepare(`
    INSERT INTO tomas (medicamento_id, fecha)
    VALUES (?, ?)
  `).run(medicamentoId, hoy);

  res.json({
    tomado: true
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