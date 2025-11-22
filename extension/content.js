// Comet AI - Content Script (Autonomous Agent)
// This script runs in EVERY webpage and enables AI to interact with the DOM directly
// Based on how real Comet works: Accessibility Tree + DOM manipulation

(function() {
  'use strict';

  // =================================================================
  // CORE: Accessibility Tree Parser (Like Real Comet)
  // =================================================================
  function getAccessibilityTree() {
    const elements = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((el, index) => {
      // Get ARIA roles, labels, and states (like Comet does)
      const role = el.getAttribute('role') || el.tagName.toLowerCase();
      const ariaLabel = el.getAttribute('aria-label') || '';
      const label = el.textContent?.trim().substring(0, 50) || '';
      const isClickable = el.tagName === 'BUTTON' || 
                         el.tagName === 'A' || 
                         el.onclick !== null || 
                         el.hasAttribute('tabindex');
      const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      
      if (isClickable || isInput || ariaLabel) {
        elements.push({
          index,
          selector: generateSelector(el),
          role,
          label: label || ariaLabel,
          ariaLabel,
          isClickable,
          isInput,
          type: el.type,
          visible: isVisible(el)
        });
      }
    });
    
    return elements;
  }

  // Generate unique selector for element
  function generateSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c).slice(0, 2).join('.');
      if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
    }
    return getXPath(el);
  }

  function getXPath(el) {
    if (el.id !== '') return `//*[@id="${el.id}"]`;
    if (el === document.body) return '/html/body';
    
    let ix = 0;
    const siblings = el.parentNode?.childNodes || [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === el) {
        return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {
        ix++;
      }
    }
  }

  function isVisible(el) {
    return el.offsetParent !== null && 
           window.getComputedStyle(el).display !== 'none' &&
           window.getComputedStyle(el).visibility !== 'hidden';
  }

  // =================================================================
  // AGENT ACTIONS: Direct DOM Manipulation (Like Comet)
  // =================================================================
  
  const AgentActions = {
    // Read entire page content
    readPage() {
      return {
        url: window.location.href,
        title: document.title,
        text: document.body.innerText,
        html: document.body.innerHTML.substring(0, 10000), // First 10k chars
        accessibilityTree: getAccessibilityTree()
      };
    },

    // Click element (NO asking user!)
    click(selector) {
      const el = document.querySelector(selector);
      if (!el) return {error: `Element not found: ${selector}`};
      el.click();
      return {success: true, clicked: selector};
    },

    // Type text into input
    type(selector, text) {
      const el = document.querySelector(selector);
      if (!el) return {error: `Element not found: ${selector}`};
      
      // Trigger all events like a real user
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', {bubbles: true}));
      el.dispatchEvent(new Event('change', {bubbles: true}));
      return {success: true, typed: text};
    },

    // Extract content from elements
    extract(selector) {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(el => ({
        text: el.textContent?.trim(),
        html: el.innerHTML,
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      }));
    },

    // Scroll page
    scroll(direction, amount = 500) {
      const scrollOptions = {behavior: 'smooth'};
      if (direction === 'down') {
        window.scrollBy({top: amount, ...scrollOptions});
      } else if (direction === 'up') {
        window.scrollBy({top: -amount, ...scrollOptions});
      }
      return {success: true, scrolled: direction};
    },

    // Take screenshot of visible area
    async screenshot() {
      // Return viewport dimensions for background script to capture
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      };
    },

    // Find elements by text content
    findByText(text) {
      const xpath = `//*[contains(text(), '${text}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const elements = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        const el = result.snapshotItem(i);
        elements.push({
          selector: generateSelector(el),
          text: el.textContent?.trim(),
          tag: el.tagName
        });
      }
      return elements;
    },

    // Get all links
    getLinks() {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent?.trim(),
        selector: generateSelector(a)
      }));
    },

    // Get all form fields
    getForms() {
      return Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        fields: Array.from(form.querySelectorAll('input, textarea, select')).map(field => ({
          name: field.name,
          type: field.type,
          id: field.id,
          selector: generateSelector(field),
          placeholder: field.placeholder
        }))
      }));
    }
  };

  // =================================================================
  // MESSAGE HANDLER: Receive commands from background/sidebar
  // =================================================================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Comet Content Script] Received:', message);

    const {action, params} = message;
    
    try {
      let result;
      
      switch (action) {
        case 'readPage':
          result = AgentActions.readPage();
          break;
        case 'click':
          result = AgentActions.click(params.selector);
          break;
        case 'type':
          result = AgentActions.type(params.selector, params.text);
          break;
        case 'extract':
          result = AgentActions.extract(params.selector);
          break;
        case 'scroll':
          result = AgentActions.scroll(params.direction, params.amount);
          break;
        case 'screenshot':
          AgentActions.screenshot().then(sendResponse);
          return true; // Async response
        case 'findByText':
          result = AgentActions.findByText(params.text);
          break;
        case 'getLinks':
          result = AgentActions.getLinks();
          break;
        case 'getForms':
          result = AgentActions.getForms();
          break;
        case 'getAccessibilityTree':
          result = getAccessibilityTree();
          break;
        default:
          result = {error: `Unknown action: ${action}`};
      }
      
      sendResponse(result);
    } catch (error) {
      sendResponse({error: error.message});
    }
    
    return true; // Keep message channel open
  });

  // =================================================================
  // AGENT OVERLAY: Show "Stop Comet Assistant" when active
  // =================================================================
  function showAgentOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'comet-agent-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a1a2e;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #00ff88;
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <span>Comet AI Agent Active</span>
        <button id="comet-stop-btn" style="
          background: #ff4444;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Stop</button>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('comet-stop-btn')?.addEventListener('click', () => {
      overlay.remove();
      chrome.runtime.sendMessage({action: 'stopAgent'});
    });
  }

  // Initialize
  console.log('[Comet AI] Content script loaded on:', window.location.href);
  
  // Listen for agent activation
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'startAgent') {
      showAgentOverlay();
    }
  });

    // ========================================
  // QUIZ AUTOMATION FUNCTIONS (CRITICAL)
  // ========================================

  // 1. Solve quiz by reading and answering all questions
  async function solveQuiz(aiAnswers) {
    try {
      const questions = findQuestionElements();
      console.log(`[COMET] Found ${questions.length} questions`);
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const options = findAnswerOptions(question);
        const correctAnswer = aiAnswers[i];
        
        // ACTUALLY click the correct answer
        const clicked = clickCorrectAnswer(options, correctAnswer);
        
        if (clicked) {
          console.log(`[COMET] Q${i+1}: Selected "${correctAnswer}" ✓`);
        } else {
          console.log(`[COMET] Q${i+1}: Could not find "${correctAnswer}"`);
        }
        
        // Wait for page to load next question
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Submit quiz if submit button exists
      const submitBtn = document.querySelector('button[type="submit"], .submit-btn, input[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
        console.log('[COMET] Quiz submitted ✓');
      }
      
      return {success: true, questionsAnswered: questions.length};
    } catch (error) {
      console.error('[COMET] Error solving quiz:', error);
      return {success: false, error: error.message};
    }
  }

  // 2. Find all quiz question elements
  function findQuestionElements() {
    const selectors = [
      '.question', '.quiz-question', '[data-question]',
      'h3', 'h4', '.question-text', '.q-text',
      '.quiz-item', '[role="group"]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`[COMET] Found questions using selector: ${selector}`);
        return Array.from(elements);
      }
    }
    
    // Fallback: look for common question patterns
    const allText = document.querySelectorAll('p, div, h1, h2, h3, h4');
    const questions = Array.from(allText).filter(el => {
      const text = el.textContent.trim();
      return text.endsWith('?') && text.length > 10 && text.length < 500;
    });
    
    if (questions.length > 0) {
      console.log(`[COMET] Found ${questions.length} questions by pattern matching`);
    }
    
    return questions;
  }

  // 3. Find answer options for a question
  function findAnswerOptions(questionElement) {
    // Try to find options within the question's parent or next siblings
    let container = questionElement.parentElement;
    
    const selectors = [
      'input[type="radio"], input[type="checkbox"]',
      'button.answer-option, button.option',
      '.answer-option, .option, .choice',
      '[role="radio"], [role="checkbox"]',
      'label', 'li'
    ];
    
    for (const selector of selectors) {
      const options = container.querySelectorAll(selector);
      if (options.length > 1 && options.length < 20) {
        console.log(`[COMET] Found ${options.length} options using: ${selector}`);
        return Array.from(options);
      }
    }
    
    // Fallback: look for clickable elements near the question
    const allButtons = container.querySelectorAll('button, input, label, div[onclick]');
    if (allButtons.length > 0) {
      return Array.from(allButtons);
    }
    
    return [];
  }

  // 4. ACTUALLY click the correct answer (MOST CRITICAL)
  function clickCorrectAnswer(options, correctAnswer) {
    if (!options || options.length === 0) {
      console.error('[COMET] No options provided to click');
      return false;
    }
    
    console.log(`[COMET] Searching for answer: "${correctAnswer}"`);
    
    // Try exact text match first
    for (let option of options) {
      const text = (option.innerText || option.textContent || option.value || '').trim();
      if (text.toLowerCase() === correctAnswer.toLowerCase()) {
        console.log(`[COMET] EXACT MATCH - Clicking: "${text}"`);
        option.click();
        option.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
        if (option.type === 'radio' || option.type === 'checkbox') {
          option.checked = true;
          option.dispatchEvent(new Event('change', {bubbles: true}));
        }
        return true;
      }
    }
    
    // Try partial match (includes)
    for (let option of options) {
      const text = (option.innerText || option.textContent || option.value || '').trim();
      if (text.toLowerCase().includes(correctAnswer.toLowerCase()) || 
          correctAnswer.toLowerCase().includes(text.toLowerCase())) {
        console.log(`[COMET] PARTIAL MATCH - Clicking: "${text}"`);
        option.click();
        option.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
        if (option.type === 'radio' || option.type === 'checkbox') {
          option.checked = true;
          option.dispatchEvent(new Event('change', {bubbles: true}));
        }
        return true;
      }
    }
    
    // Try fuzzy match (word-by-word)
    const answerWords = correctAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (let option of options) {
      const text = (option.innerText || option.textContent || option.value || '').toLowerCase();
      const matchCount = answerWords.filter(word => text.includes(word)).length;
      if (matchCount >= Math.ceil(answerWords.length * 0.5)) {
        console.log(`[COMET] FUZZY MATCH (${matchCount}/${answerWords.length} words) - Clicking`);
        option.click();
        option.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
        if (option.type === 'radio' || option.type === 'checkbox') {
          option.checked = true;
          option.dispatchEvent(new Event('change', {bubbles: true}));
        }
        return true;
      }
    }
    
    console.error('[COMET] Could not find matching answer');
    return false;
  }

  // 5. Message handler - receive quiz commands from background/AI
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[COMET] Received message:', request);
    
    if (request.action === 'solveQuiz') {
      console.log('[COMET] Starting quiz automation with AI answers');
      solveQuiz(request.answers).then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({success: false, error: error.message});
      });
      return true; // Keep message channel open for async response
    }

      // NEW: Autonomous quiz automation - extracts questions, gets AI answers, and solves automatically
      if (request.action === 'autoSolveQuiz') {
            console.log('[COMET] Starting AUTONOMOUS quiz automation');

            // Step 1: Extract all questions from the page
            const questions = findQuestionElements();
            if (!questions || questions.length === 0) {
                    sendResponse({success: false, error: 'No questions found on page'});
                    return true;
                  }

            console.log(`[COMET] Found ${questions.length} questions - sending to AI`);

            // Step 2: Format questions and send to background/AI for answers
            const quizData = questions.map(q => {
                    const options = findAnswerOptions(q);
                    return {
                              question: q.textContent.trim(),
                              options: options.map(o => o.innerText || o.textContent || o.value || '').trim()
                                      };
                  });

            // Step 3: Send to background script to get AI answers
            chrome.runtime.sendMessage({
                    action: 'getQuizAnswers',
                    quizData: quizData
                          }, async (response) => {
                    if (!response || !response.success) {
                              console.error('[COMET] Failed to get AI answers:', response?.error);
                              sendResponse({success: false, error: response?.error || 'AI failed'});
                              return;
                            }

                    // Step 4: Automatically solve the quiz with AI answers
                    console.log('[COMET] Got AI answers - starting automatic solving:', response.answers);

                    try {
                              const result = await solveQuiz(response.answers);
                              console.log('[COMET] Quiz completed autonomously!', result);
                              sendResponse({success: true, questionsAnswered: result.questionsAnswered});
                            } catch (error) {
                              console.error('[COMET] Error during autonomous solving:', error);
                              sendResponse({success: false, error: error.message});
                            }
                  });

            return true; // Keep message channel open for async response
          }
    
    if (request.action === 'analyzeQuiz') {
      // Extract quiz questions and send back for AI analysis
      const questions = findQuestionElements();
      const quizData = questions.map(q => {
        const options = findAnswerOptions(q);
        return {
          question: q.textContent.trim(),
          options: options.map(o => (o.innerText || o.textContent || o.value || '').trim())
        };
      });
      sendResponse({success: true, quizData});
      return true;
    }
    
    if (request.action === 'clickAnswer') {
      // Click a specific answer
      const {questionIndex, answer} = request;
      const questions = findQuestionElements();
      if (questions[questionIndex]) {
        const options = findAnswerOptions(questions[questionIndex]);
        const clicked = clickCorrectAnswer(options, answer);
        sendResponse({success: clicked});
      } else {
        sendResponse({success: false, error: 'Question not found'});
      }
      return true;
    }
  });

})();
