REM filepath: /home/ryhunsaker/GitHubRepos/GazeTracking/runexperiment.bat
@echo off
:: Gaze Analysis Experiment Template
:: Copyright 2024-21-24 Michael Ryan Hunsaker, M.Ed., Ph.D.
::
:: Licensed under the Apache License, Version 2.0 (the "License");
:: you may not use this file except in compliance with the License.
:: You can obtain a copy of the License at
::
:: https://www.apache.org/licenses/LICENS
::
:: Unless required by applicable law or agreed to in writing, software
:: distributed under the License is distributed on an "AS IS" BASIS,
:: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
:: See the License for the specific language governing permissions and
:: limitations under the License.

:: ANSI color codes - Colorblind friendly palette
set CYAN=^[[36m
set ORANGE=^[[33m
set WHITE=^[[37m
set BOLD=^[[1m
set NC=^[[0m
set YELLOW=^[[33m
set PURPLE=^[[35m
set GREEN=^[[32m
set BLUE=^[[34m

:: Predefined student list
set STUDENTS=2025_Students Development_Student

:: Function to clear screen and display header
:display_header
cls
echo.
echo %CYAN%══════════════════════════════════════%NC%
echo %YELLOW%%BOLD%Student Page Launch Interface%NC%
echo %CYAN%══════════════════════════════════════%NC%
echo.
goto :eof

:: Function to display student menu
:display_student_menu
echo.
echo %YELLOW%%BOLD%Available Students:%NC%
echo.
echo %PURPLE%══════════════════════════════════════%NC%
echo.
for %%i in (%STUDENTS%) do (
    set /a count+=1
    echo %ORANGE%%%count%%%NC%. %WHITE%%%i%%%NC%
)
echo.
echo %PURPLE%══════════════════════════════════════%NC%
echo.
goto :eof

:: Function to get student choice
:get_student_choice
set /p choice=Enter student number %ORANGE%(1-2)%WHITE%: %NC%
if "%choice%"=="1" (
    set student_index=0
) else if "%choice%"=="2" (
    set student_index=1
) else (
    echo %ORANGE%Error: Please enter a valid number between 1 and 2%NC%
    goto :get_student_choice
)
goto :eof

:: Function to validate if a directory exists
:validate_directory
if not exist "%~1" (
    echo %ORANGE%Error: Directory '%~1' does not exist.%NC%
    exit /b 1
)
goto :eof

:: Function to validate if required files exist
:validate_files
if not exist "%~1\cert.pem" (
    echo %ORANGE%Error: Certificate files (cert.pem and key.pem) not found in %~1%NC%
    exit /b 1
)
if not exist "%~1\key.pem" (
    echo %ORANGE%Error: Certificate files (cert.pem and key.pem) not found in %~1%NC%
    exit /b 1
)
goto :eof

:: Function to validate if required programs are installed
:check_requirements
where http-server >nul 2>&1
if errorlevel 1 (
    echo %ORANGE%Error: http-server is not installed.%NC%
    echo %WHITE%Please install it using: %CYAN%npm install -g http-server%NC%
    exit /b 1
)

where msedge >nul 2>&1
if errorlevel 1 (
    where firefox >nul 2>&1
    if errorlevel 1 (
        echo %ORANGE%Error: Neither Microsoft Edge nor Firefox is installed.%NC%
        echo %WHITE%Please install one of these browsers using your system's package manager%NC%
        exit /b 1
    )
)
goto :eof

:: Function to launch browser
:launch_browser
set url=%~1
where msedge >nul 2>&1
if errorlevel 0 (
    set browser_cmd=msedge
) else (
    set browser_cmd=firefox
)

timeout /t 2 >nul

echo %WHITE%Launching %CYAN%%browser_cmd%%WHITE%...%NC%
start "" %browser_cmd% %url%
goto :eof

:: Function to start server and browser
:start_server_and_browser
set dir=%~1
set port=8080

echo %WHITE%Starting secure server...%NC%

pushd %dir%
start "" cmd /c "http-server -S -C ..\cert.pem -K ..\key.pem --loglevel=verbose -p %port%"
popd

set url=https://localhost:%port%

call :launch_browser %url%

echo %WHITE%Server is running at %CYAN%%url%%NC%
echo %ORANGE%Press Ctrl+C to stop the server%NC%

:wait_for_interrupt
timeout /t 1 >nul
goto wait_for_interrupt

:cleanup
echo %WHITE%Shutting down server...%NC%
taskkill /im http-server.exe /f >nul 2>&1
exit /b 0

:: Main script
call :display_header

:: Check for required programs
call :check_requirements

:: Get the base directory where student files are stored
set default_base_dir=.\StudentFolders
set /p base_dir=Enter the base directory path (press Enter for the default .\StudentFolders, which is correct in most cases): 
if "%base_dir%"=="" (
    set base_dir=%default_base_dir%
)

:: Validate the base directory
call :validate_directory %base_dir%
call :validate_files %base_dir%

:: Display student menu and get choice
call :display_student_menu
call :get_student_choice
set student_dir=%STUDENTS%
set full_path=%base_dir%\%student_dir%

:: Check if student directory exists
if not exist "%full_path%" (
    echo %ORANGE%Error: No directory found for student: %student_dir%%NC%
    echo %WHITE%Expected path: %CYAN%%full_path%%NC%
    exit /b 1
)

:: Check if index.html exists
if not exist "%full_path%\index.html" (
    echo %ORANGE%Error: No index.html found in student directory%NC%
    exit /b 1
)

:: Start server and launch browser
call :start_server_and_browser %full_path%
