# ============================================
# WebLLM 模型下载脚本 (PowerShell)
# ============================================
# 使用方法:
# 1. 打开 PowerShell
# 2. 进入 models 目录: cd models
# 3. 运行脚本: .\download-model.ps1
# 4. 选择要下载的模型
# ============================================

$ErrorActionPreference = "Stop"

# 模型配置
$Models = @{
    "1" = @{
        Name = "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC"
        Size = "~300MB"
        Repo = "mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC"
        Files = @(
            "mlc-chat-config.json",
            "tokenizer.json",
            "tokenizer_config.json",
            "ndarray-cache.json",
            "params_shard_0.bin",
            "params_shard_1.bin",
            "params_shard_2.bin",
            "params_shard_3.bin"
        )
    }
    "2" = @{
        Name = "gemma-2b-it-q4f16_1-MLC"
        Size = "~500MB"
        Repo = "mlc-ai/gemma-2b-it-q4f16_1-MLC"
        Files = @(
            "mlc-chat-config.json",
            "tokenizer.json",
            "tokenizer_config.json",
            "ndarray-cache.json",
            "params_shard_0.bin",
            "params_shard_1.bin",
            "params_shard_2.bin",
            "params_shard_3.bin",
            "params_shard_4.bin"
        )
    }
    "3" = @{
        Name = "Llama-3.2-1B-Instruct-q4f16_1-MLC"
        Size = "~600MB"
        Repo = "mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC"
        Files = @(
            "mlc-chat-config.json",
            "tokenizer.json",
            "tokenizer_config.json",
            "ndarray-cache.json",
            "params_shard_0.bin",
            "params_shard_1.bin",
            "params_shard_2.bin",
            "params_shard_3.bin"
        )
    }
}

# 显示菜单
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "    WebLLM 模型下载工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "请选择要下载的模型:" -ForegroundColor Yellow
Write-Host ""

foreach ($key in $Models.Keys | Sort-Object) {
    $model = $Models[$key]
    Write-Host "[$key] $($model.Name)" -ForegroundColor Green -NoNewline
    Write-Host " ($($model.Size))" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[0] 退出" -ForegroundColor Red
Write-Host ""

$selection = Read-Host "请输入选项编号"

if ($selection -eq "0") {
    Write-Host "已退出" -ForegroundColor Yellow
    exit
}

if (-not $Models.ContainsKey($selection)) {
    Write-Host "无效选项!" -ForegroundColor Red
    exit 1
}

$SelectedModel = $Models[$selection]
$ModelDir = $SelectedModel.Name.ToLower().Replace(".", "-")

Write-Host ""
Write-Host "选择的模型: $($SelectedModel.Name)" -ForegroundColor Cyan
Write-Host "下载大小: $($SelectedModel.Size)" -ForegroundColor Cyan
Write-Host ""

# 创建目录
$TargetDir = Join-Path $PSScriptRoot $ModelDir
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    Write-Host "创建目录: $TargetDir" -ForegroundColor Green
}

# 下载文件
$BaseUrl = "https://huggingface.co/$($SelectedModel.Repo)/resolve/main"
$TotalFiles = $SelectedModel.Files.Count
$CurrentFile = 0

foreach ($file in $SelectedModel.Files) {
    $CurrentFile++
    $Url = "$BaseUrl/$file"
    $OutputPath = Join-Path $TargetDir $file

    Write-Host ""
    Write-Host "[$CurrentFile/$TotalFiles] 下载: $file" -ForegroundColor Yellow

    if (Test-Path $OutputPath) {
        $existingSize = (Get-Item $OutputPath).Length
        if ($existingSize -gt 0) {
            Write-Host "    文件已存在，跳过" -ForegroundColor Gray
            continue
        }
    }

    try {
        # 使用 BITS 或 Invoke-WebRequest 下载
        $progressPreference = 'Continue'

        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing -MaximumRedirection 5

        $fileSize = (Get-Item $OutputPath).Length
        $sizeInMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "    完成 ($sizeInMB MB)" -ForegroundColor Green
    }
    catch {
        Write-Host "    下载失败: $_" -ForegroundColor Red

        # 尝试使用镜像
        $MirrorUrl = $Url -replace "huggingface.co", "hf-mirror.com"
        Write-Host "    尝试镜像: hf-mirror.com" -ForegroundColor Yellow

        try {
            Invoke-WebRequest -Uri $MirrorUrl -OutFile $OutputPath -UseBasicParsing -MaximumRedirection 5
            $fileSize = (Get-Item $OutputPath).Length
            $sizeInMB = [math]::Round($fileSize / 1MB, 2)
            Write-Host "    完成 ($sizeInMB MB)" -ForegroundColor Green
        }
        catch {
            Write-Host "    镜像也失败，跳过此文件" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "下载完成!" -ForegroundColor Green
Write-Host "模型目录: $TargetDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 运行: git lfs track '*.bin'" -ForegroundColor White
Write-Host "2. 添加文件到 Git: git add models/" -ForegroundColor White
Write-Host "3. 提交: git commit -m 'Add model files'" -ForegroundColor White
Write-Host "4. 推送: git push origin main" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
