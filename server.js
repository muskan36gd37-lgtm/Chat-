const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Serve Frontend UI
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloud API Chat Tester</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white h-screen flex flex-col">

    <!-- Header / Config Bar -->
    <header class="bg-gray-800 p-4 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between">
        <h1 class="text-xl font-bold text-blue-400">⚡ Cloud API Chat Tester</h1>
        <div class="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <input type="text" id="apiUrl" placeholder="API Endpoint URL" class="bg-gray-700 px-3 py-1.5 rounded text-sm flex-1 md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <input type="password" id="apiKey" placeholder="API Key" class="bg-gray-700 px-3 py-1.5 rounded text-sm flex-1 md:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <select id="apiType" class="bg-gray-700 px-3 py-1.5 rounded text-sm focus:outline-none">
                <option value="gemini">Gemini Style</option>
                <option value="openai">OpenAI Style</option>
            </select>
        </div>
    </header>

    <!-- Chat Box -->
    <div id="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl w-full mx-auto">
        <div class="flex justify-start">
            <div class="bg-gray-800 p-3 rounded-lg max-w-lg text-sm text-gray-300">
                Hello! Apni API Key aur Endpoint upar enter karein, aur chat test karna start karein.
            </div>
        </div>
    </div>

    <!-- Input Footer -->
    <footer class="bg-gray-800 p-4 border-t border-gray-700">
        <form id="chatForm" class="max-w-4xl mx-auto flex gap-2">
            <input type="text" id="userInput" placeholder="Yahan apna message likhein..." class="flex-1 bg-gray-700 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">Send</button>
        </form>
    </footer>

    <script>
        const chatContainer = document.getElementById('chatContainer');
        const chatForm = document.getElementById('chatForm');
        const userInput = document.getElementById('userInput');
        const apiUrl = document.getElementById('apiUrl');
        const apiKey = document.getElementById('apiKey');
        const apiType = document.getElementById('apiType');

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = userInput.value.trim();
            if (!text) return;

            // Append User Message
            appendMessage(text, 'user');
            userInput.value = '';

            // Loading state
            const loadingId = appendMessage('Thinking...', 'bot', true);

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: apiUrl.value,
                        key: apiKey.value,
                        type: apiType.value,
                        message: text
                    })
                });

                const data = await res.json();
                removeMessage(loadingId);

                if (data.error) {
                    appendMessage('Error: ' + data.error, 'bot');
                } else {
                    appendMessage(data.reply, 'bot');
                }
            } catch (err) {
                removeMessage(loadingId);
                appendMessage('Request Failed: ' + err.message, 'bot');
            }
        });

        function appendMessage(text, sender, isLoading = false) {
            const id = 'msg-' + Math.random().toString(36.substring(2, 9));
            const div = document.createElement('div');
            div.id = id;
            div.className = \`flex \${sender === 'user' ? 'justify-end' : 'justify-start'}\`;
            
            const bubble = document.createElement('div');
            bubble.className = \`p-3 rounded-lg max-w-xl text-sm \${sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'} \${isLoading ? 'italic text-gray-400' : ''}\`;
            bubble.innerText = text;
            
            div.appendChild(bubble);
            chatContainer.appendChild(div);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return id;
        }

        function removeMessage(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }
    </script>
</body>
</html>
  `);
});

// Backend Proxy Route to handle API calls securely & bypass CORS
app.post('/api/chat', async (req, res) => {
  const { endpoint, key, type, message } = req.body;

  if (!endpoint || !key) {
    return res.json({ error: 'Endpoint aur API Key dono dena zaroori hai!' });
  }

  try {
    let fetchUrl = endpoint;
    let fetchHeaders = {
      'Content-Type': 'application/json'
    };
    let fetchBody = {};

    if (type === 'gemini') {
      // Gemini format (e.g., https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY)
      // Agar URL me ?key= nahi hai toh append kar sakte hain ya Authorization header use kar sakte hain
      fetchHeaders['x-goog-api-key'] = key;
      fetchBody = {
        contents: [{ parts: [{ text: message }] }]
      };
    } else {
      // OpenAI format (Standard Bearer Token)
      fetchHeaders['Authorization'] = \`Bearer \${key}\`;
      fetchBody = {
        model: "gpt-3.5-turbo", // ya jo bhi endpoint support kare
        messages: [{ role: "user", content: message }]
      };
    }

    const apiRes = await fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody)
    });

    const data = await apiRes.json();

    let reply = "";
    if (type === 'gemini') {
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
    } else {
      reply = data.choices?.[0]?.message?.content || JSON.stringify(data);
    }

    res.json({ reply });

  } catch (err) {
    res.json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
