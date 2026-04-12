import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/auth";
import "../styles/Upload.css";

function Upload() {
  const { id: jobId } = useParams();

  const [files, setFiles] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [jobTitle, setJobTitle] = useState(""); // ✅ NEW

  const [explanations, setExplanations] = useState({});
  const [loadingExplain, setLoadingExplain] = useState({});

  const [selectedPdf, setSelectedPdf] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const resumesPerPage = 3;
  const BASE_URL = "http://127.0.0.1:8000";

  // ---------------- FETCH RESUMES ----------------
  const fetchResumes = async () => {
    try {
      const res = await api.get(`/api/resumes/rankings/${jobId}/`);
      setResumes(res.data.rankings || []);
    } catch (err) {
      console.log(err);
    }
  };

  // ---------------- FETCH JOB ----------------
  const fetchJobDetails = async () => {
    try {
      const res = await api.get(`/api/jobs/${jobId}/`);
      setJobTitle(res.data.title || "Untitled Job");
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchResumes();
      fetchJobDetails();
    }
  }, [jobId]);

  // ---------------- FILE HANDLING ----------------
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!files.length) return alert("Please select files");

    const formData = new FormData();
    formData.append("job", jobId);
    files.forEach((file) => formData.append("resume_file", file));

    try {
      await api.post("/api/resumes/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles([]);
      setCurrentPage(1);
      fetchResumes();
    } catch (err) {
      alert("Upload failed");
    }
  };

  // ---------------- EXPLANATION ----------------
  const handleExplain = async (resumeId) => {
    if (explanations[resumeId] !== undefined) {
      setExplanations((prev) => ({
        ...prev,
        [resumeId]: undefined,
      }));
      return;
    }

    setLoadingExplain((prev) => ({ ...prev, [resumeId]: true }));

    try {
      const res = await api.get(`/api/resumes/${resumeId}/explain/`);
      setExplanations((prev) => ({
        ...prev,
        [resumeId]: res.data.explanation,
      }));
    } catch (err) {
      setExplanations((prev) => ({
        ...prev,
        [resumeId]: "Could not fetch explanation.",
      }));
    } finally {
      setLoadingExplain((prev) => ({
        ...prev,
        [resumeId]: false,
      }));
    }
  };

  // ---------------- SORT + PAGINATION ----------------
  const sortedResumes = [...resumes].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  );

  const totalPages = Math.ceil(sortedResumes.length / resumesPerPage);
  const indexOfLast = currentPage * resumesPerPage;
  const indexOfFirst = indexOfLast - resumesPerPage;
  const currentResumes = sortedResumes.slice(indexOfFirst, indexOfLast);

  // ---------------- UI ----------------
  return (
    <div className="upload-page">

      {/* HEADER */}
      <div className="page-header">
        <h1>Resume Ranking Dashboard</h1>

        <p>
          Job: <strong>{jobTitle || "Loading..."}</strong>
          <span style={{ marginLeft: "10px", opacity: 0.7 }}>
            (ID: {jobId})
          </span>
        </p>
      </div>

      {/* UPLOAD */}
      <div className="upload-box">
        <h2>📤 Upload Resumes</h2>

        <label className="drop-zone">
          <input type="file" multiple onChange={handleFileChange} />
          <p>Drag & drop or click to select files</p>
        </label>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <span key={i} className="file-chip">{f.name}</span>
            ))}
          </div>
        )}

        <button className="upload-btn" onClick={handleUpload}>
          Upload & Process
        </button>
      </div>

      {/* RESUMES */}
      <div className="resume-section">
        <h2>🏆 Ranked Resumes</h2>

        {sortedResumes.length === 0 ? (
          <div className="empty-state">No resumes processed yet</div>
        ) : (
          <>
            <div className="resume-grid">
              {currentResumes.map((r, index) => {
                const rank = indexOfFirst + index + 1;
                const fileUrl = `${BASE_URL}/api/resumes/view-resume/${r.id}/`;

                return (
                  <div key={r.id} className="resume-card">

                    <div className="rank-badge">#{rank}</div>

                    <h3>{r.actual_resume_file_name}</h3>

                    <div className="score">
                      ⭐ {r.score !== null ? r.score : "Processing..."}
                    </div>

                    <div className={`status ${r.status?.toLowerCase()}`}>
                      {r.status === "Processed"
                        ? "✔ Processed"
                        : r.status === "Pending"
                        ? "⏳ Pending"
                        : r.status}
                    </div>

                    <button
                      className="resume-link"
                      onClick={() => {
                        setSelectedPdf(fileUrl);
                        setPdfLoading(true);
                      }}
                    >
                      View Resume →
                    </button>

                    {r.status === "Processed" && (
                      <button
                        className="explain-btn"
                        onClick={() => handleExplain(r.id)}
                        disabled={loadingExplain[r.id]}
                      >
                        {loadingExplain[r.id]
                          ? "Loading..."
                          : explanations[r.id]
                          ? "Hide Explanation"
                          : "Why this rank?"}
                      </button>
                    )}

                    {explanations[r.id] && (
                      <div className="explanation">
                        {explanations[r.id]}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* PAGINATION */}
            {sortedResumes.length > resumesPerPage && (
              <div className="pagination">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={currentPage === i + 1 ? "active" : ""}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* PDF MODAL */}
      {selectedPdf && (
        <div className="pdf-modal">
          <div className="pdf-container">

            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <button className="download-btn" onClick={() => setSelectedPdf(null)}>
                Close ❌
              </button>

              <button
                className="download-btn"
                onClick={() => window.open(selectedPdf, "_blank")}
              >
                Open in New Tab
              </button>
            </div>

            {pdfLoading && <p>Loading PDF...</p>}

            <iframe
              src={`${selectedPdf}#toolbar=1`}
              title="Resume Viewer"
              onLoad={() => setPdfLoading(false)}
            />

          </div>
        </div>
      )}

    </div>
  );
}

export default Upload;