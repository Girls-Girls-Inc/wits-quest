import React from "react";
import IconButton from "../components/IconButton";

const Home = () => {
  return (
    <section>
      <h1>Welcome to Wits Quest</h1>
      <p>Conquer the edge using your Wits wits!</p>

      <IconButton route="/" icon="home" label="Home" />
      <IconButton route="/signup" icon="person_add" label="Signup" />
      <IconButton route="/login" icon="login" label="Login" />
    </section>
  );
};

export default Home;
