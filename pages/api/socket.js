import { Configuration, OpenAIApi } from "openai";
import { Server } from "socket.io";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const generateChat = async (socket, messages) => {
  const socketId = socket.id;
  const socketSession = sessions.get(socketId);
  console.log("Messages:", messages);
  try {
    const completion = await openai.createChatCompletion(
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        stream: true,
      },
      { responseType: "stream" }
    );

    completion.data.on("data", (data) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");
      let assistantMessage = "";
      for (const line of lines) {
        const message = line.replace(/^data: /, "");
        if (message === "[DONE]") {
          socketSession.messages.push({
            role: "assistant",
            content: assistantMessage,
          });
          console.log(assistantMessage);
          return; // Stream finished
        }
        try {
          const parsed = JSON.parse(message);
          const nextMessage = parsed.choices[0]?.delta?.content;
          if (nextMessage != null) {
            assistantMessage += nextMessage;
            socket.emit("messagePart", nextMessage);
          }
        } catch (error) {
          console.error("Could not JSON parse stream message", message, error);
        }
      }
    });
  } catch (error) {
    if (error.response?.status) {
      console.error(error.response.status, error.message);
      error.response.data.on("data", (data) => {
        const message = data.toString();
        try {
          const parsed = JSON.parse(message);
          console.error("An error occurred during OpenAI request: ", parsed);
        } catch (error) {
          console.error("An error occurred during OpenAI request: ", message);
        }
        socket.emit("error", "An error occurred during your request.");
      });
    } else {
      console.error("An error occurred during OpenAI request", error);
    }
  }
};

const sessions = new Map();

const SocketHandler = async (req, res) => {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message:
          "OpenAI API key not configured, please follow instructions in README.md",
      },
    });
    return;
  }

  if (req.query.reset) {
    res.socket.server.io = null;
  }

  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      const socketId = socket.id;
      sessions.set(socketId, {
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Keep responses brief. Wrap all code blocks in markdown.",
          },
        ],
      });

      console.log("User connected");

      socket.on("disconnect", () => {
        console.log("User disconnected");
      });

      socket.on("userMessage", async (content) => {
        const socketId = socket.id;
        const socketSession = sessions.get(socketId);
        const userMessage = { role: "user", content };
        socketSession.messages.push(userMessage);
        await generateChat(socket, socketSession.messages);
      });
    });
  }
  res.end();
};

function generatePrompt(animal) {
  const capitalizedAnimal =
    animal[0].toUpperCase() + animal.slice(1).toLowerCase();
  return `Suggest three names for an animal that is a superhero.

Animal: Cat
Names: Captain Sharpclaw, Agent Fluffball, The Incredible Feline
Animal: Dog
Names: Ruff the Protector, Wonder Canine, Sir Barks-a-Lot
Animal: ${capitalizedAnimal}
Names:`;
}

export default SocketHandler;
