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
COPY runtime_patch_0_12_2.py /app/runtime_patch_0_12_2.py

# The repository keeps the last stable source assets. During the App build this
# patch applies the 0.12.1 mobile fixes plus the 0.12.2 approval centre and
# binds every runtime asset to the Home Assistant BUILD_VERSION.
RUN BUILD_VERSION="${BUILD_VERSION}" python /app/runtime_patch_0_12_2.py \
 && rm /app/runtime_patch_0_12_2.py

EXPOSE 8099
CMD ["python", "-u", "/app/app.py"]
