// service-worker.js

// 🚨 IMPORTANT: Replace with your actual key
const GEMINI_API_KEY = "AIzaSyDJYfvEmaGjhvrpPso52TNpPMiItGRt0y4"; 

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.action === "generateGift") {
            
            // Return a Promise to handle the async work. The browser will wait for this to resolve.
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

                    // 1. Check for non-200 HTTP status (API errors like 403, 429)
                    if (!response.ok) {
                        const errorData = await response.json();
                        // Resolve the promise with a failed state
                        resolve({ success: false, gift: `API Error ${response.status}: ${errorData.error.message}` });
                        return;
                    }

                    const data = await response.json();
                    // 2. Safely extract the generated text
                    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error generating gift (no text found in response).";
                    
                    // Resolve the promise with a success state
                    resolve({ success: true, gift: generatedText });

                } catch (error) {
                    // 3. Catch network errors
                    console.error("Gemini API Error:", error);
                    resolve({ success: false, gift: "Sorry, the ghost is too tired to generate a gift right now (Network Failure)." });
                }
            });
        }
        // If the action is not 'generateGift', return undefined.
    }
);