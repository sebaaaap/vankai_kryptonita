# Dockerfile para Backend (FastAPI)
FROM python:3.11-slim as builder

WORKDIR /app

# Instalar dependencias de compilación si son necesarias
RUN apt-get update && apt-get install -y gcc

# Copiar dependencias
COPY pyproject.toml poetry.lock* ./

# Instalar dependencias usando pip (generando requirements a partir de poetry o directo)
# Aquí usamos un truco simple para no obligar a usar poetry en el contenedor si no queremos
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-dev --no-interaction --no-ansi

# Etapa final
FROM python:3.11-slim

WORKDIR /app

# Copiar librerías instaladas desde el builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copiar código fuente
COPY ./app ./app
COPY ./alembic ./alembic
COPY ./alembic.ini .
COPY ./run.py .

# Variables de entorno por defecto (serán sobrescritas por docker-compose)
ENV DEPLOYMENT_MODE="SERVER"
ENV DATABASE_URL="postgresql://user:pass@db:5432/pos_db"

# Exponer puerto
EXPOSE 8000

# Comando de inicio: Migraciones + Servidor
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
