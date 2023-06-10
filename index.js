let memory = {
    "help": `Try "open", "eval" and "alias". See the source code for better understanding what is going on.`,
    "/?": "alias help",
    "?": "alias help",
    "youtube": "open https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "open youtube": "alias youtube",
    "do something": "alias youtube",
};
try {
    memory = JSON.parse(localStorage.getItem('memory')) || memory;
} catch (e) {
    console.error(e);
}

const qEl = document.getElementById('q');
const chatEl = document.getElementById('chat');
const bEl = document.getElementById('b');

qEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        run(qEl.value);
        e.preventDefault();
        return false;
    }
});
bEl.addEventListener('click', e => {
    run(qEl.value);
});
function addChatItem(html, sender = 'chat') {
    const liEl = document.createElement('li');
    liEl.classList.add(`sender-${sender}`);
    liEl.innerHTML = html;
    chatEl.appendChild(liEl);
}

let state = 'idle';
let queryToLearn = null;

function run(query, silent = false) {
    if (query === 'kill your self') return localStorage.clear();
    if (/^override .*/ig.test(query)) {
        queryToLearn = query.replace('override', '').trim();
        addChatItem('what should I do instead?');
        state = 'learn';
        return;
    }

    if (!silent) addChatItem(query, 'user')
    if (memory[query] && state === 'idle') {
        const response = memory[query];
        if (/^open.*/ig.test(response)) {
            const url = response.replace('open', '').trim();
            addChatItem(`Okay, me opening ${url}`);
            setTimeout(() => {
                window.open(url);
            }, 333);
            return;
        } else if (/^eval .*/ig.test(response)) {
            const code = response.replace('eval', '');
            addChatItem(`Evaluating: ${code}`);
            setTimeout(() => {
                try {
                    eval(code);
                } catch (e) {
                    addChatItem(e.toString(), 'error');
                }
            }, 333);
            return;
        } else if (/^alias .*/ig.test(response)) {
            const newQuery = response.replace('alias', '').trim();
            return run(newQuery, true);
        }
        addChatItem(response);
        return;
    }
    switch (state) {
        case 'idle':
            addChatItem(`I'm such an IDIOT, I don't know how to respond. Please tell me.`);
            state = 'learn';
            queryToLearn = query;
            break;
        case 'learn':
            memory[queryToLearn] = query;
            addChatItem(`Ok, from now on, I'll respond "${memory[queryToLearn]}" to "${queryToLearn})"`);
            state = 'idle';
            queryToLearn = null;
            break;
    }
    try {
        localStorage.setItem('memory', JSON.stringify(memory));
    } catch (e) {
        console.error(e);
    }
}
