# ---------------------------------------------------------------------------
#  Bharat Yatra — container image
#  Works as-is on Render, Railway, Koyeb, Fly.io and Google Cloud Run.
#  No Maven, no Gradle: one javac call, because the project has no dependencies.
# ---------------------------------------------------------------------------
FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# copy the project (see .dockerignore for what is left out)
COPY . .

# compile every Java source file into ./classes
RUN mkdir -p classes && \
    javac -encoding UTF-8 -d classes src/main/java/in/bharatyatra/*.java && \
    mkdir -p data

# The app reads $PORT and binds 0.0.0.0, which is what every PaaS requires.
# Render/Railway inject their own PORT; this is only the local default.
ENV PORT=8080
EXPOSE 8080

# small heap so it is comfortable inside a 512 MB free instance
ENV JAVA_TOOL_OPTIONS="-Xmx256m -Xms64m"

CMD ["java", "-cp", "classes", "in.bharatyatra.App"]
