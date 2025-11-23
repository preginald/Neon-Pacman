import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateLevelWithAI = async (difficulty: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const prompt = `
    Create a playable Pacman level grid layout. 
    The grid should be roughly 19 to 23 tiles wide and 19 to 23 tiles tall.
    Use the following characters:
    '#' for Walls
    '.' for Pellets (Dots)
    'O' for Power Pellets (Big dots, usually 4 per map near corners)
    ' ' for Empty space
    '-' for Ghost House Gate (center of map)
    'G' for Ghost Spawn points (inside the ghost house, need 3 or 4)
    'P' for Pacman Spawn point (usually lower center)

    Ensure the map is enclosed by walls.
    Ensure there are valid paths.
    Ensure the ghost house is in the middle.
    
    Difficulty requested: ${difficulty}. 
    (If Hard, make narrow paths. If Easy, make open areas).
    
    Return ONLY the array of strings representing the rows.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The rows of the pacman maze grid."
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text);
    return data.grid;

  } catch (error) {
    console.error("Error generating level:", error);
    throw error;
  }
};