import os
from celery import Celery
celery_app=Celery(
  "document_ingestion",
   broker=os.environ["CELERY_BROKER_URL"],
   include=["ingestion.task"],
)
celery_app.conf.update(
    task_default_queue="ingestion",
    task_serializer="json",
    accept_content=["json"],
    task_ignore_result=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    enable_utc=True,
    timezone="UTC",
    broker_connection_timeout=5,
    broker_transport_options={
        "socket_connect_timeout": 5,
        "socket_timeout": 5,
    },
)