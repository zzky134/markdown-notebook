#!/bin/bash
# ============================================
# WebLLM 模型下载脚本 (Bash)
# ============================================
# 使用方法:
# 1. 进入 models 目录: cd models
# 2. 赋予执行权限: chmod +x download-model.sh
# 3. 运行脚本: ./download-model.sh
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# 模型配置
declare -A MODELS_NAME
declare -A MODELS_SIZE
declare -A MODELS_REPO

MODELS_NAME["1"]="Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC"
MODELS_SIZE["1"]="~300MB"
MODELS_REPO["1"]="mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC"
MODELS_FILES_1=("mlc-chat-config.json" "tokenizer.json" "tokenizer_config.json" "ndarray-cache.json" "params_shard_0.bin" "params_shard_1.bin" "params_shard_2.bin" "params_shard_3.bin")

MODELS_NAME["2"]="gemma-2b-it-q4f16_1-MLC"
MODELS_SIZE["2"]="~500MB"
MODELS_REPO["2"]="mlc-ai/gemma-2b-it-q4f16_1-MLC"
MODELS_FILES_2=("mlc-chat-config.json" "tokenizer.json" "tokenizer_config.json" "ndarray-cache.json" "params_shard_0.bin" "params_shard_1.bin" "params_shard_2.bin" "params_shard_3.bin" "params_shard_4.bin")

MODELS_NAME["3"]="Llama-3.2-1B-Instruct-q4f16_1-MLC"
MODELS_SIZE["3"]="~600MB"
MODELS_REPO["3"]="mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC"
MODELS_FILES_3=("mlc-chat-config.json" "tokenizer.json" "tokenizer_config.json" "ndarray-cache.json" "params_shard_0.bin" "params_shard_1.bin" "params_shard_2.bin" "params_shard_3.bin")

# 显示菜单
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}    WebLLM 模型下载工具${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "${YELLOW}请选择要下载的模型:${NC}"
echo ""

for key in "${!MODELS_NAME[@]}"; do
    echo -e "[${GREEN}$key${NC}] ${GREEN}${MODELS_NAME[$key]}${NC} ${GRAY}(${MODELS_SIZE[$key]})${NC}"
done

echo ""
echo -e "[${RED}0${NC}] ${RED}退出${NC}"
echo ""

read -p "请输入选项编号: " selection

if [ "$selection" == "0" ]; then
    echo -e "${YELLOW}已退出${NC}"
    exit 0
fi

if [ -z "${MODELS_NAME[$selection]}" ]; then
    echo -e "${RED}无效选项!${NC}"
    exit 1
fi

SELECTED_NAME="${MODELS_NAME[$selection]}"
SELECTED_SIZE="${MODELS_SIZE[$selection]}"
SELECTED_REPO="${MODELS_REPO[$selection]}"
SELECTED_FILES="MODELS_FILES_$selection[@]"

echo ""
echo -e "${CYAN}选择的模型: ${SELECTED_NAME}${NC}"
echo -e "${CYAN}下载大小: ${SELECTED_SIZE}${NC}"
echo ""

# 创建目录
MODEL_DIR=$(echo "$SELECTED_NAME" | tr '[:upper:]' '[:lower:]' | tr '.' '-')
TARGET_DIR="$(dirname "$0")/$MODEL_DIR"

if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
    echo -e "${GREEN}创建目录: $TARGET_DIR${NC}"
fi

# 下载文件
BASE_URL="https://huggingface.co/$SELECTED_REPO/resolve/main"
TOTAL_FILES=${#SELECTED_FILES}
CURRENT_FILE=0

for file in "${!SELECTED_FILES}"; do
    CURRENT_FILE=$((CURRENT_FILE + 1))
    URL="$BASE_URL/$file"
    OUTPUT_PATH="$TARGET_DIR/$file"

    echo ""
    echo -e "${YELLOW}[$CURRENT_FILE/$TOTAL_FILES] 下载: $file${NC}"

    if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
        FILE_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
        echo -e "${GRAY}    文件已存在 ($FILE_SIZE)，跳过${NC}"
        continue
    fi

    # 尝试下载
    if command -v wget &> /dev/null; then
        if wget -q --show-progress "$URL" -O "$OUTPUT_PATH" 2>/dev/null; then
            FILE_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
            echo -e "${GREEN}    完成 ($FILE_SIZE)${NC}"
        else
            echo -e "${RED}    下载失败${NC}"
            # 尝试镜像
            MIRROR_URL="${URL/huggingface.co/hf-mirror.com}"
            echo -e "${YELLOW}    尝试镜像: hf-mirror.com${NC}"
            if wget -q --show-progress "$MIRROR_URL" -O "$OUTPUT_PATH" 2>/dev/null; then
                FILE_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
                echo -e "${GREEN}    完成 ($FILE_SIZE)${NC}"
            else
                echo -e "${RED}    镜像也失败，跳过此文件${NC}"
            fi
        fi
    elif command -v curl &> /dev/null; then
        if curl -L -o "$OUTPUT_PATH" "$URL" --progress-bar; then
            FILE_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
            echo -e "${GREEN}    完成 ($FILE_SIZE)${NC}"
        else
            echo -e "${RED}    下载失败${NC}"
        fi
    else
        echo -e "${RED}错误: 需要 wget 或 curl${NC}"
        exit 1
    fi
done

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}下载完成!${NC}"
echo -e "${CYAN}模型目录: $TARGET_DIR${NC}"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "${WHITE}1. 运行: git lfs track '*.bin'${NC}"
echo -e "${WHITE}2. 添加文件到 Git: git add models/${NC}"
echo -e "${WHITE}3. 提交: git commit -m 'Add model files'${NC}"
echo -e "${WHITE}4. 推送: git push origin main${NC}"
echo -e "${CYAN}============================================${NC}"
