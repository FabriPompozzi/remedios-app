const Database = require('better-sqlite3');

const db = new Database('./data/remedios.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS medicamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    horario TEXT NOT NULL,
    dosis TEXT NOT NULL DEFAULT '',
    dias TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6'
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tomas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicamento_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,

    UNIQUE(medicamento_id, fecha)
  )
`);

module.exports = db;