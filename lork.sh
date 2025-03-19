#!/bin/bash
# First thing you do before start the work?
# sleep 3 # yes, sleep! (Commented out to reduce delay)

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo ".env file not found!"
    echo "but it is ok, thogh 🤷🏻‍♂️"
    # exit 1
fi

export PS1="🐈💨"
#OLLAMA_API_KEY="$OLLAMA_API_KEY"

# Load model configuration
if [ -f config/models.json ]; then
    model_config=$(cat config/models.json)
    default_model=$(echo "$model_config" | jq -r '.default')
    model_name=$(echo "$model_config" | jq -r ".models[\"$default_model\"].name")
else
    model_name="codellama:latest"
fi

initmsg="You are a command line assistant. Answer with one sh command each time. ONLY SH COMMAND! NO ANY markdown!!! no nano or vi, only one-line commands are availible. Everything you answer is executed on the real machine. It is macOS. DO NOT provide explanations or use markdown, just the command."

# Load conversation history
if [ -f conversation_history.json ]; then
    conversation_history=$(cat conversation_history.json)
    history_length=$(wc -c < conversation_history.json)
else
    conversation_history=$(jq -n --arg initmsg "$initmsg" '[{"role": "system", "content": $initmsg}]')
    history_length=1024
fi
echo "📜 $history_length"
# Add the message
add_to_history() {
  local message="$1"
  conversation_history=$(echo "$conversation_history" | jq --arg message "$message" '. + [{"role": "user", "content": $message}]')
}

# Log errors to a file
log_error() {
  local message="$1"
  echo "$message" >> error_log.txt
}

# Function to make API request, execute commands, and handle recursion
execute_and_recurse() {
  if [[ ! -z "$1" ]]; then
    add_to_history "$1"
  fi

  response=$(ollama run "$model_name" "$conversation_history" --format json)
  responseError=$(echo "$response" | jq -r '.error.code')

  command=$(echo "$response" | jq -r '.choices[0].message.content')
  echo "$command 8===>>> $response" >> responses.log
  if [[ $responseError != "null" ]]; then 
    errorMessage=$(echo "$response" | jq -r '.error.message')
    say -v Karen "OLLAMA API ERROR: $responseError"
    echo "🚨 $errorMessage"
    say -v Alice "Sleep for 12 seconds, to see if the issue fix itself later."
    command="./rd.sh && sleep 12"
  fi
  if [[ "$command" =~ ^sleep ]]; then
    say -v Karen "sleeping at work!"
  fi

  if [[ ! -z "$command" ]]; then
      if [[ "$command" == "exit" || "$command" == *"?\"" || "$command" == *"? " ]]; then
        echo "👁️   👃  👁️    "
        echo "$command"
      else 
        if [[ "$command" == "null" ]]; then
          command="./rd.sh && sleep 6"
        fi

        echo  "📢: $command"
      fi
    result=$(bash -c "$command" 2>&1)

    if [ $? -eq 0 ]; then
        if [[ ! -z "$result" ]]; then
          echo "🎉:"
          echo "$result"
        else
          echo "🎉🎉🎉"
        fi
      reply="Success: $result"
    else
      log_error "Command $command failed: $result"
      reply="Error: $result"
      echo "🚨 $result"
    fi
  else
    echo "🚽 Received an empty command, stopping recursion."
    say -v Karen "I just have shit myself"
    echo "response is:"
    echo "$response"
    return 0
  fi

  conversation_history=$(echo "$conversation_history" | jq --arg command "$command" --arg reply "$reply" '. + [{"role": "assistant", "content": $command}, {"role": "system", "content": $reply}]')
  echo "$conversation_history" > conversation_history.json

  if [[ "$command" == "exit" || "$command" == *"?\"" || "$command" == *"? " ]]; then
    if [[ -f afk ]]; then
      ./lork.sh "human is afk. you are on your own now."
    else
      say -v Karen "Waiting for input..."
      read -r answer
      ./lork.sh "$answer"
      return
    fi
  fi
  pickle="ask any question with say command if stuck or in a loop"
  next="continue follow alogrithm. $pickle"
  ./lork.sh "$next"
}

# Start recursion
execute_and_recurse "$1"
