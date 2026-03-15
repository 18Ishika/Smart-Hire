import { useEffect, useState } from "react";
import axios from "axios";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Feature from "../components/Feature";
import HowItWorks from "../components/Work";

function Home() {

  const [message, setMessage] = useState("");

  useEffect(() => {

    const API_URL = import.meta.env.VITE_API_URL;

    axios.get(`${API_URL}/api/users/test`)
      .then(res => {
        console.log(res.data);
        setMessage(res.data.message);
      })
      .catch(err => {
        console.error(err);
      });

  }, []);

  return (
    <div>

      <Navbar />

      {/* Backend connection test */}
      <h2>{message}</h2>

      <Hero />
      <Feature />
      <HowItWorks />

    </div>
  );
}

export default Home;