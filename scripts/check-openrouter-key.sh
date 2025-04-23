#!/bin/bash
set -e

# Load environment variables from .env file if it exists
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "📂 Loading environment variables from .env file"
  # Use a safer way to load environment variables
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ ! $key =~ ^# && -n $key ]]; then
      # Remove leading/trailing whitespace and quotes
      value=$(echo $value | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
      # Export the variable
      export $key="$value"
      
      # For OPENROUTER_API_KEY, show a prefix for verification
      if [ "$key" = "OPENROUTER_API_KEY" ]; then
        KEY_PREFIX="${value:0:5}..."
        echo "  ✅ Loaded: $key = $KEY_PREFIX (${#value} chars)"
      else
        echo "  ✅ Loaded: $key = $value"
      fi
    fi
  done < "$SCRIPT_DIR/.env"
fi

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "❌ ERROR: OPENROUTER_API_KEY is not set"
  echo "Please set it in your .env file or as an environment variable"
  exit 1
fi

# Show API key prefix for verification
KEY_PREFIX="${OPENROUTER_API_KEY:0:5}..."
echo "🔑 Using OpenRouter API key: $KEY_PREFIX (${#OPENROUTER_API_KEY} chars)"

# Create a temporary file to store the API response
API_RESPONSE_FILE=$(mktemp)

# Test the API key with a simple request and save the response
echo "🌐 Sending test request to OpenRouter API..."
curl -s -X POST \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"google/gemma-3-4b-it:free","messages":[{"role":"user","content":"Hello"}]}' \
  https://openrouter.ai/api/v1/chat/completions > "$API_RESPONSE_FILE"

# Check if the response contains expected fields
if grep -q "choices" "$API_RESPONSE_FILE"; then
  echo "✅ OpenRouter API key is valid! Response contains expected data."
  echo "Response excerpt:"
  head -n 10 "$API_RESPONSE_FILE"
  echo "🎉 API key verification successful!"
  
  # Clean up temporary file
  rm -f "$API_RESPONSE_FILE"
  exit 0
else
  echo "❌ OpenRouter API key is invalid or API is unreachable."
  echo "Response content:"
  cat "$API_RESPONSE_FILE"
  echo "❌ API key verification failed!"
  
  # Clean up temporary file
  rm -f "$API_RESPONSE_FILE"
  exit 1
fi
