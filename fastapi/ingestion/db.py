import os

import psycopg
from psycopg.rows import dict_row


def connect_db():
    return psycopg.connect(
        os.environ["DATABASE_URL"],
        row_factory=dict_row,
        connect_timeout=5,
        options=(
            "-c timezone=UTC "
            "-c statement_timeout=10000 "
            "-c lock_timeout=3000"
        ),
    )