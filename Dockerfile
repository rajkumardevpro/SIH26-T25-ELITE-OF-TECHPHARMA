# ---------------------------------------------------------------------------
#  Bharat Yatra — container image  (multi-stage: build with the JDK, ship a JRE)
#
#  Small image  ->  faster cold start  ->  fewer 502 / "hibernate-wake-error"
#  responses on free hosting tiers.
#  Works as-is on Render, Railway, Koyeb, Fly.io and Google Cloud Run.
# ---------------------------------------------------------------------------

# ---------- stage 1: compile ----------
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /src
COPY . .
RUN mkdir -p classes && \
    javac -encoding UTF-8 -d classes src/main/java/in/bharatyatra/*.java

# ---------- stage 2: run ----------
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=build /src/classes                        ./classes
COPY --from=build /src/src/main/resources/static      ./src/main/resources/static
COPY --from=build /src/data                           ./data

# The app reads $PORT and binds 0.0.0.0 — what every PaaS requires.
ENV PORT=8080
EXPOSE 8080

# Lean settings for a 512 MB free instance, tuned for fast startup
ENV JAVA_TOOL_OPTIONS="-Xmx200m -Xms48m -XX:MaxMetaspaceSize=96m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"

# Optional: set KEEPALIVE_URL to your public /api/health so the instance
# never hibernates. See FIX-502.md.

CMD ["java", "-cp", "classes", "in.bharatyatra.App"]
