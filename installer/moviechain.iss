#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{B7A3C4E5-8F12-4D9A-B6E7-1C3D5F7A9B2E}
AppName=Movie Chain
AppVersion={#AppVersion}
AppPublisher=cragjagged
AppPublisherURL=https://github.com/cragjagged/MovieChain
DefaultDirName={autopf}\MovieChain
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=MovieChain-Setup-{#AppVersion}
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
MinVersion=10.0
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Pre-built frontend
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: recursesubdirs createallsubdirs
; Server
Source: "..\server\*"; DestDir: "{app}\server"; Flags: recursesubdirs createallsubdirs
; Node.js dependencies (pre-installed, dev deps pruned)
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: recursesubdirs createallsubdirs
Source: "..\package.json"; DestDir: "{app}"
; Bundled portable Node.js runtime (downloaded by CI, not in repo)
Source: "node\*"; DestDir: "{app}\node"; Flags: recursesubdirs createallsubdirs
; NSSM service manager (downloaded by CI, not in repo)
Source: "nssm.exe"; DestDir: "{app}"
; Service scripts
Source: "setup-service.bat"; DestDir: "{app}"; Flags: deleteafterinstall
Source: "uninstall-service.bat"; DestDir: "{app}"

[Run]
Filename: "{app}\setup-service.bat"; Parameters: "{code:GetPort|} ""{code:GetDataDir|}"""; Flags: runhidden waituntilterminated; StatusMsg: "Installing service..."

[UninstallRun]
Filename: "{app}\uninstall-service.bat"; Flags: runhidden waituntilterminated; RunOnceId: "StopRemoveService"

[Code]
var
  OptionsPage: TInputQueryWizardPage;
  RemoveData: Boolean;
  UninstallDataDir: String;

// ── Install: advanced options page (shown after directory selection) ──────────

procedure InitializeWizard;
begin
  OptionsPage := CreateInputQueryPage(wpSelectDir,
    'Advanced Options', 'Configure server settings',
    'These settings can be left as defaults for most installs.');
  OptionsPage.Add('Port:', False);
  OptionsPage.Values[0] := '7879';
  OptionsPage.Add('Data directory:', False);
  OptionsPage.Values[1] := ExpandConstant('{commonappdata}\MovieChain');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Port: Integer;
begin
  Result := True;
  if CurPageID = OptionsPage.ID then
  begin
    Port := StrToIntDef(OptionsPage.Values[0], 0);
    if (Port < 1) or (Port > 65535) then
    begin
      MsgBox('Please enter a valid port number (1-65535).', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    if Trim(OptionsPage.Values[1]) = '' then
    begin
      MsgBox('Please enter a data directory path.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function GetPort(Param: String): String;
begin
  Result := OptionsPage.Values[0];
  if Result = '' then Result := '7879';
end;

function GetDataDir(Param: String): String;
begin
  Result := Trim(OptionsPage.Values[1]);
  if Result = '' then Result := ExpandConstant('{commonappdata}\MovieChain');
end;

// ── Install: create data directories and persist chosen paths ─────────────────

procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDir: String;
begin
  if CurStep = ssPostInstall then
  begin
    DataDir := GetDataDir('');
    if not DirExists(DataDir) then
      ForceDirectories(DataDir);
    if not DirExists(DataDir + '\logs') then
      ForceDirectories(DataDir + '\logs');
    // Persist chosen data dir so the uninstaller can find it later
    SetIniString('Install', 'DataDir', DataDir, ExpandConstant('{app}\install.ini'));
  end;
end;

// ── Uninstall: offer to remove user data ─────────────────────────────────────

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    // Read the data dir that was chosen at install time
    UninstallDataDir := GetIniString('Install', 'DataDir',
      ExpandConstant('{commonappdata}\MovieChain'),
      ExpandConstant('{app}\install.ini'));
    if DirExists(UninstallDataDir) then
      RemoveData := MsgBox(
        'Remove Movie Chain data?' + #13#10#13#10 +
        'This will permanently delete your chain, settings, and watch history from:' + #13#10 +
        UninstallDataDir,
        mbConfirmation, MB_YESNO) = IDYES
    else
      RemoveData := False;
  end;

  if CurUninstallStep = usPostUninstall then
    if RemoveData then
      DelTree(UninstallDataDir, True, True, True);
end;
