import { useEffect, useState } from "react";
import api from "../api/auth";
import "../styles/view.css";
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

  const handleDelete = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    try {
      await api.delete(`api/jobs/delete/${jobId}/`);
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    } catch (err) {
      console.log(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="jobs-container">

      {/* HEADER */}
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

      {/* GRID */}
      <div className="jobs-grid">
        {jobs.length === 0 ? (
          <div className="empty-state">
            <h3>No jobs yet</h3>
            <p>Create your first job to start screening candidates</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="job-card">

              {/* TOP */}
              <div className="job-top">
                <h3>{job.title}</h3>
                <span className="badge">{job.employment_type}</span>
              </div>

              {/* DESC */}
              <p className="desc">
                {job.description.slice(0, 100)}...
              </p>

              {/* CHIPS */}
              <div className="job-info">
                <span className="job-chip">
                  {job.experience_required} yrs
                </span>

                {job.required_skills &&
                  job.required_skills
                    .split(",")
                    .slice(0, 3)
                    .map((skill, i) => (
                      <span key={i} className="job-chip">
                        {skill.trim()}
                      </span>
                    ))}
              </div>

              {/* FOOTER */}
              <div className="job-footer">
                <span className="location">{job.location}</span>

                <div className="actions">
                  <button
                    className="upload-btn"
                    onClick={() => navigate(`/list/${job.id}/upload`)}
                  >
                    Upload Resumes
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(job.id)}
                  >
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