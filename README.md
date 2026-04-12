# reto-bot

Bot de retos para Discord con flujo de desafios competitivo y persistencia en PostgreSQL.

## Requisitos

- Node.js 18 o superior
- Token de bot de Discord
- Base de datos PostgreSQL

## Instalacion

1. Instala dependencias:

	npm install

2. Crea un archivo .env en la raiz tomando como base .env.example.

3. Inicia el bot:

	npm start

## Estructura recomendada

src/
- app.js
- config.js
- db.js
- commands.js
- equiposRepository.js
- interactionHandler.js

Esta separacion deja el codigo listo para escalar y facilita mantenimiento en GitHub/Railway.

## Variables de entorno (.env)

	TOKEN=tu_token_de_discord
	CLIENT_ID=tu_client_id
	GUILD_ID=tu_guild_id
	DATABASE_URL=postgresql://usuario:password@host:5432/base

## Base de datos

Al iniciar, el bot ejecuta una inicializacion de esquema:

- Crea la tabla equipos solo si no existe usando CREATE TABLE IF NOT EXISTS.
- Si existe equipos.json y tiene datos, intenta migrarlos a la tabla sin duplicar IDs.

Tabla creada automaticamente:

- equipos(id BIGINT PRIMARY KEY, nombre TEXT, emoji TEXT, rol TEXT, created_at TIMESTAMP)

## Comandos

- /registrar_equipo nombre emoji rol
- /reto usuario