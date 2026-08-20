#!/usr/bin/env bash
# Bharat Yatra — build & run with nothing but a JDK installed.
set -e
cd "$(dirname "$0")"
mkdir -p classes
javac -encoding UTF-8 -d classes src/main/java/in/bharatyatra/App.java
java -cp classes in.bharatyatra.App "${1:-8080}"
