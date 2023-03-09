import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import styles from "./index.module.css";
let socket;

export default function Home() {
  const [animalInput, setAnimalInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch("/api/socket?reset=true");
      socket = io();

      socket.on("connect", () => {
        console.log("connected");
      });
      socket.on("messagePart", (e) => {
        setMessages((r) => [...r.slice(0, -1), r[r.length - 1] + e]);
      });
    };
    socketInitializer();
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    socket.emit("userMessage", animalInput);
    setMessages((r) => [...r, animalInput, ""]);
    setAnimalInput("");
  };

  return (
    <div>
      <Head>
        <title>MyGPT</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <img src="/dog.png" className={styles.icon} />
        <h3>MyGPT</h3>
        <div
          className={styles.chatbox}
          style={{ width: "800px", display: "flex", flexDirection: "column" }}
        >
          {messages.map((message, index) => (
            <div key={index} className={styles.message}>
              <div
                style={{
                  width: "100px",
                  textAlign: "right",
                  paddingRight: "10px",
                }}
              >
                {index % 2 === 0 ? "You:" : "MyGPT:"}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ whiteSpace: "pre-wrap" }}>{message.trim()}</span>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit}>
          <textarea
            type="text"
            name="animal"
            placeholder=""
            value={animalInput}
            onChange={(e) => setAnimalInput(e.target.value)}
          />
          <input type="submit" value="Submit" />
        </form>
      </main>
    </div>
  );
}
