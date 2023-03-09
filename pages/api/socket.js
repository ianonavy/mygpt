import { Configuration, OpenAIApi } from "openai";
import { Server } from "socket.io";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const handleAnimal = async (socket, animal) => {
  try {
    const completion = await openai.createCompletion(
      {
        model: "text-davinci-003",
        prompt: generatePrompt(animal),
        temperature: 0.6,
        stream: true,
      },
      { responseType: "stream" }
    );

    completion.data.on("data", (data) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");
      console.log(`Received data ${data}`);
      for (const line of lines) {
        const message = line.replace(/^data: /, "");
        if (message === "[DONE]") {
          return; // Stream finished
        }
        try {
          const parsed = JSON.parse(message);
          console.log(parsed.choices[0].text);
          socket.emit("message", parsed.choices[0].text);
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
        res.write(
          `event: error\ndata: An error occurred during your request.\n\n`
        );
        res.write("event: end\n\n");
        res.end();
      });
    } else {
      console.error("An error occurred during OpenAI request", error);
    }
  }
};

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
      console.log("User connected");

      socket.on("disconnect", () => {
        console.log("User disconnected");
      });

      socket.on("animal", async (msg) => {
        await handleAnimal(socket, msg);
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
