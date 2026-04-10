import { useEffect, useState } from "react";
import api from "../api/auth";
import "../styles/View.css";
import { useNavigate } from "react-router-dom";

function ViewJob() {
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get("api/jobs/list/");
      setJobs(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="jobs-container">

      <div className="jobs-header">
        <div>
            <h2>My Jobs</h2>
            <p>Track, manage and optimize your job postings</p>
        </div>

        <button
            className="create-btn"
            onClick={() => navigate("/job")}
        >
            + Create Job
        </button>
        </div>

      <div className="jobs-grid">
        {jobs.length === 0 ? (
          <p>No jobs created yet</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="job-card">

              <div className="job-top">
                <h3>{job.title}</h3>
                <span className="badge">{job.employment_type}</span>
              </div>

              <p className="desc">
                {job.description.slice(0, 100)}...
              </p>

              <div className="job-info">
                <p><strong>Skills:</strong> {job.required_skills}</p>
                <p><strong>Exp:</strong> {job.experience_required} yrs</p>
              </div>

              <div className="job-footer">
                <span>{job.location}</span>

                <div className="actions">

                <button
                  className="upload-btn"
                  onClick={() => navigate(`/list/${job.id}/upload`)}
                >
                  Upload Resumes
                </button>

                <button className="delete-btn">
                  Delete
                </button>

              </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default ViewJob;