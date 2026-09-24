FROM python:3.13-alpine

ARG BUILD_VERSION
ARG BUILD_ARCH

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}"

WORKDIR /app
RUN pip install --no-cache-dir websocket-client==1.8.0
COPY app.py /app/app.py
COPY static /app/static
COPY family-hub-card.js /app/family-hub-card.js

EXPOSE 8099
CMD ["python", "-u", "/app/app.py"]
