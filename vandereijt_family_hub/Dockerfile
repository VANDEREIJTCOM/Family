FROM python:3.13-alpine

ARG BUILD_VERSION
ARG BUILD_ARCH

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}"

WORKDIR /app
RUN pip install --no-cache-dir websocket-client==1.8.0
COPY app.py ha_access.py family_progress.py progress_bridge.py reward_images.py /app/
COPY static /app/static
COPY family-hub-card.js /app/family-hub-card.js
COPY runtime_patch_0_12_2.py /app/runtime_patch_0_12_2.py
COPY runtime_patch_0_12_3.py /app/runtime_patch_0_12_3.py
COPY runtime_patch_0_12_4.py /app/runtime_patch_0_12_4.py
COPY runtime_patch_0_13_0.py /app/runtime_patch_0_13_0.py
COPY hub-activities.js hub-pictograms.js hub-completion.js hub-stars.js hub-celebrations.js hub-displays.js hub-calendar.js hub-tasks.js hub-updates.js hub-entry.js hub-reachability.js hub-navigation.js progress-card.js ha-context.js ha-theme.css ha-view-layout.js ha-task-actions.js ha-scroll-state.js /app/
COPY hub-activity-filter.js /app/

# Apply the previous runtime migrations plus shared Home Assistant calendars,
# then bind every generated runtime asset to the Home Assistant BUILD_VERSION.
RUN BUILD_VERSION="${BUILD_VERSION}" python /app/runtime_patch_0_13_0.py \
 && rm /app/runtime_patch_0_12_2.py /app/runtime_patch_0_12_3.py /app/runtime_patch_0_12_4.py /app/runtime_patch_0_13_0.py

EXPOSE 8099
CMD ["python", "-u", "/app/app.py"]
