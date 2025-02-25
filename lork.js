const fs = require('fs');
const Ollama = require('ollama');
const { exec } = require('child_process');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const loadEnv = () => {
  if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf-8');
    env.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        let strippedValue = value.trim();
        if (strippedValue.startsWith('"') && strippedValue.endsWith('"')) {
            strippedValue = strippedValue.slice(1, -1);
        }
        process.env[key.trim()] = strippedValue;
      }
    });
  } else {
    console.log('.env file not found!');
    console.log('but it is ok, thogh 🤷🏻‍♂️');
  }
};

const initmsg = "Answer with one sh command each time. ONLY SH COMMAND! NO ANY markdown!!! no nano or vi, only one-line commands are availible. Everything you answer is executed on the real machine. It is macOS. DO NOT provide explanations or use markdown, just the command.";

const loadConversationHistory = () => {
  if (fs.existsSync('conversation_history.json')) {
    return JSON.parse(fs.readFileSync('conversation_history.json', 'utf-8'));
  } else {
    return [{ role: 'system', content: initmsg }];
  }
};

const addToHistory = (history, message, role = 'user') => {
  history.push({ role, content: message });
};

const logError = (message) => {
  fs.appendFileSync('error_log.txt', `${message}\n`);
};

const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
};

const executeOllama = async (messages) => {
  try {
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'codellama:latest';
    console.log({ messagesLength: messages.length });
    const ollama = Ollama.default;
    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: messages,
    });
    console.log(response);
    return response.message.content; // Extract the content
  } catch (error) {
    throw new Error(`Ollama error: ${error.message}`);
  }
};

const executeAndRecurse = async (input) => {
  let conversationHistory = loadConversationHistory();
  if (input) {
    addToHistory(conversationHistory, input);
  }

  try {
    console.time('Ollama Request');
    const response = await executeOllama(conversationHistory);
    console.timeEnd('Ollama Request');

    // Clean up the response to get just the command
    //const commandMatch = response.match(/Assistant: (.*)$/m);
    //const command = commandMatch ? commandMatch[1].trim() : '';
    command = response.trim();
    console.log(`📢 Command: ${command}`);
    fs.appendFileSync('responses.log', `${command}\n`);

    if (command) {
      if (command === 'exit' || command.includes('?"') || command.includes('? ')) {
        console.log('👁️   👃  👁️    ');
        console.log(command);
      } else {
        const result = await executeCommand(command);
        console.log(result ? `🎉: ${result}` : '🎉🎉🎉');
        addToHistory(conversationHistory, `Success: ${result}`, 'system');
      }
    } else {
      console.log('🚽 Received an empty command, stopping recursion.');
      return;
    }

    fs.writeFileSync('conversation_history.json', JSON.stringify(conversationHistory, null, 2));

    if (command === 'exit' || command.includes('?"') || command.includes('? ')) {
      if (fs.existsSync('afk')) {
        await executeAndRecurse('human is afk. you are on your own now.');
      } else {
        console.log('Waiting for input...');
        process.stdin.once('data', async (data) => {
          await executeAndRecurse(data.toString().trim());
        });
      }
    } else {
      await executeAndRecurse('continue follow algorithm. ask any question with say command if stuck or in a loop');
    }
  } catch (error) {
    logError(`Command failed: ${error}`);
    addToHistory(conversationHistory, `Error: ${error}`, 'system');
    fs.writeFileSync('conversation_history.json', JSON.stringify(conversationHistory, null, 2));
    console.log(`🚨 ${error}`);
  }
};

const main = async () => {
  loadEnv();
  await sleep(3000);
  const input = process.argv[2];
  await executeAndRecurse(input);
};

main();
