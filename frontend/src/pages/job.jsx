import { useState } from "react";
import api from "../api/auth";
import "../styles/Job.css";
import { useNavigate } from "react-router-dom";

function JobResumePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    required_skills: "",
    location: "",
    experience_required: "",
    employment_type: "FT",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const res = await api.post("/api/jobs/create/", form);
      alert("Job created successfully");

      setForm({
        title: "",
        description: "",
        required_skills: "",
        location: "",
        experience_required: "",
        employment_type: "FT",
      });
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  return (
    <div className="job-container">

      <div className="job-card">
        <h2>Create Job</h2>

        <input
          type="text"
          name="title"
          placeholder="Job Title"
          value={form.title}
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Job Description"
          value={form.description}
          onChange={handleChange}
        />

        <textarea
          name="required_skills"
          placeholder="Required Skills (comma separated)"
          value={form.required_skills}
          onChange={handleChange}
        />

        <input
          type="text"
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
        />

        <input
          type="number"
          name="experience_required"
          placeholder="Experience (years)"
          value={form.experience_required}
          onChange={handleChange}
        />

        <select
          name="employment_type"
          value={form.employment_type}
          onChange={handleChange}
        >
          <option value="FT">Full-time</option>
          <option value="PT">Part-time</option>
          <option value="IN">Internship</option>
          <option value="CT">Contract</option>
        </select>

        <button onClick={handleSubmit}>
          Create Job
        </button>
      </div>

    </div>
  );
}

export default JobResumePage;