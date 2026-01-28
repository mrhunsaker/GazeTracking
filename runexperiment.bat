@echo off
rem Windows batch wrapper for GazeTracking experiment runner
rem Mirrors basic behavior of runexperiment.sh: run sanity check and unit tests if Node.js is available

setlocal enabledelayedexpansion
set PORT=8888

rem Simple args parsing: -p <port>
if "%1"=="-p" (
  if not "%2"=="" set PORT=%2
)

echo [runexperiment.bat] Root: %~dp0

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  echo [runexperiment.bat] Running sanity check (node)...
  if exist "%~dp0StudentFolders\Experiment\sanity_check_shapes.js" (
    node "%~dp0StudentFolders\Experiment\sanity_check_shapes.js"
  ) else (
    echo [runexperiment.bat] Sanity-check script not found; skipping.
  )
) else (
  echo [runexperiment.bat] node not found; skipping sanity check. Install Node.js to run checks.
)

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  if exist "%~dp0tests\run_unit_tests.js" (
    echo [runexperiment.bat] Running unit tests...
    node "%~dp0tests\run_unit_tests.js"
  ) else (
    echo [runexperiment.bat] No unit tests script found at tests\run_unit_tests.js
  )
)

echo [runexperiment.bat] Done. To start the experiment UI, you can run the bundled Node HTTPS server which serves static files and the API.
echo Example (from project root): npm install && npm run serve-with-api-https
echo If you prefer http-server with certs: npm install -g http-server && npx http-server -S -C cert.pem -K key.pem -p %PORT% "StudentFolders\Experiment\Experiment"

endlocal
