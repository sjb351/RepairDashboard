FROM python:3.12-slim
COPY ./requirements.txt /requirements.txt
ADD . /app/
WORKDIR /app
RUN pip install -r /requirements.txt && rm -f /requirements.txt


