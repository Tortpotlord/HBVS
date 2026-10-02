@echo off
echo Starting HBVS Server + ADB Reverse...
start cmd /k "npx http-server . -p 8080 -c-1 --cors"
timeout /t 3
C:\platform-tools\adb devices
C:\platform-tools\adb -s feb9d8b0 reverse tcp:8080 tcp:8080
C:\platform-tools\adb -s 162594564M000021 reverse tcp:8080 tcp:8080
C:\platform-tools\adb -s W8T4IZCASC4PZ5DQ reverse tcp:8080 tcp:8080
echo.
echo DONE! Open on phone:
echo http://localhost:8080/index.html?v=782002
echo http://localhost:8080/bible.html?v=782002
pause