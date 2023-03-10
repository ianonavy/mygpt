import { Configuration, OpenAIApi } from "openai";
import { Server } from "socket.io";
import { get_encoding } from "@dqbd/tiktoken";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const encoding = get_encoding("cl100k_base");

const countTokens = (messages) => {
  let numTokens = 0;
  for (let i = 0; i < messages.length; i++) {
    numTokens += 4; // every message follows <im_start>{role/name}\n{content}<im_end>\n

    let message = messages[i];
    Object.keys(message).forEach((key) => {
      const value = message[key];
      numTokens += encoding.encode(value).length;

      if (key === "name") {
        // if there's a name, the role is omitted
        numTokens -= 1; // role is always required and always 1 token
      }
    });
  }
  numTokens += 2; // every reply is primed with <im_start>assistant
  return numTokens;
};

const generateChat = async (socket, messages, isStopped) => {
  const socketId = socket.id;
  const socketSession = sessions.get(socketId);
  console.log("Messages:", messages);
  const controller = new AbortController();
  const promptTokens = countTokens(messages);
  try {
    const completion = await openai.createChatCompletion(
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        stream: true,
      },
      { responseType: "stream", signal: controller.signal }
    );

    let assistantMessage = "";
    const addToMessage = (m) => {
      assistantMessage += m;
    };

    completion.data.on("data", (data) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");
      for (const line of lines) {
        const message = line.replace(/^data: /, "");
        const stopped = isStopped();
        if (message === "[DONE]" || stopped) {
          socketSession.messages.push({
            role: "assistant",
            content: assistantMessage,
          });
          console.log("assistant:", assistantMessage);
          const completionTokens = encoding.encode(assistantMessage).length;
          socket.emit("messageEnd", {
            completionTokens,
            promptTokens,
            totalTokens: completionTokens + promptTokens,
          });
          if (stopped) {
            controller.abort();
          }
          return; // Stream finished
        }
        try {
          const parsed = JSON.parse(message);
          const nextMessage = parsed.choices[0]?.delta?.content;
          if (nextMessage != null) {
            addToMessage(nextMessage);
            socket.emit("messagePart", nextMessage, parsed.id);
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
const systemMessage = {
  role: "system",
  content: "You are a helpful assistant called MyGPT. Keep responses brief.",
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
      const socketId = socket.id;
      sessions.set(socketId, {
        messages: [systemMessage],
      });

      console.log("User connected");

      socket.on("disconnect", () => {
        console.log("User disconnected");
      });

      let isStopped = false;

      socket.on("setContext", async (messages) => {
        console.log("User set context message");
        const socketSession = sessions.get(socketId);
        messages = messages.map(({ role, content }) => ({ role, content }));
        socketSession.messages = [systemMessage, ...messages];
      });

      socket.on("userMessage", async (content) => {
        console.log("User sent message");
        const userMessage = { role: "user", content };
        const socketSession = sessions.get(socketId);
        socketSession.messages.push(userMessage);
        isStopped = false;
        await generateChat(socket, socketSession.messages, () => isStopped);
      });

      socket.on("userTokenReq", async (content) => {
        console.log(content);
        socket.emit("userTokenResp", encoding.encode(content).length);
      });

      socket.on("stopGeneration", async () => {
        console.log("User requested stop generation");
        isStopped = true;
      });
    });
  }
  res.end();
};

export default SocketHandler;
