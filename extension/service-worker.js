// service-worker.js

const GEMINI_API_KEY = "AIzaSyDJYfvEmaGjhvrpPso52TNpPMiItGRt0y4"; 

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        console.log("Service worker received action:", request.action); // Debug 1

        if (request.action === "generateGift") {

            // Set status in storage immediately so popup knows we're working
            chrome.storage.local.set({ giftStatus: "loading" });

            // Return a promise to handle the asynchronous API call
            return new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{ text: request.prompt }]
                                }],
                                generationConfig: {
                                    temperature: 0.8
                                }
                            }),
                        }
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("API Error:", errorData); // Debug 2
                        
                        // Also set error status in storage
                        await chrome.storage.local.set({ giftStatus: "error", lastGift: `API Error ${response.status}: ${errorData.error.message}` });
                        resolve({ success: false, gift: `API Error ${response.status}: ${errorData.error.message}` }); // Still resolve for popup if open
                        return;
                    }

                    const data = await response.json();
                    console.log("API Success, Full Data:", data); // Debug 3

                    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No text found in response.";
                    console.log("Extracted Text:", generatedText); // Debug 4

                    // Format text with <br> tags for HTML display
                    const htmlGift = generatedText.replace(/\n/g, '<br>');

                    // Save the successful gift to storage
                    await chrome.storage.local.set({ 
                        giftStatus: "success", 
                        lastGift: htmlGift 
                    });

                    // Resolve the promise for the popup (if it's still open)
                    resolve({ success: true, gift: htmlGift }); 
                    console.log("Promise Resolved."); // Debug 5

                } catch (error) {
                    console.error("Fetch/Network Error:", error); // Debug 6
                    
                    // Set error status in storage
                    await chrome.storage.local.set({ 
                        giftStatus: "error", 
                        lastGift: "Sorry, a network error occurred." 
                    });
                    resolve({ success: false, gift: "Sorry, a network error occurred." });
                }
            }); // End of new Promise
        }
        
        // Note: It's good practice to return true for async message listeners,
        // but returning a Promise (as we do above) accomplishes the same thing.
    }
);