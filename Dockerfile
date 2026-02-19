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

RUN npm run build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Install Python + PlatformIO for direct-mode firmware builds
RUN apk add --no-cache python3 py3-pip && \
    python3 -m pip install --break-system-packages platformio && \
    platformio platform install atmelavr

# Pre-install common Arduino libraries (matches Dockerfile.sandbox)
RUN platformio pkg install -g \
      --library "arduino-libraries/Servo@^1.2.1" \
      --library "adafruit/DHT sensor library@^1.4.6" \
      --library "adafruit/Adafruit Unified Sensor@^1.1.14" \
      --library "bblanchon/ArduinoJson" \
      --library "adafruit/Adafruit NeoPixel" \
      --library "adafruit/Adafruit SSD1306" \
      --library "adafruit/Adafruit GFX Library" \
      --library "fastled/FastLED" \
      --library "olikraus/U8g2" \
      --library "arduino-libraries/LiquidCrystal" \
      --library "marcoschwartz/LiquidCrystal_I2C" \
      --library "paulstoffregen/Encoder" \
      --library "br3ttb/Arduino-PID-Library" \
      --library "mathertel/OneButton" \
      --library "thomasfredericks/Bounce2" \
      --library "arduino-libraries/SD" \
      --library "paulstoffregen/OneWire" \
      --library "milesburton/DallasTemperature" \
      --library "adafruit/Adafruit MPU6050" \
      --library "Arduino-IRremote/Arduino-IRremote" \
      --library "chris--a/Keypad" \
      --library "waspinator/AccelStepper" \
      --library "adafruit/RTClib" \
      --library "paulstoffregen/TimerOne" \
      --library "paulstoffregen/Time" \
      --library "DeanIsMe/SevSeg" \
      --library "wayoda/LedControl" \
      --library "majicdesigns/MD_MAX72XX" \
      --library "majicdesigns/MD_Parola" \
      --library "adafruit/Adafruit BMP085 Library"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drizzle config + migrations (needed for drizzle-kit push at deploy time)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/lib/db ./lib/db
COPY --from=deps /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
