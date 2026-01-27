const API_KEY = "AIzaSyDwQfJoRxIhP-5DZD54x9vXxOwShLKRisI";

async function askGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;
    
    const data = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error("Gemini Error Payload:", result);
            return "The AI is currently unavailable or the model name is incorrect.";
        }

    } catch (error) {
        console.error("Network Error:", error);
        return "Sorry, I couldn't connect to the AI.";
    }
}
