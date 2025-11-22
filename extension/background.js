// Comet AI - Background Service Worker
// Handles communication between content script and AI backend

// API Configuration
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // User needs to add their key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request);
  
  if (request.action === 'analyzeQuizWithAI') {
    // Send quiz data to AI for analysis
    analyzeQuizWithGemini(request.quizData)
      .then(answers => {
        sendResponse({success: true, answers});
      })
      .catch(error => {
        sendResponse({success: false, error: error.message});
      });
    return true; // Keep message channel open
  }

    // NEW: Handler for autonomous quiz automation
    if (request.action === 'getQuizAnswers') {
          console.log('[Background] Getting AI answers for autonomous quiz');
          // Call the existing Gemini function to get answers
          analyzeQuizWithGemini(request.quizData)
            .then(answers => {
                      console.log('[Background] Got answers:', answers);
                      sendResponse({success: true, answers});
                    })
            .catch(error => {
                      console.error('[Background] Error getting answers:', error);
                      sendResponse({success: false, error: error.message});
                    });
          return true; // Keep message channel open
        }
  
  if (request.action === 'getAIResponse') {
    // General AI query
    getGeminiResponse(request.prompt)
      .then(response => {
        sendResponse({success: true, response});
      })
      .catch(error => {
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
});

// Analyze quiz using Gemini AI
async function analyzeQuizWithGemini(quizData) {
  const prompt = `You are a quiz solver. Analyze these quiz questions and provide the correct answer for each.

Quiz Questions:
${JSON.stringify(quizData, null, 2)}

Provide your response as a JSON array of correct answers, one for each question. Example: ["answer1", "answer2", "answer3"]
IMPORTANT: Return ONLY the JSON array, no other text.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      contents: [{
        parts: [{text: prompt}]
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const aiResponse = data.candidates[0].content.parts[0].text;
  
  // Parse JSON response
  try {
    const answers = JSON.parse(aiResponse.trim());
    return answers;
  } catch (e) {
    // If AI didn't return pure JSON, try to extract it
    const match = aiResponse.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse AI response');
  }
}

// General AI query
async function getGeminiResponse(prompt) {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      contents: [{
        parts: [{text: prompt}]
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Comet AI] Extension installed successfully!');
  console.log('[Comet AI] Remember to add your Gemini API key in background.js');
});

console.log('[Comet AI] Background service worker loaded');
