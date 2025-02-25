const fs = require('fs');
const { exec } = require('child_process');
const ollama = require('ollama');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const loadEnv = () => {
  if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf-8');
    env.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
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

const executeAndRecurse = async (input) => {
  let conversationHistory = loadConversationHistory();
  if (input) {
    addToHistory(conversationHistory, input);
  }

  try {
    const response = await ollama.chat({
      model: 'codellama:latest',
      messages: conversationHistory,
      maxTokens: 4096
    });

    const command = response.choices[0].message.content;
    console.log(`${command} 8===>>> ${JSON.stringify(response)}`);
    fs.appendFileSync('responses.log', `${command} 8===>>> ${JSON.stringify(response)}\n`);

    if (command) {
      if (command === 'exit' || command.includes('?"') || command.includes('? ')) {
        console.log('👁️   👃  👁️    ');
        console.log(command);
      } else {
        if (command === 'null') {
          command = './rd.sh && sleep 6';
        }

        console.log(`📢: ${command}`);
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
      await executeAndRecurse('continue follow alogrithm. ask any question with say command if stuck or in a loop');
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
