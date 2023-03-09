import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import styles from "./index.module.css";
let socket;

export default function Home() {
  const [animalInput, setAnimalInput] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch("/api/socket");
      socket = io();

      socket.on("connect", () => {
        console.log("connected");
      });
      socket.on("message", (e) => {
        setResult((r) => r + e);
      });
    };
    socketInitializer();
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    socket.emit("animal", animalInput);
    setAnimalInput("");
  };

  return (
    <div>
      <Head>
        <title>OpenAI Quickstart</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <img src="/dog.png" className={styles.icon} />
        <h3>Name my pet</h3>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            name="animal"
            placeholder="Enter an animal"
            value={animalInput}
            onChange={(e) => setAnimalInput(e.target.value)}
          />
          <input type="submit" value="Generate names" />
        </form>
        <div className={styles.result}>{result}</div>
      </main>
    </div>
  );
}
