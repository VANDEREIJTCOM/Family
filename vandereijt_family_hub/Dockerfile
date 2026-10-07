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
COPY runtime_patch_0_12_3.py /app/runtime_patch_0_12_3.py
COPY runtime_patch_0_12_4.py /app/runtime_patch_0_12_4.py

# Apply the previous runtime migrations plus shared Home Assistant calendars,
# then bind every generated runtime asset to the Home Assistant BUILD_VERSION.
RUN BUILD_VERSION="${BUILD_VERSION}" python /app/runtime_patch_0_12_4.py \
 && rm /app/runtime_patch_0_12_2.py /app/runtime_patch_0_12_3.py /app/runtime_patch_0_12_4.py

EXPOSE 8099
CMD ["python", "-u", "/app/app.py"]
