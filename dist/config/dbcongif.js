import oracledb from 'oracledb';

const dbConfig = {
  user: 'USUARIO DE LA BASE DE DATOS',
  password: 'CONTRASENA DE LA BASE DE DATOS',
  connectString: 'localhost:*PUERTO*/*RUTA*',
};

oracledb.createPool(dbConfig);

export default oracledb;