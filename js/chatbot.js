import { firebaseAuth } from "./firebaseAuth.js";

class APIService {
    constructor(apiEndpoint) {
        this.apiEndpoint = apiEndpoint;
    }
    async fetchApi(url, body) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body)
            });
            return response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }
    async recommendation(userInput, sessionId) {
        return this.fetchApi(this.apiEndpoint.recommendation, {
            question: userInput,
            overrideConfig: { sessionId: sessionId }
        });
    }
    async askQuestion(userInput, sessionId) {
        return this.fetchApi(this.apiEndpoint.askQuestion, {
            question: userInput,
            overrideConfig: { sessionId: sessionId }
        });
    }
}

class UIHandler {
    constructor(chatBodySelector, userInputSelector) {
        this.chatBody = document.querySelector(chatBodySelector);
        this.userInput = document.querySelector(userInputSelector);
    }
    displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        if (sender === 'bot'){
            const formattedMessage = message
                .replace(/###/g, '') // Hapus simbol ###
                .replace(/\*\*(.*?)\*\*/g, '<span class="bold">$1</span>'); // Format teks diapit **
            messageElement.innerHTML = `<pre>${formattedMessage}</pre>`;
        } else {
            messageElement.innerHTML = `<p>${message}</p>`;
        }
        this.chatBody.appendChild(messageElement);
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
    }
    getUserInput() {
        return this.userInput.value.trim();
    }
    clearUserInput() {
        this.userInput.value = '';
    }
    
}

// Di dalam class Chatbot, modifikasi method handleSendMessage
class Chatbot {
    constructor(apiService, uiHandler, sessionId) {
        this.apiService = apiService;
        this.uiHandler = uiHandler;
        this.sessionId = sessionId;
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('send-button').addEventListener("click", () => this.handleSendMessage());
        this.uiHandler.userInput.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });
    }

    async handleSendMessage() {
        const userInputValue = this.uiHandler.getUserInput();
        if (userInputValue) {
            this.uiHandler.displayMessage(userInputValue, 'user');
            const selectedOption = document.querySelector("select").value;
            const queryFunction = selectedOption === "askQuestion"
                ? this.apiService.askQuestion.bind(this.apiService)
                : this.apiService.recommendation.bind(this.apiService);
            try {
                const response = await queryFunction(userInputValue, this.sessionId);
                this.uiHandler.displayMessage(response.text, "bot");
            } catch (error) {
                this.uiHandler.displayMessage("Maaf, ada kesalahan terjadi", "bot");
            }
            this.uiHandler.clearUserInput();
        }
    }
}

const apiEndpoint = {
    recommendation: "https://api.gadgetbot.web.id/api/v1/prediction/8f05fb9a-7bfc-4322-b493-b2ea6b7b0372",
    askQuestion: "https://api.gadgetbot.web.id/api/v1/prediction/2d825df5-90c6-41b6-aa44-3b7f11695788"
};

const user = firebaseAuth.auth.currentUser;
const sessionId = user ? user.uid : 'anonymous';
const apiService = new APIService(apiEndpoint);
const uiHandler = new UIHandler('.chat-body', '#user-input');
new Chatbot(apiService, uiHandler, sessionId);

