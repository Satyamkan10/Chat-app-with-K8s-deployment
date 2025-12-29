import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";

import { allUsersRoute } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(undefined);
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [loading, setLoading] = useState(false);

  /**
   * =========================
   * Check logged-in user
   * =========================
   */
  useEffect(() => {
    const checkUser = async () => {
      const storedUser = localStorage.getItem(
          process.env.REACT_APP_LOCALHOST_KEY
      );

      if (!storedUser) {
        navigate("/login");
        return;
      }

      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setCurrentUserAvatar(user.avatarImage);
      setCurrentUserName(user.username);
    };

    checkUser();
  }, [navigate]);

  /**
   * =========================
   * Socket.io connection
   * =========================
   */
  useEffect(() => {
    if (!currentUser) return;

    socket.current = io("/", {
      path: "/socket.io",
      transports: ["websocket"],
    });

    socket.current.emit("add-user", currentUser._id);

    socket.current.on("user-status", (userId, status) => {
      setContacts((prev) =>
          prev.map((contact) =>
              contact._id === userId
                  ? { ...contact, isOnline: status }
                  : contact
          )
      );
    });

    return () => {
      if (socket.current) {
        socket.current.off("user-status");
        socket.current.disconnect();
      }
    };
  }, [currentUser]);

  /**
   * =========================
   * Fetch contacts
   * =========================
   */
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;

      if (!currentUser.isAvatarImageSet) {
        navigate("/setAvatar");
        return;
      }

      setLoading(true);
      try {
        const { data } = await axios.get(
            `${allUsersRoute}/${currentUser._id}`
        );
        setContacts(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, navigate]);

  /**
   * =========================
   * Handle chat selection
   * =========================
   */
  const handleChatChange = useCallback((chat) => {
    setLoading(true);
    setTimeout(() => {
      setCurrentChat(chat);
      setLoading(false);
    }, 300);
  }, []);

  /**
   * =========================
   * Render
   * =========================
   */
  return (
      <Container>
        <div className="container">
          <Contacts
              contacts={contacts}
              changeChat={handleChatChange}
              currentUserAvatar={currentUserAvatar}
              currentUserName={currentUserName}
          />

          {loading ? (
              <div className="loading">Loading...</div>
          ) : currentChat === undefined ? (
              <Welcome />
          ) : (
              <ChatContainer currentChat={currentChat} socket={socket} />
          )}
        </div>
      </Container>
  );
}

/**
 * =========================
 * Styled Components
 * =========================
 */
const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #131324;
  overflow: hidden;

  .container {
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
    grid-template-columns: 25% 75%;
    border-radius: 0.5rem;

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
    }

    @media screen and (max-width: 720px) {
      grid-template-columns: 1fr;
      width: 95vw;
      height: auto;
    }

    @media screen and (max-width: 480px) {
      width: 100vw;
      height: 90vh;
    }
  }

  .loading {
    color: white;
    font-size: 1.2rem;
    text-align: center;
  }
`;
