npm run dist
New-Item -Path .\build\stage
New-Item -Path .\build\package
Copy-Item -Path .\dist\*.exe -Destination .\build\stage -Force
Copy-Item -Path .\config.toml -Destination .\build\stage -Force
$compress = @{
  Path = ".\build\stage\*"
  DestinationPath = ".\build\package\SNESControlPanel_Win64.zip"
}
Compress-Archive @compress -Force
