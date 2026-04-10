import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Feature from "../components/Feature";
import HowItWorks from "../components/Work";
import Dashboard from "./dashboard";

function Home() {
  const token = localStorage.getItem("access");

  return (
    <div>
      <Navbar />

      {token ? (
        <Dashboard />
      ) : (
        <>
          <Hero />
          <Feature />
          <HowItWorks />
        </>
      )}
    </div>
  );
}

export default Home;