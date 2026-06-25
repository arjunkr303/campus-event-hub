from fastapi import FastAPI
from sqlmodel import SQLModel, create_engine
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("POSTGRESQL_URL")
engine = create_engine(DATABASE_URL, echo=True)


def create_engine_and_table():
    SQLModel.metadata.create_all(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_engine_and_table()
    yield
