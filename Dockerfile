# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build Next.js ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ vars are baked into the JS bundle at build time
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Dummy env vars so Next.js build doesn't fail on missing runtime config
ENV DATABASE_URL=postgresql://x:x@localhost:5432/x
ENV MINIO_ENDPOINT=localhost
ENV MINIO_PORT=9000
ENV MINIO_ACCESS_KEY=build-placeholder
ENV MINIO_SECRET_KEY=build-placeholder
ENV MINIO_BUCKET=sparkbench
ENV MINIO_USE_SSL=false
ENV BETTER_AUTH_SECRET=build-placeholder
ENV BETTER_AUTH_URL=http://localhost:3000
ENV ANTHROPIC_API_KEY=build-placeholder

RUN npm run build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Use a shared PlatformIO directory accessible by all users
ENV PLATFORMIO_CORE_DIR=/opt/platformio

# Install Python + PlatformIO for direct-mode firmware builds
# gcompat needed for glibc-linked AVR toolchain binaries on Alpine
RUN apk add --no-cache python3 py3-pip gcompat libstdc++ && \
    python3 -m pip install --break-system-packages platformio && \
    platformio platform install atmelavr

# Pre-install common Arduino libraries (matches Dockerfile.sandbox)
# Install each individually so one missing package doesn't block the rest
RUN for lib in \
      "arduino-libraries/Servo@^1.2.1" \
      "adafruit/DHT sensor library@^1.4.6" \
      "adafruit/Adafruit Unified Sensor@^1.1.14" \
      "bblanchon/ArduinoJson" \
      "adafruit/Adafruit NeoPixel" \
      "adafruit/Adafruit SSD1306" \
      "adafruit/Adafruit GFX Library" \
      "fastled/FastLED" \
      "olikraus/U8g2" \
      "arduino-libraries/LiquidCrystal" \
      "marcoschwartz/LiquidCrystal_I2C" \
      "paulstoffregen/Encoder" \
      "mathertel/OneButton" \
      "thomasfredericks/Bounce2" \
      "arduino-libraries/SD" \
      "paulstoffregen/OneWire" \
      "milesburton/DallasTemperature" \
      "adafruit/Adafruit MPU6050" \
      "crankyoldgit/IRremoteESP8266" \
      "chris--a/Keypad" \
      "waspinator/AccelStepper" \
      "adafruit/RTClib" \
      "paulstoffregen/TimerOne" \
      "paulstoffregen/Time" \
      "DeanIsMe/SevSeg" \
      "wayoda/LedControl" \
      "majicdesigns/MD_MAX72XX" \
      "majicdesigns/MD_Parola" \
      "adafruit/Adafruit BMP085 Library"; \
    do platformio pkg install -g --library "$lib" || echo "WARN: failed to install $lib"; \
    done

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Make PlatformIO dir writable by nextjs user
RUN chown -R nextjs:nodejs /opt/platformio

# Copy built assets from builder (public dir may not exist)
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drizzle config + migrations (needed for drizzle-kit push at deploy time)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/lib/db ./lib/db
COPY --from=deps /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=deps /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=deps /app/node_modules/.bin/drizzle-kit ./node_modules/.bin/drizzle-kit

# Claude Agent SDK (Sparky AI agent runtime)
COPY --from=deps /app/node_modules/@anthropic-ai ./node_modules/@anthropic-ai

# Install Claude Code CLI (required by the Agent SDK to spawn claude subprocess)
RUN npm install -g @anthropic-ai/claude-code

ENV PATH="/app/node_modules/.bin:$PATH"

# Entrypoint sets up Claude Code credentials at runtime
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

CMD ["sh", "./docker-entrypoint.sh"]
