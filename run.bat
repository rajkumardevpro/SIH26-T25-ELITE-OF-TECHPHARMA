@echo off
cd /d %~dp0
if not exist classes mkdir classes
javac -encoding UTF-8 -d classes src\main\java\in\bharatyatra\App.java
java -cp classes in.bharatyatra.App %1
pause
