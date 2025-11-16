// service-worker.js

const GEMINI_API_KEY = "AIzaSyDJYfvEmaGjhvrpPso52TNpPMiItGRt0y4";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Service worker received action:", request.action);

    // --- Gemini gift generation ---
    if (request.action === "generateGift") {
        chrome.storage.local.set({ giftStatus: "loading" });

        return new Promise(async (resolve) => {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: request.prompt }]
                            }],
                            generationConfig: {
                                temperature: 0.8
                            }
                        })
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("API Error:", errorData);

                    await chrome.storage.local.set({
                        giftStatus: "error",
                        lastGift: `API Error ${response.status}: ${errorData.error.message}`
                    });
                    resolve({ success: false, gift: `API Error ${response.status}: ${errorData.error.message}` });
                    return;
                }

                const data = await response.json();
                console.log("API Success, Full Data:", data);

                const generatedText =
                    data.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "Error: No text found in response.";

                const htmlGift = generatedText.replace(/\n/g, "<br>");

                await chrome.storage.local.set({
                    giftStatus: "success",
                    lastGift: htmlGift
                });

                resolve({ success: true, gift: htmlGift });
                console.log("Gift Promise Resolved.");
            } catch (error) {
                console.error("Fetch/Network Error:", error);
                await chrome.storage.local.set({
                    giftStatus: "error",
                    lastGift: "Sorry, a network error occurred."
                });
                resolve({ success: false, gift: "Sorry, a network error occurred." });
            }
        });

    // --- Popup triggered a haunt → tell content script on active tab ---
    } else if (request.action === "sendHaunt") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
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
    }
});
