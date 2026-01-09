# build_exe.ps1
# Usage: Open PowerShell in project root and run:
#   .\scripts\build_exe.ps1

param(
    [string]$Entry = "scripts\vcf_maker_gui.py",
    [string]$Name = "vcf_maker_gui"
)

Write-Host "Ensuring PyInstaller is installed..."
python -m pip install --upgrade pip setuptools wheel | Write-Host
python -m pip install pyinstaller | Write-Host

# Build single-file windowed executable.
# --add-data: include vcf_maker.py next to the exe in the bundle (Windows uses ';' separator)
$addData = "scripts\vcf_maker.py;."

Write-Host "Running PyInstaller..."
pyinstaller --noconfirm --onefile --windowed --name $Name --add-data $addData $Entry

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build succeeded. Output in dist\$Name.exe"
} else {
    Write-Host "Build failed with exit code $LASTEXITCODE"
}
