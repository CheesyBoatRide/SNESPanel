yarn dist
New-Item -Path . -Name \bin\stage -ItemType "directory"  -Force
New-Item -Path . -Name .\bin\package -ItemType "directory"  -Force
Copy-Item -Path .\dist\*.exe -Destination .\bin\stage -Force
Copy-Item -Path .\config.toml -Destination .\bin\stage -Force
Copy-Item -Path .\config.toml -Destination .\dist\win-unpacked -Force
Copy-Item -Path .\README.md -Destination .\bin\stage -Force
Copy-Item -Path .\screenshot.png -Destination .\bin\stage -Force
Copy-Item -Path .\LICENSE -Destination .\bin\stage -Force
$compress = @{
  Path = ".\bin\stage\*"
  DestinationPath = ".\bin\package\SNESControlPanel_Win64.zip"
}
Compress-Archive @compress -Force
