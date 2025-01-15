param(
    [string]$filePath,
    [string]$lines=10,
    [string]$modelId="gemma2:latest" # "llama2-uncensored:latest"
)

<#
.SYNOPSIS
Processes a Markdown file, interacts with a language model, and (optionally) executes PowerShell commands.

.DESCRIPTION
Reads a Markdown file, extracts code blocks (not sent to the model), sends the remaining content to a language model, and attempts to execute the model's response as a PowerShell command.

.PARAMETER filePath
The path to the Markdown file.

.EXAMPLE
.\mdcutor.ps1 -filePath "path\to\your\markdownfile.md"

.NOTES
Requires Ollama. Security is a primary concern; direct execution is disabled by default. Implement robust parsing before enabling execution.
#>

$conversationHistory = "mdcute.ch.md"

$markdownContent = Get-Content -Path $filePath -Raw

# Extract content without code blocks
$ollamaInput = $markdownContent

$ollamaInstructions = '"""'

$ch = "..."
$ch = Get-Content -Path $conversationHistory -Tail $lines -ErrorAction SilentlyContinue

# Ollama request
$ollamaRequest = "Last $lines lines of conversation with yourself:`n$ch`nCurrent MD file content:`n$ollamaInput`n$ollamaInstructions";

Write-Host "==================== REQUEST ===================="
Write-Host $ollamaRequest -ForegroundColor Yellow
Write-Host "================================================="
"`n$([datetime]::Now) - Request: $ollamaInput" | Add-Content -Path $conversationHistory -Encoding utf8

$ollamaResponse = & ollama run "$modelId" $ollamaRequest

Write-Host "==================== RESPONSE ==================="
Write-Host $ollamaResponse -ForegroundColor Green
Write-Host "================================================="
"`n$([datetime]::Now) - Response: $ollamaResponse" | Add-Content -Path $conversationHistory -Encoding utf8
$noError = $false
try {
    if ($ollamaResponse -match '`([^`]+)`') {
        $powershellCommand = $Matches[1]
        foreach ($match in $Matches) {
            Write-Host $match
        }
        Write-Host "Extracted PowerShell command: $powershellCommand" -ForegroundColor Cyan
        "`n$([datetime]::Now) - Command To Execute: $powershellCommand" | Add-Content -Path $conversationHistory -Encoding utf8

        $result = Invoke-Expression $powershellCommand #UNCOMMENT ONLY IF YOU HAVE ROBUST PARSING
        Write-Host "==================== RESULT ==================="
        $result | Out-Host
        Write-Host "================================================="
        "`n$([datetime]::Now) - Resulst: $result" | Add-Content -Path $conversationHistory -Encoding utf8
    } else {
        Write-Warning "No powershell command was found."        
        "`n$([datetime]::Now) - No powershell command was found." | Add-Content -Path $conversationHistory -Encoding utf8
    } 
    $noError = $true;
} catch {
    Write-Error "Error executing command: $($_.Exception.Message)"
}
# $retry = Read-Host "Do you want to try again? (yes/no)"
# if ($retry -eq "yes") {
#     & $PSCommandPath @PSBoundParameters
# }

Write-Host "Press Ctrl+C to abort..." -ForegroundColor Red
Start-Sleep -Seconds 6
if ($noError -eq $true) {
    # Clear-Host
} else {
    "`n$([datetime]::Now) - Error: $($_.Exception.Message)" | Add-Content -Path $conversationHistory -Encoding utf8
}
& $PSCommandPath -filePath "$filePath" -lines "$lines"