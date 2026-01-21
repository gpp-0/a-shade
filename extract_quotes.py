import os
import mysql.connector
from dotenv import load_dotenv
from mysql.connector.abstracts import MySQLConnectionAbstract
from mysql.connector.pooling import PooledMySQLConnection


def import_strings(from_path: str, to_path: str):
    with open(from_path, encoding="utf8") as in_file, open(to_path, "w") as out_file:
        iterator = iter(in_file)
        while True:
            try:
                line = next(iterator)
            except StopIteration:
                break
            if line.startswith("      Languages:"):
                quote = next(iterator)
                _ = out_file.write(quote.strip().replace("\\n", "\n") + "\n\n")


def transform_strings(from_path: str, to_path: str):
    with open(from_path, encoding="utf8") as in_file, open(to_path, "w") as out_file:
        for line in in_file:
            if line.startswith("- "):
                out_file.write("\n" + line.removeprefix("- ").strip())
            else:
                out_file.write("\\n" + line.strip())


load_dotenv()

db = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=os.getenv("DB_DATABASE", "database"),
    username=os.getenv("DB_USERNAME", "username"),
    password=os.getenv("DB_PASSWORD", "password"),
)

BATCH_SIZE = 50


def upload_to_db(path: str, db: PooledMySQLConnection | MySQLConnectionAbstract):
    with open(path, encoding="utf8") as file:
        cursor = db.cursor(prepared=True)

        def process(lines: list[str]):
            cursor.executemany(
                "INSERT INTO quotes(text) VALUES (%s)",
                [(x.strip(),) for x in lines],
            )

        batch: list[str] = []
        db.start_transaction()
        for line in file:
            batch.append(line)
            if len(batch) >= BATCH_SIZE:
                process(batch)
                batch = []
        process(batch)
        db.commit()
