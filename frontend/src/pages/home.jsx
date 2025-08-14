import React from "react";
import IconButton from "../components/IconButton";
import toast, { Toaster } from "react-hot-toast";

const idiotNotification = () =>
  toast("Why the hell are you clicking home in home?");

const Home = () => {
  return (
    <section>
      <h1>Welcome to Wits Quest</h1>
      <p>Conquer the edge using your Wits wits!</p>

      <IconButton onClick={idiotNotification} icon="home" label="Home" />
      <IconButton route="/" icon="login" label="Login" />
      <Toaster />
    </section>
  );
};

export default Home;
