FROM python:3.13-alpine

WORKDIR /app

# Install system dependencies
RUN apk update && apk add --no-cache \
  build-base \
  postgresql-dev \
  curl

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Explicitly install gunicorn and psycopg2-binary
RUN pip install gunicorn psycopg2-binary

# Copy application code
COPY . .

# Set build-time environment variables for collectstatic
ENV SECRET_KEY=build-time-secret-key \
  DEBUG=False \
  ALLOWED_HOSTS=* \
  DATABASE_URL=sqlite:///tmp/build.db

# Collect static files
RUN python manage.py collectstatic --noinput

# Set permissions and create non-root user
RUN adduser -D -u 1000 app && chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 8080

# Run Gunicorn server
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "3", "core.wsgi:application"]