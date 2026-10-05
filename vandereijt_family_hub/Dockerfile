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

# Keep the runtime version equal to the Home Assistant build version and apply
# the 0.12.1 mobile CSS hotfix. 0.12.0 accidentally contained `.modal{.modal{`,
# which made modern WebViews nest all following interactive/responsive CSS
# underneath the modal selector. That caused native grey button blocks and
# prevented the one-column phone layout from becoming active.
RUN sed -i -E "s/APP_VERSION = \"[^\"]+\"/APP_VERSION = \"${BUILD_VERSION}\"/" /app/app.py \
 && sed -i -E "s/const FH_VERSION=\"[^\"]+\";/const FH_VERSION=\"${BUILD_VERSION}\";/" /app/family-hub-card.js \
 && sed -i 's/\.modal{\.modal{width/.modal{width/' /app/family-hub-card.js \
 && sed -i 's/@media(max-width:800px){/@media(max-width:800px), (orientation:portrait) and (max-width:1200px){/' /app/family-hub-card.js \
 && sed -i 's/ha-card{height:/button{-webkit-appearance:none;appearance:none;font-family:inherit}ha-card{height:/' /app/family-hub-card.js

EXPOSE 8099
CMD ["python", "-u", "/app/app.py"]
