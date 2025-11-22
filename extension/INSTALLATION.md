# Comet AI Browser Extension - REAL AUTOMATION INSTALLATION GUIDE

## CRITICAL: This Is ACTUAL Automation - Not Simulation!

This extension contains REAL quiz-solving automation that ACTUALLY:
- ✓ Reads quiz questions from web pages
- ✓ Clicks correct answer buttons
- ✓ Submits quizzes automatically
- ✓ Uses AI to determine correct answers

**NO MORE FAKE STATUS MESSAGES!** This is real DOM manipulation.

---

## Installation Steps

### 1. Download the Extension

```bash
git clone https://github.com/harinish45/comet-ai-browser-replica.git
cd comet-ai-browser-replica/extension
```

### 2. Get Your Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key
4. Open `background.js` in the extension folder
5. Replace `'YOUR_GEMINI_API_KEY'` with your actual API key:

```javascript
const GEMINI_API_KEY = 'your-actual-key-here';
```

### 3. Install Extension in Chrome

1. Open Chrome/Edge browser
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `extension` folder from where you cloned the repo
6. The Comet AI extension should now appear in your extensions list!

---

## How to Use - REAL Quiz Automation

### Method 1: Using Browser Console (For Testing)

1. Navigate to any quiz page
2. Open DevTools (F12)
3. Go to Console tab
4. Send a message to analyze and solve the quiz:

```javascript
// Step 1: Analyze quiz to get questions
chrome.runtime.sendMessage(
  {action: 'analyzeQuiz'},
  (response) => {
    console.log('Quiz data:', response);
    
    // Step 2: Send to AI for analysis
    chrome.runtime.sendMessage(
      {action: 'analyzeQuizWithAI', quizData: response.quizData},
      (aiResponse) => {
        console.log('AI Answers:', aiResponse);
        
        // Step 3: Actually click the answers!
        chrome.runtime.sendMessage(
          {action: 'solveQuiz', answers: aiResponse.answers},
          (result) => console.log('Result:', result)
        );
      }
    );
  }
);
```

### Method 2: Direct Quiz Solving

```javascript
// If you already know the answers, skip AI and directly solve:
chrome.runtime.sendMessage(
  {
    action: 'solveQuiz',
    answers: ['Answer to Q1', 'Answer to Q2', 'Answer to Q3']
  },
  (response) => console.log('Quiz solved!', response)
);
```

---

## What Makes This REAL?

### ❌ What This Extension DOES NOT Do:
- Does NOT show fake "Thinking..." messages
- Does NOT simulate clicks
- Does NOT pretend to automate

### ✓ What This Extension ACTUALLY Does:

**content.js** functions:
- `findQuestionElements()` - Scans page DOM for question elements
- `findAnswerOptions()` - Locates clickable answer buttons/radios
- `clickCorrectAnswer()` - ACTUALLY clicks the right answer:
  - Uses `element.click()`
  - Dispatches MouseEvent
  - Sets `checked` property for radios/checkboxes
  - Fires `change` events
  
**background.js** functions:
- `analyzeQuizWithGemini()` - Sends questions to Gemini AI
- Gets back correct answers as JSON array
- Passes answers to content script

**Result**: Quiz is ACTUALLY completed with visible button clicks!

---

## Troubleshooting

### Issue: "No questions found"
- Solution: The quiz page uses custom selectors. Edit `findQuestionElements()` in content.js to add your site's specific selectors.

### Issue: "Could not find matching answer"
- Solution: The AI response might not match exactly. The `clickCorrectAnswer()` function tries:
  1. Exact match
  2. Partial match (includes)
  3. Fuzzy word matching
- If still failing, check console logs for what text was found.

### Issue: "AI API error"
- Solution: Check that your Gemini API key is correct in `background.js`
- Make sure you have API quota remaining

### Issue: Extension not loading
- Solution: Check `chrome://extensions` for errors
- Make sure all three files exist: content.js, background.js, manifest.json

---

## Testing

To verify REAL automation is working:

1. Open any quiz page
2. Open DevTools Console (F12)
3. Watch for `[COMET]` log messages:
   - "Found X questions"
   - "Found Y options using: [selector]"
   - "EXACT MATCH - Clicking: [answer]"
   - "Q1: Selected [answer] ✓"

4. Watch the PAGE ITSELF - you should see:
   - Radio buttons actually getting selected
   - Checkboxes actually getting checked
   - Page state changing

---

## Next Steps

Now that you have REAL automation:
1. Test on simple quiz sites first
2. Adjust selectors in content.js for your target sites
3. Build a popup UI for easier control (optional)
4. Add more automation patterns beyond quizzes

**The foundation is complete. The automation is REAL. Start using it!**
