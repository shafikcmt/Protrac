# ProTrac Backend

A Django REST API backend for ProTrac.

## Features

-   **Django REST Framework:** RESTful API with comprehensive serialization and validation
-   **JWT Authentication:** Secure token-based authentication using SimpleJWT
-   **Django Unfold:** Modern and intuitive admin interface
-   **OpenAPI Documentation:** Auto-generated API documentation with drf-spectacular
-   **PostgreSQL Support:** Production-ready database configuration
-   **Image Processing:** Advanced image handling with Pillow and AVIF support

## Requirements

-   Python 3.12 or higher
-   Django 5.2 or higher
-   PostgreSQL (recommended for production)
-   Poetry for dependency management

## Project Structure

```
protrac-backend/
├── core/                   # Django project configuration
│   ├── settings.py
│   ├── urls.py
│   └── ...
├── accounts/               # User authentication and profiles
│   └── ...
├── common/                 # Shared utilities and base classes
│   └── ...
├── tracking/               # Project tracking functionality
│   └── ...
├── .env.example
├── Dockerfile
├── manage.py
├── pyproject.toml
└── README.md
```

## Setup Instructions

### Using Poetry (Recommended)

1. **Install Poetry**: Follow the instructions on the [Poetry website](https://python-poetry.org/docs/#installation).

2. **Clone the Repository**:

    ```bash
    git clone <repository-url> protrac-backend
    cd protrac-backend
    ```

3. **Install Dependencies**:

    ```bash
    poetry install
    ```

4. **Activate the Virtual Environment**:

    ```bash
    poetry env activate
    ```

5. **Configure Environment Variables**:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` with your database credentials and other settings.

6. **Run Database Migrations**:

    ```bash
    python manage.py migrate
    ```

7. **Create a Superuser**:

    ```bash
    python manage.py createsuperuser
    ```

8. **Start the Development Server**:
    ```bash
    python manage.py runserver
    ```

### Using pip and venv

1. **Clone the Repository**:

    ```bash
    git clone <repository-url> protrac-backend
    cd protrac-backend
    ```

2. **Create and Activate Virtual Environment**:

    ```bash
    python -m venv .venv
    # On Windows
    .venv\Scripts\activate
    # On macOS/Linux
    source .venv/bin/activate
    ```

3. **Install Dependencies**:

    ```bash
    pip install -r requirements.txt
    ```

4. **Configure Environment Variables**:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` with your database credentials and other settings.

5. **Run Database Migrations**:

    ```bash
    python manage.py migrate
    ```

6. **Create a Superuser**:

    ```bash
    python manage.py createsuperuser
    ```

7. **Start the Development Server**:
    ```bash
    python manage.py runserver
    ```

## Testing

Run the test suite:

```bash
python -m pytest -v
```

## Docker Support

Build and run with Docker:

```bash
docker build -t protrac-backend .
docker run -p 8000:8000 protrac-backend
```

## Development

The project uses:

-   **Django Unfold** for admin interface styling
-   **DRF Spectacular** for OpenAPI documentation
-   **Pillow** with AVIF support for image processing
-   **PostgreSQL** as the primary database
-   **pytest** and **factory-boy** for testing

For development, ensure you have the environment variables configured in `.env` and run migrations before starting the server.
