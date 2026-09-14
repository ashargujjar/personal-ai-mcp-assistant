import hashlib
import logging
import os
import time
from typing import BinaryIO

import httpx
from cloudinary.utils import private_download_url
from celery.utils.log import get_task_logger


logger = get_task_logger(__name__)
# HTTPX's INFO request logs include the signed URL's query string.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


class SourceError(Exception):
    def __init__(self, code: str, message: str, retryable: bool):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


def verify_source(
    source: dict,
    *,
    job_id: str | None = None,
    destination: BinaryIO | None = None,
) -> None:
    started = time.monotonic()
    cloud = (
        os.getenv("CLOUDINARY_CLOUD_NAME")
        or os.getenv("CLOUDINARY_NAME")
    )
    key = (
        os.getenv("CLOUDINARY_API_KEY")
        or os.getenv("CLOUDINARY_API")
    )
    secret = (
        os.getenv("CLOUDINARY_API_SECRET")
        or os.getenv("CLOUDINARY_SECRET")
    )

    if not all((cloud, key, secret)):
        raise SourceError(
            "STORAGE_CONFIG",
            "Storage credentials are missing",
            False,
        )

    expected_size = source["file_size"]

    if not 0 < expected_size <= 20 * 1024 * 1024:
        raise SourceError(
            "INVALID_SIZE",
            "Stored file size is outside the supported range",
            False,
        )

    url = private_download_url(
        source["storage_key"],
        "pdf",
        cloud_name=cloud,
        api_key=key,
        api_secret=secret,
        resource_type="raw",
        type="authenticated",
        expires_at=int(time.time()) + 60,
        secure=True,
    )

    digest = hashlib.sha256()
    received = 0
    header = b""
    deadline = time.monotonic() + 120
    next_progress = 25
    logger.info(
        "source_download_started job=%s expected_bytes=%s budget_seconds=120",
        job_id, expected_size,
    )

    try:
        with httpx.Client(
            timeout=httpx.Timeout(15.0, connect=5.0),
            follow_redirects=True,
        ) as client:
            with client.stream("GET", url) as response:
                logger.info(
                    "source_http_response job=%s status=%s",
                    job_id, response.status_code,
                )
                if response.status_code != 200:
                    retryable = (
                        response.status_code in (408, 429)
                        or response.status_code >= 500
                    )
                    raise SourceError(
                        "STORAGE_HTTP",
                        f"Storage returned HTTP {response.status_code}",
                        retryable,
                    )

                for block in response.iter_bytes(chunk_size=65536):
                    if time.monotonic() > deadline:
                        raise SourceError(
                            "SOURCE_TIMEOUT",
                            "Source download exceeded its time budget",
                            True,
                        )

                    received += len(block)

                    if received > expected_size:
                        raise SourceError(
                            "SIZE_MISMATCH",
                            "Downloaded file exceeds its recorded size",
                            False,
                        )

                    if len(header) < 5:
                        header += block[:5 - len(header)]

                    digest.update(block)
                    if destination is not None:
                        destination.write(block)

                    percent = received * 100 // expected_size
                    if percent >= next_progress:
                        logger.info(
                            "source_download_progress job=%s bytes=%s/%s percent=%s",
                            job_id, received, expected_size, percent,
                        )
                        next_progress = (percent // 25 + 1) * 25

    except httpx.RequestError:
        raise SourceError(
            "SOURCE_NETWORK",
            "Source download failed at the network layer",
            True,
        ) from None

    if received != expected_size:
        raise SourceError(
            "SIZE_MISMATCH",
            "Downloaded size differs from the recorded size",
            False,
        )

    if header != b"%PDF-":
        raise SourceError(
            "INVALID_PDF_HEADER",
            "Downloaded file does not have the expected PDF header",
            False,
        )

    if digest.hexdigest() != source["file_hash"]:
        raise SourceError(
            "HASH_MISMATCH",
            "Downloaded content differs from the uploaded content",
            False,
        )

    logger.info(
        "source_verified job=%s bytes=%s checks=size,pdf_header,sha256 elapsed_ms=%d",
        job_id, received, int((time.monotonic() - started) * 1000),
    )
