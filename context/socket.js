import React, { createContext, useEffect, useState } from "react";

import io from "socket.io-client";

export const SocketContext = createContext(undefined);

export const SocketProvider = (props) => {
  const [socket, setSocket] = useState(undefined);

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch("/api/socket?reset=true");
      const socket = io();
      setSocket(socket);
    };
    socketInitializer();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};
