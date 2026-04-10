import { useNavigate } from "react-router-dom";
function Hero() {
  const navigate = useNavigate();
  return (
    <section className="hero">

      <div className="hero-text">

        <h1>
          AI Powered Resume Screening
        </h1>

        <p>
          Upload resumes and instantly find the
          best candidates for your job description.
        </p>

        <button onClick={() => navigate("/job")}>
          Start Hiring
        </button>

      </div>

      <div className="hero-image">

        <img
          src="https://images.unsplash.com/photo-1551836022-d5d88e9218df"
          alt="office"
        />

      </div>

    </section>
  );

}

export default Hero;