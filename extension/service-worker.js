// service-worker.js
const GEMINI_API_KEY = "AIzaSyDJYfvEmaGjhvrpPso52TNpPMiItGRt0y4"; // Use your key

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        console.log("Service worker received action:", request.action);

        // --- Gemini gift generation ---
        if (request.action === "generateGift") {
            chrome.storage.local.set({ giftStatus: "loading" });
            return new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: request.prompt }] }],
                                generationConfig: { temperature: 0.8 }
                            }),
                        }
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("API Error:", errorData);
                        await chrome.storage.local.set({ giftStatus: "error", lastGift: `API Error ${response.status}: ${errorData.error.message}` });
                        resolve({ success: false, gift: `API Error ${response.status}: ${errorData.error.message}` });
                        return;
                    }

                    const data = await response.json();
                    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No text found in response.";
                    const htmlGift = generatedText.replace(/\n/g, '<br>');

                    await chrome.storage.local.set({ 
                        giftStatus: "success", 
                        lastGift: htmlGift 
                    });
                    resolve({ success: true, gift: htmlGift }); 

                } catch (error) {
                    console.error("Fetch/Network Error:", error); 
                    await chrome.storage.local.set({ 
                        giftStatus: "error", 
                        lastGift: "Sorry, a network error occurred." 
                    });
                    resolve({ success: false, gift: "Sorry, a network error occurred." });
                }
            }); // End of new Promise
        
        // --- Popup triggered a haunt → tell content script on active tab ---
        } else if (request.action === "sendHaunt") {
            // This is the block you need for the advanced haunt
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    // This message (startHaunting) is now sent to content.js
                    // The new V2 popup.js also sends a message, but this is the correct flow
                    chrome.tabs.sendMessage(tabs[0].id, { action: "startHaunting" });
                }
            });
            if (sendResponse) {
                sendResponse({ ok: true });
            }
            return;

        // --- Content script received haunt from partner ---
        } else if (request.action === "receiveHaunt") {
            console.log("Service worker: Storing haunt flag!");
            chrome.storage.local.set({ haunted: true });
            if (sendResponse) {
                sendResponse({ ok: true });
            }
        }
    }
);