import os
import dj_database_url
from pathlib import Path
from logging import getLogger
from dotenv import load_dotenv
from datetime import timedelta
from common.unfold import UNFOLD_CONFIG
import os



# --- LOGGER ---
log = getLogger(__name__)

# --- BASE DIRECTORY ---
# Base directory to simplify path configurations
BASE_DIR = Path(__file__).resolve().parent.parent

# --- ENVIRONMENT VARIABLES ---
# Environment variables from the .env file
load_dotenv(BASE_DIR / ".env")

# --- SECRET KEY ---
# Secret key from the environment; generate a random one if not set
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "The SECRET_KEY environment variable is not set. Please set it in your .env file."
    )

# --- DEBUG ---
# Debug mode based on the environment variable
DEBUG = os.getenv("DEBUG", "False") == "True"
if DEBUG:
    log.warning("DEBUG mode is enabled; Not recommended for production!")

# --- ALLOWED HOSTS ---
# Allowed hosts for the application
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(",")

# --- APPLICATION DEFINITIONS ---
# Django default applications
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

# Third-party applications
UNFOLD_APPS = [
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "unfold.contrib.inlines",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "django_filters",
    "rest_framework",
    "drf_spectacular",
    "rest_framework_simplejwt",
]

# Local applications
LOCAL_APPS = ["accounts", "common", "tracking"]

# Combine all applications
INSTALLED_APPS = UNFOLD_APPS + DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# --- MIDDLEWARE ---
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# --- ROOT URL CONFIGURATION ---
ROOT_URLCONF = "core.urls"

# --- TEMPLATES ---
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- WSGI APPLICATION ---
WSGI_APPLICATION = "core.wsgi.application"

# --- STATIC AND MEDIA URLS ---
STATIC_URL = "static/"
MEDIA_URL = "media/"

# --- STATIC AND MEDIA ROOTS ---
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = BASE_DIR / "media"

# --- DATABASE CONFIGURATION ---
# Use SQLite if no database URL is provided
DATABASE_URL = os.getenv("DATABASE_URL")
if DEBUG and not DATABASE_URL:
    log.warning(
        "No DATABASE_URL set. Using SQLite for development. "
        "Not recommended for production!"
    )
    DATABASE_URL = "sqlite:///" + str(BASE_DIR / "db.sqlite3")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is required. Please set it in your .env file."
    )

DATABASES = {
    "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600),
}

# --- AUTH USER MODEL ---
AUTH_USER_MODEL = "accounts.User"

# --- AUTHENTICATION BACKENDS ---
AUTHENTICATION_BACKENDS = (
    "accounts.backends.EmailOrUsernameModelBackend",
    "django.contrib.auth.backends.ModelBackend",
)

# --- PASSWORD VALIDATORS ---
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# --- CORS CONFIGURATION ---
CORS_ALLOW_CREDENTIALS = True

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")

# Allow all origins via env var, or implicitly in DEBUG mode
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "False") == "True"

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    ALLOWED_HOSTS = ["*", "localhost", "127.0.0.1"]

if not CORS_ALLOW_ALL_ORIGINS and not CORS_ALLOWED_ORIGINS:
    raise ValueError(
        "CORS_ALLOWED_ORIGINS environment variable is required "
        "(unless CORS_ALLOW_ALL_ORIGINS=True). "
        "Please set it in your .env file."
    )

if not ALLOWED_HOSTS:
    raise ValueError(
        "ALLOWED_HOSTS environment variable is required. "
        "Please set it in your .env file."
    )

# --- INTERNATIONALIZATION ---
LANGUAGE_CODE = "en-us"
USE_I18N = True

# --- TIME ZONE ---
TIME_ZONE = "Asia/Dhaka"
USE_TZ = True

# --- DEFAULT AUTO FIELD ---
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- EMAIL CONFIGURATION ---
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if not DEBUG
    else "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = os.getenv("EMAIL_PORT", 587)
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")

# --- LOGGING CONFIGURATION ---
# Logging configuration for both development and production environments

# Ensure the logs directory exists
log_dir = BASE_DIR / "logs"
log_file_path = log_dir / "django.log"
os.makedirs(log_dir, exist_ok=True)

# Ensure the log file exists
if not log_file_path.exists():
    log_file_path.touch()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG" if DEBUG else "INFO",
            "class": "logging.StreamHandler",
            "formatter": "verbose" if DEBUG else "simple",
        },
        "file": {
            "level": "WARNING",
            "class": "logging.FileHandler",
            "filename": str(log_file_path),
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": "DEBUG" if DEBUG else "INFO",
    },
}

# --- UNFOLD CONFIGURATION ---
UNFOLD = UNFOLD_CONFIG

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100000,
}

# --- SIMPLE JWT CONFIGURATION ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_DAYS", 15))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 90))
    ),
}

# --- DRF SPECTACULAR CONFIGURATION ---
SPECTACULAR_SETTINGS = {
    "TITLE": "ProTrac API",
    "DESCRIPTION": "API documentation for ProTrac",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": "/api",
    "SWAGGER_UI_SETTINGS": {
        "filter": True,
        "docExpansion": "none",
        "defaultModelsExpandDepth": -1,
        "persistAuthorization": True,
        "defaultModelExpandDepth": 3,
        "tryItOutEnabled": True,
    },
}



print("✅ DATABASE_URL from ENV =", os.getenv("DATABASE_URL"))